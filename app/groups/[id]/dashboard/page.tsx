'use client';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import GroupNav from '@/components/GroupNav';
import FeedbackButton from '@/components/FeedbackButton';
import type { Expense, Group } from '@/types';
import { queryKeys } from '@/lib/queryKeys';

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

      {loading ? <p className="text-sm text-gray-400">Loading...</p> : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="border border-gray-700 bg-gray-900 rounded p-3">
              <p className="text-xs text-gray-500">Today</p>
              <p className="text-2xl font-bold mt-1">₹{todayTotal.toLocaleString()}</p>
            </div>
            <div className="border border-gray-700 bg-gray-900 rounded p-3">
              <p className="text-xs text-gray-500">This period</p>
              <p className="text-2xl font-bold mt-1">₹{periodTotal.toLocaleString()}</p>
            </div>
          </div>

          {sortedCategories.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold mb-2">This period by category</h2>
              <div className="space-y-2">
                {sortedCategories.map(([cat, amt]) => (
                  <div key={cat} className="flex justify-between text-sm">
                    <span className="text-gray-400">{cat}</span>
                    <span className="font-medium">₹{amt.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-sm font-semibold mb-2">Recent</h2>
            {recent.length === 0 ? (
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
        </>
      )}

  <div className="h-14 mb-32" />
        <GroupNav groupId={id} />
    </div>
  );
}
