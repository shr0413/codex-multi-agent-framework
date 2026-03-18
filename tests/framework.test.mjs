import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import { runTask, resumeRun } from "../src/index.mjs";

async function createTempProject() {
  return fs.mkdtemp(path.join(os.tmpdir(), "codex-framework-"));
}

test("blocks a complex feature task without a design summary", async () => {
  const projectRoot = await createTempProject();
  const taskPath = path.join(projectRoot, "task.json");

  await fs.writeFile(
    taskPath,
    JSON.stringify(
      {
        schemaVersion: 1,
        taskId: "missing-design",
        title: "Missing design summary",
        mode: "normal",
        kind: "feature",
        complexity: {
          uncertainty: "high",
          fileCount: 4,
          stageCount: 2
        },
        context: {
          acceptance: ["Should not run"]
        },
        plan: [
          {
            id: "write",
            title: "Write something",
            type: "write_file",
            payload: {
              path: "artifact.txt",
              content: "hello"
            }
          }
        ],
        verification: {
          expectedFiles: ["artifact.txt"]
        }
      },
      null,
      2
    )
  );

  const runState = await runTask({ projectRoot, taskPath });
  assert.equal(runState.status, "blocked");
  assert.equal(runState.gateDecisions.design.status, "blocked");
});

test("completes a normal-mode run and persists evidence", async () => {
  const projectRoot = await createTempProject();
  const taskPath = path.join(projectRoot, "task.json");
  const artifactPath = path.join(projectRoot, "artifacts", "report.txt");

  await fs.writeFile(
    taskPath,
    JSON.stringify(
      {
        schemaVersion: 1,
        taskId: "normal-complete",
        title: "Normal run",
        mode: "normal",
        kind: "feature",
        complexity: {
          uncertainty: "low",
          fileCount: 1,
          stageCount: 1
        },
        context: {
          acceptance: ["Write the report"]
        },
        plan: [
          {
            id: "write",
            title: "Write report",
            type: "write_file",
            files: ["artifacts/report.txt"],
            payload: {
              path: "artifacts/report.txt",
              content: "hello\n"
            }
          },
          {
            id: "append",
            title: "Append proof",
            type: "append_file",
            dependsOn: ["write"],
            files: ["artifacts/report.txt"],
            payload: {
              path: "artifacts/report.txt",
              content: "verified\n"
            }
          }
        ],
        verification: {
          expectedFiles: ["artifacts/report.txt"],
          expectedText: [
            {
              path: "artifacts/report.txt",
              includes: ["hello", "verified"]
            }
          ]
        }
      },
      null,
      2
    )
  );

  const runState = await runTask({ projectRoot, taskPath });
  assert.equal(runState.status, "completed");
  assert.equal(runState.gateDecisions.verification.status, "passed");
  assert.match(await fs.readFile(artifactPath, "utf8"), /verified/);
  assert.ok(runState.output.runDir);

  const resumed = await resumeRun({ projectRoot, runId: runState.runId });
  assert.equal(resumed.status, "completed");
});

test("autonomous mode keeps improvements and rolls back weaker refinements", async () => {
  const projectRoot = await createTempProject();
  const taskPath = path.join(projectRoot, "task.json");
  const scorePath = path.join(projectRoot, "score.txt");

  await fs.writeFile(
    taskPath,
    JSON.stringify(
      {
        schemaVersion: 1,
        taskId: "autonomous-run",
        title: "Autonomous run",
        mode: "autonomous_optimization",
        kind: "feature",
        complexity: {
          uncertainty: "medium",
          fileCount: 1,
          stageCount: 3
        },
        context: {
          designSummary: "Autonomous optimization still needs an upfront design summary when the task is multi-stage.",
          acceptance: ["Keep the best score"]
        },
        verification: {
          expectedFiles: ["score.txt"],
          expectedText: [
            {
              path: "score.txt",
              includes: ["5"]
            }
          ]
        },
        autonomousOptimization: {
          metric: "score",
          mutableFiles: ["score.txt"],
          evaluate: {
            type: "file_numeric",
            path: "score.txt",
            missingValue: 1
          },
          iterations: [
            {
              id: "improve",
              title: "Improve the score",
              type: "improvement",
              plan: [
                {
                  id: "write-five",
                  title: "Write better score",
                  type: "write_file",
                  files: ["score.txt"],
                  payload: {
                    path: "score.txt",
                    content: "5"
                  }
                }
              ]
            },
            {
              id: "refine",
              title: "Attempt weaker refinement",
              type: "refinement",
              plan: [
                {
                  id: "write-four",
                  title: "Write weaker score",
                  type: "write_file",
                  files: ["score.txt"],
                  payload: {
                    path: "score.txt",
                    content: "4"
                  }
                }
              ]
            }
          ]
        }
      },
      null,
      2
    )
  );

  const runState = await runTask({ projectRoot, taskPath });
  assert.equal(runState.status, "completed");
  assert.equal(runState.watcher.baselineMetric, 1);
  assert.equal(runState.watcher.bestMetric, 5);
  assert.deepEqual(runState.watcher.acceptedIterations, ["improve"]);
  assert.deepEqual(runState.watcher.revertedIterations, ["refine"]);
  assert.equal(await fs.readFile(scorePath, "utf8"), "5");
});
