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
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <a href="/" className="inline-flex items-center gap-2 mb-4">
          <div className="h-10 w-10 rounded-xl bg-sky-500 flex items-center justify-center text-slate-950 font-bold">
            <Shield className="w-6 h-6 text-slate-950" />
          </div>
          <span className="text-2xl font-extrabold text-white">
            Pay<span className="text-sky-400">Guard</span>
          </span>
        </a>
        <h2 className="text-xl font-bold text-white">
          {isRegister ? 'Create a PayGuard Account' : 'Sign in to PayGuard Escrow'}
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Autonomous escrow platform powered by PayPal and Kernel cloud agents.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {/* Quick Demo Pre-Authentication Card */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 mb-6 shadow-md">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 block mb-2">
            🚀 1-Click Demo Evaluation Sign-In:
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleDemoLogin('CLIENT')}
              disabled={loading}
              className="px-3 py-2 bg-slate-700/80 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold border border-slate-600 transition"
            >
              Alice (Client)
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('FREELANCER')}
              disabled={loading}
              className="px-3 py-2 bg-slate-700/80 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold border border-slate-600 transition"
            >
              Bob (Freelancer)
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('ADMIN')}
              disabled={loading}
              className="px-3 py-2 bg-slate-700/80 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold border border-slate-600 transition"
            >
              Admin
            </button>
          </div>
        </div>

        {/* Regular Login Form */}
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-200 sm:px-10">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Primary Account Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="CLIENT">Client (Create & Fund Jobs)</option>
                    <option value="FREELANCER">Freelancer (Submit Work & Receive Payouts)</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            {isRegister && role === 'FREELANCER' && (
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Connected PayPal Email (for Payee Payouts)
                </label>
                <input
                  type="email"
                  value={paypalEmail}
                  onChange={(e) => setPaypalEmail(e.target.value)}
                  placeholder="paypal-receiver@example.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg text-sm shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
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

          <div className="mt-6 text-center text-xs text-slate-500">
            {isRegister ? (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegister(false)}
                  className="font-bold text-sky-600 hover:underline"
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
                  className="font-bold text-sky-600 hover:underline"
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

