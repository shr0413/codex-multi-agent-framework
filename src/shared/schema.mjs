import path from "node:path";
import { readJsonFile } from "./utils.mjs";

export const FRAMEWORK_VERSION = 1;
export const RUN_MODES = new Set(["normal", "autonomous_optimization"]);
export const TASK_KINDS = new Set(["feature", "bug", "regression", "research"]);
export const STEP_TYPES = new Set(["note", "write_file", "append_file", "shell"]);

export async function loadTaskFile(taskFilePath) {
  const task = await readJsonFile(taskFilePath);
  task.__taskFilePath = path.resolve(taskFilePath);
  validateTask(task);
  return task;
}

export function validateTask(task) {
  const errors = [];

  if (!task || typeof task !== "object") {
    throw new Error("Task file must contain a JSON object.");
  }

  if (task.schemaVersion !== FRAMEWORK_VERSION) {
    errors.push(`schemaVersion must be ${FRAMEWORK_VERSION}.`);
  }

  if (!task.taskId) {
    errors.push("taskId is required.");
  }

  if (!task.title) {
    errors.push("title is required.");
  }

  if (!RUN_MODES.has(task.mode)) {
    errors.push(`mode must be one of: ${[...RUN_MODES].join(", ")}.`);
  }

  if (!TASK_KINDS.has(task.kind)) {
    errors.push(`kind must be one of: ${[...TASK_KINDS].join(", ")}.`);
  }

  validateStepArray(task.plan, "plan", errors);

  if (task.mode === "normal" && (!Array.isArray(task.plan) || task.plan.length === 0)) {
    errors.push("normal mode requires a non-empty plan array.");
  }

  if (!task.verification || typeof task.verification !== "object") {
    errors.push("verification is required.");
  }

  if (task.mode === "autonomous_optimization") {
    const config = task.autonomousOptimization;
    if (!config || typeof config !== "object") {
      errors.push("autonomousOptimization is required for autonomous_optimization mode.");
    } else {
      if (!config.metric) {
        errors.push("autonomousOptimization.metric is required.");
      }
      if (!isValidMetricSpec(config.evaluate)) {
        errors.push("autonomousOptimization.evaluate must define either command or a supported built-in metric spec.");
      }
      if (!Array.isArray(config.mutableFiles) || config.mutableFiles.length === 0) {
        errors.push("autonomousOptimization.mutableFiles must be a non-empty array.");
      }
      if (!Array.isArray(config.iterations) || config.iterations.length === 0) {
        errors.push("autonomousOptimization.iterations must be a non-empty array.");
      } else {
        validateIterationArray(config.iterations, errors);
        const iterationKinds = new Set(config.iterations.map((entry) => entry.type));
        if (!iterationKinds.has("improvement")) {
          errors.push("autonomousOptimization.iterations must include at least one improvement phase.");
        }
        if (!iterationKinds.has("refinement")) {
          errors.push("autonomousOptimization.iterations must include at least one refinement phase.");
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Task validation failed:\n- ${errors.join("\n- ")}`);
  }
}

function isValidMetricSpec(metricSpec) {
  if (!metricSpec || typeof metricSpec !== "object") {
    return false;
  }
  if (metricSpec.command) {
    return true;
  }
  if (metricSpec.type === "file_numeric" && metricSpec.path) {
    return true;
  }
  return false;
}

function validateStepArray(steps, label, errors) {
  if (!steps) {
    return;
  }
  if (!Array.isArray(steps)) {
    errors.push(`${label} must be an array.`);
    return;
  }

  const seen = new Set();
  for (const step of steps) {
    if (!step.id) {
      errors.push(`${label} contains a step without id.`);
      continue;
    }
    if (seen.has(step.id)) {
      errors.push(`${label} contains duplicate step id "${step.id}".`);
    }
    seen.add(step.id);

    if (!STEP_TYPES.has(step.type)) {
      errors.push(`${label}.${step.id} has unsupported type "${step.type}".`);
    }

    if (!step.title) {
      errors.push(`${label}.${step.id} is missing title.`);
    }

    if ((step.type === "write_file" || step.type === "append_file") && !step.payload?.path) {
      errors.push(`${label}.${step.id} requires payload.path.`);
    }

    if ((step.type === "write_file" || step.type === "append_file") && typeof step.payload?.content !== "string") {
      errors.push(`${label}.${step.id} requires payload.content.`);
    }

    if (step.type === "shell" && !step.payload?.command) {
      errors.push(`${label}.${step.id} requires payload.command.`);
    }
  }
}

function validateIterationArray(iterations, errors) {
  const seen = new Set();
  for (const iteration of iterations) {
    if (!iteration.id) {
      errors.push("autonomousOptimization.iterations contains an iteration without id.");
      continue;
    }
    if (seen.has(iteration.id)) {
      errors.push(`autonomousOptimization.iterations contains duplicate id "${iteration.id}".`);
    }
    seen.add(iteration.id);

    if (!["improvement", "refinement"].includes(iteration.type)) {
      errors.push(`autonomousOptimization.iterations.${iteration.id} must have type improvement or refinement.`);
    }

    validateStepArray(iteration.plan, `autonomousOptimization.iterations.${iteration.id}.plan`, errors);
    if (!Array.isArray(iteration.plan) || iteration.plan.length === 0) {
      errors.push(`autonomousOptimization.iterations.${iteration.id}.plan must be a non-empty array.`);
    }
  }
}

export function requiresDesignGate(task) {
  const complexity = task.complexity ?? {};
  if (task.kind === "bug" || task.kind === "regression") {
    return false;
  }
  return complexity.uncertainty === "high" || (complexity.fileCount ?? 0) >= 3 || (complexity.stageCount ?? 0) >= 2;
}

export function requiresDebuggingGate(task) {
  return task.kind === "bug" || task.kind === "regression";
}
