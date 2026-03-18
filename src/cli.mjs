#!/usr/bin/env node
import path from "node:path";
import { runTask, resumeRun, showRun } from "./index.mjs";

const args = process.argv.slice(2);
const command = args[0];

if (!command || ["run", "resume", "show-run"].includes(command) === false) {
  printUsage();
  process.exit(command ? 1 : 0);
}

const options = parseOptions(args.slice(1));
const projectRoot = path.resolve(options.projectRoot ?? process.cwd());

try {
  let result;
  if (command === "run") {
    if (!options.positional[0]) {
      throw new Error("run requires a task file path.");
    }
    const taskPath = path.resolve(projectRoot, options.positional[0]);
    result = await runTask({ projectRoot, taskPath });
  } else if (command === "resume") {
    if (!options.positional[0]) {
      throw new Error("resume requires a runId.");
    }
    result = await resumeRun({ projectRoot, runId: options.positional[0] });
  } else {
    if (!options.positional[0]) {
      throw new Error("show-run requires a runId.");
    }
    result = await showRun({ projectRoot, runId: options.positional[0] });
  }

  console.log(JSON.stringify(summarize(result), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

function parseOptions(values) {
  const positional = [];
  const parsed = {
    positional,
    projectRoot: null
  };

  for (let index = 0; index < values.length; index += 1) {
    const current = values[index];
    if (current === "--project-root") {
      parsed.projectRoot = values[index + 1];
      index += 1;
      continue;
    }
    positional.push(current);
  }

  return parsed;
}

function summarize(runState) {
  return {
    runId: runState.runId,
    taskId: runState.taskId,
    title: runState.title,
    mode: runState.mode,
    status: runState.status,
    phase: runState.phase,
    currentNode: runState.currentNode,
    currentIteration: runState.currentIteration,
    output: runState.output,
    gateDecisions: runState.gateDecisions,
    watcher: runState.watcher,
    verification: runState.verification,
    error: runState.error
  };
}

function printUsage() {
  console.log(`Codex Multi-Agent Framework CLI

Usage:
  node src/cli.mjs run <task-file> [--project-root <path>]
  node src/cli.mjs resume <run-id> [--project-root <path>]
  node src/cli.mjs show-run <run-id> [--project-root <path>]`);
}
