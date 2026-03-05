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
    <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-800 bg-gray-950 flex flex-wrap justify-around py-4 text-lg">
      {nav.map(({ label, path }) => (
        <button key={path} onClick={() => router.push(path)}
          className={`px-3 py-3 min-w-[72px] ${pathname === path ? 'font-semibold text-white' : 'text-gray-500'}`}>
          {label}
        </button>
      ))}
    </nav>
  );
}
