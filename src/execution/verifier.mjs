import { fileExists, normalizeFileList, nowIso, readTextFile, resolveWithinRoot } from "../shared/utils.mjs";
import { runShellCommand } from "../shared/command-runner.mjs";

export class Verifier {
  constructor({ projectRoot, stateStore }) {
    this.projectRoot = projectRoot;
    this.stateStore = stateStore;
  }

  async verifyStep(step, scope) {
    if (!step.verification) {
      return {
        passed: true,
        verifiedAt: nowIso(),
        checks: []
      };
    }
    return this.runVerification(step.verification, `${scope}:${step.id}`);
  }

  async verifyRun(task) {
    return this.runVerification(task.verification, "run");
  }

  async evaluateMetric(metricSpec, label = "metric") {
    if (metricSpec.type === "file_numeric") {
      const absolutePath = resolveWithinRoot(this.projectRoot, metricSpec.path);
      let metric = Number(metricSpec.missingValue ?? 0);
      if (await fileExists(absolutePath)) {
        const raw = (await readTextFile(absolutePath)).trim();
        metric = Number(raw || (metricSpec.missingValue ?? 0));
      }
      if (Number.isNaN(metric)) {
        throw new Error(`Built-in file_numeric metric could not parse ${metricSpec.path}.`);
      }
      await this.stateStore.logEvidence("metric", {
        label,
        metric,
        source: "file_numeric",
        path: metricSpec.path
      });
      return {
        metric,
        evaluatedAt: nowIso(),
        stdout: String(metric),
        stderr: ""
      };
    }

    const cwd = resolveWithinRoot(this.projectRoot, metricSpec.cwd ?? ".");
    const result = await runShellCommand(metricSpec.command, {
      cwd,
      timeoutMs: metricSpec.timeoutMs ?? 30_000
    });

    if (!result.success) {
      throw new Error(`Metric evaluation failed for ${label}: ${result.stderr || result.stdout}`);
    }

    const metric = parseMetric(result.stdout);
    await this.stateStore.logEvidence("metric", {
      label,
      metric,
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim()
    });

    return {
      metric,
      evaluatedAt: nowIso(),
      stdout: result.stdout,
      stderr: result.stderr
    };
  }

  async runVerification(spec, target) {
    const checks = [];

    for (const relativePath of normalizeFileList(spec.expectedFiles ?? [])) {
      const absolutePath = resolveWithinRoot(this.projectRoot, relativePath);
      const passed = await fileExists(absolutePath);
      checks.push({
        type: "expected_file",
        target: relativePath,
        passed
      });
    }

    for (const expectation of spec.expectedText ?? []) {
      const absolutePath = resolveWithinRoot(this.projectRoot, expectation.path);
      const includes = Array.isArray(expectation.includes) ? expectation.includes : [expectation.includes];
      let missing = [...includes];
      if (await fileExists(absolutePath)) {
        const text = await readTextFile(absolutePath);
        missing = includes.filter((fragment) => !text.includes(fragment));
      }
      checks.push({
        type: "expected_text",
        target: expectation.path,
        includes,
        passed: missing.length === 0,
        missing
      });
    }

    for (const commandSpec of spec.commands ?? []) {
      const cwd = resolveWithinRoot(this.projectRoot, commandSpec.cwd ?? ".");
      const result = await runShellCommand(commandSpec.command, {
        cwd,
        timeoutMs: commandSpec.timeoutMs ?? 30_000
      });
      checks.push({
        type: "command",
        command: commandSpec.command,
        passed: result.success,
        exitCode: result.exitCode,
        stdout: result.stdout.trim(),
        stderr: result.stderr.trim()
      });
    }

    const passed = checks.every((check) => check.passed !== false);
    const verification = {
      target,
      passed,
      verifiedAt: nowIso(),
      checks
    };

    await this.stateStore.logEvidence("verification", verification);
    return verification;
  }
}

function parseMetric(rawOutput) {
  const trimmed = rawOutput.trim();
  if (!trimmed) {
    throw new Error("Metric output is empty.");
  }

  const match = trimmed.match(/METRIC\s*=\s*(-?\d+(?:\.\d+)?)/i);
  if (match) {
    return Number(match[1]);
  }

  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed.metric === "number") {
      return parsed.metric;
    }
  } catch {
    // Ignore non-JSON output.
  }

  throw new Error(`Unable to parse metric from output: ${trimmed}`);
}
