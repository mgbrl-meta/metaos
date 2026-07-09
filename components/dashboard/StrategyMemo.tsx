"use client";

import { useMemo } from "react";
import { useMetaStore } from "@/store/metaStore";
import { generateStrategyMemo } from "@/lib/report/reportGenerator";
import { GlassCard, MetaButton, MutedText, Surface, TonePill } from "@/components/cards/MetaCards";

export function StrategyMemo() {
  const { performanceRows, settings } = useMetaStore();

  const memo = useMemo(() => {
    if (!performanceRows.length) return null;
    return generateStrategyMemo(performanceRows, settings);
  }, [performanceRows, settings]);

  const reportText = useMemo(() => {
    if (!memo) return "";
    return [
      memo.title,
      memo.subtitle,
      "",
      ...memo.sections.flatMap((section) => [
        section.title,
        ...section.body.map((line) => `- ${line}`),
        "",
      ]),
    ].join("\n");
  }, [memo]);

  const copyReport = async () => {
    if (!reportText) return;
    await navigator.clipboard.writeText(reportText);
    alert("Strategy memo copied.");
  };

  const exportPdf = () => {
    if (!memo) return;
    const html = `
      <html>
        <head>
          <title>${memo.title}</title>
          <style>
            body { font-family: Helvetica, Arial, sans-serif; padding: 40px; color: #111; line-height: 1.6; }
            h1 { font-size: 34px; margin-bottom: 4px; }
            h2 { font-size: 20px; margin-top: 32px; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
            li { margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <h1>${memo.title}</h1>
          <p>${memo.subtitle}</p>
          ${memo.sections.map((s) => `<h2>${s.title}</h2><ul>${s.body.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>`).join("")}
        </body>
      </html>
    `;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  if (!memo) {
    return (
      <GlassCard className="p-8">
        <h2 className="text-2xl font-black">Strategy Report</h2>
        <MutedText className="mt-2">Upload Meta data first to generate a board-ready report.</MutedText>
      </GlassCard>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#0A84FF]">Report Output</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">{memo.title}</h1>
          <MutedText className="mt-2">{memo.subtitle}</MutedText>
        </div>
        <div className="flex flex-wrap gap-2">
          <MetaButton variant="secondary" onClick={copyReport}>Copy Report</MetaButton>
          <MetaButton variant="primary" onClick={exportPdf}>Export PDF</MetaButton>
        </div>
      </div>

      <GlassCard className="p-5">
        <div className="flex flex-wrap gap-2">
          <TonePill tone="green">Green = Scale / Healthy</TonePill>
          <TonePill tone="yellow">Yellow = Watch / Improve</TonePill>
          <TonePill tone="red">Red = Cut / Risk</TonePill>
        </div>
      </GlassCard>

      {memo.sections.map((section, idx) => (
        <GlassCard key={section.title} className="p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#0A84FF] text-sm font-black text-black">
              {idx + 1}
            </span>
            <h2 className="text-xl font-black">{section.title}</h2>
          </div>
          <div className="grid gap-3">
            {section.body.map((line, index) => (
              <Surface key={`${section.title}-${index}`} className="p-4 text-sm leading-6">
                <span className="opacity-70">{line}</span>
              </Surface>
            ))}
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

function escapeHtml(text: string) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
