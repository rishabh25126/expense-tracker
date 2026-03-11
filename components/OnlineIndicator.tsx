'use client';
import { useState, useEffect } from 'react';

export default function OnlineIndicator() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span className={`w-2 h-2 rounded-full ${online ? 'bg-green-400' : 'bg-red-400'}`} />
      <span className={online ? 'text-green-400' : 'text-red-400'}>
        {online ? 'Online' : 'Offline'}
      </span>
    </span>
  );
}
