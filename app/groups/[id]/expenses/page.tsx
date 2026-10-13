'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Expense, Category } from '@/types';
import { queryKeys } from '@/lib/queryKeys';
import { groupOptions, expensesOptions, categoriesOptions, refreshGroupData } from '@/lib/groupQueries';
import { exportExpensesCSV } from '@/lib/csvExport';
import { formatINR, formatDate } from '@/lib/format';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import CategoryIcon from '@/components/CategoryIcon';
import { iconForCategory } from '@/lib/categoryIcons';

const DEFAULT_CATS = ['Food', 'Travel', 'Rent', 'Shopping', 'Bills', 'Other'];

export default function GroupExpensesPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [filterCategory, setFilterCategory] = useState('All');
  const [showAll, setShowAll] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [editForm, setEditForm] = useState({ amount: '', category: '', description: '', date: '' });
  const editAmountRef = useRef<HTMLInputElement>(null);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (!editing) return;
    editAmountRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setEditing(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing]);

  const { data: group = null, isLoading: groupLoading } = useQuery(groupOptions(id));

  const { data: expenses = [], isLoading: expensesLoading } = useQuery(expensesOptions(id));

  const { data: customCats = [] } = useQuery(categoriesOptions(id));

  const allCategories = [...DEFAULT_CATS, ...(Array.isArray(customCats) ? customCats : []).map((c: Category) => c.name).filter(n => !DEFAULT_CATS.includes(n))];
  const periodStart = group?.period_start ?? '';
  const loading = groupLoading || expensesLoading;

  const filtered = (Array.isArray(expenses) ? expenses : [])
    .filter(e => {
      if (!showAll && periodStart && e.date < periodStart) return false;
      if (filterCategory !== 'All' && e.category !== filterCategory) return false;
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));

  const total = filtered.reduce((s, e) => s + Number(e.amount), 0);

  const deleteExpense = useMutation({
    mutationFn: async (eid: string) => { const res = await fetch(`/api/groups/${id}/expenses/${eid}`, { method: 'DELETE' }); if (!res.ok) throw new Error('Delete failed'); return res; },
    onSuccess: () => {
      refreshGroupData(queryClient, id);
    },
  });

  const updateExpense = useMutation({
    mutationFn: async ({ expenseId, payload }: { expenseId: string; payload: Record<string, unknown> }) => {
      const res = await fetch(`/api/groups/${id}/expenses/${expenseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Update failed');
      return res.json();
    },
    onSuccess: () => {
      refreshGroupData(queryClient, id);
    },
  });

  const handleDelete = (eid: string) => {
    if (!confirm('Are you sure you want to delete this expense? This cannot be undone.')) return;
    deleteExpense.mutate(eid);
  };

  const startEdit = (exp: Expense) => {
    setEditing(exp);
    setEditForm({ amount: String(exp.amount), category: exp.category, description: exp.description || '', date: exp.date });
  };

  const saveEdit = async () => {
    if (!editing || !editForm.amount || Number(editForm.amount) <= 0) return;
    updateExpense.mutate(
      { expenseId: editing.id, payload: { ...editForm, amount: Number(editForm.amount) } },
      { onSuccess: () => setEditing(null) },
    );
  };

  const handleReload = () => {
    void Promise.all([
      queryClient.refetchQueries({ queryKey: queryKeys.group(id) }),
      queryClient.refetchQueries({ queryKey: queryKeys.expenses(id) }),
      queryClient.refetchQueries({ queryKey: queryKeys.categories(id) }),
    ]);
  };

  return (
    <div id="main-content" className="app-page has-nav">
      <div className="app-header flex-wrap">
        <div className="flex items-center gap-2">
          <h1 className="app-title">Expenses</h1>
          <button
            type="button"
            onClick={handleReload}
            className="text-xs p-1.5 rounded border border-gray-600 text-gray-400 hover:text-gray-200 hover:border-gray-500"
            title="Refresh"
            aria-label="Refresh"
          >
            ↻
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => exportExpensesCSV(filtered, group?.name ?? 'expenses')}
            disabled={filtered.length === 0}
            className="secondary-action text-sm disabled:opacity-40"
          >
            Export CSV
          </button>
          <button onClick={() => setShowAll(v => !v)}
            className={`secondary-action text-sm ${showAll ? 'bg-gray-800 text-emerald-400' : 'text-gray-400'}`}>
            {showAll ? 'Current period' : 'All time'}
          </button>
        </div>
      </div>

      <div aria-label="Filter by category" className="mb-6 flex flex-wrap gap-2">
        {['All', ...allCategories].map(c => (
          <button key={c} onClick={() => setFilterCategory(c)}
            aria-pressed={filterCategory === c}
            className={`secondary-action text-sm ${filterCategory === c ? 'border-emerald-500 bg-gray-800 text-emerald-400' : 'text-gray-400'}`}>
            {c}
          </button>
        ))}
      </div>

      {filtered.length > 0 && (
        <div className="surface mb-5 flex items-center justify-between gap-3 p-5"><span className="text-sm text-gray-400">Filtered total · {filtered.length} expense{filtered.length === 1 ? '' : 's'}</span><strong className="text-xl text-gray-100">{formatINR(total)}</strong></div>
      )}

      {loading ? <p className="text-sm text-gray-400">Loading...</p> : filtered.length === 0 ? (
        <p className="surface p-10 text-center text-sm text-gray-400">No expenses match these filters.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(exp => (
            <div key={exp.id} className="surface flex min-w-0 items-start justify-between gap-3 p-4 sm:p-5">
              <div className="flex min-w-0 items-start gap-3">
                <CategoryIcon icon={iconForCategory(exp.category, (Array.isArray(customCats) ? customCats : []).find(c => c.name === exp.category)?.icon)} fallbackName={exp.category} />
                <div className="min-w-0">
                <p className="text-lg font-semibold">{formatINR(exp.amount)}</p>
                <p className="mt-1 text-sm text-gray-400">{exp.category} · {formatDate(exp.date)}</p>
                {exp.description && <p className="mt-1 break-words text-sm text-gray-300">{exp.description}</p>}
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                <button onClick={() => startEdit(exp)} className="secondary-action text-sm">Edit</button>
                <button onClick={() => handleDelete(exp.id)} className="secondary-action danger-action text-sm">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p aria-live="polite" className="status-message text-red-400">{deleteExpense.isError ? 'Could not delete expense.' : updateExpense.isError ? 'Could not update expense.' : ''}</p>
      <AnimatePresence>{editing && (
        <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : .18 }} onMouseDown={event => { if (event.target === event.currentTarget) setEditing(null); }}>
          <motion.div role="dialog" aria-modal="true" aria-labelledby="edit-expense-title" className="sheet space-y-4" initial={{ y: reducedMotion ? 0 : 28 }} animate={{ y: 0 }} exit={{ y: reducedMotion ? 0 : 28 }} transition={{ duration: reducedMotion ? 0 : .2 }}>
            <h2 id="edit-expense-title" className="section-title">Edit expense</h2>
            <div><label htmlFor="edit-amount" className="field-label">Amount</label><input ref={editAmountRef} id="edit-amount" name="amount" inputMode="decimal" min="0.01" step="0.01" type="number" value={editForm.amount}
              onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))}
              className="field" /></div>
            <div><label htmlFor="edit-category" className="field-label">Category</label><select id="edit-category" name="category" value={editForm.category}
              onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
              className="field">
              {allCategories.map(c => <option key={c}>{c}</option>)}
            </select></div>
            <div><label htmlFor="edit-description" className="field-label">Description</label><input id="edit-description" name="description" type="text" value={editForm.description}
              onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
              className="field" placeholder="Optional description…" /></div>
            <div><label htmlFor="edit-date" className="field-label">Date</label><input id="edit-date" name="date" type="date" value={editForm.date}
              onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
              className="field max-w-full appearance-none [&::-webkit-date-and-time-value]:text-gray-100" /></div>
            <div className="flex gap-2">
              <button onClick={saveEdit} disabled={updateExpense.isPending || !editForm.amount || Number(editForm.amount) <= 0} className="primary-action flex-1 disabled:opacity-50">Save</button>
              <button onClick={() => setEditing(null)} className="secondary-action flex-1">Cancel</button>
            </div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>

        <div className="hidden" />
    </div>
  );
}
