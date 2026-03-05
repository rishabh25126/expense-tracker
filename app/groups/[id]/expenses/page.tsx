'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import GroupNav from '@/components/GroupNav';
import type { Expense, Group, Category } from '@/types';

const DEFAULT_CATS = ['Food', 'Travel', 'Rent', 'Shopping', 'Bills', 'Other'];

export default function GroupExpensesPage() {
  const { id } = useParams<{ id: string }>();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('All');
  const [showAll, setShowAll] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [editForm, setEditForm] = useState({ amount: '', category: '', description: '', date: '' });
  const [customCats, setCustomCats] = useState<Category[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/groups/${id}`).then(r => r.json()),
      fetch(`/api/groups/${id}/expenses`).then(r => r.json()),
      fetch(`/api/groups/${id}/categories`).then(r => r.json()),
    ]).then(([g, e, cats]) => { setGroup(g); setExpenses(e); setCustomCats(cats); setLoading(false); });
  }, [id]);

  const allCategories = [...DEFAULT_CATS, ...customCats.map((c: Category) => c.name).filter(n => !DEFAULT_CATS.includes(n))];

  const periodStart = group?.period_start ?? '';

  const filtered = expenses
    .filter(e => {
      if (!showAll && periodStart && e.date < periodStart) return false;
      if (filterCategory !== 'All' && e.category !== filterCategory) return false;
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));

  const total = filtered.reduce((s, e) => s + Number(e.amount), 0);

  const handleDelete = async (eid: string) => {
    if (!confirm('Delete this expense?')) return;
    await fetch(`/api/groups/${id}/expenses/${eid}`, { method: 'DELETE' });
    setExpenses(e => e.filter(x => x.id !== eid));
  };

  const startEdit = (exp: Expense) => {
    setEditing(exp);
    setEditForm({ amount: String(exp.amount), category: exp.category, description: exp.description || '', date: exp.date });
  };

  const saveEdit = async () => {
    if (!editing) return;
    const res = await fetch(`/api/groups/${id}/expenses/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editForm, amount: Number(editForm.amount) }),
    });
    const updated = await res.json();
    setExpenses(e => e.map(x => x.id === editing.id ? updated : x));
    setEditing(null);
  };

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Expenses</h1>
        <button onClick={() => setShowAll(v => !v)}
          className={`text-xs px-2 py-1 rounded border border-gray-700 ${showAll ? 'bg-white text-gray-900' : 'text-gray-400'}`}>
          {showAll ? 'Current period' : 'All time'}
        </button>
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        {['All', ...allCategories].map(c => (
          <button key={c} onClick={() => setFilterCategory(c)}
            className={`text-xs px-2 py-1 rounded border border-gray-700 ${filterCategory === c ? 'bg-white text-gray-900' : 'text-gray-400'}`}>
            {c}
          </button>
        ))}
      </div>

      {filtered.length > 0 && (
        <p className="text-sm text-gray-500 mb-3">Total: <strong className="text-gray-100">₹{total.toLocaleString()}</strong></p>
      )}

      {loading ? <p className="text-sm text-gray-400">Loading...</p> : filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center mt-12">No expenses found</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(exp => (
            <div key={exp.id} className="border border-gray-700 bg-gray-900 rounded p-3 flex justify-between items-start">
              <div>
                <p className="font-medium text-sm">₹{Number(exp.amount).toLocaleString()}</p>
                <p className="text-xs text-gray-500">{exp.category} · {exp.date}</p>
                {exp.description && <p className="text-xs text-gray-400">{exp.description}</p>}
              </div>
              <div className="flex gap-2 ml-2">
                <button onClick={() => startEdit(exp)} className="text-xs text-blue-400">Edit</button>
                <button onClick={() => handleDelete(exp.id)} className="text-xs text-red-400">Del</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-10">
          <div className="bg-gray-900 border border-gray-700 w-full max-w-sm rounded-t-xl p-4 space-y-3">
            <h2 className="font-semibold">Edit Expense</h2>
            <input type="number" value={editForm.amount}
              onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100" placeholder="Amount" />
            <select value={editForm.category}
              onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100">
              {allCategories.map(c => <option key={c}>{c}</option>)}
            </select>
            <input type="text" value={editForm.description}
              onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-500" placeholder="Description" />
            <input type="date" value={editForm.date}
              onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100" />
            <div className="flex gap-2">
              <button onClick={saveEdit} className="flex-1 bg-white text-gray-900 rounded py-2 text-sm">Save</button>
              <button onClick={() => setEditing(null)} className="flex-1 border border-gray-700 rounded py-2 text-sm text-gray-300">Cancel</button>
            </div>
          </div>
        </div>
      )}

        <div className="h-14 mb-32" />
      <GroupNav groupId={id} />
    </div>
  );
}
