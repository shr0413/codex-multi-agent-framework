import { evaluateInitialGates, evaluateVerificationGate } from "../process/gates.mjs";
import { stringifyError } from "../shared/utils.mjs";
import { buildExecutionBatches } from "./router.mjs";
import { Verifier } from "./verifier.mjs";
import { Watcher } from "./watcher.mjs";
import { WorkerPool } from "./worker-pool.mjs";
import { StateStore } from "../state/state-store.mjs";

export class Orchestrator {
  constructor({ projectRoot, config, task, runId = null }) {
    this.projectRoot = projectRoot;
    this.config = config;
    this.task = task;
    this.stateStore = new StateStore({ projectRoot, config, runId });
    this.verifier = new Verifier({ projectRoot, stateStore: this.stateStore });
    this.workerPool = new WorkerPool({ projectRoot, stateStore: this.stateStore });
    this.runState = null;
    this.watcher = null;
  }

  async run() {
    await this.stateStore.initializeProjectState();

    if (this.stateStore.runId) {
      this.runState = await this.stateStore.loadRunState();
      this.task = await this.stateStore.loadTaskSnapshot();
      if (this.runState.status === "completed") {
        return this.runState;
      }
      await this.stateStore.logEvent("run.resumed", "orchestrator", {
        runId: this.stateStore.runId
      });
    } else {
      this.runState = await this.stateStore.createRun(this.task);
      await this.stateStore.logEvent("run.created", "orchestrator", {
        runId: this.runState.runId,
        taskId: this.task.taskId
      });
    }

    this.watcher = new Watcher(this.runState);

    try {
      await this.applyInitialGates();
      if (this.runState.status === "blocked") {
        return this.runState;
      }

      this.runState.status = "running";
      if (this.task.mode === "normal") {
        await this.runNormalMode();
      } else {
        await this.runAutonomousMode();
      }
    } catch (error) {
      this.runState.status = "failed";
      this.runState.error = stringifyError(error);
      await this.stateStore.logEvent("run.failed", "orchestrator", {
        message: error instanceof Error ? error.message : String(error)
      });
    }

    await this.stateStore.saveRunState(this.runState);
    return this.runState;
  }

  async applyInitialGates() {
    const decisions = evaluateInitialGates(this.task, this.runState);
    this.runState.gateDecisions = {
      ...this.runState.gateDecisions,
      ...decisions
    };
    await this.stateStore.saveRunState(this.runState);

    const blocked = Object.values(decisions).find((entry) => entry.status === "blocked");
    if (blocked) {
      this.runState.status = "blocked";
      this.runState.phase = `${blocked.gate}_gate`;
      await this.stateStore.logEvent("gate.blocked", "orchestrator", blocked);
      await this.stateStore.saveRunState(this.runState);
    }
  }

  async runNormalMode() {
    this.runState.phase = "execution";
    await this.stateStore.saveRunState(this.runState);

    await this.executePlan(this.task.plan, "main");
    await this.completeWithVerification();
  }

  async runAutonomousMode() {
    this.runState.phase = "baseline";
    await this.stateStore.saveRunState(this.runState);

    const optimization = this.task.autonomousOptimization;
    if (this.runState.watcher.baselineMetric == null) {
      const baseline = await this.verifier.evaluateMetric(optimization.evaluate, "baseline");
      this.watcher.recordBaseline(baseline.metric);
      await this.stateStore.logEvent("watcher.baseline", "watcher", baseline);
      await this.stateStore.saveRunState(this.runState);
    }

    for (const iteration of optimization.iterations) {
      const current = this.runState.iterations[iteration.id];
      if (current?.status && current.status !== "pending") {
        continue;
      }

      const stop = this.watcher.shouldStopAutonomous(this.task, this.config);
      if (stop.stop) {
        this.runState.autonomousStopReason = stop.reason;
        break;
      }

      const scope = `iteration:${iteration.id}`;
      this.runState.phase = "iteration";
      this.runState.currentIteration = iteration.id;
      this.runState.iterations[iteration.id] = {
        id: iteration.id,
        type: iteration.type,
        status: "running"
      };
      await this.stateStore.saveRunState(this.runState);

      const snapshot = await this.stateStore.snapshotFiles(optimization.mutableFiles);
      try {
        await this.executePlan(iteration.plan, scope);
        const evaluation = await this.verifier.evaluateMetric(optimization.evaluate, iteration.id);
        const bestMetric = this.runState.watcher.bestMetric ?? this.runState.watcher.baselineMetric;
        const accepted =
          evaluation.metric > bestMetric ||
          (evaluation.metric === bestMetric && iteration.acceptEqualMetric === true);

        if (!accepted) {
          await this.stateStore.restoreSnapshot(snapshot);
        }

        this.watcher.recordIteration(iteration, evaluation.metric, accepted);
        this.runState.iterations[iteration.id] = {
          id: iteration.id,
          type: iteration.type,
          status: accepted ? "accepted" : "reverted",
          metric: evaluation.metric,
          accepted,
          evaluatedAt: evaluation.evaluatedAt
        };

        await this.stateStore.logEvent("watcher.iteration", "watcher", {
          iterationId: iteration.id,
          type: iteration.type,
          metric: evaluation.metric,
          accepted
        });
        await this.stateStore.saveRunState(this.runState);
      } catch (error) {
        await this.stateStore.restoreSnapshot(snapshot);
        this.watcher.recordFailure(error instanceof Error ? error.message : String(error));
        this.runState.iterations[iteration.id] = {
          id: iteration.id,
          type: iteration.type,
          status: "failed",
          error: stringifyError(error)
        };
        await this.stateStore.logEvent("watcher.iteration.failed", "watcher", {
          iterationId: iteration.id,
          message: error instanceof Error ? error.message : String(error)
        });
        await this.stateStore.saveRunState(this.runState);
      }
    }

    await this.completeWithVerification();
  }

