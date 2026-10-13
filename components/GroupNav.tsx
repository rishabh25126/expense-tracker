'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import { ChartNoAxesCombined, LayoutDashboard, Plus, ReceiptText, Tags } from 'lucide-react';

type Props = { groupId: string };
const items = [
  { label: 'Expenses', slug: 'expenses', icon: ReceiptText },
  { label: 'Dashboard', slug: 'dashboard', icon: LayoutDashboard },
  { label: 'Add expense', slug: 'add', icon: Plus },
  { label: 'Stats', slug: 'stats', icon: ChartNoAxesCombined },
  { label: 'Categories', slug: 'categories', icon: Tags },
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
        {items.map(({ label, slug, icon: Icon }) => {
          const path = `/groups/${groupId}/${slug}`;
          const active = pathname === path;
          const isAdd = slug === 'add';
          return <Link key={slug} href={path} aria-label={label} title={label} aria-current={active ? 'page' : undefined}
            className={`relative flex min-h-16 min-w-0 items-center justify-center rounded-2xl px-0 py-2 font-medium lg:min-h-12 lg:justify-start lg:gap-3 lg:px-4 lg:text-sm ${active ? 'text-emerald-300' : 'text-gray-400 hover:bg-gray-900 hover:text-gray-100'}`}>
            {active && <motion.span layoutId="active-nav" transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 360, damping: 30 }} className={`absolute inset-1 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 ${isAdd ? 'hidden lg:block' : ''}`} />}
            {isAdd ? <>
              <span aria-hidden="true" className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[3px] border-gray-950 bg-emerald-400 text-gray-950 shadow-lg shadow-emerald-950/50 lg:hidden"><Icon size={30} strokeWidth={2.4} /></span>
              <Icon aria-hidden="true" size={24} strokeWidth={2} className="relative hidden shrink-0 lg:block" />
            </> : <Icon aria-hidden="true" size={26} strokeWidth={active ? 2.3 : 2} className="relative shrink-0 lg:h-6 lg:w-6" />}
            <span aria-hidden="true" className="relative hidden truncate lg:inline">{isAdd ? 'Add' : label}</span>
          </Link>;
        })}
      </div>
      <Link href="/groups" className="mx-4 mt-8 hidden min-h-11 items-center rounded-xl px-4 text-sm text-gray-400 hover:bg-gray-900 hover:text-gray-100 lg:flex">← All trackers</Link>
    </nav>
  );
}
