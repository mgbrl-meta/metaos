'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  {
    section: 'PULSE',
    items: [{ href: '/dashboard', label: 'Morning Briefing', icon: '☀' }],
  },
  {
    section: 'PERFORMANCE',
    items: [
      { href: '/dashboard/account', label: 'Account Overview', icon: '◎' },
      { href: '/dashboard/campaigns', label: 'Campaigns', icon: '▦' },
      { href: '/dashboard/adsets', label: 'Ad Sets', icon: '⊞' },
      { href: '/dashboard/ads', label: 'Ads', icon: '▤' },
      { href: '/dashboard/calendar', label: 'Daily Calendar', icon: '📅' },
    ],
  },
  {
    section: 'INTELLIGENCE',
    items: [
      { href: '/dashboard/trends', label: 'Trends', icon: '∿', soon: true },
      { href: '/dashboard/funnel', label: 'Funnel', icon: '▽', soon: true },
      { href: '/dashboard/cohorts', label: 'Cohorts', icon: '◴', soon: true },
    ],
  },
  {
    section: 'GROWTH OS',
    items: [
      { href: '/dashboard/worklist', label: "Today's Worklist", icon: '✓', soon: true },
      { href: '/dashboard/scale', label: 'Scale Lab', icon: '↗', soon: true },
      { href: '/dashboard/kill', label: 'Kill List', icon: '✗', soon: true },
      { href: '/dashboard/fatigue', label: 'Fatigue Monitor', icon: '◐', soon: true },
      { href: '/dashboard/anomalies', label: 'Anomaly Feed', icon: '⚠', soon: true },
    ],
  },
  {
    section: 'SETTINGS',
    items: [{ href: '/dashboard/settings', label: 'Targets & Config', icon: '⚙' }],
  },
];

export default function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500" />
          <span className="font-semibold text-slate-900">Meta Growth OS</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV.map((s) => (
          <div key={s.section} className="mb-5">
            <div className="px-2 mb-1.5 text-[10px] font-semibold tracking-wider text-slate-400">
              {s.section}
            </div>
            {s.items.map((it) => {
              const active = pathname === it.href;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm mb-0.5 transition ${
                    active
                      ? 'bg-indigo-50 text-indigo-700 font-medium'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className="w-5 text-center text-xs opacity-70">{it.icon}</span>
                  <span className="flex-1">{it.label}</span>
                  {(it as any).soon && (
                    <span className="text-[9px] uppercase tracking-wider text-slate-400">soon</span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-slate-200 text-xs text-slate-500 truncate">
        {userEmail}
      </div>
    </aside>
  );
}
