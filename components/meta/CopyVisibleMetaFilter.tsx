"use client";

import { useMemo, useState } from "react";

const BAD_LINE_PATTERNS = [
  /^meta os$/i,
  /^daily performance os$/i,
  /^sheet live$/i,
  /^settings$/i,
  /^summary$/i,
  /^de-scale$/i,
  /^scale$/i,
  /^zero purchase$/i,
  /^high cpa$/i,
  /^high roas$/i,
  /^spend$/i,
  /^monthly$/i,
  /^creative ageing$/i,
  /^copy meta filter$/i,
  /^why this is critical$/i,
  /^metric read$/i,
  /^select metrics trend$/i,
  /^life spend$/i,
  /^last 7d spend$/i,
  /^last 7d cpa$/i,
  /^last 7d roas$/i,
  /^l7d spend$/i,
  /^l7d cpa$/i,
  /^l7d roas$/i,
  /^cpm$/i,
  /^ctr$/i,
  /^cpa$/i,
  /^roas$/i,
  /^aov$/i,
  /^purch\.?$/i,
  /^impr\.?$/i,
  /^lpv$/i,
  /^no sale$/i,
  /^₹[\d,]+$/i,
  /^\d+(\.\d+)?x$/i,
  /^\d+(\.\d+)?%$/i,
];

const AD_NAME_HINTS = [
  "collab",
  "creative test",
  "ad-set",
  "ad set",
  "pixel",
  "socialcrew",
  "wishlink",
  "individual",
  "static",
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

function cleanLine(value: string) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[|·,\s]+$/g, "")
    .trim();
}

function removeBadgePrefix(value: string) {
  return cleanLine(value)
    .replace(/^ZERO PURCHASE\s+/i, "")
    .replace(/^HIGH CPA\s+/i, "")
    .replace(/^HIGH ROAS\s+/i, "")
    .replace(/^TOP SPENDER\s+/i, "")
    .replace(/^APPROVAL CHECK\s+/i, "")
    .replace(/^Y SPEND\s+₹?[\d,]+\s*/i, "")
    .trim();
}

function cutMetricLeak(value: string) {
  let text = removeBadgePrefix(value);

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

  return cleanLine(text);
}

function isCampaignPath(line: string) {
  const lower = line.toLowerCase();

  // This prevents copying the second descriptive path line:
  // "Rosemary Oil Shots | Test Campaign · Rosemary Oil Shot - Collab..."
  return (
    lower.includes(" campaign ·") ||
    lower.includes(" test campaign ·") ||
    lower.includes(" ad-concept ·") ||
    lower.includes(" ad concept ·") ||
    lower.includes("main ad set") ||
    lower.includes("campaign ·") ||
    lower.includes("·")
  );
}

function looksLikeAdName(value: string) {
  const text = cutMetricLeak(value);
  const lower = text.toLowerCase();

  if (!text || text.length < 8 || text.length > 180) return false;
  if (BAD_LINE_PATTERNS.some((pattern) => pattern.test(text))) return false;
  if (isCampaignPath(text)) return false;

  // Avoid full table/header text and metric-only text.
  if (lower.includes("why this is critical")) return false;
  if (lower.includes("metric window")) return false;
  if (lower.includes("select metrics")) return false;
  if (lower.includes("operator read")) return false;
  if (lower.includes("source: google sheet")) return false;

  const hasHint = AD_NAME_HINTS.some((hint) => lower.includes(hint));
  const hasNameShape =
    lower.includes(" - ") ||
    lower.includes(" | ") ||
    lower.includes("_") ||
    lower.includes("@");

  return hasHint && hasNameShape;
}

function candidateLinesFromElement(el: Element) {
  const text = (el as HTMLElement).innerText || "";

  return text
    .split(/\n+/)
    .flatMap((line) => line.split(/\t+/))
    .map(cutMetricLeak)
    .filter(Boolean);
}

function extractAdNameFromRow(el: Element) {
  const lines = candidateLinesFromElement(el);

  // Prefer the first clean ad-name looking line in the row.
  // This avoids copying the campaign/adset path below the ad name.
  return lines.find(looksLikeAdName) || "";
}

function toMetaHandleOnly(adName: string) {
  const cleaned = cutMetricLeak(adName);

  // Most Brillare collab ad names start with creator handle/name before " - ".
  const firstPart = cleaned.split(" - ")[0]?.trim() || cleaned;

  return firstPart
    .replace(/[|·,\s]+$/g, "")
    .trim();
}

function dedupeLines(values: string[]) {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const cleaned = cleanLine(value);
    if (!cleaned) continue;

    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    out.push(cleaned);
  }

  return out;
}

function extractVisibleAdNames() {
  const root =
    document.querySelector("main") ||
    document.querySelector(".metaos-app") ||
    document.body;

  const rowSelectors = [
    "tbody tr",
    "[role='row']",
    "section .border-b",
    "div.border-b",
    "article",
  ];

  const candidates: string[] = [];

  for (const selector of rowSelectors) {
    const elements = Array.from(root.querySelectorAll(selector));

    for (const el of elements) {
      const rect = (el as HTMLElement).getBoundingClientRect();

      // Only visible rows/cards.
      if (rect.width < 100 || rect.height < 20) continue;
      if (rect.bottom < 0 || rect.top > window.innerHeight + 600) continue;

      const adName = extractAdNameFromRow(el);
      if (adName) candidates.push(adName);
    }
  }

  // Fallback: scan visible page lines, but still copy only ad-name shaped lines.
  if (!candidates.length) {
    const pageLines = candidateLinesFromElement(root);
    candidates.push(...pageLines.filter(looksLikeAdName));
  }

  const names: string[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const cleaned = cutMetricLeak(candidate);
    const key = cleaned.toLowerCase();

    if (!looksLikeAdName(cleaned)) continue;
    if (seen.has(key)) continue;

    seen.add(key);
    names.push(cleaned);
  }

  return names;
}

export function CopyVisibleMetaFilter() {
  const [copiedCount, setCopiedCount] = useState<number | null>(null);
  const [error, setError] = useState("");

  const label = useMemo(() => {
    if (copiedCount !== null) return `Copied ${copiedCount} ads`;
    if (error) return "No ads found";
    return "Copy Meta OR Filter";
  }, [copiedCount, error]);

  async function handleCopy(mode: "handles" | "full" = "handles") {
    setError("");
    setCopiedCount(null);

    const rawNames = extractVisibleAdNames();
    const names = mode === "handles" ? dedupeLines(rawNames.map(toMetaHandleOnly)) : dedupeLines(rawNames);

    if (!names.length) {
      setError("No visible ad names found on this tab.");
      window.setTimeout(() => setError(""), 2500);
      return;
    }

    // Actual CRLF line breaks. Meta may still display it in one input,
    // but this is the correct clipboard format for one value per line.
    const text = names.join("\r\n");

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
        onClick={() => handleCopy("handles")}
        className="meta-copy-filter-button"
        title="Copies creator handles only, one per line, for Meta Ads Manager: Ad name contains any of"
      >
        {copiedCount !== null ? `Copied ${copiedCount}` : "Copy Handles"}
      </button>

      <button
        type="button"
        onClick={() => handleCopy("full")}
        className="meta-copy-filter-button meta-copy-filter-button-secondary"
        title="Copies full visible ad names, one per line"
      >
        Full Names
      </button>

      {error ? <div className="meta-copy-filter-toast">{error}</div> : null}
    </div>
  );
}
