'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');

  const login = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            data: { full_name: form.name.trim() || null },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: form.email.trim(),
        password: form.password,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      router.push('/');
      router.refresh();
    },
    onError: (e: Error) => setError(e.message || 'Authentication failed'),
  });

  const googleLogin = async () => {
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    login.mutate();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-8 text-center">Expense Tracker</h1>
        <div className="grid grid-cols-2 border border-gray-700 rounded overflow-hidden mb-4">
          <button type="button" onClick={() => setMode('login')} className={`py-2 text-sm ${mode === 'login' ? 'bg-white text-gray-900' : 'text-gray-400'}`}>Sign in</button>
          <button type="button" onClick={() => setMode('signup')} className={`py-2 text-sm ${mode === 'signup' ? 'bg-white text-gray-900' : 'text-gray-400'}`}>Sign up</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <input
              type="text" placeholder="Name" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          )}
          <input
            type="email" placeholder="Email" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="password" placeholder="Password" value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={login.isPending || !form.email.trim() || !form.password}
            className="w-full bg-white text-gray-900 rounded py-2 text-sm font-medium disabled:opacity-40">
            {login.isPending ? 'Working...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
          </button>
        </form>
        <button
          type="button"
          onClick={googleLogin}
          className="w-full border border-gray-700 rounded py-2 text-sm text-gray-200 mt-3"
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}
