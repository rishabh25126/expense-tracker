'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import GroupNav from '@/components/GroupNav';
import type { Category } from '@/types';
import { queryKeys } from '@/lib/queryKeys';
import CategoryIcon from '@/components/CategoryIcon';
import CategoryIconPicker from '@/components/CategoryIconPicker';
import { iconForCategory, type CategoryIconId } from '@/lib/categoryIcons';

const DEFAULTS = ['Food', 'Travel', 'Rent', 'Shopping', 'Bills', 'Other'];

export default function GroupCategoriesPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState<CategoryIconId | null>(null);
  const [editingIconId, setEditingIconId] = useState<string | null>(null);
  const [editingIcon, setEditingIcon] = useState<CategoryIconId | null>(null);

  const { data: categories = [], isLoading, isError: categoriesError } = useQuery({
    queryKey: queryKeys.categories(id),
    queryFn: async () => { const res = await fetch(`/api/groups/${id}/categories`); if (!res.ok) throw new Error('Could not load categories'); return res.json() as Promise<Category[]>; },
  });

  const createCategory = useMutation({
    mutationFn: async ({ name, icon }: { name: string; icon: CategoryIconId }) => {
      const res = await fetch(`/api/groups/${id}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), icon }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not add category');
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories(id) });
      setNewName('');
      setNewIcon(null);
    },
  });

  const updateIcon = useMutation({
    mutationFn: async ({ cid, icon }: { cid: string; icon: CategoryIconId }) => {
      const res = await fetch(`/api/groups/${id}/categories/${cid}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ icon }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not update icon');
      return body as Category;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories(id) });
      setEditingIconId(null);
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (cid: string) => {
      const res = await fetch(`/api/groups/${id}/categories/${cid}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Could not delete category');
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories(id) });
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newIcon || [...DEFAULTS, ...categories.map(c => c.name)].some(name => name.toLowerCase() === newName.trim().toLowerCase())) return;
    createCategory.mutate({ name: newName.trim(), icon: newIcon });
  };

  const handleDelete = (cid: string) => {
    if (!confirm('Delete category?')) return;
    deleteCategory.mutate(cid);
  };

  const handleReload = () => {
    void queryClient.refetchQueries({ queryKey: queryKeys.categories(id) });
  };

  return (
    <div id="main-content" className="app-page has-nav narrow">
      <div className="app-header">
        <div><h1 className="app-title">Categories</h1><p className="app-subtitle">Organize expenses your way.</p></div>
        <button
          type="button"
          onClick={handleReload}
          className="secondary-action text-lg"
          title="Refresh"
          aria-label="Refresh"
        >
          ↻
        </button>
      </div>

      <section className="surface mb-5 p-5">
        <h2 className="section-title mb-4">Default categories</h2>
        <div className="flex flex-wrap gap-2">
          {DEFAULTS.map(d => <span key={d} className="flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-800 p-2 pr-3 text-sm text-gray-200"><CategoryIcon icon={iconForCategory(d)} className="h-9 w-9 rounded-lg" />{d}</span>)}
        </div>
      </section>

      <section className="surface mb-5 p-5">
          <h2 className="section-title mb-4">Your categories</h2>
          {isLoading && <p role="status" className="muted">Loading categories…</p>}
          {categoriesError && <p role="alert" className="text-red-400">Could not load categories.</p>}
          {!isLoading && categories.length === 0 && <p className="muted text-sm">Add a category to personalize your tracker.</p>}
          <div className="space-y-2">
            {categories.map(c => (
              <div key={c.id} data-ui="category-row" className="border-b border-gray-700 py-3 last:border-0">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-3 break-words text-sm"><CategoryIcon icon={iconForCategory(c.name, c.icon)} fallbackName={c.name} />{c.name}</span>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => { setEditingIconId(c.id); setEditingIcon(iconForCategory(c.name, c.icon)); }} className="secondary-action text-sm">Icon</button>
                    <button onClick={() => handleDelete(c.id)} disabled={deleteCategory.isPending} className="secondary-action danger-action text-sm">Delete</button>
                  </div>
                </div>
                {editingIconId === c.id && <div className="mt-4 space-y-3">
                  <CategoryIconPicker value={editingIcon} onChange={setEditingIcon} label={`Icon for ${c.name}`} />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { if (editingIcon) updateIcon.mutate({ cid: c.id, icon: editingIcon }); }} disabled={updateIcon.isPending || !editingIcon} className="primary-action text-sm disabled:opacity-40">Save icon</button>
                    <button type="button" onClick={() => setEditingIconId(null)} className="secondary-action text-sm">Cancel</button>
                  </div>
                  {updateIcon.isError && <p role="alert" className="text-sm text-red-400">{updateIcon.error.message}</p>}
                </div>}
              </div>
            ))}
          </div>
      </section>

      <form onSubmit={handleAdd} className="surface space-y-3 p-5">
        <label htmlFor="new-category" className="field-label">New category</label>
        <input id="new-category" name="category-name" autoComplete="off" type="text" value={newName} onChange={e => setNewName(e.target.value)}
          placeholder="e.g. Health…"
          className="field"
        />
        <CategoryIconPicker value={newIcon} onChange={setNewIcon} label="Choose an icon" />
        <button type="submit" disabled={createCategory.isPending || !newName.trim() || !newIcon || [...DEFAULTS, ...categories.map(c => c.name)].some(name => name.toLowerCase() === newName.trim().toLowerCase())}
          className="primary-action w-full disabled:opacity-40">
          Add category
        </button>
        <p aria-live="polite" className="status-message text-sm text-red-400">{newName.trim() && [...DEFAULTS, ...categories.map(c => c.name)].some(name => name.toLowerCase() === newName.trim().toLowerCase()) ? 'That category already exists.' : createCategory.isError ? createCategory.error.message : deleteCategory.isError ? 'Could not delete category.' : ''}</p>
      </form>

        <div className="hidden" />
      <GroupNav groupId={id} />
    </div>
  );
}
