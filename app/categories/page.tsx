'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Category } from '@/types';

const DEFAULTS = ['Food', 'Travel', 'Rent', 'Shopping', 'Bills', 'Other'];

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(setCategories);
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const created = await res.json();
    setCategories(c => [...c, created]);
    setNewName('');
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete category?')) return;
    await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    setCategories(c => c.filter(x => x.id !== id));
  };

  return (
    <div className="min-h-screen p-4 max-w-sm mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-500 text-sm">← Back</button>
        <h1 className="text-xl font-bold">Categories</h1>
      </div>

      <div className="mb-6">
        <h2 className="text-xs text-gray-500 uppercase tracking-wide mb-2">Defaults</h2>
        <div className="flex flex-wrap gap-2">
          {DEFAULTS.map(d => <span key={d} className="text-sm border rounded px-2 py-1 bg-gray-50">{d}</span>)}
        </div>
      </div>

      {categories.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs text-gray-500 uppercase tracking-wide mb-2">Custom</h2>
          <div className="space-y-2">
            {categories.map(c => (
              <div key={c.id} className="flex justify-between items-center border rounded px-3 py-2">
                <span className="text-sm">{c.name}</span>
                <button onClick={() => handleDelete(c.id)} className="text-xs text-red-500">Delete</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text" value={newName} onChange={e => setNewName(e.target.value)}
          placeholder="New category name"
          className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
        <button type="submit" disabled={saving || !newName.trim()}
          className="bg-black text-white px-3 py-2 rounded text-sm disabled:opacity-40">
          Add
        </button>
      </form>

      <nav className="fixed bottom-0 left-0 right-0 border-t bg-white flex justify-around py-3 text-xs">
        <button onClick={() => router.push('/dashboard')} className="text-gray-500">Dashboard</button>
        <button onClick={() => router.push('/expenses')} className="text-gray-500">Expenses</button>
        <button onClick={() => router.push('/add')} className="text-gray-500">+ Add</button>
        <button onClick={() => router.push('/categories')} className="font-semibold">Categories</button>
      </nav>
      <div className="h-14" />
    </div>
  );
}
