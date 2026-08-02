'use client';
import { useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NotificationRecord } from '@/types';
import { queryKeys } from '@/lib/queryKeys';

export default function NotificationsPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [dismissedToastId, setDismissedToastId] = useState<string | null>(null);
  const enabled = pathname !== '/login' && !pathname.startsWith('/auth/');

  const { data: notifications = [] } = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: async () => {
      const res = await fetch('/api/notifications');
      if (res.status === 401) return [];
      return res.json() as Promise<NotificationRecord[]>;
    },
    enabled,
    refetchInterval: 30000,
  });

  const unread = notifications.filter(n => !n.read_at);
  const toast = useMemo(
    () => unread.find(n => n.id !== dismissedToastId && pathname !== n.url),
    [unread, dismissedToastId, pathname],
  );

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  });

  if (!enabled) return null;
  if (notifications.length === 0 && !toast) return null;

  const view = (notification: NotificationRecord) => {
    markRead.mutate(notification.id);
    router.push(notification.url);
  };

  return (
    <>
      <div className="fixed top-3 right-3 z-40">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-xs shadow-lg"
        >
          Alerts{unread.length > 0 ? ` ${unread.length}` : ''}
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-1.5rem)] bg-gray-900 border border-gray-700 rounded p-2 shadow-xl space-y-2">
            {notifications.length === 0 ? (
              <p className="text-xs text-gray-500 p-2">No alerts</p>
            ) : notifications.slice(0, 8).map(notification => (
              <button
                key={notification.id}
                type="button"
                onClick={() => view(notification)}
                className="w-full text-left p-2 rounded hover:bg-gray-800"
              >
                <p className={`text-xs ${notification.read_at ? 'text-gray-400' : 'text-gray-100 font-medium'}`}>{notification.title}</p>
                <p className="text-xs text-gray-500 mt-1">{notification.body}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed left-3 right-3 bottom-24 z-40 max-w-sm mx-auto bg-gray-900 border border-gray-700 rounded p-3 shadow-xl">
          <p className="text-sm font-medium">{toast.title}</p>
          <p className="text-xs text-gray-400 mt-1">{toast.body}</p>
          <div className="flex gap-2 mt-3">
            <button type="button" onClick={() => view(toast)} className="flex-1 bg-white text-gray-900 rounded py-1.5 text-xs font-medium">
              View expenses
            </button>
            <button
              type="button"
              onClick={() => {
                setDismissedToastId(toast.id);
                markRead.mutate(toast.id);
              }}
              className="flex-1 border border-gray-700 rounded py-1.5 text-xs text-gray-300"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </>
  );
}
