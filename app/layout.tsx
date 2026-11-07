import type { Metadata } from 'next';
import './globals.css';
import { MobileTabBar } from '@/components/MobileTabBar';

export const metadata: Metadata = {
  title: 'PayGuard Escrow | Autonomous Verification & Payment Settlement',
  description: 'AI-driven escrow platform verifying software deliverables and settling PayPal holds autonomously.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 antialiased font-sans text-slate-900 pb-16 md:pb-0">
        {children}
        <MobileTabBar />
      </body>
    </html>
  );
}
