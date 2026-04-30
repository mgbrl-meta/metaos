import { createServerSupabase } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar userEmail={user.email || ''} />
      <main className="flex-1 min-w-0 pb-16 lg:pb-0">{children}</main>
      <MobileNav />
    </div>
  );
}
