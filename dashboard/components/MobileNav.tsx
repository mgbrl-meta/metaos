'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/dashboard', label: 'Pulse', icon: '☀' },
  { href: '/dashboard/account', label: 'Overview', icon: '◎' },
  { href: '/dashboard/campaigns', label: 'Camps', icon: '▦' },
  { href: '/dashboard/ads', label: 'Ads', icon: '▤' },
  { href: '/dashboard/settings', label: 'Settings', icon: '⚙' },
];

export default function MobileNav() {
  const path = usePathname();
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 flex">
      {TABS.map((t) => {
        const active = path === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex-1 flex flex-col items-center justify-center py-2 text-xs ${
              active ? 'text-indigo-700' : 'text-slate-500'
            }`}
          >
            <span className="text-base">{t.icon}</span>
            <span className="mt-0.5">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
