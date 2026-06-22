"use client";

import { useMemo, useState } from "react";

const EXCLUDE_PHRASES = [
  "meta os",
  "daily performance os",
  "sheet live",
  "settings",
  "summary",
  "de-scale",
  "scale",
  "zero purchase",
  "high cpa",
  "high roas",
  "spend",
  "monthly",
  "creative ageing",
  "copy meta filter",
  "ad name contains any of",
  "why this is critical",
  "metric read",
  "select metrics trend",
  "life spend",
  "last 7d spend",
  "last 7d cpa",
  "last 7d roas",
  "l7d spend",
  "l7d cpa",
  "l7d roas",
  "cpm",
  "ctr",
  "cpa",
  "roas",
  "aov",
  "purch",
  "impr",
  "lpv",
];

const POSITIVE_PATTERNS = [
  "collab",
  "creative test",
  "ad-set",
  "ad set",
  "pixel",
  "socialcrew",
  "wishlink",
  "static",
  "individual",
  "vernacular",
  "rosemary",
  "scalp",
  "serum",
  "oil shot",
  "june'26",
  "may'26",
  "apr",
  "march",
];

function cleanCandidate(value: string) {
  let text = String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // If table row text leaks metrics after the name, cut before metric labels.
  const cutMarkers = [
    " LIFE SPEND ",
    " Y SPEND ",
    " SPEND ",
    " CPM ",
    " CTR ",
    " CPA ",
    " ROAS ",
    " LAST 7D ",
    " L7D ",
    " TOP SPENDER ",
    " APPROVAL CHECK ",
  ];

  for (const marker of cutMarkers) {
    const idx = text.toUpperCase().indexOf(marker);
    if (idx > 12) text = text.slice(0, idx).trim();
  }

  // Remove common status/badge prefixes if they joined into the same line.
  text = text
    .replace(/^ZERO PURCHASE\s+/i, "")
    .replace(/^HIGH CPA\s+/i, "")
    .replace(/^HIGH ROAS\s+/i, "")
    .replace(/^TOP SPENDER\s+/i, "")
    .replace(/^APPROVAL CHECK\s+/i, "")
    .replace(/^Y SPEND\s+₹?[\d,]+\s*/i, "")
    .trim();

  // Meta filter works better without accidental trailing separators.
  text = text.replace(/[|·,\s]+$/g, "").trim();

  return text;
}

function looksLikeAdName(value: string) {
  const text = cleanCandidate(value);
  const lower = text.toLowerCase();

  if (text.length < 8 || text.length > 220) return false;
  if (!/[a-zA-Z0-9_@]/.test(text)) return false;

  if (EXCLUDE_PHRASES.some((phrase) => lower === phrase || lower.startsWith(`${phrase}:`))) {
    return false;
  }

  if (lower.includes("₹") && !lower.includes("collab")) return false;
  if (/^\d+(\.\d+)?x?$/.test(lower)) return false;
  if (/^\d{4}-\d{2}-\d{2}/.test(lower)) return false;

  const hasPositivePattern = POSITIVE_PATTERNS.some((pattern) => lower.includes(pattern));
  const hasNameShape = lower.includes(" - ") || lower.includes(" | ") || lower.includes("_") || lower.includes("@");

  return hasPositivePattern && hasNameShape;
}

function extractVisibleAdNames() {
  const root =
    document.querySelector("main") ||
    document.querySelector(".metaos-app") ||
    document.body;

  const rawText = (root as HTMLElement).innerText || "";

  const lines = rawText
    .split(/\n+/)
    .flatMap((line) => line.split(/\t+/))
    .map(cleanCandidate)
    .filter(Boolean);

  const names: string[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const candidate = cleanCandidate(line);

    if (!looksLikeAdName(candidate)) continue;

    const key = candidate.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    names.push(candidate);
  }

  return names;
}

export function CopyVisibleMetaFilter() {
  const [copiedCount, setCopiedCount] = useState<number | null>(null);
  const [error, setError] = useState("");

  const label = useMemo(() => {
    if (copiedCount !== null) return `Copied ${copiedCount} ads`;
    if (error) return "No ads found";
    return "Copy Meta Filter";
  }, [copiedCount, error]);

  async function handleCopy() {
    setError("");
    setCopiedCount(null);

    const names = extractVisibleAdNames();

    if (!names.length) {
      setError("No visible ad names found on this tab.");
      window.setTimeout(() => setError(""), 2500);
      return;
    }

    const text = names.join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopiedCount(names.length);
      window.setTimeout(() => setCopiedCount(null), 2500);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);

      setCopiedCount(names.length);
      window.setTimeout(() => setCopiedCount(null), 2500);
    }
  }

  return (
    <div className="meta-copy-filter-fixed">
      <button
        type="button"
        onClick={handleCopy}
        className="meta-copy-filter-button"
        title="Copies visible ad names as newline-separated text for Meta Ads Manager: Ad name contains any of"
      >
        {label}
      </button>

      {error ? <div className="meta-copy-filter-toast">{error}</div> : null}
    </div>
  );
}
