import type {
  sheets_v4,
} from "googleapis";

import type {
  MetaSheetConfig,
} from "./config";

import type {
  MetaSheetRow,
} from "./schema";

export interface MetaSheetProbe {
  sheetTab: string;
  rowCount: number;
  columnCount: number;
  headers: string[];
  headerCount: number;
  dataRowCount: number;
  dataRange: string;
}

export interface MetaSheetRepositoryResult {
  probe: MetaSheetProbe;
  rows: MetaSheetRow[];
  chunkCount: number;
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  let timer:
    ReturnType<typeof setTimeout>
    | undefined;

  const timeoutPromise =
    new Promise<T>(
      (_, reject) => {
        timer =
          setTimeout(() => {
            reject(
              new Error(
                `${label} timed out after ${timeoutMs}ms`
              )
            );
          }, timeoutMs);
      }
    );

  return Promise.race([
    promise,
    timeoutPromise,
  ]).finally(() => {
    if (timer) {
      clearTimeout(timer);
    }
  });
}

function quoteSheetTab(
  sheetTab: string
) {
  return `'${sheetTab.replace(
    /'/g,
    "''"
  )}'`;
}

function columnNumberToLetters(
  columnNumber: number
) {
  let value =
    Math.max(
      1,
      Math.floor(columnNumber)
    );

  let output = "";

  while (value > 0) {
    const remainder =
      (value - 1) % 26;

    output =
      String.fromCharCode(
        65 + remainder
      ) + output;

    value =
      Math.floor(
        (value - 1) / 26
      );
  }

  return output;
}

function normalizeHeaders(
  values: unknown[]
) {
  const used =
    new Map<string, number>();

  return values.map(
    (value, index) => {
      const base =
        String(
          value ?? ""
        ).trim() ||
        `Column ${index + 1}`;

      const count =
        used.get(base) || 0;

      used.set(
        base,
        count + 1
      );

      return count === 0
        ? base
        : `${base} (${count + 1})`;
    }
  );
}

function createRanges(
  sheetTab: string,
  lastColumn: string,
  lastRow: number,
  chunkSize: number
) {
  const ranges:
    string[] = [];

  const quotedTab =
    quoteSheetTab(sheetTab);

  for (
    let startRow = 2;
    startRow <= lastRow;
    startRow += chunkSize
  ) {
    const endRow =
      Math.min(
        lastRow,
        startRow +
          chunkSize -
          1
      );

    ranges.push(
      `${quotedTab}!A${startRow}:${lastColumn}${endRow}`
    );
  }

  return ranges;
}

async function runWithConcurrency<T>(
  tasks: Array<
    () => Promise<T>
  >,
  concurrency: number
) {
  const results:
    T[] = new Array(
      tasks.length
    );

  let nextIndex = 0;

  async function worker() {
    while (true) {
      const currentIndex =
        nextIndex;

      nextIndex += 1;

      if (
        currentIndex >=
        tasks.length
      ) {
        return;
      }

      results[currentIndex] =
        await tasks[
          currentIndex
        ]();
    }
  }

  await Promise.all(
    Array.from(
      {
        length:
          Math.min(
            concurrency,
            tasks.length
          ),
      },

      () => worker()
    )
  );

  return results;
}

