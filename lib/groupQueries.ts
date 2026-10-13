import { queryOptions, type QueryClient } from '@tanstack/react-query';
import type { Category, Expense, Group } from '@/types';
import { queryKeys } from '@/lib/queryKeys';

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load data (${response.status})`);
  return response.json() as Promise<T>;
}

export const groupOptions = (id: string) => queryOptions({
  queryKey: queryKeys.group(id),
  queryFn: () => getJson<Group>(`/api/groups/${id}`),
});

export const expensesOptions = (id: string) => queryOptions({
  queryKey: queryKeys.expenses(id),
  queryFn: () => getJson<Expense[]>(`/api/groups/${id}/expenses`),
});

export const categoriesOptions = (id: string) => queryOptions({
  queryKey: queryKeys.categories(id),
  queryFn: () => getJson<Category[]>(`/api/groups/${id}/categories`),
});

// Refresh the shared data even when its screen is not mounted. The save UI never waits
// for these requests; React Query keeps the prior result visible while refreshing.
export function refreshGroupData(client: QueryClient, id: string) {
  void Promise.allSettled([
    client.fetchQuery({ ...groupOptions(id), staleTime: 0 }),
    client.fetchQuery({ ...expensesOptions(id), staleTime: 0 }),
    client.fetchQuery({ ...categoriesOptions(id), staleTime: 0 }),
    client.fetchQuery({
      queryKey: queryKeys.groups,
      queryFn: () => getJson<Group[]>('/api/groups'),
      staleTime: 0,
    }),
  ]);
  void client.invalidateQueries({ queryKey: queryKeys.insights(id), refetchType: 'none' });
  void client.invalidateQueries({ queryKey: queryKeys.digest(id), refetchType: 'none' });
}
