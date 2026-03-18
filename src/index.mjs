import path from "node:path";
import { fileExists, readJsonFile } from "./shared/utils.mjs";
import { loadTaskFile } from "./shared/schema.mjs";
import { Orchestrator } from "./execution/orchestrator.mjs";
import { StateStore } from "./state/state-store.mjs";

const DEFAULT_CONFIG = {
  version: 1,
  stateRoot: ".codex-framework",
  crossProjectLearningsRoot: "E:\\codex\\.learnings",
  maxFailuresBeforeEscalation: 3,
  verificationRequiresFreshEvidence: true,
  autonomousOptimization: {
    enabledByDefault: false,
    defaultMaxNoImprovementIterations: 8,
    defaultMaxConsecutiveFailures: 3
  }
};

export async function loadFrameworkConfig(projectRoot) {
  const configFile = path.join(projectRoot, "framework.config.json");
  if (await fileExists(configFile)) {
    return readJsonFile(configFile);
  }
  return DEFAULT_CONFIG;
}

export async function runTask({ projectRoot, taskPath }) {
  const config = await loadFrameworkConfig(projectRoot);
  const task = await loadTaskFile(taskPath);
  const orchestrator = new Orchestrator({ projectRoot, config, task });
  return orchestrator.run();
}

export async function resumeRun({ projectRoot, runId }) {
  const config = await loadFrameworkConfig(projectRoot);
  const stateStore = new StateStore({ projectRoot, config, runId });
  const task = await stateStore.loadTaskSnapshot();
  const orchestrator = new Orchestrator({ projectRoot, config, task, runId });
  return orchestrator.run();
}

export async function showRun({ projectRoot, runId }) {
  const config = await loadFrameworkConfig(projectRoot);
  const stateStore = new StateStore({ projectRoot, config, runId });
  return stateStore.loadRunState();
}
