import type { Metadata, Viewport } from 'next';
import './globals.css';
import QueryProvider from '@/components/QueryProvider';

export const metadata: Metadata = {
  title: 'ExpenseAI',
  description: 'Log expenses by voice in under 3 seconds',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'ExpenseAI' },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
