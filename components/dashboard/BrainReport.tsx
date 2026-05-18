"use client";

import { useMemo } from "react";
import { useMetaStore } from "@/store/metaStore";
import { runMetaBrain } from "@/lib/brain/metaBrain";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function BrainReport() {
  const { performanceRows, settings } = useMetaStore();

  const brain = useMemo(() => {
    if (!performanceRows.length) return null;
    return runMetaBrain(performanceRows, settings);
  }, [performanceRows, settings]);

  if (!brain) {
    return (
      <Card className="rounded-3xl border-none shadow-sm">
        <CardContent className="p-8">
          <h2 className="text-xl font-semibold">World-Class AI Brain</h2>
          <p className="mt-2 text-muted-foreground">
            Upload Meta data first to activate the AI brain.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      <Card className="rounded-3xl border-none shadow-sm">
        <CardHeader>
          <CardTitle>World-Class AI Brain</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-muted-foreground">Health Score</p>
              <p className="mt-1 text-3xl font-semibold">{brain.healthScore}/100</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-muted-foreground">Scale Readiness</p>
              <p className="mt-1 text-3xl font-semibold">{brain.scaleReadiness}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-muted-foreground">Mode</p>
              <p className="mt-1 text-lg font-semibold">
                Incremental Efficiency Scale
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-black p-5 text-white">
            <p className="text-sm text-white/60">Account Verdict</p>
            <p className="mt-2 text-lg font-medium">{brain.accountVerdict}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <InsightBox title="Biggest Risk" text={brain.biggestRisk} />
            <InsightBox title="Biggest Opportunity" text={brain.biggestOpportunity} />
          </div>
        </CardContent>
      </Card>

      <Section title="Immediate Actions" items={brain.immediateActions} />
      <Section title="Budget Intelligence" items={brain.budgetInsights} />
      <Section title="Creative Intelligence" items={brain.creativeInsights} />
      <Section title="Funnel Intelligence" items={brain.funnelInsights} />
      <Section title="Testing Roadmap" items={brain.testingRoadmap} />

      <PlanSection title="7-Day Plan" items={brain.sevenDayPlan} />
      <PlanSection title="14-Day Plan" items={brain.fourteenDayPlan} />
      <PlanSection title="30-Day Roadmap" items={brain.thirtyDayPlan} />

      <Card className="rounded-3xl border-none shadow-sm">
        <CardHeader>
          <CardTitle>90-Day Growth Plan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {brain.ninetyDayPlan.map((phase) => (
            <div key={phase.phase} className="rounded-2xl bg-slate-50 p-4">
              <h3 className="font-semibold">{phase.phase}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{phase.goal}</p>
              <ul className="mt-3 list-disc pl-5 text-sm text-muted-foreground">
                {phase.actions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function InsightBox({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-2 font-medium">{text}</p>
    </div>
  );
}

function Section({
  title,
  items,
}: {
  title: string;
  items: {
    title: string;
    severity: string;
    type: string;
    insight: string;
    action: string;
    expectedImpact: string;
  }[];
}) {
  return (
    <Card className="rounded-3xl border-none shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {items.map((item) => (
          <div key={item.title} className="rounded-2xl bg-slate-50 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">{item.title}</h3>
              <Badge variant="secondary">{item.type}</Badge>
              <Badge variant="outline">{item.severity}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{item.insight}</p>
            <p className="mt-2 text-sm">
              <span className="font-medium">Action:</span> {item.action}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-medium text-slate-950">Expected impact:</span>{" "}
              {item.expectedImpact}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function PlanSection({ title, items }: { title: string; items: string[] }) {
  return (
    <Card className="rounded-3xl border-none shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="list-disc pl-5 text-sm text-muted-foreground">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
