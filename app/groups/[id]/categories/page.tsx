'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import GroupNav from '@/components/GroupNav';
import type { Category } from '@/types';

const DEFAULTS = ['Food', 'Travel', 'Rent', 'Shopping', 'Bills', 'Other'];

export default function GroupCategoriesPage() {
  const { id } = useParams<{ id: string }>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/groups/${id}/categories`).then(r => r.json()).then(setCategories);
  }, [id]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/groups/${id}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const created = await res.json();
    setCategories(c => [...c, created]);
    setNewName('');
    setSaving(false);
  };

  const handleDelete = async (cid: string) => {
    if (!confirm('Delete category?')) return;
    await fetch(`/api/groups/${id}/categories/${cid}`, { method: 'DELETE' });
    setCategories(c => c.filter(x => x.id !== cid));
  };

  return (
    <div className="min-h-screen p-4 max-w-sm mx-auto">
      <h1 className="text-xl font-bold mb-6">Categories</h1>

      <div className="mb-6">
        <h2 className="text-xs text-gray-500 uppercase tracking-wide mb-2">Defaults</h2>
        <div className="flex flex-wrap gap-2">
          {DEFAULTS.map(d => <span key={d} className="text-sm border border-gray-700 bg-gray-800 rounded px-2 py-1 text-gray-300">{d}</span>)}
        </div>
      </div>

      {categories.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs text-gray-500 uppercase tracking-wide mb-2">Custom</h2>
          <div className="space-y-2">
            {categories.map(c => (
              <div key={c.id} className="flex justify-between items-center border border-gray-700 bg-gray-900 rounded px-3 py-2">
                <span className="text-sm">{c.name}</span>
                <button onClick={() => handleDelete(c.id)} className="text-xs text-red-400">Delete</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleAdd} className="flex gap-2">
        <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
          placeholder="New category name"
          className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button type="submit" disabled={saving || !newName.trim()}
          className="bg-white text-gray-900 px-3 py-2 rounded text-sm disabled:opacity-40">
          Add
        </button>
      </form>

        <div className="h-14 mb-32" />
      <GroupNav groupId={id} />
    </div>
  );
}
