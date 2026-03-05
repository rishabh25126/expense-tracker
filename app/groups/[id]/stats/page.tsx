'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import GroupNav from '@/components/GroupNav';
import type { Expense, Group } from '@/types';

function HBar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 text-right text-xs text-gray-500 truncate">{label}</span>
      <div className="flex-1 bg-gray-100 rounded h-5">
        <div className="bg-black h-5 rounded transition-all" style={{ width: `${Math.max(Math.round((value / max) * 100), value > 0 ? 2 : 0)}%` }} />
      </div>
      <span className="text-xs font-medium w-16 text-right">₹{value.toLocaleString()}</span>
    </div>
  );
}

function DailyBars({ expenses, from }: { expenses: Expense[]; from: string }) {
  const today = new Date().toISOString().split('T')[0];
  const days: { date: string; label: string; total: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = d.toISOString().split('T')[0];
    if (date < from) continue;
    const total = expenses.filter(e => e.date === date).reduce((s, e) => s + Number(e.amount), 0);
    const label = date === today ? 'today' : date.slice(5);
    days.push({ date, label, total });
  }
  if (days.length === 0) return <p className="text-xs text-gray-400">No data yet</p>;
  const max = Math.max(...days.map(d => d.total), 1);
  return (
    <div className="flex items-end gap-0.5 h-24">
      {days.map(({ date, label, total }) => (
        <div key={date} className="flex-1 flex flex-col items-center gap-0.5">
          <div
            className="w-full bg-black rounded-t"
            style={{ height: `${Math.round((total / max) * 72)}px`, minHeight: total > 0 ? '3px' : '0' }}
          />
          <span className="text-[9px] text-gray-400 rotate-0 truncate w-full text-center">{label}</span>
        </div>
      ))}
    </div>
  );
}

export default function GroupStatsPage() {
  const { id } = useParams<{ id: string }>();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const reload = () =>
    Promise.all([
      fetch(`/api/groups/${id}`).then(r => r.json()),
      fetch(`/api/groups/${id}/expenses`).then(r => r.json()),
    ]).then(([g, e]) => { setGroup(g); setExpenses(e); setLoading(false); });

  useEffect(() => { reload(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Previous period (from prev_period_start or beginning of time, up to period_start)
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

  const flash = (text: string) => { setMsg(text); setTimeout(() => setMsg(''), 3000); };

  const startNewPeriod = async () => {
    if (!confirm('Start a new period from today? You can undo this.')) return;
    await fetch(`/api/groups/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start_period' }),
    });
    await reload();
    flash('New period started!');
  };

  const undoPeriod = async () => {
    const res = await fetch(`/api/groups/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'undo_period' }),
    });
    if (!res.ok) { flash('No previous period to restore'); return; }
    await reload();
    flash('Period restored!');
  };

  if (loading) return <div className="p-4 text-sm text-gray-400">Loading...</div>;

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-1">Stats</h1>
      <p className="text-xs text-gray-400 mb-4">Current period from {periodStart}</p>

      {/* Period control */}
      <div className="flex gap-2 mb-4">
        <button onClick={startNewPeriod}
          className="flex-1 bg-black text-white rounded py-2 text-sm font-medium">
          Start New Period
        </button>
        {prevStart && (
          <button onClick={undoPeriod}
            className="px-4 py-2 border rounded text-sm text-gray-600">
            Undo
          </button>
        )}
      </div>
      {msg && <p className="text-green-600 text-sm mb-4">{msg}</p>}

      {/* Daily chart */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold mb-3">Daily spending (current period)</h2>
        <DailyBars expenses={curExpenses} from={periodStart} />
      </div>

      {/* Current period */}
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

      {/* Previous period */}
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

      <div className="h-14" />
      <GroupNav groupId={id} />
    </div>
  );
}
