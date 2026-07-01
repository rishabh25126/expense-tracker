'use client';

const DEVICE_KEY = 'expense_device_id';

function generateDeviceId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `device_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

export function getDeviceId() {
  if (typeof window === 'undefined') return '';

  const existing = window.localStorage.getItem(DEVICE_KEY);
  if (existing) return existing;

  const created = generateDeviceId();
  window.localStorage.setItem(DEVICE_KEY, created);
  return created;
}
