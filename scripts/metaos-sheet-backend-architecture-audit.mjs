import fs from "node:fs";

const requiredFiles = [
  "lib/meta-sheet/schema.ts",
  "lib/meta-sheet/config.ts",
  "lib/meta-sheet/auth.ts",
  "lib/meta-sheet/repository.ts",
  "lib/meta-sheet/service.ts",
  "app/api/meta-sheet/route.ts",
];

const failures = [];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    failures.push(
      `Missing architecture file: ${file}`
    );
  }
}

const route =
  fs.readFileSync(
    "app/api/meta-sheet/route.ts",
    "utf8"
  );

const repository =
  fs.readFileSync(
    "lib/meta-sheet/repository.ts",
    "utf8"
  );

const service =
  fs.readFileSync(
    "lib/meta-sheet/service.ts",
    "utf8"
  );

for (const token of [
  "getMetaSheetHealth",
  "getMetaSheetData",
  'mode === "health"',
  'mode !== "data"',
  "maxDuration",
]) {
  if (!route.includes(token)) {
    failures.push(
      `Route contract missing: ${token}`
    );
  }
}

for (const token of [
  "probeMetaSheet",
  "readMetaSheetRows",
  "chunkSize",
  "batchConcurrency",
  "A:A",
  "1:1",
]) {
  if (!repository.includes(token)) {
    failures.push(
      `Repository contract missing: ${token}`
    );
  }
}

for (const token of [
  "__metaosSheetState",
  "inFlight",
  "expiresAt",
  "getMetaSheetHealth",
  "getMetaSheetData",
]) {
  if (!service.includes(token)) {
    failures.push(
      `Service contract missing: ${token}`
    );
  }
}

if (
  fs.existsSync(
    "lib/meta/server/googleSheetDataSource.ts"
  )
) {
  failures.push(
    "Obsolete Google Sheet source still exists."
  );
}

if (
  route.includes("googleapis")
) {
  failures.push(
    "Route contains Google API implementation logic."
  );
}

if (
  route.includes("A:ZZ")
) {
  failures.push(
    "Route still owns an unbounded A:ZZ range."
  );
}

if (failures.length) {
  for (const failure of failures) {
    console.error(
      `❌ ${failure}`
    );
  }

  process.exit(1);
}

console.log("");
console.log(
  "MetaOS Sheet Backend Architecture Audit"
);
console.log(
  "======================================="
);
console.log(
  "✅ Dedicated configuration owner"
);
console.log(
  "✅ Dedicated authentication owner"
);
console.log(
  "✅ Dedicated repository owner"
);
console.log(
  "✅ Dedicated service and cache owner"
);
console.log(
  "✅ Route is transport-only"
);
console.log(
  "✅ Health and data modes are separated"
);
console.log(
  "✅ Chunked bounded Sheet retrieval"
);
console.log(
  "✅ Obsolete backend owner removed"
);
console.log(
  "✅ Backend architecture: PASS"
);
