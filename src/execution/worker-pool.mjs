import { runShellCommand } from "../shared/command-runner.mjs";
import {
  appendTextFile,
  nowIso,
  resolveWithinRoot,
  writeTextFile
} from "../shared/utils.mjs";
import { collectStepFiles } from "./router.mjs";

export class WorkerPool {
  constructor({ projectRoot, stateStore }) {
    this.projectRoot = projectRoot;
    this.stateStore = stateStore;
  }

  async executeBatch(batch, scope) {
    return Promise.all(batch.map((step) => this.executeStep(step, scope)));
  }

  async executeStep(step, scope) {
    const startedAt = nowIso();
    await this.stateStore.logEvent("worker.step.started", "worker", {
      scope,
      stepId: step.id,
      type: step.type
    });

    let result;
    switch (step.type) {
      case "note":
        result = await this.executeNote(step, scope);
        break;
      case "write_file":
        result = await this.executeWrite(step, false);
        break;
      case "append_file":
        result = await this.executeWrite(step, true);
        break;
      case "shell":
        result = await this.executeShell(step);
        break;
      default:
        result = {
          success: false,
          exitCode: -1,
          stdout: "",
          stderr: `Unsupported step type: ${step.type}`
        };
    }

    const finishedAt = nowIso();
    await this.stateStore.logEvent("worker.step.finished", "worker", {
      scope,
      stepId: step.id,
      success: result.success,
      exitCode: result.exitCode
    });

    return {
      stepId: step.id,
      scope,
      success: result.success,
      exitCode: result.exitCode,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      touchedFiles: collectStepFiles(step),
      startedAt,
      finishedAt
    };
  }

  async executeNote(step, scope) {
    const content = step.payload?.content ?? step.summary ?? step.title;
    await this.stateStore.appendWorkingSummary(
      `${scope}: ${step.title}`,
      `${content}\n`
    );
    return {
      success: true,
      exitCode: 0,
      stdout: content,
      stderr: ""
    };
  }

  async executeWrite(step, append) {
    const absolutePath = resolveWithinRoot(this.projectRoot, step.payload.path);
    if (append) {
      await appendTextFile(absolutePath, step.payload.content);
    } else {
      await writeTextFile(absolutePath, step.payload.content);
    }
    return {
      success: true,
      exitCode: 0,
      stdout: absolutePath,
      stderr: ""
    };
  }

  async executeShell(step) {
    const cwd = resolveWithinRoot(this.projectRoot, step.payload.cwd ?? ".");
    const command = step.payload.command;
    const timeoutMs = step.payload.timeoutMs ?? 30_000;
    return runShellCommand(command, { cwd, timeoutMs });
  }
}
