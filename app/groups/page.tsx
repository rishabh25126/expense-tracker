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

  const { data: groups = [], isLoading, isError: groupsError } = useQuery({
    queryKey: queryKeys.groups,
    queryFn: async () => { const res = await fetch('/api/groups'); if (!res.ok) throw new Error('Could not load trackers'); return res.json() as Promise<Group[]>; },
  });

  const createGroup = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error('Could not create tracker');
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
    <main id="main-content" className="app-page max-w-3xl">
      <div className="app-header">
        <div><h1 className="app-title">Trackers</h1><p className="app-subtitle">Choose a workspace or start a new one.</p></div>
        <button onClick={() => logout.mutate()} disabled={logout.isPending} className="secondary-action text-sm">Log out</button>
      </div>

      {isLoading ? <p className="muted" role="status">Loading trackers…</p> : groupsError ? <p role="alert" className="surface mb-8 p-6 text-red-400">Could not load trackers. Check your connection and refresh.</p> : groups.length > 0 ? (
        <div className="space-y-3 mb-8">
          {groups.map(g => (
            <div
              key={g.id}
              className="surface flex min-w-0 items-center gap-2 p-3 sm:p-4"
            >
              {renamingId === g.id ? (
                <>
                  <input
                    aria-label={`Rename ${g.name}`}
                    name="tracker-rename"
                    type="text"
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    className="field min-w-0 flex-1"
                    placeholder="Tracker name"
                    onKeyDown={e => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') cancelRename(); }}
                  />
                  <button type="button" onClick={saveRename} disabled={renameGroup.isPending || !renameValue.trim()} className="secondary-action text-sm text-emerald-400 disabled:opacity-50">Save</button>
                  <button type="button" onClick={cancelRename} disabled={renameGroup.isPending} className="secondary-action text-sm">Cancel</button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => router.push(`/groups/${g.id}/add`)}
                    className="min-w-0 flex-1 px-2 text-left text-base font-semibold hover:text-emerald-400"
                  >
                    <span className="truncate block">{g.name}</span>
                  </button>
                  <button type="button" onClick={() => startRename(g)} className="secondary-action shrink-0 text-sm" title="Rename">Rename</button>
                  <button type="button" onClick={e => handleDelete(e, g)} className="secondary-action danger-action shrink-0 text-sm" title="Delete">Delete</button>
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="surface mb-8 p-10 text-center text-gray-400">No trackers yet. Create your first workspace below.</p>
      )}

      <form onSubmit={handleCreate} className="surface space-y-3 p-5">
        <label htmlFor="new-tracker" className="field-label">New tracker</label>
        <div className="flex gap-2">
        <input
          id="new-tracker" name="tracker-name" autoComplete="off"
          type="text" value={newName} onChange={e => setNewName(e.target.value)}
          placeholder="e.g. Household…"
          className="field min-w-0 flex-1"
        />
        <button type="submit" disabled={createGroup.isPending || !newName.trim()}
          className="primary-action disabled:opacity-40">
          Create
        </button>
        </div>
        <p aria-live="polite" className="status-message text-red-400">{createGroup.isError ? 'Could not create tracker. Try again.' : ''}{renameGroup.isError ? 'Could not rename tracker.' : ''}{deleteGroup.isError ? 'Could not delete tracker.' : ''}</p>
      </form>

      <div className="mt-8 text-center">
        <FeedbackButton />
      </div>
    </main>
  );
}
