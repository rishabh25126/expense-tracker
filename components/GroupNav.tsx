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
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-white flex justify-around py-4 text-sm">
      {nav.map(({ label, path }) => (
        <button key={path} onClick={() => router.push(path)}
          className={`px-2 py-1 min-w-[56px] ${pathname === path ? 'font-semibold text-black' : 'text-gray-400'}`}>
          {label}
        </button>
      ))}
    </nav>
  );
}
