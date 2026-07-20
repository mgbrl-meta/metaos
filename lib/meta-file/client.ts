import ExcelJS from "exceljs";
import Papa from "papaparse";

export type MetaFileRow = Record<string, unknown>;

export type ParsedMetaFile = {
  fileName: string;
  sheetName: string;
  headers: string[];
  rows: MetaFileRow[];
};

const HEADER_SIGNALS = [
  "day",
  "date",
  "campaign name",
  "campaign_name",
  "campaign id",
  "campaign_id",
  "ad set name",
  "ad_set_name",
  "ad name",
  "ad_name",
  "amount spent",
  "amount_spent",
  "purchases",
];

function cleanHeader(value: unknown, index: number): string {
  const text = String(value ?? "").replace(/^\uFEFF/, "").trim();
  return text || `Column ${index + 1}`;
}

function scoreHeaderRow(values: unknown[]): number {
  const normalized = values.map((value) => String(value ?? "").trim().toLowerCase());
  return HEADER_SIGNALS.reduce(
    (score, signal) => score + (normalized.some((value) => value.includes(signal)) ? 1 : 0),
    0
  );
}

function matrixToRows(matrix: unknown[][]): { headers: string[]; rows: MetaFileRow[] } {
  const nonEmpty = matrix.filter((row) =>
    row.some((cell) => String(cell ?? "").trim() !== "")
  );

  if (!nonEmpty.length) {
    return { headers: [], rows: [] };
  }

  const candidates = nonEmpty.slice(0, 12);
  let headerIndex = 0;
  let bestScore = -1;

  candidates.forEach((row, index) => {
    const score = scoreHeaderRow(row);
    if (score > bestScore) {
      bestScore = score;
      headerIndex = index;
    }
  });

  const headers = nonEmpty[headerIndex].map(cleanHeader);
  const seen = new Map<string, number>();
  const uniqueHeaders = headers.map((header) => {
    const count = seen.get(header) ?? 0;
    seen.set(header, count + 1);
    return count === 0 ? header : `${header} (${count + 1})`;
  });

  const rows = nonEmpty
    .slice(headerIndex + 1)
    .map((values) => {
      const row: MetaFileRow = {};
      uniqueHeaders.forEach((header, index) => {
        row[header] = values[index] ?? "";
      });
      return row;
    })
    .filter((row) =>
      Object.values(row).some((value) => String(value ?? "").trim() !== "")
    );

  return { headers: uniqueHeaders, rows };
}

async function parseCsv(file: File): Promise<ParsedMetaFile> {
  const text = await file.text();
  const result = Papa.parse<unknown[]>(text, {
    skipEmptyLines: "greedy",
  });

  if (result.errors.length && !result.data.length) {
    throw new Error(result.errors[0]?.message || "Unable to parse the CSV file.");
  }

  const parsed = matrixToRows(result.data as unknown[][]);
  return {
    fileName: file.name,
    sheetName: "CSV",
    ...parsed,
  };
}

async function parseWorkbook(file: File): Promise<ParsedMetaFile> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());

  const candidates = workbook.worksheets.map((worksheet) => {
    const matrix: unknown[][] = [];
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      const values = Array.isArray(row.values) ? row.values.slice(1) : [];
      matrix.push(values);
    });

    const parsed = matrixToRows(matrix);
    return {
      sheetName: worksheet.name,
      ...parsed,
    };
  });

  const selected = candidates.sort((a, b) => b.rows.length - a.rows.length)[0];

  if (!selected || !selected.rows.length) {
    throw new Error("No usable data rows were found in the workbook.");
  }

  return {
    fileName: file.name,
    ...selected,
  };
}

export async function parseMetaFile(file: File): Promise<ParsedMetaFile> {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "csv") {
    return parseCsv(file);
  }

  if (extension === "xlsx") {
    return parseWorkbook(file);
  }

  if (extension === "xls") {
    throw new Error("Old .xls files are not supported. Save the file as .xlsx and upload again.");
  }

  throw new Error("Unsupported file type. Upload a .xlsx or .csv file.");
}
