# MetaOS V2 Backend Architecture Freeze

## Status

MetaOS V2 backend architecture is frozen after Step 12M.

The product QC gate protects:

1. Backend Calculation Test
2. Backend Engine Regression Test
3. Backend Data Contract Audit
4. Backend Data Adapter Audit
5. Backend Output Shape Audit
6. Backend Fixture Regression Test
7. Settings Guardrail Audit
8. Readability Audit
9. TypeScript
10. Production Build

Legacy full-project ESLint remains informational because it contains pre-existing legacy frontend lint debt.

---

## Core Principle

AI interprets and explains.  
Code calculates.

No dashboard, AI layer, or UI component should own core Meta calculations.

---

## Data Flow

```txt
metaStore.performanceRows
  → MetaOSV2App
  → normalizeMetaV2Rows
  → MetaV2CleanRow[]
  → calculateMetaV2Totals
  → decisionRules
  → engines
  → dashboards

---

## STEP 12M — Block 2 of 3  
Adds the freeze audit to `package.json`, QC, and baseline.

```bash
cd ~/meta-ai-growth-os && \
cp scripts/metaos-qc.mjs ".metaos-backups/pony-step-12m-qc-before.mjs" && \
cp scripts/metaos-baseline.mjs ".metaos-backups/pony-step-12m-baseline-before.mjs" && \
cp package.json ".metaos-backups/pony-step-12m-package-before.json" && \
node <<'EOF'
const fs = require("fs");

const file = "package.json";
const pkg = JSON.parse(fs.readFileSync(file, "utf8"));

pkg.scripts = {
  ...pkg.scripts,
  "metaos:architecture-freeze": "node scripts/metaos-architecture-freeze.mjs"
};

fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + "\n");

---

## Architecture Freeze Required References

This section exists to make the architecture freeze audit explicit and stable.

Core backend ownership files:

```txt
lib/meta-v2/calculationCore.ts
lib/meta-v2/columnMap.ts
lib/meta-v2/normalize.ts
lib/meta-v2/metrics.ts
lib/meta-v2/engineUtils.ts
lib/meta-v2/decisionRules.ts
lib/meta-v2/formatters.ts
cd ~/meta-ai-growth-os && \
mkdir -p .metaos-backups/docs && \
STAMP="$(date +%Y%m%d-%H%M%S)" && \
cp docs/METAOS_V2_BACKEND_ARCHITECTURE.md ".metaos-backups/docs/METAOS_V2_BACKEND_ARCHITECTURE-$STAMP.before-12m1.md" && \
cat >> docs/METAOS_V2_BACKEND_ARCHITECTURE.md <<'EOF'

---

## Architecture Freeze Required References

This section exists to make the architecture freeze audit explicit and stable.

Core backend ownership files:

- lib/meta-v2/calculationCore.ts
- lib/meta-v2/columnMap.ts
- lib/meta-v2/normalize.ts
- lib/meta-v2/metrics.ts
- lib/meta-v2/engineUtils.ts
- lib/meta-v2/decisionRules.ts
- lib/meta-v2/formatters.ts

Engine files:

- lib/meta-v2/engines/commandCenterEngine.ts
- lib/meta-v2/engines/funnelEngine.ts
- lib/meta-v2/engines/zeroPurchaseEngine.ts
- lib/meta-v2/engines/dataQcEngine.ts

Frozen data path:

metaStore.performanceRows
  -> normalizeMetaV2Rows
  -> MetaV2CleanRow[]
  -> calculateMetaV2Totals
  -> decisionRules
  -> engines
  -> dashboards

Mandatory QC commands:

- npm run metaos:qc
- npm run metaos:baseline

Principle:

AI interprets and explains.
Code calculates.

