'use client';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import GroupNav from '@/components/GroupNav';
import type { Expense, Group } from '@/types';
import { queryKeys } from '@/lib/queryKeys';
import { RECHARTS_THEME } from '@/lib/chartColors';

const LineChart = dynamic(() => import('recharts').then(m => m.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then(m => m.Line), { ssr: false });
const BarChart = dynamic(() => import('recharts').then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(m => m.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const LabelList = dynamic(() => import('recharts').then(m => m.LabelList), { ssr: false });

export default function GroupStatsPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: group = null, isLoading: groupLoading } = useQuery({
    queryKey: queryKeys.group(id),
    queryFn: () => fetch(`/api/groups/${id}`).then(r => r.json()) as Promise<Group>,
  });

  const { data: rawExpenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: queryKeys.expenses(id),
    queryFn: () => fetch(`/api/groups/${id}/expenses`).then(r => r.json()) as Promise<Expense[]>,
  });

  const startPeriod = useMutation({
    mutationFn: () => fetch(`/api/groups/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'start_period' }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.group(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses(id) });
    }
  });

  const undoPeriod = useMutation({
    mutationFn: () => fetch(`/api/groups/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'undo_period' }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.group(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses(id) });
    }
  });

  const expenses = Array.isArray(rawExpenses) ? rawExpenses : [];

  if (groupLoading || expensesLoading) return <div className="p-4 text-sm text-gray-400">Loading...</div>;

  const periodStart = group?.period_start ?? '';
  const currentPeriodExpenses = expenses.filter(e => !periodStart || e.date >= periodStart);

  const catTotals: Record<string, number> = {};
  currentPeriodExpenses.forEach(e => {
    catTotals[e.category] = (catTotals[e.category] || 0) + Number(e.amount);
  });

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Stats</h1>
        <div className="flex gap-2">
          {group?.prev_period_start && (
            <button
              onClick={() => { if (confirm('Undo start period?')) undoPeriod.mutate(); }}
              disabled={undoPeriod.isPending}
              className="text-xs px-3 py-1.5 rounded border border-gray-700 text-gray-400 disabled:opacity-50"
            >
              Undo
            </button>
          )}
          <button
            onClick={() => { if (confirm('Start a new period? This will reset your current period stats.')) startPeriod.mutate(); }}
            disabled={startPeriod.isPending}
            className="text-xs px-3 py-1.5 rounded bg-white text-gray-900 font-medium disabled:opacity-50"
          >
            Start New Period
          </button>
        </div>
      </div>

      <div className="flex gap-3 mb-8 text-center">
        <div className="border border-gray-700 bg-gray-900/50 rounded-lg p-3 flex-1">
           <p className="text-xs text-gray-400">Total Expenses (Current Period)</p>
           <p className="text-xl font-bold mt-1 text-indigo-400">₹{currentPeriodExpenses.reduce((s, e) => s + Number(e.amount), 0).toLocaleString()}</p>
        </div>
        <div className="border border-gray-700 bg-gray-900/50 rounded-lg p-3 flex-1">
           <p className="text-xs text-gray-400">Categories Used (Current Period)</p>
           <p className="text-xl font-bold mt-1 text-indigo-400">{Object.keys(catTotals).length}</p>
        </div>
      </div>

      <div className="mb-10">
        <h2 className="text-sm font-semibold mb-3">Monthly spending (last 12 months)</h2>
        {(() => {
          const monthlyData: { label: string; amount: number }[] = [];
          for (let i = 11; i >= 0; i--) {
            const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
            const year = d.getFullYear();
            const monthStr = String(d.getMonth() + 1).padStart(2, '0');
            const key = `${year}-${monthStr}`;
            const label = d.toLocaleString('default', { month: 'short' });
            const total = expenses.filter(e => e.date.startsWith(key)).reduce((s, e) => s + Number(e.amount), 0);
            monthlyData.push({ label, amount: total });
          }
          return (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
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
        <h2 className="text-sm font-semibold mb-3">Category-wise spends (Current Period)</h2>
        {(() => {
          const catTotals: Record<string, number> = {};
          currentPeriodExpenses.forEach(e => {
            catTotals[e.category] = (catTotals[e.category] || 0) + Number(e.amount);
          });
          const categoryData = Object.entries(catTotals)
            .map(([category, amount]) => ({ category, amount }))
            .sort((a, b) => b.amount - a.amount);
            
          if (categoryData.length === 0) {
            return <p className="text-xs text-gray-400">No expenses yet</p>;
          }

          return (
            <ResponsiveContainer width="100%" height={Math.max(100, categoryData.length * 50 + 50)}>
              <BarChart data={categoryData} layout="vertical" margin={{ top: 10, right: 60, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={RECHARTS_THEME.gridStroke} horizontal={true} vertical={false}/>
                <XAxis type="number" tick={{ fill: RECHARTS_THEME.textFill, fontSize: 11 }} stroke={RECHARTS_THEME.axisStroke} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <YAxis dataKey="category" type="category" tick={{ fill: RECHARTS_THEME.textFill, fontSize: 11 }} stroke={RECHARTS_THEME.axisStroke} width={70} />
                <Tooltip
                  formatter={(value) => `₹${Number(value).toLocaleString()}`}
                  contentStyle={{ backgroundColor: RECHARTS_THEME.tooltipBg, border: `1px solid ${RECHARTS_THEME.tooltipBorder}`, borderRadius: 6, fontSize: 12 }}
                  itemStyle={{ color: '#e5e7eb' }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar dataKey="amount" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={24}>
                  <LabelList 
                    dataKey="amount" 
                    position="right" 
                    formatter={(value: any) => `₹${Number(value || 0).toLocaleString()}`} 
                    fill={RECHARTS_THEME.textFill} 
                    fontSize={11} 
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          );
        })()}
      </div>

      <div className="h-14 mb-32" />
      <GroupNav groupId={id} />
    </div>
  );
}
