export function MetaEmptyState({
  title = "No data available",
  description = "Upload or refresh Meta data to activate this section.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm dark:border-white/10 dark:bg-[#111827] dark:text-white">
      <div className="text-base font-black">{title}</div>
      <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {description}
      </div>
    </div>
  );
}
