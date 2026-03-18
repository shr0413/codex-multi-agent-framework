import { existsSync, readFileSync } from "node:fs";

const filePath = process.argv[2];
if (!filePath || !existsSync(filePath)) {
  console.log("METRIC=0");
  process.exit(0);
}

const raw = readFileSync(filePath, "utf8").trim();
const numeric = Number(raw || "0");
if (Number.isNaN(numeric)) {
  console.log("METRIC=0");
  process.exit(0);
}

console.log(`METRIC=${numeric}`);
