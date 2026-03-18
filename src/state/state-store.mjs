import path from "node:path";
import { promises as fs } from "node:fs";
import {
  appendJsonLine,
  appendTextFile,
  cloneData,
  createRunId,
  ensureDir,
  fileExists,
  nowIso,
  readJsonFile,
  writeJsonFile,
  writeTextFile
} from "../shared/utils.mjs";

export class StateStore {
  constructor({ projectRoot, config, runId = null }) {
    this.projectRoot = projectRoot;
    this.config = config;
    this.runId = runId;
    this.stateRoot = path.resolve(projectRoot, config.stateRoot);
    this.memoryDir = path.join(this.stateRoot, "memory");
    this.projectMemoryFile = path.join(this.memoryDir, "project-memory.json");
    this.crossProjectLearningsFile = path.join(this.memoryDir, "cross-project-learnings.json");
    this.setRunId(runId);
  }

  setRunId(runId = null) {
    this.runId = runId;
    this.runDir = runId ? path.join(this.stateRoot, "runs", runId) : null;
    this.runStateFile = this.runDir ? path.join(this.runDir, "run-state.json") : null;
    this.taskSnapshotFile = this.runDir ? path.join(this.runDir, "task-snapshot.json") : null;
    this.eventsFile = this.runDir ? path.join(this.runDir, "events.jsonl") : null;
    this.evidenceFile = this.runDir ? path.join(this.runDir, "evidence.jsonl") : null;
    this.workingSummaryFile = this.runDir ? path.join(this.runDir, "working-summary.md") : null;
  }

  async initializeProjectState() {
    await ensureDir(this.memoryDir);

    if (!(await fileExists(this.projectMemoryFile))) {
      await writeJsonFile(this.projectMemoryFile, {
        projectName: "codex-multi-agent-framework",
        autonomousOptimizationEnabled: false,
        principles: [
          "Default to single-agent execution until complexity justifies orchestration.",
          "Do not claim success without fresh verification evidence.",
          "Parallel work is allowed only for independent problem domains."
        ],
        updatedAt: nowIso()
      });
    }

    if (!(await fileExists(this.crossProjectLearningsFile))) {
      await writeJsonFile(this.crossProjectLearningsFile, {
        sourceRoot: this.config.crossProjectLearningsRoot,
        policy: "Store sanitized references only. Do not copy raw external logs into auto-reloaded state files.",
        references: [],
        updatedAt: nowIso()
      });
    }
  }

  async createRun(task) {
    const runId = this.runId ?? createRunId(task.taskId);
    this.setRunId(runId);
    await ensureDir(this.runDir);

    const initialState = {
      frameworkVersion: this.config.version,
      runId,
      taskId: task.taskId,
      title: task.title,
      mode: task.mode,
      kind: task.kind,
      status: "pending",
      phase: "initializing",
      startedAt: nowIso(),
      updatedAt: nowIso(),
      currentNode: null,
      currentScope: null,
      currentIteration: null,
      lastExecutionAt: null,
      verification: null,
      gateDecisions: {
        design: null,
        planning: null,
        debugging: null,
        verification: null
      },
      watcher: {
        failureCount: 0,
        consecutiveFailureCount: 0,
        noImprovementCount: 0,
        baselineMetric: null,
        bestMetric: null,
        acceptedIterations: [],
        revertedIterations: [],
        attemptedIterationKinds: []
      },
      iterations: {},
      steps: {},
      output: {
        runDir: this.runDir,
        stateRoot: this.stateRoot
      }
    };

    await writeJsonFile(this.taskSnapshotFile, cloneData(task));
    await writeJsonFile(this.runStateFile, initialState);
    await writeTextFile(
      this.workingSummaryFile,
      `# Working Summary\n\n## Task\n- ID: ${task.taskId}\n- Title: ${task.title}\n- Mode: ${task.mode}\n- Kind: ${task.kind}\n\n## Acceptance\n${(task.context?.acceptance ?? []).map((item) => `- ${item}`).join("\n")}\n`
    );
    return initialState;
  }

  async loadRunState() {
    return readJsonFile(this.runStateFile);
  }

  async saveRunState(runState) {
    runState.updatedAt = nowIso();
    await writeJsonFile(this.runStateFile, runState);
  }

  async loadTaskSnapshot() {
    return readJsonFile(this.taskSnapshotFile);
  }

  async logEvent(type, actor, payload = {}) {
    if (!this.eventsFile) {
      return;
    }
    await appendJsonLine(this.eventsFile, {
      at: nowIso(),
      type,
      actor,
      payload
    });
  }

  async logEvidence(kind, payload = {}) {
    if (!this.evidenceFile) {
      return;
    }
    await appendJsonLine(this.evidenceFile, {
      at: nowIso(),
      kind,
      payload
    });
  }

  async appendWorkingSummary(sectionTitle, content) {
    await appendTextFile(this.workingSummaryFile, `\n## ${sectionTitle}\n${content}\n`);
  }

  async snapshotFiles(relativePaths) {
    const snapshot = [];

    for (const relativePath of relativePaths) {
      const absolutePath = path.resolve(this.projectRoot, relativePath);
      if (await fileExists(absolutePath)) {
        const buffer = await fs.readFile(absolutePath);
        snapshot.push({
          relativePath,
          exists: true,
          contentBase64: buffer.toString("base64")
        });
      } else {
        snapshot.push({
          relativePath,
          exists: false,
          contentBase64: null
        });
      }
    }

    return snapshot;
  }

  async restoreSnapshot(snapshot) {
    for (const entry of snapshot) {
      const absolutePath = path.resolve(this.projectRoot, entry.relativePath);
      if (!entry.exists) {
        await fs.rm(absolutePath, { force: true });
        continue;
      }
      await ensureDir(path.dirname(absolutePath));
      const buffer = Buffer.from(entry.contentBase64, "base64");
      await fs.writeFile(absolutePath, buffer);
    }
  }
}
