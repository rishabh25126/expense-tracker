'use client';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import GroupNav from '@/components/GroupNav';
import FeedbackButton from '@/components/FeedbackButton';
import type { Expense, Group } from '@/types';
import { queryKeys } from '@/lib/queryKeys';
import { colorFor, RECHARTS_THEME } from '@/lib/chartColors';
import type { PieLabelRenderProps } from 'recharts';

const PieChart = dynamic(() => import('recharts').then(m => m.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(m => m.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(m => m.Cell), { ssr: false });
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
    isLoading: insightsLoading,
    isError: insightsError,
  } = useQuery({
    queryKey: queryKeys.insights(id),
    queryFn: () => fetch(`/api/groups/${id}/insights`).then(r => r.json()) as Promise<InsightsResponse>,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const {
    data: digestData,
    isLoading: digestLoading,
  } = useQuery({
    queryKey: queryKeys.digest(id),
    queryFn: () => fetch(`/api/groups/${id}/insights?type=digest`).then(r => r.json()) as Promise<DigestResponse>,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 1000 * 60 * 60,
  });

  const logout = useMutation({
    mutationFn: () => fetch('/api/auth', { method: 'DELETE' }),
    onSuccess: () => router.push('/login'),
  });

  const loading = groupLoading || expensesLoading;
  const today = new Date().toISOString().split('T')[0];
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
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">{group?.name ?? 'Dashboard'}</h1>
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
        <div className="flex gap-3">
          <button onClick={() => router.push('/groups')} className="text-xs text-gray-400">Groups</button>
          <FeedbackButton />
          <button onClick={() => logout.mutate()} disabled={logout.isPending} className="text-xs text-gray-400">Logout</button>
        </div>
      </div>
      {periodStart && <p className="text-xs text-gray-400 mb-4">Period from {periodStart}</p>}

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="border border-gray-700 bg-gray-900 rounded p-3">
          <p className="text-xs text-gray-500">Today</p>
          {loading
            ? <div className="h-8 mt-1 bg-gray-800 rounded animate-pulse" />
            : <p className="text-2xl font-bold mt-1">₹{todayTotal.toLocaleString()}</p>}
        </div>
        <div className="border border-gray-700 bg-gray-900 rounded p-3">
          <p className="text-xs text-gray-500">This period</p>
          {loading
            ? <div className="h-8 mt-1 bg-gray-800 rounded animate-pulse" />
            : <p className="text-2xl font-bold mt-1">₹{periodTotal.toLocaleString()}</p>}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4 mb-6">
          <div className="h-4 w-40 bg-gray-800 rounded animate-pulse" />
          <div className="h-48 bg-gray-800 rounded animate-pulse" />
        </div>
      ) : (
        <>

          {sortedCategories.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold mb-2">This period by category</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={sortedCategories.map(([name, value]) => ({ name, value }))}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={(props: PieLabelRenderProps) => `${props.name ?? ''} ${(((props.percent as number) ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                    style={{ fontSize: 10 }}
                  >
                    {sortedCategories.map(([cat]) => (
                      <Cell key={cat} fill={colorFor(cat)} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `₹${Number(value).toLocaleString()}`}
                    contentStyle={{ backgroundColor: RECHARTS_THEME.tooltipBg, border: `1px solid ${RECHARTS_THEME.tooltipBorder}`, borderRadius: 6, fontSize: 12 }}
                    itemStyle={{ color: '#e5e7eb' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-2">
                {sortedCategories.map(([cat, amt]) => (
                  <div key={cat} className="flex justify-between text-sm">
                    <span className="text-gray-400">{cat}</span>
                    <span className="font-medium">₹{amt.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {periodExpenses.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold mb-2">Top 5 biggest spends</h2>
              <div className="space-y-2">
                {[...periodExpenses]
                  .sort((a, b) => Number(b.amount) - Number(a.amount))
                  .slice(0, 5)
                  .map((e, i) => (
                    <div key={e.id} className={`flex justify-between items-start text-sm p-2 rounded ${i === 0 ? 'border-l-2 border-indigo-500 bg-gray-900' : ''}`}>
                      <div className="flex gap-2 items-start min-w-0">
                        <span className="text-gray-500 text-xs mt-0.5">{i + 1}</span>
                        <div className="min-w-0">
                          <span className="text-gray-400 text-xs">{e.category}</span>
                          {e.description && <p className="text-gray-500 text-xs truncate">{e.description}</p>}
                          <p className="text-gray-600 text-xs">{e.date}</p>
                        </div>
                      </div>
                      <span className="font-bold whitespace-nowrap ml-2">₹{Number(e.amount).toLocaleString()}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="mb-6">
        <h2 className="text-sm font-semibold mb-2">Recent</h2>
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-6 bg-gray-800 rounded animate-pulse" />)}
          </div>
        ) : recent.length === 0 ? (
          <p className="text-sm text-gray-400">No expenses yet.</p>
        ) : (
          <div className="space-y-2">
            {recent.map(e => (
              <div key={e.id} className="flex justify-between text-sm border-b border-gray-800 pb-2">
                <div>
                  <span className="text-gray-400">{e.category}</span>
                  {e.description && <span className="text-gray-500 ml-2 text-xs">· {e.description}</span>}
                </div>
                <span className="font-medium">₹{Number(e.amount).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-6">
        <h2 className="text-sm font-semibold mb-2">Spending insights</h2>
        {insightsLoading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-4 bg-gray-800 rounded animate-pulse" style={{ width: `${70 + i * 10}%` }} />)}
          </div>
        ) : insightsError || insightsData?.error ? (
          <p className="text-sm text-red-400">Could not load insights. Try refreshing.</p>
        ) : !insightsData?.insights?.length ? (
          <p className="text-sm text-gray-400">Add a few expenses to see insights for this period.</p>
        ) : (
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-200">
            {insightsData.insights.map((insight, idx) => (
              <li key={idx}>{insight}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="mb-6">
        <h2 className="text-sm font-semibold mb-2">Weekly digest</h2>
        {digestLoading ? (
          <div className="space-y-2">
            <div className="h-4 bg-gray-800 rounded animate-pulse w-full" />
            <div className="h-4 bg-gray-800 rounded animate-pulse w-3/4" />
          </div>
        ) : digestData?.digest ? (
          <div className="border border-gray-700 bg-gray-900 rounded p-3">
            <p className="text-sm text-gray-200">{digestData.digest}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Add expenses this week to see your digest.</p>
        )}
      </div>

      <div className="h-14 mb-32" />
      <GroupNav groupId={id} />
    </div>
  );
}
