'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import GroupNav from '@/components/GroupNav';
import type { Expense, Group } from '@/types';
import { queryKeys } from '@/lib/queryKeys';
import { colorFor, RECHARTS_THEME } from '@/lib/chartColors';

const LineChart = dynamic(() => import('recharts').then(m => m.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then(m => m.Line), { ssr: false });
const BarChart = dynamic(() => import('recharts').then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(m => m.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });
const Legend = dynamic(() => import('recharts').then(m => m.Legend), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });

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
      queryClient.invalidateQueries({ queryKey: queryKeys.insights(id) });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.insights(id) });
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
        <h2 className="text-sm font-semibold mb-3">Monthly spending (last 12 months)</h2>
        {(() => {
          const monthlyData: { label: string; amount: number }[] = [];
          for (let i = 11; i >= 0; i--) {
            const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
            const key = d.toISOString().slice(0, 7);
            const label = d.toLocaleString('default', { month: 'short' });
            const total = expenses.filter(e => e.date.startsWith(key)).reduce((s, e) => s + Number(e.amount), 0);
            monthlyData.push({ label, amount: total });
          }
          return (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={RECHARTS_THEME.gridStroke} />
                <XAxis dataKey="label" tick={{ fill: RECHARTS_THEME.textFill, fontSize: 11 }} stroke={RECHARTS_THEME.axisStroke} />
                <YAxis tick={{ fill: RECHARTS_THEME.textFill, fontSize: 11 }} stroke={RECHARTS_THEME.axisStroke} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip
                  formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Spent']}
                  contentStyle={{ backgroundColor: RECHARTS_THEME.tooltipBg, border: `1px solid ${RECHARTS_THEME.tooltipBorder}`, borderRadius: 6, fontSize: 12 }}
                  itemStyle={{ color: '#e5e7eb' }}
                />
                <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          );
        })()}
      </div>

      <div className="mb-6">
        <h2 className="text-sm font-semibold mb-3">Daily spending (current period)</h2>
        <DailyBars expenses={curExpenses} from={periodStart} />
      </div>

      <div className="mb-6">
        <h2 className="text-sm font-semibold mb-3">Spending heatmap (last 90 days)</h2>
        {(() => {
          const dailyTotals: Record<string, number> = {};
          for (const e of expenses) dailyTotals[e.date] = (dailyTotals[e.date] || 0) + Number(e.amount);
          const maxAmt = Math.max(...Object.values(dailyTotals), 1);

          const days: { date: string; dow: number; weekIdx: number; amount: number }[] = [];
          const todayDate = new Date();
          const startDate = new Date(todayDate); startDate.setDate(startDate.getDate() - 89);
          const startDow = startDate.getDay();
          for (let i = 0; i < 90; i++) {
            const d = new Date(startDate); d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            const globalIdx = startDow + i;
            days.push({ date: dateStr, dow: globalIdx % 7, weekIdx: Math.floor(globalIdx / 7), amount: dailyTotals[dateStr] || 0 });
          }
          const weeks = days.reduce<Record<number, typeof days>>((acc, d) => { (acc[d.weekIdx] ||= []).push(d); return acc; }, {});
          const weekKeys = Object.keys(weeks).map(Number).sort((a, b) => a - b);

          return (
            <div className="overflow-x-auto">
              <div className="flex gap-0.5" style={{ minWidth: 'fit-content' }}>
                <div className="flex flex-col gap-0.5 mr-1">
                  {['S','M','T','W','T','F','S'].map((d, i) => (
                    <div key={i} className="w-3 h-3 text-[7px] text-gray-500 flex items-center justify-center">{i % 2 === 1 ? d : ''}</div>
                  ))}
                </div>
                {weekKeys.map(wk => (
                  <div key={wk} className="flex flex-col gap-0.5">
                    {Array.from({ length: 7 }, (_, dow) => {
                      const cell = weeks[wk]?.find(d => d.dow === dow);
                      if (!cell) return <div key={dow} className="w-3 h-3" />;
                      const opacity = cell.amount === 0 ? 0.05 : 0.15 + 0.85 * (cell.amount / maxAmt);
                      return (
                        <div
                          key={dow}
                          className="w-3 h-3 rounded-sm"
                          style={{ backgroundColor: `rgba(99, 102, 241, ${opacity})` }}
                          title={`${cell.date}: ₹${cell.amount.toLocaleString()}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold">Period comparison</h2>
          <div className="text-xs text-gray-400">
            Current ₹{curTotal.toLocaleString()} · Previous ₹{prevTotal.toLocaleString()}
          </div>
        </div>
        {curSorted.length === 0 && prevSorted.length === 0 ? (
          <p className="text-xs text-gray-400">No expenses to compare</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={(() => {
              const allCats = new Set([...Object.keys(curCats), ...Object.keys(prevCats)]);
              return [...allCats].map(cat => ({
                category: cat,
                current: curCats[cat] || 0,
                previous: prevCats[cat] || 0,
              })).sort((a, b) => b.current - a.current);
            })()}>
              <CartesianGrid strokeDasharray="3 3" stroke={RECHARTS_THEME.gridStroke} />
              <XAxis dataKey="category" tick={{ fill: RECHARTS_THEME.textFill, fontSize: 10 }} stroke={RECHARTS_THEME.axisStroke} angle={-30} textAnchor="end" height={50} />
              <YAxis tick={{ fill: RECHARTS_THEME.textFill, fontSize: 11 }} stroke={RECHARTS_THEME.axisStroke} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              <Tooltip
                formatter={(value) => `₹${Number(value).toLocaleString()}`}
                contentStyle={{ backgroundColor: RECHARTS_THEME.tooltipBg, border: `1px solid ${RECHARTS_THEME.tooltipBorder}`, borderRadius: 6, fontSize: 12 }}
                itemStyle={{ color: '#e5e7eb' }}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: RECHARTS_THEME.textFill }} />
              <Bar dataKey="current" fill="#6366f1" name="Current" radius={[2, 2, 0, 0]} />
              <Bar dataKey="previous" fill="#6b7280" name="Previous" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

        <div className="h-14 mb-32" />
      <GroupNav groupId={id} />
    </div>
  );
}
