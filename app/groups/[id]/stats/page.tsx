'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarRange } from 'lucide-react';
import type { Group } from '@/types';
import { formatDate, formatINR } from '@/lib/format';
import { groupOptions, expensesOptions, refreshGroupData } from '@/lib/groupQueries';
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

const INDIA_TIME_ZONE = 'Asia/Kolkata';

function todayInIndia() {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: INDIA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function shiftISODate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function checkedGroupResponse(response: Response) {
  const body = await response.json().catch(() => null) as (Group & { error?: string }) | null;
  if (!response.ok) throw new Error(body?.error || 'Could not update the period. Try again.');
  return body as Group;
}

export default function GroupStatsPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const today = todayInIndia();
  const [selectedDate, setSelectedDate] = useState(today);

  const { data: group = null, isLoading: groupLoading } = useQuery(groupOptions(id));

  const { data: rawExpenses = [], isLoading: expensesLoading } = useQuery(expensesOptions(id));

  const startPeriod = useMutation({
    mutationFn: (periodStart: string) => fetch(`/api/groups/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start_period', periodStart }),
    }).then(checkedGroupResponse),
    onSuccess: () => {
      refreshGroupData(queryClient, id);
    }
  });

  const undoPeriod = useMutation({
    mutationFn: () => fetch(`/api/groups/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'undo_period' }),
    }).then(checkedGroupResponse),
    onSuccess: () => {
      refreshGroupData(queryClient, id);
    }
  });

  const expenses = Array.isArray(rawExpenses) ? rawExpenses : [];

  const periodStart = group?.period_start ?? '';
  const earliestNewStart = periodStart ? shiftISODate(periodStart, 1) : '';
  const canStartPeriod = Boolean(earliestNewStart && earliestNewStart <= today);
  const previousPeriodEnd = selectedDate ? shiftISODate(selectedDate, -1) : '';
  const periodPending = startPeriod.isPending || undoPeriod.isPending;
  const periodError = startPeriod.error?.message || undoPeriod.error?.message || '';
  const periodSuccess = startPeriod.isSuccess
    ? `New period started on ${formatDate(startPeriod.data.period_start)}.`
    : undoPeriod.isSuccess
      ? `Period restored to ${formatDate(undoPeriod.data.period_start)}.`
      : '';

  useEffect(() => {
    if (!canStartPeriod) return;
    setSelectedDate(current => current >= earliestNewStart && current <= today ? current : today);
  }, [canStartPeriod, earliestNewStart, today]);

  const currentPeriodExpenses = expenses.filter(e => !periodStart || e.date >= periodStart);

  const catTotals: Record<string, number> = {};
  currentPeriodExpenses.forEach(e => {
    catTotals[e.category] = (catTotals[e.category] || 0) + Number(e.amount);
  });

  return (
    <div id="main-content" className="app-page has-nav">
      <div className="app-header flex-wrap">
        <div><h1 className="app-title">Stats</h1><p className="app-subtitle">Patterns across your spending.</p></div>
      </div>

      {groupLoading || expensesLoading ? (
        <div className="grid gap-5 sm:grid-cols-2" role="status" aria-label="Loading stats">
          <div className="surface h-32 animate-pulse" />
          <div className="surface h-32 animate-pulse" />
          <div className="surface h-64 animate-pulse" />
          <div className="surface h-64 animate-pulse" />
        </div>
      ) : <>
      {group && (
        <section className="surface mb-6 overflow-hidden" aria-labelledby="period-settings-title">
          <div className="flex flex-col gap-4 border-b border-[#314139] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-900 bg-emerald-950/60 text-emerald-400">
                <CalendarRange aria-hidden="true" size={21} strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <h2 id="period-settings-title" className="section-title">Period Settings</h2>
                <p className="mt-1 text-sm text-gray-400">
                  Current period started <span className="font-medium text-gray-200">{formatDate(periodStart)}</span>
                </p>
              </div>
            </div>
            {group.prev_period_start && (
              <button
                type="button"
                onClick={() => { startPeriod.reset(); undoPeriod.mutate(); }}
                disabled={periodPending}
                className="secondary-action shrink-0 text-sm disabled:opacity-50"
              >
                {undoPeriod.isPending ? 'Restoring…' : 'Undo Last Period Start'}
              </button>
            )}
          </div>

          <div className="p-5 sm:p-6">
            {canStartPeriod ? (
              <form
                className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
                onSubmit={event => {
                  event.preventDefault();
                  undoPeriod.reset();
                  startPeriod.mutate(selectedDate);
                }}
              >
                <div className="min-w-0">
                  <label htmlFor="period-start-date" className="field-label">New Period Start Date</label>
                  <input
                    id="period-start-date"
                    name="periodStart"
                    type="date"
                    autoComplete="off"
                    required
                    min={earliestNewStart}
                    max={today}
                    value={selectedDate}
                    onChange={event => {
                      setSelectedDate(event.target.value);
                      startPeriod.reset();
                      undoPeriod.reset();
                    }}
                    aria-describedby="period-start-preview"
                    className="field sm:max-w-xs"
                  />
                  <p id="period-start-preview" className="mt-3 text-sm leading-6 text-gray-400">
                    {selectedDate ? <>
                      Expenses from <span className="font-medium text-gray-200">{formatDate(selectedDate)}</span> onward will appear in the new period. The previous period will end on {formatDate(previousPeriodEnd)}.
                    </> : 'Choose a start date to preview the new period boundary.'}
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={periodPending}
                  className="primary-action w-full whitespace-nowrap text-sm disabled:opacity-50 sm:w-auto"
                >
                  {startPeriod.isPending ? 'Starting…' : 'Start New Period'}
                </button>
              </form>
            ) : (
              <p className="text-sm leading-6 text-gray-400">
                This period already starts today. You can start the next period tomorrow.
              </p>
            )}
            <p aria-live="polite" className={`status-message mt-3 ${periodError ? 'text-red-400' : 'text-emerald-400'}`}>
              {periodError || periodSuccess}
            </p>
          </div>
        </section>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="surface min-w-0 p-5">
           <p className="text-xs text-gray-400">Total Expenses (Current Period)</p>
           <p className="mt-2 break-words text-3xl font-bold text-emerald-400">{formatINR(currentPeriodExpenses.reduce((s, e) => s + Number(e.amount), 0))}</p>
        </div>
        <div className="surface min-w-0 p-5">
           <p className="text-xs text-gray-400">Categories Used (Current Period)</p>
           <p className="mt-2 text-3xl font-bold text-emerald-400">{Object.keys(catTotals).length}</p>
        </div>
      </div>

      <div className="grid min-w-0 gap-5 lg:grid-cols-2">
      <section className="surface chart-panel p-5">
        <h2 className="section-title mb-5">Monthly spending</h2>
        {(() => {
          const monthlyData: { label: string; amount: number }[] = [];
          for (let i = 11; i >= 0; i--) {
            const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
            const year = d.getFullYear();
            const monthStr = String(d.getMonth() + 1).padStart(2, '0');
            const key = `${year}-${monthStr}`;
            const label = new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(d);
            const total = expenses.filter(e => e.date.startsWith(key)).reduce((s, e) => s + Number(e.amount), 0);
            monthlyData.push({ label, amount: total });
          }
          return (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={monthlyData} margin={{ top: 10, right: 12, left: -12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={RECHARTS_THEME.gridStroke} />
                <XAxis dataKey="label" tick={{ fill: RECHARTS_THEME.textFill, fontSize: 11 }} stroke={RECHARTS_THEME.axisStroke} />
                <YAxis tick={{ fill: RECHARTS_THEME.textFill, fontSize: 11 }} stroke={RECHARTS_THEME.axisStroke} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip
                  formatter={(value) => [formatINR(Number(value)), 'Spent']}
                  contentStyle={{ backgroundColor: RECHARTS_THEME.tooltipBg, border: `1px solid ${RECHARTS_THEME.tooltipBorder}`, borderRadius: 6, fontSize: 12 }}
                  itemStyle={{ color: '#e5e7eb' }}
                />
                <Line isAnimationActive={false} type="monotone" dataKey="amount" stroke="#3ecf8e" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          );
        })()}
      </section>

      <section className="surface chart-panel p-5">
        <h2 className="section-title mb-5">Categories this period</h2>
        {(() => {
          const catTotals: Record<string, number> = {};
          currentPeriodExpenses.forEach(e => {
            catTotals[e.category] = (catTotals[e.category] || 0) + Number(e.amount);
          });
          const categoryData = Object.entries(catTotals)
            .map(([category, amount]) => ({ category, amount }))
            .sort((a, b) => b.amount - a.amount);

          if (categoryData.length === 0) {
            return <p className="text-sm text-gray-400">No expenses this period yet.</p>;
          }

          return (
            <ResponsiveContainer width="100%" height={Math.max(100, categoryData.length * 50 + 50)}>
              <BarChart data={categoryData} layout="vertical" margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={RECHARTS_THEME.gridStroke} horizontal={true} vertical={false}/>
                <XAxis type="number" tick={{ fill: RECHARTS_THEME.textFill, fontSize: 11 }} stroke={RECHARTS_THEME.axisStroke} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <YAxis dataKey="category" type="category" tick={{ fill: RECHARTS_THEME.textFill, fontSize: 11 }} tickFormatter={value => String(value).length > 11 ? `${String(value).slice(0, 10)}…` : String(value)} stroke={RECHARTS_THEME.axisStroke} width={78} />
                <Tooltip
                  formatter={(value) => formatINR(Number(value))}
                  contentStyle={{ backgroundColor: RECHARTS_THEME.tooltipBg, border: `1px solid ${RECHARTS_THEME.tooltipBorder}`, borderRadius: 6, fontSize: 12 }}
                  itemStyle={{ color: '#e5e7eb' }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar isAnimationActive={false} dataKey="amount" fill="#3ecf8e" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          );
        })()}
      </section>
      </div>

      </>}
    </div>
  );
}
