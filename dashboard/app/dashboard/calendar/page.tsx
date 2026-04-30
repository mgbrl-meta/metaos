import TopBar from '@/components/TopBar';
import { getAccountDailySeries, getDateRange } from '@/lib/queries';
import { fmtCur } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const range = await getDateRange();
  const series = await getAccountDailySeries({ start: range.minDay, end: range.maxDay });

  const byMonth = new Map<string, any[]>();
  for (const day of series) {
    const ym = day.day.slice(0, 7);
    if (!byMonth.has(ym)) byMonth.set(ym, []);
    byMonth.get(ym)!.push(day);
  }

  const roasValues = series.map((d: any) => Number(d.roas || 0)).filter((v: number) => v > 0);
  const sorted = [...roasValues].sort((a, b) => a - b);
  const q25 = sorted[Math.floor(sorted.length * 0.25)] || 0;
  const q50 = sorted[Math.floor(sorted.length * 0.50)] || 0;
  const q75 = sorted[Math.floor(sorted.length * 0.75)] || 0;

  function colorFor(roas: number) {
    if (!roas) return 'bg-slate-100 text-slate-400';
    if (roas >= q75) return 'bg-emerald-500 text-white';
    if (roas >= q50) return 'bg-emerald-300 text-emerald-900';
    if (roas >= q25) return 'bg-amber-300 text-amber-900';
    return 'bg-rose-400 text-white';
  }

  const months = Array.from(byMonth.entries()).sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <div>
      <TopBar title="Daily Calendar" maxDay={range.maxDay} />
      <div className="p-5">
