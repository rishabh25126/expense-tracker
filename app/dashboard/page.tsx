'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Expense } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/expenses')
      .then(r => r.json())
      .then(data => { setExpenses(data); setLoading(false); });
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const monthPrefix = today.slice(0, 7);

  const todayTotal = expenses.filter(e => e.date === today).reduce((s, e) => s + Number(e.amount), 0);
  const monthTotal = expenses.filter(e => e.date.startsWith(monthPrefix)).reduce((s, e) => s + Number(e.amount), 0);

  const categoryTotals = expenses
    .filter(e => e.date.startsWith(monthPrefix))
    .reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
      return acc;
    }, {});

  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const recent = expenses.slice(0, 5);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <button onClick={handleLogout} className="text-xs text-gray-400">Logout</button>
      </div>

      {loading ? <p className="text-sm text-gray-400">Loading...</p> : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="border rounded p-3">
              <p className="text-xs text-gray-500">Today</p>
              <p className="text-2xl font-bold mt-1">₹{todayTotal.toLocaleString()}</p>
            </div>
            <div className="border rounded p-3">
              <p className="text-xs text-gray-500">This month</p>
              <p className="text-2xl font-bold mt-1">₹{monthTotal.toLocaleString()}</p>
            </div>
          </div>

          {sortedCategories.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold mb-2">This month by category</h2>
              <div className="space-y-2">
                {sortedCategories.map(([cat, amt]) => (
                  <div key={cat} className="flex justify-between text-sm">
                    <span className="text-gray-600">{cat}</span>
                    <span className="font-medium">₹{amt.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-sm font-semibold mb-2">Recent</h2>
            {recent.length === 0 ? (
              <p className="text-sm text-gray-400">No expenses yet. <button onClick={() => router.push('/add')} className="underline">Add one</button></p>
            ) : (
              <div className="space-y-2">
                {recent.map(e => (
                  <div key={e.id} className="flex justify-between text-sm border-b pb-2">
                    <div>
                      <span className="text-gray-600">{e.category}</span>
                      {e.description && <span className="text-gray-400 ml-2 text-xs">· {e.description}</span>}
                    </div>
                    <span className="font-medium">₹{Number(e.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <nav className="fixed bottom-0 left-0 right-0 border-t bg-white flex justify-around py-3 text-xs">
        <button onClick={() => router.push('/dashboard')} className="font-semibold">Dashboard</button>
        <button onClick={() => router.push('/expenses')} className="text-gray-500">Expenses</button>
        <button onClick={() => router.push('/add')} className="text-gray-500">+ Add</button>
        <button onClick={() => router.push('/categories')} className="text-gray-500">Categories</button>
      </nav>
      <div className="h-14" />
    </div>
  );
}
