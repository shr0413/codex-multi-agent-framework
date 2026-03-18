import crypto from "node:crypto";
import path from "node:path";
import { promises as fs } from "node:fs";

export function nowIso() {
  return new Date().toISOString();
}

export function createRunId(taskId) {
  const slug = String(taskId ?? "run")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "run";
  const stamp = nowIso().replace(/[:.]/g, "-");
  const suffix = crypto.randomBytes(3).toString("hex");
  return `${slug}-${stamp}-${suffix}`;
}

export function resolveWithinRoot(projectRoot, target = ".") {
  return path.isAbsolute(target) ? target : path.resolve(projectRoot, target);
}

export async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

export async function writeJsonFile(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function writeTextFile(filePath, content) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, "utf8");
}

export async function appendTextFile(filePath, content) {
  await ensureDir(path.dirname(filePath));
  await fs.appendFile(filePath, content, "utf8");
}

export async function readTextFile(filePath) {
  return fs.readFile(filePath, "utf8");
}

export async function readTextFileIfExists(filePath) {
  if (!(await fileExists(filePath))) {
    return "";
  }
  return fs.readFile(filePath, "utf8");
}

export async function appendJsonLine(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fs.appendFile(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

export function normalizeFileList(files = []) {
  return [...new Set(files.filter(Boolean).map((entry) => String(entry).replace(/\\/g, "/")))];
}

export function cloneData(value) {
  return value == null ? value : structuredClone(value);
}

export function stringifyError(error) {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }
  return String(error);
}
