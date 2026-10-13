'use client';

import { useEffect, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import GroupNav from '@/components/GroupNav';
import { groupOptions, expensesOptions, categoriesOptions } from '@/lib/groupQueries';

export default function GroupLayout({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const client = useQueryClient();

  useEffect(() => {
    if (!id) return;
    void Promise.allSettled([
      client.prefetchQuery(groupOptions(id)),
      client.prefetchQuery(expensesOptions(id)),
      client.prefetchQuery(categoriesOptions(id)),
    ]);
  }, [client, id]);

  return <>{children}<GroupNav groupId={id} /></>;
}
