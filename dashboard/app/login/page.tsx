'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabase, isEmailAllowed } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createBrowserSupabase();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const allowed = await isEmailAllowed(supabase, email);
    if (!allowed) {
      await supabase.auth.signOut();
      setError('Your email is not authorized for this dashboard.');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <form onSubmit={handleLogin} className="bg-white border border-slate-200 rounded-xl p-8 w-full max-w-md shadow-sm">
        <h1 className="text-2xl font-semibold mb-2">Meta Growth OS</h1>
        <p className="text-slate-500 text-sm mb-6">Sign in to continue</p>

        <label className="block mb-4">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="you@example.com" />
        </label>

        <label className="block mb-6">
          <span className="text-sm font-medium text-slate-700">Password</span>
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </label>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md p-3 mb-4">
            {error}
          </div>
        )}

        <button type="submit" disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-md disabled:opacity-50 transition">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
