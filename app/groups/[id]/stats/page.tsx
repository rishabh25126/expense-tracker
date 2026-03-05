'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import GroupNav from '@/components/GroupNav';
import type { Expense, Group } from '@/types';
import { queryKeys } from '@/lib/queryKeys';

const BAR_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#84cc16',
];

function colorFor(label: string) {
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  return BAR_COLORS[hash % BAR_COLORS.length];
}

function HBar({ label, value, max }: { label: string; value: number; max: number }) {
  const color = colorFor(label);
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 text-right text-xs text-gray-500 truncate">{label}</span>
      <div className="flex-1 bg-gray-800 rounded h-5">
        <div className="h-5 rounded transition-all" style={{ width: `${Math.max(Math.round((value / max) * 100), value > 0 ? 2 : 0)}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-medium w-16 text-right">₹{value.toLocaleString()}</span>
    </div>
  );
}

function MonthlyBars({ expenses }: { expenses: Expense[] }) {
  const months: { key: string; label: string; total: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = d.toISOString().slice(0, 7); // YYYY-MM
    const label = d.toLocaleString('default', { month: 'short' });
    const total = expenses.filter(e => e.date.startsWith(key)).reduce((s, e) => s + Number(e.amount), 0);
    months.push({ key, label, total });
  }
  const max = Math.max(...months.map(m => m.total), 1);
  const thisMonth = new Date().toISOString().slice(0, 7);
  return (
    <div className="flex items-end gap-1 h-28">
      {months.map(({ key, label, total }) => (
        <div key={key} className="flex-1 flex flex-col items-center gap-0.5">
          {total > 0 && <span className="text-[8px] text-gray-500 w-full text-center leading-none mb-0.5">₹{total >= 1000 ? `${(total/1000).toFixed(1)}k` : total}</span>}
          <div
            className="w-full rounded-t"
            style={{
              height: `${Math.round((total / max) * 64)}px`,
              minHeight: total > 0 ? '3px' : '1px',
              backgroundColor: key === thisMonth ? '#6366f1' : '#93c5fd',
            }}
          />
          <span className="text-[9px] text-gray-400 w-full text-center">{label}</span>
        </div>
      ))}
    </div>
  );
}

function DailyBars({ expenses, from }: { expenses: Expense[]; from: string }) {
  const today = new Date().toISOString().split('T')[0];
  const days: { date: string; label: string; total: number; inPeriod: boolean }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = d.toISOString().split('T')[0];
    const inPeriod = date >= from;
    const total = inPeriod ? expenses.filter(e => e.date === date).reduce((s, e) => s + Number(e.amount), 0) : 0;
    const label = date === today ? 'today' : date.slice(5);
    days.push({ date, label, total, inPeriod });
  }
  const max = Math.max(...days.map(d => d.total), 1);
  return (
    <div className="flex items-end gap-0.5 h-28">
      {days.map(({ date, label, total, inPeriod }) => (
        <div key={date} className="flex-1 flex flex-col items-end gap-0.5" title={total > 0 ? `₹${total.toLocaleString()}` : ''}>
          {total > 0 && <span className="text-[8px] text-gray-500 w-full text-center leading-none mb-0.5">₹{total >= 1000 ? `${(total/1000).toFixed(1)}k` : total}</span>}
          <div
            className="w-full rounded-t"
            style={{
              height: `${Math.round((total / max) * 64)}px`,
              minHeight: total > 0 ? '3px' : '1px',
              backgroundColor: !inPeriod ? '#e5e7eb' : date === today ? '#6366f1' : '#93c5fd',
            }}
          />
          <span className="text-[9px] text-gray-400 truncate w-full text-center">{label}</span>
        </div>
      ))}
    </div>
  );
}

export default function GroupStatsPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [msg, setMsg] = useState('');

  const { data: group = null, isLoading: groupLoading } = useQuery({
    queryKey: queryKeys.group(id),
    queryFn: () => fetch(`/api/groups/${id}`).then(r => r.json()) as Promise<Group>,
  });

  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: queryKeys.expenses(id),
    queryFn: () => fetch(`/api/groups/${id}/expenses`).then(r => r.json()) as Promise<Expense[]>,
  });

  const loading = groupLoading || expensesLoading;

  const startPeriod = useMutation({
    mutationFn: () =>
      fetch(`/api/groups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_period' }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.group(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses(id) });
      setMsg('New period started!');
      setTimeout(() => setMsg(''), 3000);
    },
  });

  const undoPeriod = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/groups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'undo_period' }),
      });
      if (!res.ok) throw new Error('No previous period');
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.group(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses(id) });
      setMsg('Period restored!');
      setTimeout(() => setMsg(''), 3000);
    },
    onError: () => {
      setMsg('No previous period to restore');
      setTimeout(() => setMsg(''), 3000);
    },
  });

  const today = new Date().toISOString().split('T')[0];
  const periodStart = group?.period_start ?? today;
  const prevStart = group?.prev_period_start;

  // Current period expenses
  const curExpenses = expenses.filter(e => e.date >= periodStart);
  const curTotal = curExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const curCats = curExpenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
    return acc;
  }, {});
  const curSorted = Object.entries(curCats).sort((a, b) => b[1] - a[1]);
  const curMax = curSorted[0]?.[1] ?? 1;

  // Previous period
  const prevExpenses = expenses.filter(e => {
    if (e.date >= periodStart) return false;
    if (prevStart && e.date < prevStart) return false;
    return true;
  });
  const prevTotal = prevExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const prevCats = prevExpenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
    return acc;
  }, {});
  const prevSorted = Object.entries(prevCats).sort((a, b) => b[1] - a[1]);
  const prevMax = prevSorted[0]?.[1] ?? 1;

  const handleUndo = () => undoPeriod.mutate();

  const handleReload = () => {
    void Promise.all([
      queryClient.refetchQueries({ queryKey: queryKeys.group(id) }),
      queryClient.refetchQueries({ queryKey: queryKeys.expenses(id) }),
    ]);
  };

  if (loading) return <div className="p-4 text-sm text-gray-400">Loading...</div>;

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-xl font-bold">Stats</h1>
        <button
          type="button"
          onClick={handleReload}
          className="text-xs p-1.5 rounded border border-gray-600 text-gray-400 hover:text-gray-200 hover:border-gray-500"
          title="Refresh"
          aria-label="Refresh"
        >
          ↻
        </button>
      </div>
      <p className="text-xs text-gray-400 mb-4">Current period from {periodStart}</p>

      <div className="flex gap-2 mb-4">
        <button onClick={() => startPeriod.mutate()} disabled={startPeriod.isPending}
          className="flex-1 bg-white text-gray-900 rounded py-2 text-sm font-medium disabled:opacity-40">
          Start New Period
        </button>
        {prevStart && (
          <button onClick={handleUndo} disabled={undoPeriod.isPending}
            className="px-4 py-2 border border-gray-700 rounded text-sm text-gray-400">
            Undo
          </button>
        )}
      </div>
      {msg && <p className="text-green-600 text-sm mb-4">{msg}</p>}

      <div className="mb-6">
        <h2 className="text-sm font-semibold mb-3">Monthly spending (last 6 months)</h2>
        <MonthlyBars expenses={expenses} />
      </div>

      <div className="mb-6">
        <h2 className="text-sm font-semibold mb-3">Daily spending (current period)</h2>
        <DailyBars expenses={curExpenses} from={periodStart} />
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold">Current period</h2>
          <span className="font-bold text-sm">₹{curTotal.toLocaleString()}</span>
        </div>
        {curSorted.length === 0 ? (
          <p className="text-xs text-gray-400">No expenses in this period</p>
        ) : (
          <div className="space-y-2">
            {curSorted.map(([cat, amt]) => (
              <HBar key={cat} label={cat} value={amt} max={curMax} />
            ))}
          </div>
        )}
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold">Previous period</h2>
          <span className="font-bold text-sm">₹{prevTotal.toLocaleString()}</span>
        </div>
        {prevSorted.length === 0 ? (
          <p className="text-xs text-gray-400">No expenses in previous period</p>
        ) : (
          <div className="space-y-2">
            {prevSorted.map(([cat, amt]) => (
              <HBar key={cat} label={cat} value={amt} max={prevMax} />
            ))}
          </div>
        )}
      </div>

        <div className="h-14 mb-32" />
      <GroupNav groupId={id} />
    </div>
  );
}
