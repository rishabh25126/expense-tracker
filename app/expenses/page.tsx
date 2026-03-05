'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Expense } from '@/types';

const CATEGORIES = ['All', 'Food', 'Travel', 'Rent', 'Shopping', 'Bills', 'Other'];

export default function ExpensesPage() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [editing, setEditing] = useState<Expense | null>(null);
  const [editForm, setEditForm] = useState({ amount: '', category: '', description: '', date: '' });

  const fetchExpenses = async () => {
    const res = await fetch('/api/expenses');
    const data = await res.json();
    setExpenses(data);
    setLoading(false);
  };

  useEffect(() => { fetchExpenses(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
    setExpenses(e => e.filter(x => x.id !== id));
  };

  const startEdit = (exp: Expense) => {
    setEditing(exp);
    setEditForm({ amount: String(exp.amount), category: exp.category, description: exp.description, date: exp.date });
  };

  const saveEdit = async () => {
    if (!editing) return;
    const res = await fetch(`/api/expenses/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editForm, amount: Number(editForm.amount) }),
    });
    const updated = await res.json();
    setExpenses(e => e.map(x => x.id === editing.id ? updated : x));
    setEditing(null);
  };

  const filtered = expenses.filter(e => {
    if (filterCategory !== 'All' && e.category !== filterCategory) return false;
    if (filterFrom && e.date < filterFrom) return false;
    if (filterTo && e.date > filterTo) return false;
    return true;
  });

  const total = filtered.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Expenses</h1>
        <button onClick={() => router.push('/add')} className="bg-black text-white text-sm px-3 py-1.5 rounded">+ Add</button>
      </div>

      {/* Filters */}
      <div className="space-y-2 mb-4">
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setFilterCategory(c)}
              className={`text-xs px-2 py-1 rounded border ${filterCategory === c ? 'bg-black text-white' : 'text-gray-600'}`}
            >{c}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
            className="border rounded px-2 py-1 text-xs flex-1" />
          <span className="text-xs text-gray-400 self-center">to</span>
          <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
            className="border rounded px-2 py-1 text-xs flex-1" />
        </div>
      </div>

      {filtered.length > 0 && (
        <p className="text-sm text-gray-500 mb-3">Total: <strong>₹{total.toLocaleString()}</strong></p>
      )}

      {loading ? <p className="text-sm text-gray-400">Loading...</p> : filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center mt-12">No expenses found</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(exp => (
            <div key={exp.id} className="border rounded p-3 flex justify-between items-start">
              <div>
                <p className="font-medium text-sm">₹{Number(exp.amount).toLocaleString()}</p>
                <p className="text-xs text-gray-500">{exp.category} · {exp.date}</p>
                {exp.description && <p className="text-xs text-gray-400">{exp.description}</p>}
              </div>
              <div className="flex gap-2 ml-2">
                <button onClick={() => startEdit(exp)} className="text-xs text-blue-500">Edit</button>
                <button onClick={() => handleDelete(exp.id)} className="text-xs text-red-500">Del</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-10">
          <div className="bg-white w-full max-w-sm rounded-t-xl p-4 space-y-3">
            <h2 className="font-semibold">Edit Expense</h2>
            <input type="number" value={editForm.amount} onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))}
              className="w-full border rounded px-3 py-2 text-sm" placeholder="Amount" />
            <select value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
              className="w-full border rounded px-3 py-2 text-sm">
              {CATEGORIES.slice(1).map(c => <option key={c}>{c}</option>)}
            </select>
            <input type="text" value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
              className="w-full border rounded px-3 py-2 text-sm" placeholder="Description" />
            <input type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
              className="w-full border rounded px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <button onClick={saveEdit} className="flex-1 bg-black text-white rounded py-2 text-sm">Save</button>
              <button onClick={() => setEditing(null)} className="flex-1 border rounded py-2 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 border-t bg-white flex justify-around py-3 text-xs">
        <button onClick={() => router.push('/dashboard')} className="text-gray-500">Dashboard</button>
        <button onClick={() => router.push('/expenses')} className="font-semibold">Expenses</button>
        <button onClick={() => router.push('/add')} className="text-gray-500">+ Add</button>
        <button onClick={() => router.push('/categories')} className="text-gray-500">Categories</button>
      </nav>
      <div className="h-14" />
    </div>
  );
}
