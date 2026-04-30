'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const PRESETS = [
  { label: 'Last 3 days', days: 3 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 28 days', days: 28 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 60 days', days: 60 },
  { label: 'Last 90 days', days: 90 },
];

export default function TopBar({ title, maxDay }: { title: string; maxDay: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  const currentDays = Number(params.get('d') || 7);
  const currentLabel = PRESETS.find((p) => p.days === currentDays)?.label || `Last ${currentDays} days`;

  function pick(days: number) {
    const url = new URL(window.location.href);
    url.searchParams.set('d', String(days));
    router.push(url.pathname + url.search);
    setOpen(false);
  }

  return (
    <div className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200 px-5 py-3 flex items-center gap-3">
      <h1 className="text-lg font-semibold text-slate-900 lg:hidden">Meta Growth OS</h1>
      <h2 className="hidden lg:block text-base font-semibold text-slate-900">{title}</h2>

      <div className="flex-1" />

      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="text-sm border border-slate-300 rounded-md px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"
        >
          <span>📅</span>
          <span>{currentLabel}</span>
          <span className="text-xs">▾</span>
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1">
              {PRESETS.map((p) => (
                <button
                  key={p.days}
                  onClick={() => pick(p.days)}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 ${
                    p.days === currentDays ? 'text-indigo-700 font-medium bg-indigo-50' : 'text-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <form action="/auth/signout" method="post">
        <button className="text-xs text-slate-500 hover:text-slate-900 px-2 py-1.5">Sign out</button>
      </form>
    </div>
  );
}
