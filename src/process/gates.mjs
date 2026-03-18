import { nowIso } from "../shared/utils.mjs";
import { requiresDebuggingGate, requiresDesignGate } from "../shared/schema.mjs";

function decision(gate, status, reason, details = {}) {
  return {
    gate,
    status,
    reason,
    details,
    decidedAt: nowIso()
  };
}

export function evaluateInitialGates(task, runState) {
  return {
    design: evaluateDesignGate(task),
    planning: evaluatePlanningGate(task),
    debugging: evaluateDebuggingGate(task, runState)
  };
}

export function evaluateDesignGate(task) {
  if (!requiresDesignGate(task)) {
    return decision("design", "skipped", "Task complexity does not require a design gate.");
  }
  if (task.context?.designSummary) {
    return decision("design", "passed", "Design summary present.", {
      designSummary: task.context.designSummary
    });
  }
  return decision("design", "blocked", "High-uncertainty or multi-stage task requires context.designSummary.");
}

export function evaluatePlanningGate(task) {
  if (task.mode === "normal" && Array.isArray(task.plan) && task.plan.length > 0) {
    return decision("planning", "passed", "Normal-mode plan is defined.", {
      planLength: task.plan.length
    });
  }

  if (task.mode === "autonomous_optimization") {
    const config = task.autonomousOptimization;
    const hasEvaluate =
      Boolean(config?.evaluate?.command) ||
      (config?.evaluate?.type === "file_numeric" && Boolean(config?.evaluate?.path));
    if (config?.metric && hasEvaluate && Array.isArray(config.iterations) && config.iterations.length > 0) {
      return decision("planning", "passed", "Autonomous optimization plan is defined.", {
        iterationCount: config.iterations.length,
        metric: config.metric
      });
    }
  }

  return decision("planning", "blocked", "Planning gate requires a runnable plan and verification contract.");
}

export function evaluateDebuggingGate(task, runState) {
  if (!requiresDebuggingGate(task)) {
    return decision("debugging", "skipped", "Task is not a bug or regression.");
  }

  if ((runState?.watcher?.failureCount ?? 0) >= 3) {
    return decision("debugging", "blocked", "Failure threshold reached. Escalate to architectural review.");
  }

  if (task.context?.rootCause) {
    return decision("debugging", "passed", "Root cause recorded.", {
      rootCause: task.context.rootCause
    });
  }

  return decision("debugging", "blocked", "Bug and regression tasks require context.rootCause before fixes can run.");
}

export function evaluateVerificationGate(runState, verificationResult) {
  if (!verificationResult?.passed) {
    return decision("verification", "blocked", "Verification checks failed.", {
      verificationResult
    });
  }

  if (!runState.lastExecutionAt) {
    return decision("verification", "blocked", "No execution timestamp recorded for this run.");
  }

  if (new Date(verificationResult.verifiedAt).getTime() < new Date(runState.lastExecutionAt).getTime()) {
    return decision("verification", "blocked", "Verification evidence is stale relative to the latest execution.");
  }

  return decision("verification", "passed", "Fresh verification evidence is present.", {
    verifiedAt: verificationResult.verifiedAt
  });
}
