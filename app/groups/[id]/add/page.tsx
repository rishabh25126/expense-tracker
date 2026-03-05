'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import VoiceInput from '@/components/VoiceInput';
import GroupNav from '@/components/GroupNav';
import type { ParsedExpense, Category } from '@/types';

const DEFAULTS = ['Food', 'Travel', 'Rent', 'Shopping', 'Bills', 'Other'];
const TODAY = () => new Date().toISOString().split('T')[0];

export default function GroupAddPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState({ amount: '', category: 'Food', description: '', date: TODAY() });
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [customCats, setCustomCats] = useState<Category[]>([]);
  const [saved, setSaved] = useState(false);
  const [voiceKey, setVoiceKey] = useState(0);

  useEffect(() => {
    fetch(`/api/groups/${id}/categories`).then(r => r.json()).then(setCustomCats);
  }, [id]);

  const categories = [...DEFAULTS, ...customCats.map(c => c.name).filter(n => !DEFAULTS.includes(n))];

  const handleTranscript = async (text: string) => {
    setParsing(true);
    setError('');
    try {
      const res = await fetch('/api/parse-expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, categories }),
      });
      const parsed: ParsedExpense & { error?: string } = await res.json();
      if (parsed.error) { setError(parsed.error); return; }
      setForm(f => ({
        amount: parsed.amount != null ? String(parsed.amount) : f.amount,
        category: parsed.category ?? f.category,
        description: parsed.description || f.description,
        date: parsed.date ?? f.date,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse voice input');
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
      const res = await fetch(`/api/groups/${id}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaved(true);
      setForm(f => ({ amount: '', category: f.category, description: '', date: TODAY() }));
      setVoiceKey(k => k + 1);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen p-4 max-w-sm mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Add Expense</h1>
        <button onClick={() => router.push('/groups')} className="text-xs text-gray-400">Groups</button>
      </div>

      <div className="flex flex-col items-center mb-6">
        <p className="text-sm text-gray-500 mb-3">Tap mic and speak your expense</p>
        <VoiceInput key={voiceKey} onTranscript={handleTranscript} disabled={parsing || saving} />
        {parsing && <p className="text-sm text-gray-400 mt-2">Parsing...</p>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide">Amount *</label>
          <input
            type="number" step="0.01" value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            placeholder="0" required
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide">Category</label>
          <select value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide">Description</label>
          <input type="text" value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Optional"
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-500 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide">Date</label>
          <input type="date" value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {saved && <p className="text-green-400 text-sm">Saved!</p>}
        <button type="submit" disabled={saving || !form.amount}
          className="w-full bg-white text-gray-900 rounded py-2 text-sm font-medium disabled:opacity-40 mt-2">
          {saving ? 'Saving...' : 'Save Expense'}
        </button>
      </form>

      <div className="h-14 mb-32" />
      <GroupNav groupId={id} />
    </div>
  );
}
