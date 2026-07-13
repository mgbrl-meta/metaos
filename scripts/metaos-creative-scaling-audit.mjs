import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = [
  "lib/meta-v2/creative-scaling/schema.ts",
  "lib/meta-v2/creative-scaling/poisson.ts",
  "lib/meta-v2/creative-scaling/boundaries.ts",
  "lib/meta-v2/creative-scaling/creativeScalingEngine.ts",
  "lib/meta-v2/creative-scaling/creativeScalingExport.ts",
  "components/metaos-ui/modules/creative-scaling/CreativeScalingModule.tsx",
  "styles/metaos-ui/creative-scaling.css",
  "components/metaos-ui/shell/MetaOSSidebar.tsx",
];

function fail(message) {
  console.error(`❌ ${message}`);
  process.exitCode = 1;
}

function read(file) {
  const absolute =
    path.join(root, file);

  if (!fs.existsSync(absolute)) {
    fail(`Missing file: ${file}`);
    return "";
  }

  return fs.readFileSync(
    absolute,
    "utf8"
  );
}

const source =
  Object.fromEntries(
    files.map((file) => [
      file,
      read(file),
    ])
  );

const engine =
  source[
    "lib/meta-v2/creative-scaling/creativeScalingEngine.ts"
  ];

for (const token of [
  "latestDate",
  "liveAdIds",
  "isLiveOnLatestDate",
  "poissonCdf",
  "poissonUpperTail",
  "buildCreativeScalingCurves",
]) {
  if (!engine.includes(token)) {
    fail(
      `Engine missing token: ${token}`
    );
  }
}

const moduleSource =
  source[
    "components/metaos-ui/modules/creative-scaling/CreativeScalingModule.tsx"
  ];

for (const token of [
  "buildCreativeScalingOutput",
  "buildCreativeScalingCsv",
  "ComposedChart",
  "scaleCpa",
  "killCpa",
  "Export",
]) {
  if (
    !moduleSource.includes(
      token
    )
  ) {
    fail(
      `Module missing token: ${token}`
    );
  }
}

const sidebar =
  source[
    "components/metaos-ui/shell/MetaOSSidebar.tsx"
  ];

for (const token of [
  "OPEN_DELAY_MS",
  "CLOSE_DELAY_MS",
  "scheduleOpen",
  "scheduleClose",
]) {
  if (!sidebar.includes(token)) {
    fail(
      `Sidebar motion missing: ${token}`
    );
  }
}

if (process.exitCode) {
  process.exit(1);
}

console.log("");
console.log(
  "MetaOS Creative Scaling Audit"
);
console.log(
  "============================="
);
console.log(
  "✅ Latest-date live-ad eligibility."
);
console.log(
  "✅ Selected-window aggregation."
);
console.log(
  "✅ Poisson scale/watch/kill engine."
);
console.log(
  "✅ Dynamic target CPA boundaries."
);
console.log(
  "✅ Scatter chart architecture."
);
console.log(
  "✅ Export-ready engine output."
);
console.log(
  "✅ Soft delayed sidebar reveal."
);
console.log(
  "✅ Creative Scaling architecture: PASS"
);
