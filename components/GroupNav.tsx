'use client';
import { useRouter, usePathname } from 'next/navigation';

type Props = { groupId: string };

export default function GroupNav({ groupId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const base = `/groups/${groupId}`;

  const nav = [
    { label: '+ Add', path: `${base}/add` },
    { label: 'Expenses', path: `${base}/expenses` },
    { label: 'Dashboard', path: `${base}/dashboard` },
    { label: 'Stats', path: `${base}/stats` },
    { label: 'Categories', path: `${base}/categories` },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-white flex justify-around py-3 text-xs">
      {nav.map(({ label, path }) => (
        <button key={path} onClick={() => router.push(path)}
          className={pathname === path ? 'font-semibold' : 'text-gray-500'}>
          {label}
        </button>
      ))}
    </nav>
  );
}
