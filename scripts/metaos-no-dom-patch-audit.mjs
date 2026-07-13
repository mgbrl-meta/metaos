import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const strict = process.argv.includes("--strict");

const scanRoots = [
  "app",
  "components",
  "lib",
  "store"
];

const allowedExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx"
]);

const rules = [
  {
    code: "DOM_MUTATION_OBSERVER",
    pattern: /\bMutationObserver\b/g,
    message:
      "UI navigation or layout must not be coordinated through MutationObserver."
  },
  {
    code: "DOM_QUERY_SELECTOR",
    pattern: /\bquerySelector(?:All)?\s*</g,
    message:
      "Typed React state and registries must replace DOM-scanned application controls."
  },
  {
    code: "PROGRAMMATIC_BUTTON_CLICK",
    pattern:
      /\b(?:button|element|item)\.click\s*\(/g,
    message:
      "One UI layer must not activate another through programmatic DOM clicks."
  },
  {
    code: "ORIGINAL_TAB_MARKER",
    pattern:
      /metaosOriginalTab|metaos-original-tab/gi,
    message:
      "Legacy hidden-tab marker detected."
  }
];

function walk(directory, files = []) {
  if (!fs.existsSync(directory)) {
    return files;
  }

  for (const entry of fs.readdirSync(directory, {
    withFileTypes: true
  })) {
    const absolute = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      walk(absolute, files);
      continue;
    }

    if (allowedExtensions.has(path.extname(entry.name))) {
      files.push(absolute);
    }
  }

  return files;
}

function lineNumber(source, index) {
  return source.slice(0, index).split("\n").length;
}

const findings = [];

for (const scanRoot of scanRoots) {
  for (const file of walk(path.join(root, scanRoot))) {
    const relative = path.relative(root, file);
    const source = fs.readFileSync(file, "utf8");

    for (const rule of rules) {
      rule.pattern.lastIndex = 0;

      let match;

      while (
        (match = rule.pattern.exec(source)) !== null
      ) {
        findings.push({
          code: rule.code,
          file: relative,
          line: lineNumber(source, match.index),
          message: rule.message
        });
      }
    }
  }
}

console.log("");
console.log("MetaOS DOM Patch Audit");
console.log("======================");

if (!findings.length) {
  console.log(
    "✅ No DOM-driven frontend patch architecture detected."
  );
  process.exit(0);
}

for (const finding of findings) {
  console.log(
    `- ${finding.code}: ${finding.file}:${finding.line}`
  );
  console.log(`  ${finding.message}`);
}

console.log("");
console.log(
  `Detected ${findings.length} patch-architecture finding(s).`
);

if (strict) {
  console.error("❌ Strict DOM patch audit: FAIL");
  process.exit(1);
}

console.log(
  "⚠️ Baseline/report-only mode: PASS with known debt."
);
console.log(
  "Strict enforcement will become blocking after the new application shell replaces the old patch layer."
);
