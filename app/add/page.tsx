'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import VoiceInput from '@/components/VoiceInput';
import type { ParsedExpense } from '@/types';

const CATEGORIES = ['Food', 'Travel', 'Rent', 'Shopping', 'Bills', 'Other'];
const TODAY = () => new Date().toISOString().split('T')[0];

export default function AddExpensePage() {
  const router = useRouter();
  const [form, setForm] = useState({ amount: '', category: 'Food', description: '', date: TODAY() });
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleTranscript = async (text: string) => {
    setParsing(true);
    setError('');
    try {
      const res = await fetch('/api/parse-expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const parsed: ParsedExpense = await res.json();
      setForm(f => ({
        amount: parsed.amount != null ? String(parsed.amount) : f.amount,
        category: parsed.category ?? f.category,
        description: parsed.description || f.description,
        date: parsed.date ?? f.date,
      }));
    } catch {
      setError('Failed to parse voice input');
    } finally {
      setParsing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Save failed');
      router.push('/expenses');
    } catch {
      setError('Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen p-4 max-w-sm mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-500 text-sm">← Back</button>
        <h1 className="text-xl font-bold">Add Expense</h1>
      </div>

      <div className="flex flex-col items-center mb-6">
        <p className="text-sm text-gray-500 mb-3">Tap mic and speak your expense</p>
        <VoiceInput onTranscript={handleTranscript} disabled={parsing || saving} />
        {parsing && <p className="text-sm text-gray-400 mt-2">Parsing...</p>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide">Amount *</label>
          <input
            type="number" step="0.01" value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            placeholder="0" required
            className="w-full border rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide">Category</label>
          <select
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            className="w-full border rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-black"
          >
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide">Description</label>
          <input
            type="text" value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Optional"
            className="w-full border rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide">Date</label>
          <input
            type="date" value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className="w-full border rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit" disabled={saving || !form.amount}
          className="w-full bg-black text-white rounded py-2 text-sm font-medium disabled:opacity-40 mt-2"
        >
          {saving ? 'Saving...' : 'Save Expense'}
        </button>
      </form>
    </div>
  );
}
