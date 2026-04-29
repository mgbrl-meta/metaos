import { createBrowserClient } from '@supabase/ssr';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function createBrowserSupabase() {
  return createBrowserClient(URL, KEY);
}

export async function isEmailAllowed(supabase: any, email: string): Promise<boolean> {
  const { data } = await supabase
    .from('email_allowlist')
    .select('email')
    .eq('email', email.toLowerCase())
    .maybeSingle();
  return !!data;
}
