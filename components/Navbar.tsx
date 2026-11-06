'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, User, LogOut, CheckCircle, ArrowRightLeft, Plus } from 'lucide-react';
import { SessionUser } from '@/lib/auth';

export function Navbar() {
  const router = useRouter();
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
      .catch(() => { });
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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <a href="/dashboard" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm">
              <Shield className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-slate-900">
                Pay<span className="text-sky-600">Guard</span>
              </span>
              <span className="ml-1.5 text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                Escrow
              </span>
            </div>
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="/dashboard" className="hover:text-slate-900 transition">
              Dashboard
            </a>
            <a href="/admin" className="hover:text-slate-900 transition">
              Admin Console
            </a>
            <a href="/demo/good" target="_blank" className="hover:text-slate-900 transition">
              Demo Targets ↗
            </a>
          </nav>
        </div>

        {/* Right Section: User & Quick Switcher */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <>
              {/* Quick Role Switcher for Demo */}
              <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
                <span className="px-2 text-slate-400 font-medium">Demo Role:</span>
                <button
                  onClick={() => switchDemoRole('CLIENT')}
                  disabled={switching}
                  className={`px-2.5 py-1 rounded font-medium transition ${currentUser.role === 'CLIENT'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  Alice (Client)
                </button>
                <button
                  onClick={() => switchDemoRole('FREELANCER')}
                  disabled={switching}
                  className={`px-2.5 py-1 rounded font-medium transition ${currentUser.role === 'FREELANCER'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  Bob (Freelancer)
                </button>
                <button
                  onClick={() => switchDemoRole('ADMIN')}
                  disabled={switching}
                  className={`px-2.5 py-1 rounded font-medium transition ${currentUser.role === 'ADMIN'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  Admin
                </button>
              </div>

              <a
                href="/jobs/new"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Escrow Job</span>
              </a>

              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="flex flex-col text-right hidden sm:block">
                  <span className="text-xs font-bold text-slate-800">{currentUser.name}</span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                    {currentUser.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign out"
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => switchDemoRole('CLIENT')}
                className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition"
              >
                Sign In (Demo Client)
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