  async executePlan(plan, scope) {
    const alreadyCompleted = this.getCompletedStepIds(scope);
    const batches = buildExecutionBatches(plan, { alreadyCompleted });

    for (const batch of batches) {
      const results = await this.workerPool.executeBatch(batch, scope);
      for (const result of results) {
        const stepKey = this.toStepKey(scope, result.stepId);
        const nextState = this.runState.steps[stepKey] ?? {
          id: result.stepId,
          scope,
          title: batch.find((entry) => entry.id === result.stepId)?.title ?? result.stepId,
          attempts: 0
        };
        nextState.attempts += 1;
        nextState.status = result.success ? "completed" : "failed";
        nextState.startedAt = result.startedAt;
        nextState.finishedAt = result.finishedAt;
        nextState.stdout = result.stdout;
        nextState.stderr = result.stderr;
        nextState.touchedFiles = result.touchedFiles;
        this.runState.steps[stepKey] = nextState;
        this.runState.currentNode = result.stepId;
        this.runState.currentScope = scope;
        this.runState.lastExecutionAt = result.finishedAt;

        if (result.success) {
          this.watcher.recordSuccess();
          const step = batch.find((entry) => entry.id === result.stepId);
          const stepVerification = await this.verifier.verifyStep(step, scope);
          if (!stepVerification.passed) {
            nextState.status = "failed";
            this.watcher.recordFailure(`Step verification failed for ${result.stepId}.`);
            throw new Error(`Step verification failed for ${result.stepId}.`);
          }
        } else {
          this.watcher.recordFailure(`Step ${result.stepId} failed with exit code ${result.exitCode}.`);
          await this.stateStore.saveRunState(this.runState);
          throw new Error(`Step ${result.stepId} failed with exit code ${result.exitCode}.`);
        }
      }
      await this.stateStore.saveRunState(this.runState);
    }
  }

  async completeWithVerification() {
    this.runState.phase = "verification";
    await this.stateStore.saveRunState(this.runState);
    const verification = await this.verifier.verifyRun(this.task);
    this.runState.verification = verification;
    this.runState.gateDecisions.verification = evaluateVerificationGate(this.runState, verification);

    const attemptedKinds = new Set(this.runState.watcher.attemptedIterationKinds);
    if (
      this.task.mode === "autonomous_optimization" &&
      (!attemptedKinds.has("improvement") || !attemptedKinds.has("refinement"))
    ) {
      this.runState.status = "failed";
      this.runState.autonomousStopReason = "Autonomous mode exited before both improvement and refinement phases ran.";
    } else if (this.runState.gateDecisions.verification.status === "passed") {
      this.runState.status = "completed";
    } else {
      this.runState.status = "failed";
    }

    this.runState.phase = "done";
    await this.stateStore.logEvent("run.finished", "orchestrator", {
      status: this.runState.status
    });
  }

  getCompletedStepIds(scope) {
    return new Set(
      Object.entries(this.runState.steps)
        .filter(([key, value]) => key.startsWith(`${scope}::`) && value.status === "completed")
        .map(([, value]) => value.id)
    );
  }

  toStepKey(scope, stepId) {
    return `${scope}::${stepId}`;
  }
}
