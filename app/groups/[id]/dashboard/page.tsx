'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { Cell } from 'recharts';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import GroupNav from '@/components/GroupNav';
import { formatINR } from '@/lib/format';
import FeedbackButton from '@/components/FeedbackButton';
import type { Expense, Group } from '@/types';
import { queryKeys } from '@/lib/queryKeys';
import { CHART_COLORS, RECHARTS_THEME } from '@/lib/chartColors';

const PieChart = dynamic(() => import('recharts').then(m => m.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(m => m.Pie), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });

type InsightsResponse = {
  insights: string[];
  error?: string;
};

type DigestResponse = {
  digest: string;
  error?: string;
};

export default function GroupDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [today, setToday] = useState('');
  useEffect(() => {
    const now = new Date();
    setToday(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
  }, []);

  const { data: group = null, isLoading: groupLoading } = useQuery({
    queryKey: queryKeys.group(id),
    queryFn: () => fetch(`/api/groups/${id}`).then(r => r.json()) as Promise<Group>,
  });

  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: queryKeys.expenses(id),
    queryFn: () => fetch(`/api/groups/${id}/expenses`).then(r => r.json()) as Promise<Expense[]>,
  });

  const {
    data: insightsData,
    isFetching: insightsLoading,
    isError: insightsError,
    refetch: fetchInsights,
  } = useQuery({
    queryKey: queryKeys.insights(id),
    queryFn: () => fetch(`/api/groups/${id}/insights`).then(r => r.json()) as Promise<InsightsResponse>,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: false,
  });

  const {
    data: digestData,
    isFetching: digestLoading,
    isError: digestError,
    refetch: fetchDigest,
  } = useQuery({
    queryKey: queryKeys.digest(id),
    queryFn: () => fetch(`/api/groups/${id}/insights?type=digest`).then(r => r.json()) as Promise<DigestResponse>,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: false,
  });

  const logout = useMutation({
    mutationFn: () => fetch('/api/auth', { method: 'DELETE' }),
    onSuccess: () => router.push('/login'),
  });

  const loading = groupLoading || expensesLoading;
  const periodStart = group?.period_start ?? '';

  const periodExpenses = expenses.filter(e => !periodStart || e.date >= periodStart);
  const todayTotal = expenses.filter(e => e.date === today).reduce((s, e) => s + Number(e.amount), 0);
  const periodTotal = periodExpenses.reduce((s, e) => s + Number(e.amount), 0);

  const categoryTotals = periodExpenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
    return acc;
  }, {});
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const recent = expenses.slice(0, 5);

  const handleReload = () => {
    void Promise.all([
      queryClient.refetchQueries({ queryKey: queryKeys.group(id) }),
      queryClient.refetchQueries({ queryKey: queryKeys.expenses(id) }),
      queryClient.refetchQueries({ queryKey: queryKeys.insights(id) }),
    ]);
  };

  return (
    <div id="main-content" className="app-page has-nav">
      <div className="app-header flex-wrap">
        <div className="flex items-center gap-2">
          <h1 className="app-title">{group?.name ?? 'Dashboard'}</h1>
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
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => router.push('/groups')} className="secondary-action text-sm lg:hidden">Trackers</button>
          <FeedbackButton />
          <button onClick={() => logout.mutate()} disabled={logout.isPending} className="secondary-action text-sm">Log out</button>
        </div>
      </div>
      {periodStart && <p className="text-xs text-gray-400 mb-4">Period from {periodStart}</p>}

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="surface min-w-0 p-5">
          <p className="text-xs text-gray-500">Today</p>
          {loading
            ? <div className="h-8 mt-1 bg-gray-800 rounded animate-pulse" />
            : <p className="mt-2 break-words text-3xl font-bold">{formatINR(todayTotal)}</p>}
        </div>
        <div className="surface min-w-0 p-5">
          <p className="text-xs text-gray-500">This period</p>
          {loading
            ? <div className="h-8 mt-1 bg-gray-800 rounded animate-pulse" />
            : <p className="mt-2 break-words text-3xl font-bold">{formatINR(periodTotal)}</p>}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4 mb-6">
          <div className="h-4 w-40 bg-gray-800 rounded animate-pulse" />
          <div className="h-48 bg-gray-800 rounded animate-pulse" />
        </div>
      ) : (
        <div className="grid min-w-0 gap-5 lg:grid-cols-2">

          {sortedCategories.length > 0 && (
            <section className="surface chart-panel p-5">
              <h2 className="section-title mb-4">This period by category</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    isAnimationActive={false}
                    data={sortedCategories.map(([name, value]) => ({ name, value }))}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={43}
                  >
                    {sortedCategories.map(([cat], index) => (
                      <Cell key={cat} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatINR(Number(value))}
                    contentStyle={{ backgroundColor: RECHARTS_THEME.tooltipBg, border: `1px solid ${RECHARTS_THEME.tooltipBorder}`, borderRadius: 6, fontSize: 12 }}
                    itemStyle={{ color: '#e5e7eb' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-2">
                {sortedCategories.map(([cat, amt]) => (
                  <div key={cat} className="flex min-w-0 justify-between gap-3 text-sm">
                    <span className="min-w-0 break-words text-gray-400">{cat}</span>
                    <span className="shrink-0 font-medium">{formatINR(amt)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {periodExpenses.length > 0 && (
            <section className="surface p-5">
              <h2 className="section-title mb-4">Top spends</h2>
              <div className="space-y-2">
                {[...periodExpenses]
                  .sort((a, b) => Number(b.amount) - Number(a.amount))
                  .slice(0, 5)
                  .map((e, i) => (
                    <div key={e.id} className={`flex justify-between items-start text-sm p-2 rounded ${i === 0 ? 'border-l-2 border-emerald-500 bg-gray-900' : ''}`}>
                      <div className="flex gap-2 items-start min-w-0">
                        <span className="text-gray-500 text-xs mt-0.5">{i + 1}</span>
                        <div className="min-w-0">
                          <span className="text-gray-400 text-xs">{e.category}</span>
                          {e.description && <p className="break-words text-sm text-gray-400">{e.description}</p>}
                          <p className="text-gray-600 text-xs">{e.date}</p>
                        </div>
                      </div>
                      <span className="font-bold whitespace-nowrap ml-2">{formatINR(e.amount)}</span>
                    </div>
                  ))}
              </div>
            </section>
          )}
        </div>
      )}

      <section className="surface mb-5 p-5">
        <h2 className="section-title mb-4">Recent expenses</h2>
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-6 bg-gray-800 rounded animate-pulse" />)}
          </div>
        ) : recent.length === 0 ? (
          <p className="text-sm text-gray-400">No expenses yet.</p>
        ) : (
          <div className="space-y-2">
            {recent.map(e => (
              <div key={e.id} data-ui="expense-row" className="flex min-w-0 justify-between gap-3 border-b border-gray-700 pb-3 text-sm last:border-0">
                <div className="min-w-0 break-words">
                  <span className="text-gray-400">{e.category}</span>
                  {e.description && <span className="text-gray-500 ml-2 text-xs">· {e.description}</span>}
                </div>
                <span className="font-medium">{formatINR(e.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="surface mb-5 p-5">
        <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
          <h2 className="section-title">Spending insights</h2>
          <button
            onClick={() => { fetchInsights(); fetchDigest(); }}
            disabled={insightsLoading || digestLoading}
            className="primary-action flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <svg className={`w-3.5 h-3.5 ${insightsLoading || digestLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
              <path d="M5 3v4M3 5h4"/>
            </svg>
            {insightsLoading || digestLoading ? 'Generating...' : 'Generate AI Insights'}
          </button>
        </div>
        {!insightsData && !insightsLoading && !insightsError ? (
           <p className="text-sm text-gray-400 mt-2">Click the button to generate AI insights about your spending patterns.</p>
        ) : insightsLoading ? (
          <div className="space-y-2 mt-3">
            {[1,2,3].map(i => <div key={i} className="h-4 bg-gray-800 rounded animate-pulse" style={{ width: `${70 + i * 10}%` }} />)}
          </div>
        ) : insightsError || insightsData?.error ? (
          <p className="text-sm text-red-400 mt-3">Could not load insights. Try again.</p>
        ) : !insightsData?.insights?.length ? (
          <p className="text-sm text-gray-400 mt-3">Add a few expenses to see insights for this period.</p>
        ) : (
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 mt-3">
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-200">
              {insightsData.insights.map((insight, idx) => (
                <li key={idx} className="leading-snug">{insight}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="surface mb-5 p-5">
        <h2 className="section-title mb-4">Weekly digest</h2>
        {!digestData && !digestLoading && !digestError ? (
           <p className="text-sm text-gray-400 mt-2">Click the button above to generate your weekly AI digest.</p>
        ) : digestLoading ? (
          <div className="space-y-2 mt-3">
            <div className="h-4 bg-gray-800 rounded animate-pulse w-full" />
            <div className="h-4 bg-gray-800 rounded animate-pulse w-3/4" />
          </div>
        ) : digestError || digestData?.error ? (
          <p className="text-sm text-red-400 mt-3">Could not load digest. Try again.</p>
        ) : digestData?.digest ? (
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 mt-3">
            <p className="text-sm text-gray-200 leading-snug">{digestData.digest}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-400 mt-3">Add expenses this week to see your digest.</p>
        )}
      </section>

      <div className="hidden" />
      <GroupNav groupId={id} />
    </div>
  );
}
