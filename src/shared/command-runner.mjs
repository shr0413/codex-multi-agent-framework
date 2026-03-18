import { spawn } from "node:child_process";

export function runShellCommand(command, options = {}) {
  const {
    cwd,
    env = {},
    timeoutMs = 30_000
  } = options;

  return new Promise((resolve) => {
    const child = spawn(command, {
      cwd,
      env: { ...process.env, ...env },
      shell: true,
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";
    let timeoutHit = false;
    const timer = setTimeout(() => {
      timeoutHit = true;
      child.kill();
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({
        success: false,
        exitCode: -1,
        stdout,
        stderr: `${stderr}${stderr ? "\n" : ""}${error.message}`,
        timeoutHit
      });
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        success: !timeoutHit && code === 0,
        exitCode: timeoutHit ? 124 : (code ?? -1),
        stdout,
        stderr,
        timeoutHit
      });
    });
  });
}
