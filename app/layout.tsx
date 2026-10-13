import type { Metadata, Viewport } from 'next';
import './globals.css';
import QueryProvider from '@/components/QueryProvider';

export const metadata: Metadata = {
  title: 'ExpenseAI',
  description: 'Log expenses by voice in under 3 seconds',
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/icons/voice.svg', type: 'image/svg+xml' }, { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' }],
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'ExpenseAI' },
};

export const viewport: Viewport = {
  themeColor: '#0d1410',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 antialiased overflow-x-hidden w-full relative">
        <a href="#main-content" className="skip-link">Skip to content</a>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
