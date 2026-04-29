import { createServerSupabase } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

export default async function DashboardHome() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: account } = await supabase
    .from('daily_account')
    .select('day, spend, revenue, roas, purchases')
    .order('day', { ascending: false })
    .limit(7);

  const rows = account || [];
  const totalSpend = rows.reduce((s, r) => s + (r.spend || 0), 0);
  const totalRev = rows.reduce((s, r) => s + (r.revenue || 0), 0);
  const totalPur = rows.reduce((s, r) => s + (r.purchases || 0), 0);
  const avgRoas = totalSpend > 0 ? totalRev / totalSpend : 0;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <header className="flex items-center justify-between max-w-6xl mx-auto mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Meta Growth OS</h1>
          <p className="text-sm text-slate-500">Welcome, {user.email}</p>
        </div>
        <form action="/auth/signout" method="post">
          <button type="submit" className="text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 border border-slate-200 rounded-md">
            Sign out
          </button>
        </form>
      </header>

      <main className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Kpi label="Spend (last 7d)" value={`₹${Math.round(totalSpend).toLocaleString('en-IN')}`} />
          <Kpi label="Revenue (last 7d)" value={`₹${Math.round(totalRev).toLocaleString('en-IN')}`} />
          <Kpi label="ROAS (last 7d)" value={avgRoas.toFixed(2)} />
          <Kpi label="Purchases (last 7d)" value={totalPur.toLocaleString('en-IN')} />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-semibold mb-3">Last 7 days</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="pb-2 pr-4">Day</th>
                  <th className="pb-2 px-4 text-right">Spend</th>
                  <th className="pb-2 px-4 text-right">Revenue</th>
                  <th className="pb-2 px-4 text-right">ROAS</th>
                  <th className="pb-2 pl-4 text-right">Purchases</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-400">No data yet</td></tr>
                ) : rows.map(r => (
                  <tr key={r.day} className="border-b border-slate-100">
                    <td className="py-2 pr-4">{r.day}</td>
                    <td className="py-2 px-4 text-right">₹{Math.round(r.spend || 0).toLocaleString('en-IN')}</td>
                    <td className="py-2 px-4 text-right">₹{Math.round(r.revenue || 0).toLocaleString('en-IN')}</td>
                    <td className="py-2 px-4 text-right">{(r.roas || 0).toFixed(2)}</td>
                    <td className="py-2 pl-4 text-right">{r.purchases || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-center text-slate-400 text-sm mt-12">
          Chunk 4 deployed. Full dashboard pages coming in Chunk 5.
        </p>
      </main>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="text-xs text-slate-500 uppercase tracking-wide font-medium">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}
