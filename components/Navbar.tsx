'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, LogOut, Plus, ExternalLink } from 'lucide-react';
import { SessionUser } from '@/lib/auth';

export function Navbar() {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const switchDemoRole = async (role: 'CLIENT' | 'FREELANCER' | 'ADMIN') => {
    setSwitching(true);
    try {
      const res = await fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
        window.location.reload();
      }
    } finally {
      setSwitching(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setCurrentUser(null);
    window.location.href = '/auth/login';
  };

  return (
    <header className="sticky top-0 z-40 bg-[#05070c]/80 backdrop-blur-md border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center text-slate-950 font-black shadow-lg shadow-white/10 group-hover:scale-105 transition-transform duration-150">
              <Shield className="w-5 h-5 text-slate-950 fill-slate-950" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white">
                Pay<span className="text-sky-400">Guard</span>
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 bg-white/[0.05] border border-white/[0.08] text-slate-400 rounded-full">
                Escrow Protocol
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-2 text-xs font-medium">
            <Link
              href="/dashboard"
              className={`px-3 py-1.5 rounded-full transition-colors duration-150 ${
                pathname === '/dashboard'
                  ? 'bg-white/[0.08] text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Escrow Console
            </Link>
            <Link
              href="/admin"
              className={`px-3 py-1.5 rounded-full transition-colors duration-150 ${
                pathname === '/admin'
                  ? 'bg-white/[0.08] text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Dispute Console
            </Link>
            <a
              href="/demo/good"
              target="_blank"
              className="px-3 py-1.5 rounded-full text-slate-400 hover:text-white transition-colors duration-150 flex items-center gap-1"
            >
              <span>Sandbox Targets</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </a>
          </nav>
        </div>

        {/* Right Section: Role Switcher & User Profile */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <>
              {/* Quick Role Switcher for Demo */}
              <div className="hidden lg:flex items-center bg-white/[0.03] p-1 rounded-full border border-white/[0.08] text-xs">
                <span className="px-2.5 text-slate-500 font-medium text-[11px]">Role:</span>
                <button
                  onClick={() => switchDemoRole('CLIENT')}
                  disabled={switching}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-150 ${
                    currentUser.role === 'CLIENT'
                      ? 'bg-white text-slate-950 font-bold shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Alice (Client)
                </button>
                <button
                  onClick={() => switchDemoRole('FREELANCER')}
                  disabled={switching}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-150 ${
                    currentUser.role === 'FREELANCER'
                      ? 'bg-sky-500 text-slate-950 font-bold shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Bob (Freelancer)
                </button>
                <button
                  onClick={() => switchDemoRole('ADMIN')}
                  disabled={switching}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-150 ${
                    currentUser.role === 'ADMIN'
                      ? 'bg-purple-500 text-white font-bold shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Admin
                </button>
              </div>

              <Link
                href="/jobs/new"
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-200 text-slate-950 text-xs font-bold rounded-full transition-transform duration-100 active:scale-[0.98] shadow-md shadow-white/10"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Escrow</span>
              </Link>

              <div className="flex items-center gap-2.5 pl-3 border-l border-white/[0.08]">
                <div className="hidden sm:flex flex-col text-right leading-tight">
                  <span className="text-xs font-semibold text-slate-200 whitespace-nowrap">{currentUser.name}</span>
                  <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
                    {currentUser.role === 'CLIENT'
                      ? 'Client account'
                      : currentUser.role === 'FREELANCER'
                      ? 'Freelancer account'
                      : 'Administrator'}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign out"
                  className="p-2 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-full transition-colors duration-150"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/auth/login"
                className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors duration-150"
              >
                Sign In
              </Link>
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-950 text-xs font-bold rounded-full transition-transform duration-100 active:scale-[0.98] shadow-md shadow-white/10"
              >
                Launch Console
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
