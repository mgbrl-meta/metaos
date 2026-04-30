import TopBar from '@/components/TopBar';
import { getDateRange } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function AdsPage() {
  const range = await getDateRange();
  return (
    <div>
      <TopBar title="Ads" maxDay={range.maxDay} />
      <div className="p-8 text-center text-slate-500">Ads view coming next.</div>
    </div>
  );
}
