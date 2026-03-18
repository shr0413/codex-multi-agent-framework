import { normalizeFileList } from "../shared/utils.mjs";

export function buildExecutionBatches(steps, options = {}) {
  const alreadyCompleted = options.alreadyCompleted ?? new Set();
  const remaining = new Map(
    steps
      .filter((step) => !alreadyCompleted.has(step.id))
      .map((step) => [step.id, step])
  );
  const completed = new Set(alreadyCompleted);
  const batches = [];

  while (remaining.size > 0) {
    const ready = [...remaining.values()]
      .filter((step) => (step.dependsOn ?? []).every((dependency) => completed.has(dependency)))
      .sort((left, right) => left.id.localeCompare(right.id));

    if (ready.length === 0) {
      throw new Error("Unable to route plan: unresolved dependency or cycle detected.");
    }

    const batch = [];
    const touchedFiles = new Set();

    for (const step of ready) {
      const stepTouches = collectStepFiles(step);
      const hasConflict = stepTouches.some((entry) => touchedFiles.has(entry));
      const serialStep = step.allowParallel === false;
      const serialBatch = batch.some((entry) => entry.allowParallel === false);

      if (batch.length > 0 && (serialStep || serialBatch || hasConflict)) {
        continue;
      }

      batch.push(step);
      stepTouches.forEach((entry) => touchedFiles.add(entry));
    }

    if (batch.length === 0) {
      batch.push(ready[0]);
    }

    batches.push(batch);
    batch.forEach((step) => {
      remaining.delete(step.id);
      completed.add(step.id);
    });
  }

  return batches;
}

export function collectStepFiles(step) {
  return normalizeFileList([
    ...(step.files ?? []),
    step.payload?.path
  ]);
}
