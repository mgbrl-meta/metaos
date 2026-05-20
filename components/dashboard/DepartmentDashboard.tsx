"use client";

import { useMemo, useState } from "react";
import {
  Award,
  Building2,
  Clock,
  Medal,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  GlassCard,
  MetricCard,
  MutedText,
  PageHeader,
  Surface,
  TonePill,
} from "@/components/cards/MetaCards";
import { useThemeStore } from "@/components/theme/ThemeProvider";

type QueryStatus = "open" | "resolved" | "overdue" | "reopened" | "escalated";

type QueryRow = {
  id: string;
  department: string;
  assignee: string;
  status: QueryStatus;
  createdAt: string;
  resolvedAt?: string;
  slaHours: number;
  reopened: boolean;
  escalated: boolean;
  appreciation: number;
  critical: boolean;
};

const demoQueries: QueryRow[] = [
  {
    id: "Q-101",
    department: "Customer Support",
    assignee: "Riya",
    status: "resolved",
    createdAt: "2026-05-10T10:00:00",
    resolvedAt: "2026-05-10T13:30:00",
    slaHours: 8,
    reopened: false,
    escalated: false,
    appreciation: 20,
    critical: false,
  },
  {
    id: "Q-102",
    department: "Operations",
    assignee: "Aman",
    status: "open",
    createdAt: "2026-05-11T09:00:00",
    slaHours: 24,
    reopened: false,
    escalated: true,
    appreciation: 0,
    critical: true,
  },
  {
    id: "Q-103",
    department: "Finance",
    assignee: "Neha",
    status: "resolved",
    createdAt: "2026-05-11T12:00:00",
    resolvedAt: "2026-05-11T15:00:00",
    slaHours: 12,
    reopened: false,
    escalated: false,
    appreciation: 35,
    critical: true,
  },
  {
    id: "Q-104",
    department: "Marketing",
    assignee: "Karan",
    status: "resolved",
    createdAt: "2026-05-12T10:00:00",
    resolvedAt: "2026-05-13T12:00:00",
    slaHours: 24,
    reopened: true,
    escalated: false,
    appreciation: 5,
    critical: false,
  },
  {
    id: "Q-105",
    department: "Operations",
    assignee: "Aman",
    status: "resolved",
    createdAt: "2026-05-13T09:30:00",
    resolvedAt: "2026-05-13T20:00:00",
    slaHours: 24,
    reopened: false,
    escalated: false,
    appreciation: 10,
    critical: false,
  },
  {
    id: "Q-106",
    department: "Customer Support",
    assignee: "Riya",
    status: "resolved",
    createdAt: "2026-05-14T11:00:00",
    resolvedAt: "2026-05-14T12:00:00",
    slaHours: 8,
    reopened: false,
    escalated: false,
    appreciation: 25,
    critical: false,
  },
  {
    id: "Q-107",
    department: "Tech",
    assignee: "Dev",
    status: "open",
    createdAt: "2026-05-14T09:00:00",
    slaHours: 48,
    reopened: false,
    escalated: false,
    appreciation: 0,
    critical: true,
  },
  {
    id: "Q-108",
    department: "Tech",
    assignee: "Dev",
    status: "resolved",
    createdAt: "2026-05-12T09:00:00",
    resolvedAt: "2026-05-13T10:00:00",
    slaHours: 48,
    reopened: false,
    escalated: false,
    appreciation: 30,
    critical: true,
  },
];

const now = new Date("2026-05-16T12:00:00");

const money = (n: number) => Math.round(n || 0).toLocaleString();
const num = (n: number, d = 1) => Number(n || 0).toFixed(d);

function hoursBetween(start: string, end?: string) {
  const a = new Date(start).getTime();
  const b = end ? new Date(end).getTime() : now.getTime();
  return Math.max(0, (b - a) / 36e5);
}

function isResolved(row: QueryRow) {
  return row.status === "resolved" && Boolean(row.resolvedAt);
}

function isOverdue(row: QueryRow) {
  if (isResolved(row)) {
    return hoursBetween(row.createdAt, row.resolvedAt) > row.slaHours;
  }
  return hoursBetween(row.createdAt) > row.slaHours;
}

function scoreClamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function groupBy<T>(rows: T[], keyFn: (row: T) => string) {
  const map = new Map<string, T[]>();
  rows.forEach((row) => {
    const key = keyFn(row);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  });
  return map;
}

