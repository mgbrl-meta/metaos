export function EmptyState({
  title = "No data available",
  description = "Refresh Meta data to activate this V2 screen.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.055] p-8 text-white shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
      <div className="text-lg font-black">{title}</div>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">{description}</p>
    </div>
  );
}
