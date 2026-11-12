'use client';

import React from 'react';
import { Navbar } from './Navbar';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#05070c] text-[#f8fafc] selection:bg-sky-500 selection:text-slate-950 font-sans relative overflow-x-clip bg-grid-mesh pb-20">
      {/* Unified Ambient Neon Glows matching Landing Page */}
      <div className="pointer-events-none fixed bottom-0 left-0 w-[50vw] h-[50vh] neon-glow-left blur-3xl opacity-50 z-0 -translate-x-1/4 translate-y-1/4"></div>
      <div className="pointer-events-none fixed bottom-0 right-0 w-[50vw] h-[50vh] neon-glow-right blur-3xl opacity-50 z-0 translate-x-1/4 translate-y-1/4"></div>

      <Navbar />

      <div className="relative z-10">{children}</div>
    </div>
  );
}

