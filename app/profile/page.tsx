'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PushNotificationsToggle from '@/components/PushNotificationsToggle';
import type { MeResponse } from '@/types';
import { queryKeys } from '@/lib/queryKeys';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899'];

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const { data } = useQuery({
    queryKey: queryKeys.me,
    queryFn: () => fetch('/api/me').then(r => r.json()) as Promise<MeResponse>,
  });

  const [name, setName] = useState('');
  const [color, setColor] = useState('');
  const profile = data?.profile;

  useEffect(() => {
    if (!profile) return;
    setName(profile.full_name ?? '');
    setColor(profile.color);
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: name, color, password: password || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Profile update failed');
      return json;
    },
    onSuccess: () => {
      setPassword('');
      setSaved(true);
      setError('');
      queryClient.invalidateQueries({ queryKey: queryKeys.me });
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="min-h-screen p-4 max-w-sm mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">Profile</h1>
        <button onClick={() => router.push('/groups')} className="text-xs text-gray-400">Groups</button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide">Email</label>
          <p className="text-sm text-gray-300 mt-1">{data?.user.email}</p>
        </div>

        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide">Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Display name"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide">Transaction color</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-9 h-9 rounded-full border-2 ${color === c ? 'border-white' : 'border-gray-800'}`}
                style={{ backgroundColor: c }}
                aria-label={`Select ${c}`}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide">New password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Leave blank to keep current"
          />
        </div>

        <PushNotificationsToggle />

        {error && <p className="text-sm text-red-400">{error}</p>}
        {saved && <p className="text-sm text-green-400">Saved</p>}
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending || !color}
          className="w-full bg-white text-gray-900 rounded py-2 text-sm font-medium disabled:opacity-40"
        >
          {save.isPending ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </div>
  );
}
