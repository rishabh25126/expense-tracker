'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const login = useMutation({
    mutationFn: async (credentials: typeof form) => {
      const res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials) });
      if (!res.ok) throw new Error('Invalid username or password');
      return res;
    },
    onSuccess: () => router.push('/'),
    onError: (error: Error) => setError(error.message),
  });
  return <main id="main-content" className="flex min-h-dvh items-center justify-center px-5 py-12">
    <div className="w-full max-w-md">
      <div className="mb-10 text-center">
        <span aria-hidden="true" className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-3xl font-bold text-gray-950">₹</span>
        <h1 className="app-title mt-5">Welcome back</h1>
        <p className="app-subtitle">Sign in to your spending workspace.</p>
      </div>
      <form onSubmit={e => { e.preventDefault(); setError(''); login.mutate(form); }} className="surface space-y-5 p-6 sm:p-8">
        <div><label htmlFor="username" className="field-label">Username</label><input id="username" name="username" type="text" autoComplete="username" spellCheck={false} required value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} className="field" placeholder="Your username…" /></div>
        <div><label htmlFor="password" className="field-label">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="field" placeholder="Your password…" /></div>
        <p aria-live="polite" className="status-message text-red-400">{error}</p>
        <button type="submit" disabled={login.isPending} className="primary-action w-full disabled:opacity-50">{login.isPending ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  </main>;
}
