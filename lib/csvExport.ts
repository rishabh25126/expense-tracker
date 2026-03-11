import type { Expense } from '@/types';

export function exportExpensesCSV(expenses: Expense[], groupName: string) {
  const headers = ['Date', 'Amount', 'Category', 'Description'];
  const rows = expenses.map(e => [
    e.date,
    String(e.amount),
    `"${e.category.replace(/"/g, '""')}"`,
    `"${(e.description || '').replace(/"/g, '""')}"`,
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${groupName}-expenses.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
