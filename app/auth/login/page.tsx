'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, Mail, ArrowRight, UserCheck, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<'CLIENT' | 'FREELANCER'>('CLIENT');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDemoLogin = async (demoRole: 'CLIENT' | 'FREELANCER' | 'ADMIN') => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: demoRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Demo login failed');
      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const payload = isRegister
      ? { email, password, name, role, paypalEmail }
      : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05070c] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-grid-mesh relative overflow-x-clip text-[#f8fafc]">
      {/* Dual Neon Ambient Glows */}
      <div className="pointer-events-none fixed bottom-0 left-0 w-[50vw] h-[50vh] neon-glow-left blur-3xl opacity-60 z-0 -translate-x-1/4 translate-y-1/4"></div>
      <div className="pointer-events-none fixed bottom-0 right-0 w-[50vw] h-[50vh] neon-glow-right blur-3xl opacity-60 z-0 translate-x-1/4 translate-y-1/4"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <a href="/" className="inline-flex items-center gap-3 mb-4 group">
          <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-slate-950 font-black shadow-lg shadow-white/10 group-hover:scale-105 transition-transform duration-150">
            <Shield className="w-5 h-5 text-slate-950 fill-slate-950" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-white">
            Pay<span className="text-sky-400">Guard</span>
          </span>
        </a>
        <h2 className="text-2xl font-extrabold tracking-tight text-white">
          {isRegister ? 'Create an escrow account' : 'Sign in to PayGuard Escrow'}
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Autonomous escrow platform powered by PayPal Orders v2 and cloud agent verification.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md space-y-4 relative z-10">
        {/* Quick Demo Pre-Authentication Card */}
        <div className="bg-[#080b14]/85 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-semibold text-slate-300">
              One-click evaluation profiles
            </span>
            <span className="text-[11px] font-mono text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-md">
              Instant Session
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleDemoLogin('CLIENT')}
              disabled={loading}
              className="px-3 py-2 bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.98] text-white rounded-xl text-xs font-medium border border-white/[0.08] transition-colors duration-150 text-center"
            >
              Alice (Client)
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('FREELANCER')}
              disabled={loading}
              className="px-3 py-2 bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.98] text-white rounded-xl text-xs font-medium border border-white/[0.08] transition-colors duration-150 text-center"
            >
              Bob (Freelancer)
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('ADMIN')}
              disabled={loading}
              className="px-3 py-2 bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.98] text-white rounded-xl text-xs font-medium border border-white/[0.08] transition-colors duration-150 text-center"
            >
              Admin
            </button>
          </div>
        </div>

        {/* Regular Login Form */}
        <div className="bg-[#080b14]/85 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-2xl border border-white/[0.08] sm:px-8">
          {error && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Full name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#06080d] border border-white/[0.1] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors duration-150"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Primary account role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-[#06080d] border border-white/[0.1] rounded-xl text-sm text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors duration-150"
                  >
                    <option value="CLIENT">Client (Create & Fund Jobs)</option>
                    <option value="FREELANCER">Freelancer (Submit Work & Receive Payouts)</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#06080d] border border-white/[0.1] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors duration-150"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#06080d] border border-white/[0.1] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors duration-150"
                />
              </div>
            </div>

            {isRegister && role === 'FREELANCER' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Connected PayPal email (for payouts)
                </label>
                <input
                  type="email"
                  value={paypalEmail}
                  onChange={(e) => setPaypalEmail(e.target.value)}
                  placeholder="paypal-receiver@example.com"
                  className="w-full px-3.5 py-2.5 bg-[#06080d] border border-white/[0.1] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors duration-150"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-white hover:bg-slate-200 text-slate-950 font-bold rounded-full text-sm shadow-xl shadow-white/10 active:scale-[0.98] transition-transform duration-150 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>{isRegister ? 'Register Account' : 'Sign In'}</span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            {isRegister ? (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegister(false)}
                  className="font-medium text-sky-400 hover:text-sky-300 transition-colors duration-150 ml-1"
                >
                  Sign in here
                </button>
              </p>
            ) : (
              <p>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegister(true)}
                  className="font-medium text-sky-400 hover:text-sky-300 transition-colors duration-150 ml-1"
                >
                  Create new account
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
