import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();

const generatedTypeDirectories = [
  ".next/types",
  ".next/dev/types",
];

for (const relativePath of generatedTypeDirectories) {
  const absolutePath = path.join(root, relativePath);

  if (fs.existsSync(absolutePath)) {
    fs.rmSync(absolutePath, {
      recursive: true,
      force: true,
    });

    console.log(`Removed stale generated types: ${relativePath}`);
  }
}

const incrementalFiles = [
  "tsconfig.tsbuildinfo",
  ".next/cache/tsconfig.tsbuildinfo",
];

for (const relativePath of incrementalFiles) {
  const absolutePath = path.join(root, relativePath);

  if (fs.existsSync(absolutePath)) {
    fs.rmSync(absolutePath, {
      force: true,
    });

    console.log(`Removed stale TypeScript cache: ${relativePath}`);
  }
}

console.log("");
console.log("Running clean TypeScript validation...");

const result = spawnSync(
  process.platform === "win32"
    ? "npx.cmd"
    : "npx",
  [
    "tsc",
    "--noEmit",
    "--pretty",
    "false",
  ],
  {
    cwd: root,
    stdio: "inherit",
    shell: false,
  }
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
