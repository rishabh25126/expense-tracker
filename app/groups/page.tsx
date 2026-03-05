'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Group } from '@/types';
import FeedbackButton from '@/components/FeedbackButton';
import { queryKeys } from '@/lib/queryKeys';

export default function GroupsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const { data: groups = [] } = useQuery({
    queryKey: queryKeys.groups,
    queryFn: () => fetch('/api/groups').then(r => r.json()) as Promise<Group[]>,
  });

  const createGroup = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      return res.json();
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
      setNewName('');
      router.push(`/groups/${created.id}/add`);
    },
  });

  const renameGroup = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await fetch(`/api/groups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rename', name: name.trim() }),
      });
      if (!res.ok) throw new Error('Rename failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
      setRenamingId(null);
      setRenameValue('');
    },
  });

  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/groups/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      return res.json();
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
      queryClient.removeQueries({ queryKey: queryKeys.group(id) });
      queryClient.removeQueries({ queryKey: queryKeys.expenses(id) });
      queryClient.removeQueries({ queryKey: queryKeys.categories(id) });
    },
  });

  const logout = useMutation({
    mutationFn: () => fetch('/api/auth', { method: 'DELETE' }),
    onSuccess: () => router.push('/login'),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    createGroup.mutate(newName.trim());
  };

  const startRename = (g: Group) => {
    setRenamingId(g.id);
    setRenameValue(g.name);
  };

  const saveRename = () => {
    if (!renamingId || !renameValue.trim()) return;
    renameGroup.mutate({ id: renamingId, name: renameValue.trim() });
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue('');
  };

  const handleDelete = (e: React.MouseEvent, g: Group) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete the tracker "${g.name}"? All its expenses and categories will be permanently removed. This cannot be undone.`)) return;
    deleteGroup.mutate(g.id);
  };

  return (
    <div className="min-h-screen p-4 max-w-sm mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">Trackers</h1>
        <button onClick={() => logout.mutate()} disabled={logout.isPending} className="text-xs text-gray-400">Logout</button>
      </div>

      {groups.length > 0 ? (
        <div className="space-y-2 mb-6">
          {groups.map(g => (
            <div
              key={g.id}
              className="border border-gray-700 bg-gray-900 rounded p-3 flex items-center gap-2"
            >
              {renamingId === g.id ? (
                <>
                  <input
                    type="text"
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Tracker name"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') cancelRename(); }}
                  />
                  <button type="button" onClick={saveRename} disabled={renameGroup.isPending || !renameValue.trim()} className="text-xs text-green-400 disabled:opacity-50">Save</button>
                  <button type="button" onClick={cancelRename} disabled={renameGroup.isPending} className="text-xs text-gray-400">Cancel</button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => router.push(`/groups/${g.id}/add`)}
                    className="flex-1 text-left font-medium text-sm hover:underline min-w-0"
                  >
                    <span className="truncate block">{g.name}</span>
                  </button>
                  <button type="button" onClick={() => startRename(g)} className="text-xs text-gray-400 shrink-0" title="Rename">Rename</button>
                  <button type="button" onClick={e => handleDelete(e, g)} className="text-xs text-red-400 shrink-0" title="Delete">Delete</button>
                  <span className="text-xs text-gray-500 shrink-0">→</span>
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 mb-6 text-center">No trackers yet. Create one below.</p>
      )}

      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          type="text" value={newName} onChange={e => setNewName(e.target.value)}
          placeholder="New tracker name"
          className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button type="submit" disabled={createGroup.isPending || !newName.trim()}
          className="bg-white text-gray-900 px-3 py-2 rounded text-sm disabled:opacity-40">
          Create
        </button>
      </form>

      <div className="mt-8 text-center">
        <FeedbackButton />
      </div>
    </div>
  );
}
