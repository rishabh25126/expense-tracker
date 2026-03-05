'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Group } from '@/types';
import FeedbackButton from '@/components/FeedbackButton';

export default function GroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch('/api/groups').then(r => r.json()).then(setGroups);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const created = await res.json();
    setCreating(false);
    setNewName('');
    router.push(`/groups/${created.id}/add`);
  };

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    router.push('/login');
  };

  return (
    <div className="min-h-screen p-4 max-w-sm mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">Trackers</h1>
        <button onClick={handleLogout} className="text-xs text-gray-400">Logout</button>
      </div>

      {groups.length > 0 ? (
        <div className="space-y-2 mb-6">
          {groups.map(g => (
            <button key={g.id} onClick={() => router.push(`/groups/${g.id}/add`)}
              className="w-full text-left border rounded p-3 flex justify-between items-center hover:bg-gray-50">
              <span className="font-medium text-sm">{g.name}</span>
              <span className="text-xs text-gray-400">→</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 mb-6 text-center">No trackers yet. Create one below.</p>
      )}

      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          type="text" value={newName} onChange={e => setNewName(e.target.value)}
          placeholder="New tracker name"
          className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
        <button type="submit" disabled={creating || !newName.trim()}
          className="bg-black text-white px-3 py-2 rounded text-sm disabled:opacity-40">
          Create
        </button>
      </form>

      <div className="mt-8 text-center">
        <FeedbackButton />
      </div>
    </div>
  );
}
