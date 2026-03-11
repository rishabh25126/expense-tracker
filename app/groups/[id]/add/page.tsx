'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import VoiceInput from '@/components/VoiceInput';
import GroupNav from '@/components/GroupNav';
import OnlineIndicator from '@/components/OnlineIndicator';
import type { ParsedExpense, Category, Group, Expense } from '@/types';
import { queryKeys } from '@/lib/queryKeys';
import { enqueue, pendingCount, getQueue, dequeue } from '@/lib/offlineQueue';

const DEFAULTS = ['Food', 'Travel', 'Rent', 'Shopping', 'Bills', 'Other'];
const TODAY = () => new Date().toISOString().split('T')[0];

export default function GroupAddPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ amount: '', category: 'Food', description: '', date: TODAY() });
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [queued, setQueued] = useState(false);
  const [voiceKey, setVoiceKey] = useState(0);
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  // Prefetch group, expenses, and categories in parallel so Expenses/Dashboard/Stats/Categories tabs load instantly
  useEffect(() => {
    if (!id) return;
    void Promise.all([
      queryClient.prefetchQuery({
        queryKey: queryKeys.group(id),
        queryFn: () => fetch(`/api/groups/${id}`).then(r => r.json()) as Promise<Group>,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.expenses(id),
        queryFn: () => fetch(`/api/groups/${id}/expenses`).then(r => r.json()) as Promise<Expense[]>,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.categories(id),
        queryFn: () => fetch(`/api/groups/${id}/categories`).then(r => r.json()) as Promise<Category[]>,
      }),
    ]);
  }, [id, queryClient]);

  // Online/offline tracking + pending count
  useEffect(() => {
    setOnline(navigator.onLine);
    setPending(pendingCount(id));
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [id]);

  // Auto-sync queued expenses when back online
  useEffect(() => {
    if (!online || syncing) return;
    const queue = getQueue(id);
    if (queue.length === 0) return;

    setSyncing(true);
    (async () => {
      for (const item of queue) {
        try {
          const res = await fetch(`/api/groups/${id}/expenses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
          });
          if (!res.ok) break;
          dequeue(id);
        } catch {
          break;
        }
      }
      setPending(pendingCount(id));
      setSyncing(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.group(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.insights(id) });
    })();
  }, [online]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: customCats = [] } = useQuery({
    queryKey: queryKeys.categories(id),
    queryFn: () => fetch(`/api/groups/${id}/categories`).then(r => r.json()) as Promise<Category[]>,
  });

  const categories = [...DEFAULTS, ...customCats.map(c => c.name).filter(n => !DEFAULTS.includes(n))];

  const parseExpense = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch('/api/parse-expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, categories }),
      });
      const parsed: ParsedExpense & { error?: string } = await res.json();
      if (parsed.error) throw new Error(parsed.error);
      return parsed;
    },
    onError: (e: Error) => setError(e.message),
  });

  const createExpense = useMutation({
    mutationFn: async (payload: typeof form) => {
      const res = await fetch(`/api/groups/${id}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Save failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.group(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.insights(id) });
      setSaved(true);
      setForm(f => ({ amount: '', category: f.category, description: '', date: TODAY() }));
      setVoiceKey(k => k + 1);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: () => setError('Failed to save expense'),
  });

  const handleTranscript = async (text: string) => {
    setError('');
    parseExpense.mutate(text, {
      onSuccess: (parsed) => {
        setForm(f => ({
          amount: parsed.amount != null ? String(parsed.amount) : f.amount,
          category: parsed.category ?? f.category,
          description: parsed.description || f.description,
          date: parsed.date ?? f.date,
        }));
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount) return;
    setError('');

    if (!navigator.onLine) {
      enqueue(id, form);
      setPending(pendingCount(id));
      setQueued(true);
      setForm(f => ({ amount: '', category: f.category, description: '', date: TODAY() }));
      setVoiceKey(k => k + 1);
      setTimeout(() => setQueued(false), 2000);
      return;
    }

    createExpense.mutate(form);
  };

  const parsing = parseExpense.isPending;
  const saving = createExpense.isPending;

  return (
    <div className="min-h-screen p-4 max-w-sm mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">Add Expense</h1>
          <OnlineIndicator />
        </div>
        <button onClick={() => router.push('/groups')} className="text-xs text-gray-400">Groups</button>
      </div>

      <div className="flex flex-col items-center mb-6">
        <p className="text-sm text-gray-500 mb-3">Tap mic and speak your expense</p>
        <VoiceInput key={voiceKey} onTranscript={handleTranscript} disabled={parsing || saving} />
        {parsing && <p className="text-sm text-gray-400 mt-2">Parsing...</p>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide">Amount *</label>
          <input
            type="number" step="0.01" value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            placeholder="0" required
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide">Category</label>
          <select value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide">Description</label>
          <input type="text" value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Optional"
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-500 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide">Date</label>
          <input type="date" value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className="w-full max-w-full box-border appearance-none bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 [&::-webkit-date-and-time-value]:text-gray-100"
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {saved && <p className="text-green-400 text-sm">Saved!</p>}
        {queued && <p className="text-yellow-400 text-sm">Queued!</p>}
        {pending > 0 && (
          <p className="text-xs text-yellow-400">
            {syncing ? 'Syncing...' : `${pending} expense${pending > 1 ? 's' : ''} pending sync`}
          </p>
        )}
        <button type="submit" disabled={saving || !form.amount}
          className="w-full bg-white text-gray-900 rounded py-2 text-sm font-medium disabled:opacity-40 mt-2">
          {saving ? 'Saving...' : !online ? 'Queue Expense' : 'Save Expense'}
        </button>
      </form>

      <div className="h-14 mb-32" />
      <GroupNav groupId={id} />
    </div>
  );
}
