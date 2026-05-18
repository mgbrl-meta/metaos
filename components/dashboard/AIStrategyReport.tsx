"use client";

import { useMetaStore } from "@/store/metaStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AIStrategyReport() {
  const { performanceRows } = useMetaStore();

  const scale = performanceRows.filter((r) => r.decision === "Scale").length;
  const kill = performanceRows.filter((r) => r.decision === "Kill").length;
  const reduce = performanceRows.filter((r) => r.decision === "Reduce").length;
  const refresh = performanceRows.filter((r) => r.decision === "Refresh Creative").length;

  if (!performanceRows.length) {
    return (
      <Card className="rounded-3xl border-none shadow-sm">
        <CardContent className="p-8">
          <h2 className="text-xl font-semibold">AI Strategy Report</h2>
          <p className="mt-2 text-muted-foreground">Upload Meta data first.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      <Card className="rounded-3xl border-none shadow-sm">
        <CardHeader>
          <CardTitle>AI Strategy Report</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm text-muted-foreground">
          <p>
            Current account has {scale} scale candidates, {reduce} reduce candidates,
            {kill} kill candidates and {refresh} creative refresh candidates.
          </p>

          <div>
            <h3 className="font-semibold text-slate-950">7-Day Plan</h3>
            <p>Kill clear waste, reduce weak pockets, protect winners and refresh fatigued ads.</p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-950">14-Day Plan</h3>
            <p>Reallocate saved budget into proven winners and validate emerging ads with controlled spend.</p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-950">30-Day Roadmap</h3>
            <p>Build a structured testing pipeline across hooks, offers, formats and landing page angles.</p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-950">90-Day Growth Plan</h3>
            <p>
              Days 1–30: stabilize. Days 31–60: scale winners. Days 61–90:
              build a repeatable creative and budget operating system.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
