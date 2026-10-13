'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';

type Props = { groupId: string };
const items = [
  { label: 'Expenses', slug: 'expenses', icon: '≡' },
  { label: 'Dashboard', slug: 'dashboard', icon: '◫' },
  { label: 'Add', slug: 'add', icon: '＋' },
  { label: 'Stats', slug: 'stats', icon: '▥' },
  { label: 'Categories', slug: 'categories', icon: '◇' },
];

export default function GroupNav({ groupId }: Props) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();
  return (
    <nav data-ui="tracker-nav" aria-label="Tracker navigation" className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-700 bg-gray-950 lg:top-0 lg:right-auto lg:w-56 lg:border-t-0 lg:border-r">
      <div className="hidden px-5 pt-8 pb-10 lg:block">
        <Link href="/groups" className="text-lg font-bold tracking-tight text-gray-100">Expense<span className="text-emerald-500">AI</span></Link>
        <p className="mt-1 text-xs text-gray-400">Your spending workspace</p>
      </div>
      <div className="grid grid-cols-5 gap-1 px-2 pt-2 pb-[calc(8px+env(safe-area-inset-bottom))] lg:flex lg:flex-col lg:gap-1 lg:px-3 lg:pb-0">
        {items.map(({ label, slug, icon }) => {
          const path = `/groups/${groupId}/${slug}`;
          const active = pathname === path;
          const isAdd = slug === 'add';
          return <Link key={slug} href={path} aria-current={active ? 'page' : undefined}
            className={`relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[11px] font-medium sm:text-xs lg:min-h-12 lg:flex-row lg:justify-start lg:gap-3 lg:px-4 lg:text-sm ${active ? 'text-emerald-400' : 'text-gray-400 hover:bg-gray-900 hover:text-gray-100'}`}>
            {active && <motion.span layoutId="active-nav" transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 360, damping: 30 }} className={`absolute inset-0 rounded-xl bg-gray-800 ${isAdd ? 'hidden lg:block' : ''}`} />}
            {isAdd ? <>
              <span aria-hidden="true" className="relative -mt-4 flex h-12 w-12 items-center justify-center rounded-full border-4 border-gray-950 bg-emerald-500 text-3xl font-light leading-none text-gray-950 shadow-lg shadow-emerald-950/40 lg:hidden">+</span>
              <span aria-hidden="true" className="relative hidden w-6 text-lg leading-none lg:inline">{icon}</span>
            </> : <span aria-hidden="true" className="relative text-xl leading-none lg:w-6 lg:text-lg">{icon}</span>}
            <span className="relative truncate">{label}</span>
          </Link>;
        })}
      </div>
      <Link href="/groups" className="mx-4 mt-8 hidden min-h-11 items-center rounded-xl px-4 text-sm text-gray-400 hover:bg-gray-900 hover:text-gray-100 lg:flex">← All trackers</Link>
    </nav>
  );
}
