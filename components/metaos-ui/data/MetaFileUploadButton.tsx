"use client";

import { FileUp, LoaderCircle } from "lucide-react";
import { useRef, useState } from "react";

import { parseMetaFile } from "@/lib/meta-file/client";
import { enrichRows } from "@/lib/metrics";
import {
  buildMetaDataQualitySummary,
  normalizeMetaRows,
} from "@/lib/metaDataQuality";
import { useMetaStore } from "@/store/metaStore";

function latestDateFromRows(rows: Array<Record<string, unknown>>): string {
  return rows
    .map((row) => String(row.date || row.day || ""))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .at(-1) || "";
}

export function MetaFileUploadButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (file: File) => {
    setUploading(true);
    setError("");

    try {
      const parsed = await parseMetaFile(file);
      const normalized = normalizeMetaRows(parsed.rows);

      if (!normalized.length) {
        throw new Error("The file did not contain usable Meta Ads rows.");
      }

      const settings = useMetaStore.getState().settings;
      const performanceRows = enrichRows(normalized as never[], settings);
      const qcSummary = buildMetaDataQualitySummary(normalized);
      const now = new Date().toISOString();

      useMetaStore.setState({
        rawRows: normalized as never[],
        performanceRows: performanceRows as never[],
        metaQcSummary: qcSummary,
        metaLatestDate: latestDateFromRows(normalized),
        metaFetchedAt: now,
        metaRowCount: normalized.length,
        metaSource: "file",
        metaSourceLabel: parsed.fileName,
      });
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "The file could not be imported."
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.csv"
        className="mos-visually-hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      <button
        type="button"
        className="mos-header-action"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        title={error || "Upload a Meta Ads .xlsx or .csv export"}
      >
        {uploading ? <LoaderCircle className="animate-spin" /> : <FileUp />}
        <span>{uploading ? "Importing" : "Upload Excel"}</span>
      </button>
    </>
  );
}