function calcDepartment(rows: QueryRow[]) {
  const total = rows.length;
  const resolved = rows.filter(isResolved).length;
  const open = total - resolved;
  const overdue = rows.filter(isOverdue).length;
  const reopened = rows.filter((r) => r.reopened).length;
  const escalated = rows.filter((r) => r.escalated).length;
  const resolvedRows = rows.filter(isResolved);

  const avgResolutionHours =
    resolvedRows.reduce((s, r) => s + hoursBetween(r.createdAt, r.resolvedAt), 0) /
    Math.max(1, resolvedRows.length);

  const resolutionRate = (resolved / Math.max(1, total)) * 100;
  const slaCompliance = ((total - overdue) / Math.max(1, total)) * 100;
  const reopenRate = (reopened / Math.max(1, total)) * 100;
  const escalationRate = (escalated / Math.max(1, total)) * 100;

  const speedScore = scoreClamp(100 - avgResolutionHours * 2);
  const efficiencyScore = scoreClamp(
    resolutionRate * 0.4 +
      speedScore * 0.25 +
      slaCompliance * 0.15 +
      (100 - reopenRate) * 0.1 +
      (100 - escalationRate) * 0.1
  );

  return {
    total,
    resolved,
    open,
    overdue,
    reopened,
    escalated,
    avgResolutionHours,
    resolutionRate,
    slaCompliance,
    reopenRate,
    escalationRate,
    efficiencyScore,
  };
}

function calcPerson(rows: QueryRow[]) {
  const base = calcDepartment(rows);
  const appreciation = rows.reduce((s, r) => s + r.appreciation, 0);
  const beforeSla = rows.filter(
    (r) => isResolved(r) && hoursBetween(r.createdAt, r.resolvedAt) <= r.slaHours
  ).length;

  const appreciationScore = scoreClamp(appreciation);
  const resolvedScore = scoreClamp(base.resolutionRate);
  const speedScore = scoreClamp(100 - base.avgResolutionHours * 2);
  const qualityScore = scoreClamp(100 - base.reopenRate);

  const productivityScore = scoreClamp(
    resolvedScore * 0.35 +
      speedScore * 0.25 +
      base.slaCompliance * 0.2 +
      qualityScore * 0.1 +
      appreciationScore * 0.1
  );

  return {
    ...base,
    appreciation,
    beforeSla,
    productivityScore,
  };
}

function scoreTone(score: number): "green" | "yellow" | "red" {
  if (score >= 80) return "green";
  if (score >= 60) return "yellow";
  return "red";
}

