import { Delta, deltaArrow, deltaColorClass, deltaText } from '@/lib/deltas';

export default function KpiCard({
  label,
  value,
  sub,
  delta,
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: Delta;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-slate-300 transition">
      <div className="text-[10px] font-semibold tracking-wider uppercase text-slate-500">
        {label}
      </div>
      <div className="text-xl font-semibold text-slate-900 mt-1 tabular-nums">{value}</div>
      <div className="flex items-center justify-between mt-1">
        <div className="text-[11px] text-slate-400">{sub || ''}</div>
        {delta && (
          <div className={`text-[11px] font-medium tabular-nums ${deltaColorClass(delta)}`}>
            {deltaArrow(delta)} {deltaText(delta)}
          </div>
        )}
      </div>
    </div>
  );
}
