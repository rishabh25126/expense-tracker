'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import VoiceInput from '@/components/VoiceInput';
import GroupNav from '@/components/GroupNav';
import OnlineIndicator from '@/components/OnlineIndicator';
import AmountCalculator from '@/components/AmountCalculator';
import type { ParsedExpense, Category, Group, Expense } from '@/types';
import { queryKeys } from '@/lib/queryKeys';
import { enqueue, pendingCount, getQueue, dequeue } from '@/lib/offlineQueue';

const DEFAULTS = ['Food', 'Travel', 'Rent', 'Shopping', 'Bills', 'Other'];
const TODAY = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export default function GroupAddPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ amount: '', category: 'Food', description: '', date: '' });
  useEffect(() => { setForm(current => current.date ? current : { ...current, date: TODAY() }); }, []);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [queued, setQueued] = useState(false);
  const [voiceKey, setVoiceKey] = useState(0);
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const syncInFlight = useRef(false);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (statusTimer.current) clearTimeout(statusTimer.current); }, []);
  const clearStatusLater = () => {
    if (statusTimer.current) clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => { setSaved(false); setQueued(false); }, 2000);
  };

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
    if (!online || syncInFlight.current) return;
    const queue = getQueue(id);
    if (queue.length === 0) return;

    let cancelled = false;
    syncInFlight.current = true;
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
      syncInFlight.current = false;
      if (!cancelled) {
        setPending(pendingCount(id));
        setSyncing(false);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.group(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.insights(id) });
    })();
    return () => { cancelled = true; };
  }, [online]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: customCats = [] } = useQuery({
    queryKey: queryKeys.categories(id),
    queryFn: () => fetch(`/api/groups/${id}/categories`).then(r => r.json()) as Promise<Category[]>,
  });

  const categories = [...DEFAULTS, ...(Array.isArray(customCats) ? customCats : []).map(c => c.name).filter(n => !DEFAULTS.includes(n))];

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
      clearStatusLater();
    },
    onError: () => setError('Failed to save expense'),
  });

  const handleTranscript = async (text: string) => {
    setError('');
    await parseExpense.mutateAsync(text, {
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
      clearStatusLater();
      return;
    }

    createExpense.mutate(form);
  };

  const parsing = parseExpense.isPending;
  const saving = createExpense.isPending;

  return (
    <div id="main-content" className="app-page has-nav narrow">
      <div className="app-header">
        <div className="flex items-center gap-2">
          <h1 className="app-title">Add Expense</h1>
          <OnlineIndicator />
        </div>
        <button onClick={() => router.push('/groups')} className="secondary-action text-sm">Trackers</button>
      </div>

      <div className="surface mb-5 flex flex-col items-center px-4 py-5 sm:py-9">
        <VoiceInput key={voiceKey} onTranscript={handleTranscript} disabled={parsing || saving} />
        <p className="mt-4 text-sm text-gray-400">Tap to add with your voice</p>
        {parsing && <p aria-live="polite" className="text-sm text-gray-400 mt-2">Understanding expense…</p>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="amount" className="field-label">Amount <span aria-hidden="true">*</span></label>
          <div className="relative mt-1">
            <input
              id="amount" name="amount" type="number" inputMode="decimal" min="0.01" step="0.01" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="0.00" required
              className="field pr-16 text-xl font-semibold"
            />
            <AmountCalculator
              value={form.amount}
              onAmountChange={amount => setForm(f => ({ ...f, amount }))}
            />
          </div>
        </div>
        <div>
          <label htmlFor="category" className="field-label">Category</label>
          <select id="category" name="category" value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            className="field">
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="description" className="field-label">Description</label>
          <input id="description" name="description" type="text" autoComplete="off" value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="What did you spend on?…"
            className="field"
          />
        </div>
        <div>
          <label htmlFor="date" className="field-label">Date</label>
          <input id="date" name="date" type="date" value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className="field max-w-full appearance-none [&::-webkit-date-and-time-value]:text-gray-100"
          />
        </div>
        <p aria-live="polite" className="status-message">{error && <span className="text-red-400">{error}</span>}{saved && <span className="text-emerald-400">Expense saved</span>}{queued && <span className="text-yellow-400">Expense queued for sync</span>}</p>
        {pending > 0 && (
          <p aria-live="polite" className="text-sm text-yellow-400">
            {syncing ? 'Syncing...' : `${pending} expense${pending > 1 ? 's' : ''} pending sync`}
          </p>
        )}
        <button type="submit" disabled={saving || !form.amount}
          className="primary-action w-full disabled:opacity-40 mt-2">
          {saving ? 'Saving...' : !online ? 'Queue Expense' : 'Save Expense'}
        </button>
      </form>

      <div className="hidden" />
      <GroupNav groupId={id} />
    </div>
  );
}