export async function probeMetaSheet(
  sheets:
    sheets_v4.Sheets,

  config:
    MetaSheetConfig
): Promise<MetaSheetProbe> {
  const quotedTab =
    quoteSheetTab(
      config.sheetTab
    );

  const spreadsheetResponse =
    await withTimeout(
      sheets
        .spreadsheets
        .get({
          spreadsheetId:
            config
              .spreadsheetId,

          fields:
            "sheets.properties(title,gridProperties(rowCount,columnCount))",
        }),

      config
        .requestTimeoutMs,

      "Google Sheet metadata fetch"
    );

  const sheet =
    spreadsheetResponse
      .data
      .sheets
      ?.find(
        (candidate) =>
          candidate
            .properties
            ?.title ===
          config.sheetTab
      );

  if (!sheet) {
    throw new Error(
      `Sheet tab "${config.sheetTab}" was not found.`
    );
  }

  const [
    headerResponse,
    firstColumnResponse,
  ] =
    await Promise.all([
      withTimeout(
        sheets
          .spreadsheets
          .values
          .get({
            spreadsheetId:
              config
                .spreadsheetId,

            range:
              `${quotedTab}!1:1`,

            majorDimension:
              "ROWS",

            valueRenderOption:
              "UNFORMATTED_VALUE",
          }),

        config
          .requestTimeoutMs,

        "Google Sheet header fetch"
      ),

      withTimeout(
        sheets
          .spreadsheets
          .values
          .get({
            spreadsheetId:
              config
                .spreadsheetId,

            range:
              `${quotedTab}!A:A`,

            majorDimension:
              "COLUMNS",

            valueRenderOption:
              "UNFORMATTED_VALUE",
          }),

        config
          .requestTimeoutMs,

        "Google Sheet row-count probe"
      ),
    ]);

  const rawHeaders =
    headerResponse
      .data
      .values
      ?.[0] || [];

  const headers =
    normalizeHeaders(
      rawHeaders
    );

  if (!headers.length) {
    throw new Error(
      `Sheet tab "${config.sheetTab}" has no header row.`
    );
  }

  const firstColumn =
    firstColumnResponse
      .data
      .values
      ?.[0] || [];

  const lastRow =
    Math.max(
      1,
      firstColumn.length
    );

  const lastColumn =
    columnNumberToLetters(
      headers.length
    );

  const dataRange =
    `${quotedTab}!A1:${lastColumn}${lastRow}`;

  return {
    sheetTab:
      config.sheetTab,

    rowCount:
      Number(
        sheet
          .properties
          ?.gridProperties
          ?.rowCount ||
        lastRow
      ),

    columnCount:
      Number(
        sheet
          .properties
          ?.gridProperties
          ?.columnCount ||
        headers.length
      ),

    headers,

    headerCount:
      headers.length,

    dataRowCount:
      Math.max(
        0,
        lastRow - 1
      ),

    dataRange,
  };
}

export async function readMetaSheetRows(
  sheets:
    sheets_v4.Sheets,

  config:
    MetaSheetConfig,

  existingProbe?:
    MetaSheetProbe
): Promise<MetaSheetRepositoryResult> {
  const probe =
    existingProbe ||
    await probeMetaSheet(
      sheets,
      config
    );

  if (
    probe.dataRowCount === 0
  ) {
    return {
      probe,
      rows: [],
      chunkCount: 0,
    };
  }

  const lastColumn =
    columnNumberToLetters(
      probe.headers.length
    );

  const lastRow =
    probe.dataRowCount + 1;

  const ranges =
    createRanges(
      config.sheetTab,
      lastColumn,
      lastRow,
      config.chunkSize
    );

  const tasks =
    ranges.map(
      (range) =>
        async () => {
          const response =
            await withTimeout(
              sheets
                .spreadsheets
                .values
                .get({
                  spreadsheetId:
                    config
                      .spreadsheetId,

                  range,

                  majorDimension:
                    "ROWS",

                  valueRenderOption:
                    "UNFORMATTED_VALUE",

                  dateTimeRenderOption:
                    "FORMATTED_STRING",
                }),

              config
                .requestTimeoutMs,

              `Google Sheet chunk ${range}`
            );

          return (
            response
              .data
              .values || []
          );
        }
    );

  const chunks =
    await runWithConcurrency(
      tasks,
      config.batchConcurrency
    );

  const rows:
    MetaSheetRow[] = [];

  for (const chunk of chunks) {
    for (const values of chunk) {
      const hasData =
        values.some(
          (value) =>
            String(
              value ?? ""
            ).trim() !== ""
        );

      if (!hasData) {
        continue;
      }

      const row:
        MetaSheetRow = {};

      for (
        let index = 0;
        index <
        probe.headers.length;
        index += 1
      ) {
        row[
          probe.headers[index]
        ] =
          values[index] ?? "";
      }

      rows.push(row);
    }
  }

  return {
    probe,
    rows,
    chunkCount:
      ranges.length,
  };
}
