'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

const PRESETS = [
  { label: 'Yesterday', days: 1 },
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
  const [custom, setCustom] = useState(false);
  const [fromD, setFromD] = useState('');
  const [toD, setToD] = useState(maxDay || '');

  const currentDays = Number(params.get('d') || 7);
  const fromParam = params.get('from');
  const toParam = params.get('to');

  const label = (fromParam && toParam)
    ? fromParam + ' to ' + toParam
    : (PRESETS.find((p) => p.days === currentDays)?.label || ('Last ' + currentDays + ' days'));

  function pick(days: number) {
    const url = new URL(window.location.href);
    url.searchParams.set('d', String(days));
    url.searchParams.delete('from');
    url.searchParams.delete('to');
    router.push(url.pathname + url.search);
    setOpen(false);
  }

  function applyCustom() {
    if (!fromD || !toD) return;
    const url = new URL(window.location.href);
    url.searchParams.set('from', fromD);
    url.searchParams.set('to', toD);
    url.searchParams.delete('d');
    router.push(url.pathname + url.search);
    setOpen(false);
    setCustom(false);
  }

  return (
    <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <div className="flex-1" />
      <div className="relative">
        <button onClick={() => setOpen(!open)} className="text-sm border border-slate-300 rounded-md px-3 py-1.5 hover:bg-slate-50">
          {label}
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1">
              {!custom && PRESETS.map((p) => (
                <button key={p.days} onClick={() => pick(p.days)} className="block w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                  {p.label}
                </button>
              ))}
              {!custom && (
                <div className="border-t border-slate-200 mt-1 pt-1">
                  <button onClick={() => setCustom(true)} className="block w-full text-left px-3 py-1.5 text-sm text-indigo-700 hover:bg-slate-50">
                    Custom range
                  </button>
                </div>
              )}
              {custom && (
                <div className="p-3 space-y-2">
                  <input type="date" value={fromD} onChange={(e) => setFromD(e.target.value)} max={maxDay} className="w-full text-sm border border-slate-300 rounded px-2 py-1" />
                  <input type="date" value={toD} onChange={(e) => setToD(e.target.value)} max={maxDay} className="w-full text-sm border border-slate-300 rounded px-2 py-1" />
                  <div className="flex gap-2">
                    <button onClick={applyCustom} className="flex-1 bg-indigo-600 text-white text-sm py-1 rounded">Apply</button>
                    <button onClick={() => setCustom(false)} className="flex-1 border border-slate-300 text-sm py-1 rounded">Cancel</button>
                  </div>
                </div>
              )}
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
