import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function createBrowserSupabase() {
  return createBrowserClient(URL, KEY);
}

export function createServerSupabase() {
  const cookieStore = cookies();
  return createServerClient(URL, KEY, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {}
      },
    },
  });
}

export async function isEmailAllowed(supabase: any, email: string): Promise<boolean> {
  const { data } = await supabase
    .from('email_allowlist')
    .select('email')
    .eq('email', email.toLowerCase())
    .maybeSingle();
  return !!data;
}
