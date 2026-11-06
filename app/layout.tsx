import type { Metadata } from 'next';
import './globals.css';

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
      <body className="min-h-screen bg-slate-50 antialiased font-sans text-slate-900">
        {children}
      </body>
    </html>
  );
}
