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
    <html lang="en" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body className="min-h-screen bg-slate-950 antialiased font-sans text-slate-100 pb-16 md:pb-0">
        {children}
        <MobileTabBar />
      </body>
    </html>
  );
}
