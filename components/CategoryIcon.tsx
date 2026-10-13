import type { CategoryIconId } from '@/lib/categoryIcons';

export default function CategoryIcon({ icon, fallbackName = '', className = '' }: { icon: CategoryIconId | null; fallbackName?: string; className?: string }) {
  const drawing = icon === 'food' ? <><path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18M17 3c-2 2-3 5-3 9h5V3h-2ZM19 12v9" /></>
    : icon === 'travel' ? <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18M9 12v3m6-3v3" /></>
    : icon === 'home' ? <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z" /><path d="M9 21v-8h6v8" /></>
    : icon === 'shopping' ? <><path d="M4 8h16l-1 13H5L4 8ZM9 9V6a3 3 0 0 1 6 0v3" /></>
    : icon === 'bills' ? <><path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3ZM8 8h8M8 12h8M8 16h4" /></>
    : icon === 'health' ? <><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z" /></>
    : icon === 'entertainment' ? <><path d="M4 9h16l2 9a2 2 0 0 1-3 2l-3-3H8l-3 3a2 2 0 0 1-3-2l2-9ZM8 11v4m-2-2h4m7-1h.01M19 14h.01" /></>
    : icon === 'education' ? <><path d="m2 9 10-5 10 5-10 5L2 9ZM6 11v6c4 3 8 3 12 0v-6M22 9v7" /></>
    : icon === 'gift' ? <><rect x="3" y="9" width="18" height="12" rx="1" /><path d="M2 6h20v3H2zM12 6v15M12 6C7 6 6 3 8 2c2-1 4 2 4 4Zm0 0c5 0 6-3 4-4-2-1-4 2-4 4Z" /></>
    : <><circle cx="7" cy="7" r="2" /><circle cx="17" cy="7" r="2" /><circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" /></>;

  return <span aria-hidden="true" data-icon={icon ?? 'initials'} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 ${className}`}>
    {icon ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">{drawing}</svg>
      : <span className="text-xs font-semibold uppercase">{fallbackName.trim().slice(0, 2) || '•'}</span>}
  </span>;
}