export function DepartmentDashboard() {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const [selectedPerson, setSelectedPerson] = useState("Riya");

  const data = useMemo(() => {
    const rows = demoQueries;

    const company = calcDepartment(rows);

    const departments = Array.from(groupBy(rows, (r) => r.department).entries())
      .map(([department, items]) => ({
        department,
        ...calcDepartment(items),
        workloadPerPerson:
          items.length / Math.max(1, new Set(items.map((i) => i.assignee)).size),
      }))
      .sort((a, b) => b.total - a.total);

    const people = Array.from(groupBy(rows, (r) => r.assignee).entries())
      .map(([person, items]) => ({
        person,
        department: items[0]?.department || "",
        ...calcPerson(items),
      }))
      .sort((a, b) => b.productivityScore - a.productivityScore);

    const fastestDepartment = [...departments].sort(
      (a, b) => a.avgResolutionHours - b.avgResolutionHours
    )[0];

    const mostPendingDepartment = [...departments].sort((a, b) => b.open - a.open)[0];

    const lowestResolutionDepartment = [...departments].sort(
      (a, b) => a.resolutionRate - b.resolutionRate
    )[0];

    const mostOverdueDepartment = [...departments].sort((a, b) => b.overdue - a.overdue)[0];

    const selected = people.find((p) => p.person === selectedPerson) || people[0];

    const productivityTrend = [
      { day: "Mon", score: Math.max(45, selected.productivityScore - 12), resolved: 2 },
      { day: "Tue", score: Math.max(45, selected.productivityScore - 8), resolved: 3 },
      { day: "Wed", score: Math.max(45, selected.productivityScore - 4), resolved: 4 },
      { day: "Thu", score: selected.productivityScore, resolved: selected.resolved },
      { day: "Fri", score: Math.min(100, selected.productivityScore + 3), resolved: selected.resolved + 1 },
    ];

    const departmentChart = departments.map((d) => ({
      department: d.department,
      assigned: d.total,
      resolved: d.resolved,
      open: d.open,
      efficiency: d.efficiencyScore,
    }));

    const appreciationLeaderboard = people
      .map((p) => ({
        person: p.person,
        department: p.department,
        appreciation: p.appreciation,
        productivity: p.productivityScore,
      }))
      .sort((a, b) => b.appreciation - a.appreciation);

    const actionInsight =
      mostOverdueDepartment?.overdue > 0
        ? `${mostOverdueDepartment.department} needs immediate support because it has ${mostOverdueDepartment.overdue} overdue queries.`
        : lowestResolutionDepartment?.resolutionRate < 75
        ? `${lowestResolutionDepartment.department} needs process review because resolution rate is only ${num(lowestResolutionDepartment.resolutionRate)}%.`
        : `Departments are healthy. Focus on appreciation, workload balance and faster resolution time.`;

    return {
      rows,
      company,
      departments,
      people,
      selected,
      productivityTrend,
      departmentChart,
      appreciationLeaderboard,
      fastestDepartment,
      mostPendingDepartment,
      lowestResolutionDepartment,
      mostOverdueDepartment,
      actionInsight,
    };
  }, [selectedPerson]);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Department Dashboard"
        title="Department Efficiency + Employee Productivity"
        description="CEO view for department efficiency, plus employee-level productivity, appreciation and query resolution performance."
      />

      <GlassCard className="p-6">
        <TonePill tone={data.company.efficiencyScore >= 80 ? "green" : data.company.efficiencyScore >= 60 ? "yellow" : "red"}>
          Company Efficiency {data.company.efficiencyScore}/100
        </TonePill>

        <h2 className="mt-4 text-2xl font-black leading-tight">{data.actionInsight}</h2>

        <MutedText className="mt-2">
          CEO can use this view to check department workload, SLA risk, people productivity and appreciation culture.
        </MutedText>
      </GlassCard>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Total Queries" value={money(data.company.total)} tone="blue" />
        <MetricCard label="Resolution Rate" value={`${num(data.company.resolutionRate)}%`} tone={data.company.resolutionRate >= 80 ? "green" : "yellow"} />
        <MetricCard label="Avg Resolution Time" value={`${num(data.company.avgResolutionHours)}h`} tone={data.company.avgResolutionHours <= 12 ? "green" : "yellow"} />
        <MetricCard label="Overdue Queries" value={String(data.company.overdue)} tone={data.company.overdue ? "red" : "green"} />
        <MetricCard label="Open Queries" value={String(data.company.open)} tone={data.company.open ? "yellow" : "green"} />
        <MetricCard label="Reopened Queries" value={String(data.company.reopened)} tone={data.company.reopened ? "red" : "green"} />
        <MetricCard label="Escalated Queries" value={String(data.company.escalated)} tone={data.company.escalated ? "red" : "green"} />
        <MetricCard label="SLA Compliance" value={`${num(data.company.slaCompliance)}%`} tone={data.company.slaCompliance >= 85 ? "green" : "yellow"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <GlassCard className="p-5">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-[#0A84FF]" />
            <h2 className="text-xl font-black">Department Query Load</h2>
          </div>

          <div className="mt-5 h-[320px] w-full min-w-0">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data.departmentChart}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="assigned" />
                <Bar dataKey="resolved" />
                <Bar dataKey="open" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-[#0A84FF]" />
            <h2 className="text-xl font-black">Department Efficiency Score</h2>
          </div>

          <div className="mt-5 h-[320px] w-full min-w-0">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data.departmentChart}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="efficiency" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="overflow-hidden">
        <div className="border-b border-current/10 p-5">
          <h2 className="text-xl font-black">CEO Department Efficiency Table</h2>
          <MutedText className="mt-1 text-sm">
            Department-wise workload, resolution rate, SLA risk and efficiency score.
          </MutedText>
        </div>

        <div className="metaos-scroll-table overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead
              className={
                isDark
                  ? "border-b border-white/10 bg-white/[0.04] text-[11px] uppercase tracking-[0.16em] text-white/45"
                  : "border-b border-black/10 bg-black/[0.035] text-[11px] uppercase tracking-[0.16em] text-black/55"
              }
            >
              <tr>
                <th className="px-5 py-4">Department</th>
                <th className="px-5 py-4">Assigned</th>
                <th className="px-5 py-4">Resolved</th>
                <th className="px-5 py-4">Open</th>
                <th className="px-5 py-4">Resolution Rate</th>
                <th className="px-5 py-4">Avg Time</th>
                <th className="px-5 py-4">Overdue</th>
                <th className="px-5 py-4">Escalation Rate</th>
                <th className="px-5 py-4">Workload / Person</th>
                <th className="px-5 py-4">Efficiency</th>
              </tr>
            </thead>

            <tbody>
              {data.departments.map((row) => (
                <tr
                  key={row.department}
                  className={
                    isDark
                      ? "border-b border-white/5 text-white hover:bg-white/[0.04]"
                      : "border-b border-black/5 text-black hover:bg-black/[0.035]"
                  }
                >
                  <td className="px-5 py-4 font-black">{row.department}</td>
                  <td className="px-5 py-4 opacity-75">{row.total}</td>
                  <td className="px-5 py-4 opacity-75">{row.resolved}</td>
                  <td className="px-5 py-4 opacity-75">{row.open}</td>
                  <td className="px-5 py-4 opacity-75">{num(row.resolutionRate)}%</td>
                  <td className="px-5 py-4 opacity-75">{num(row.avgResolutionHours)}h</td>
                  <td className="px-5 py-4 font-black text-red-400">{row.overdue}</td>
                  <td className="px-5 py-4 opacity-75">{num(row.escalationRate)}%</td>
                  <td className="px-5 py-4 opacity-75">{num(row.workloadPerPerson)}</td>
                  <td className="px-5 py-4">
                    <TonePill tone={scoreTone(row.efficiencyScore)}>{row.efficiencyScore}/100</TonePill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <GlassCard className="p-5">
          <div className="flex items-center gap-3">
            <Award className="h-5 w-5 text-[#0A84FF]" />
            <h2 className="text-xl font-black">Appreciation Leaderboard</h2>
          </div>

          <div className="mt-4 grid gap-3">
            {data.appreciationLeaderboard.map((person, index) => (
              <Surface key={person.person} className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-black">
                      #{index + 1} {person.person}
                    </p>
                    <MutedText className="mt-1 text-sm">{person.department}</MutedText>
                  </div>
                  <TonePill tone={index === 0 ? "green" : "blue"}>
                    {person.appreciation} pts
                  </TonePill>
                </div>
              </Surface>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-[#0A84FF]" />
            <h2 className="text-xl font-black">Employee Productivity View</h2>
          </div>

          <select
            value={selectedPerson}
            onChange={(e) => setSelectedPerson(e.target.value)}
            className="mt-4 h-11 w-full rounded-2xl border border-current/10 bg-transparent px-4 text-sm outline-none"
          >
            {data.people.map((person) => (
              <option key={person.person} value={person.person}>
                {person.person} — {person.department}
              </option>
            ))}
          </select>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <MiniMetric label="Productivity Score" value={`${data.selected.productivityScore}/100`} tone={scoreTone(data.selected.productivityScore)} />
            <MiniMetric label="Resolved" value={String(data.selected.resolved)} tone="green" />
            <MiniMetric label="Open" value={String(data.selected.open)} tone={data.selected.open ? "yellow" : "green"} />
            <MiniMetric label="Avg Time" value={`${num(data.selected.avgResolutionHours)}h`} tone={data.selected.avgResolutionHours <= 12 ? "green" : "yellow"} />
            <MiniMetric label="SLA Compliance" value={`${num(data.selected.slaCompliance)}%`} tone={data.selected.slaCompliance >= 85 ? "green" : "yellow"} />
            <MiniMetric label="Appreciation" value={`${data.selected.appreciation} pts`} tone="blue" />
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-5">
        <div className="flex items-center gap-3">
          <UserCheck className="h-5 w-5 text-[#0A84FF]" />
          <h2 className="text-xl font-black">{data.selected.person}'s Productivity Chart</h2>
        </div>

        <div className="mt-5 h-[320px] w-full min-w-0">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data.productivityTrend}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="score" strokeWidth={3} />
              <Line type="monotone" dataKey="resolved" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <div className="flex items-center gap-3">
          <Medal className="h-5 w-5 text-[#0A84FF]" />
          <h2 className="text-xl font-black">Appreciation Rules</h2>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Surface className="p-4">+10 points: Query resolved before SLA</Surface>
          <Surface className="p-4">+20 points: Appreciation from requester</Surface>
          <Surface className="p-4">+15 points: Manager appreciation</Surface>
          <Surface className="p-4">+10 points: Helped another department</Surface>
          <Surface className="p-4">+25 points: Resolved critical issue</Surface>
          <Surface className="p-4">-10 points: Query reopened</Surface>
          <Surface className="p-4">-15 points: SLA breached</Surface>
        </div>
      </GlassCard>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "yellow" | "red" | "blue" | "neutral";
}) {
  return (
    <Surface className="p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] opacity-45">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
      <div className="mt-3">
        <TonePill tone={tone}>{tone}</TonePill>
      </div>
    </Surface>
  );
}
