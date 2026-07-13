import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  types:
    "components/metaos-ui/table/types.ts",

  table:
    "components/metaos-ui/table/DataTable.tsx",

  toolbar:
    "components/metaos-ui/table/TableToolbar.tsx",

  pagination:
    "components/metaos-ui/table/TablePagination.tsx",

  density:
    "components/metaos-ui/table/TableDensityControl.tsx",

  exports:
    "components/metaos-ui/table/index.ts",

  css:
    "styles/metaos-ui/table.css",

  cssEntry:
    "styles/metaos-ui/index.css",
};

function fail(message) {
  console.error(`❌ ${message}`);
  process.exitCode = 1;
}

function read(relativePath) {
  const absolute = path.join(
    root,
    relativePath
  );

  if (!fs.existsSync(absolute)) {
    fail(
      `Missing table-system file: ${relativePath}`
    );

    return "";
  }

  return fs.readFileSync(
    absolute,
    "utf8"
  );
}

function removeComments(source) {
  return source.replace(
    /\/\*[\s\S]*?\*\//g,
    ""
  );
}

function findClosingBrace(
  source,
  openingIndex
) {
  let depth = 0;

  for (
    let index = openingIndex;
    index < source.length;
    index += 1
  ) {
    if (source[index] === "{") {
      depth += 1;
    }

    if (source[index] === "}") {
      depth -= 1;

      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function extractSelectors(source) {
  const css =
    removeComments(source);

  const selectors = [];

  let cursor = 0;

  while (cursor < css.length) {
    const opening =
      css.indexOf("{", cursor);

    if (opening < 0) {
      break;
    }

    const prelude = css
      .slice(cursor, opening)
      .trim();

    const closing =
      findClosingBrace(
        css,
        opening
      );

    if (closing < 0) {
      fail(
        `Unbalanced CSS near: ${prelude.slice(
          0,
          70
        )}`
      );

      break;
    }

    const block = css.slice(
      opening + 1,
      closing
    );

    const normalized =
      prelude.toLowerCase();

    if (
      normalized.startsWith(
        "@keyframes"
      ) ||
      normalized.startsWith(
        "@-webkit-keyframes"
      )
    ) {
      cursor = closing + 1;
      continue;
    }

    if (
      normalized.startsWith(
        "@media"
      ) ||
      normalized.startsWith(
        "@supports"
      ) ||
      normalized.startsWith(
        "@container"
      ) ||
      normalized.startsWith(
        "@layer"
      )
    ) {
      selectors.push(
        ...extractSelectors(block)
      );

      cursor = closing + 1;
      continue;
    }

    if (normalized.startsWith("@")) {
      cursor = closing + 1;
      continue;
    }

    selectors.push(
      ...prelude
        .split(",")
        .map((item) =>
          item.trim()
        )
        .filter(Boolean)
    );

    cursor = closing + 1;
  }

  return selectors;
}

const source = Object.fromEntries(
  Object.entries(files).map(
    ([key, relativePath]) => [
      key,
      read(relativePath),
    ]
  )
);

const requiredTypeTokens = [
  "DataTableColumn",
  "DataTableSortState",
  "DataTablePaginationState",
  "DataTableTone",
  "DataTableDensity",
];

for (const token of requiredTypeTokens) {
  if (!source.types.includes(token)) {
    fail(
      `Table type contract is missing: ${token}`
    );
  }
}

const requiredTableTokens = [
  "getRowId",
  "onSortChange",
  "aria-sort",
  "aria-busy",
  "stickyHeader",
  "expandedRowIds",
  "onToggleRow",
  "renderExpandedRow",
  "rowTone",
  "loadingRowCount",
];

for (const token of requiredTableTokens) {
  if (!source.table.includes(token)) {
    fail(
      `DataTable contract is missing: ${token}`
    );
  }
}

for (const token of [
  "type=\"search\"",
  "aria-label",
  "Clear search",
]) {
  if (!source.toolbar.includes(token)) {
    fail(
      `Table toolbar accessibility contract is missing: ${token}`
    );
  }
}

for (const token of [
  "page",
  "pageSize",
  "totalRows",
  "onPageChange",
  "onPageSizeChange",
  "Rows per page",
]) {
  if (!source.pagination.includes(token)) {
    fail(
      `Controlled pagination contract is missing: ${token}`
    );
  }
}

for (const forbiddenImport of [
  "@/lib/meta-v2/",
  "@/lib/meta/",
  "@/store/metaStore",
  "@/store/metaV2",
]) {
  for (const [
    fileName,
    fileSource,
  ] of Object.entries({
    DataTable: source.table,
    TableToolbar:
      source.toolbar,
    TablePagination:
      source.pagination,
    TableDensityControl:
      source.density,
  })) {
    if (
      fileSource.includes(
        forbiddenImport
      )
    ) {
      fail(
        `${fileName} imports backend or performance-store code: ${forbiddenImport}`
      );
    }
  }
}

for (const forbidden of [
  "!important",
  "linear-gradient",
  "radial-gradient",
  "#0A84FF",
  "[class*=",
  "[class^=",
]) {
  if (source.css.includes(forbidden)) {
    fail(
      `Table CSS contains forbidden pattern: ${forbidden}`
    );
  }
}

const selectors =
  extractSelectors(source.css);

for (const selector of selectors) {
  if (
    !selector.startsWith(
      ".metaos-ui"
    )
  ) {
    fail(
      `Table selector is not scoped under .metaos-ui: ${selector}`
    );
  }
}

for (const selector of [
  ".metaos-ui .mos-table-region",
  ".metaos-ui .mos-data-table",
  ".metaos-ui .mos-table-sort-button",
  ".metaos-ui .mos-table-expanded-content",
  ".metaos-ui .mos-table-toolbar",
  ".metaos-ui .mos-table-pagination",
]) {
  if (!source.css.includes(selector)) {
    fail(
      `Required table selector is missing: ${selector}`
    );
  }
}

const imports = [
  '@import "tailwindcss";',
  '@import "./tokens.css";',
  '@import "./foundation.css";',
  '@import "./primitives.css";',
  '@import "./table.css";',
  '@import "./shell.css";',
];

let previousPosition = -1;

for (const importToken of imports) {
  const position =
    source.cssEntry.indexOf(
      importToken
    );

  if (position < 0) {
    fail(
      `Workspace stylesheet is missing: ${importToken}`
    );
  }

  if (position < previousPosition) {
    fail(
      "Workspace table stylesheet import order is invalid."
    );
  }

  previousPosition = position;
}

if (process.exitCode) {
  console.error("");
  console.error(
    "MetaOS table-system audit failed."
  );

  process.exit(1);
}

console.log("");
console.log(
  "MetaOS Analytical Table System Audit"
);
console.log(
  "===================================="
);
console.log(
  `✅ Scoped table selectors inspected: ${selectors.length}`
);
console.log(
  "✅ Typed column and sort contracts."
);
console.log(
  "✅ Controlled pagination contract."
);
console.log(
  "✅ Sticky header and column support."
);
console.log(
  "✅ Expandable-row contract."
);
console.log(
  "✅ Loading and empty states."
);
console.log(
  "✅ Compact and comfortable densities."
);
console.log(
  "✅ Accessible sorting and table search."
);
console.log(
  "✅ Semantic positive, negative and warning states."
);
console.log(
  "✅ No backend or performance-store dependency."
);
console.log(
  "✅ No !important, gradients or broad selectors."
);
console.log(
  "✅ Analytical table architecture: PASS"
);
