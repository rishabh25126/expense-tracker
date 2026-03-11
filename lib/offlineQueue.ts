type QueuedExpense = {
  amount: string;
  category: string;
  description: string;
  date: string;
};

const key = (groupId: string) => `offline_expenses_${groupId}`;

export function getQueue(groupId: string): QueuedExpense[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(key(groupId));
  return raw ? JSON.parse(raw) : [];
}

export function enqueue(groupId: string, expense: QueuedExpense): void {
  const q = getQueue(groupId);
  q.push(expense);
  localStorage.setItem(key(groupId), JSON.stringify(q));
}

export function dequeue(groupId: string): void {
  const q = getQueue(groupId);
  q.shift();
  if (q.length === 0) localStorage.removeItem(key(groupId));
  else localStorage.setItem(key(groupId), JSON.stringify(q));
}

export function pendingCount(groupId: string): number {
  return getQueue(groupId).length;
}
