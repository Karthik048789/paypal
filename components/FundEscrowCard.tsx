'use client';

import React, { useState } from 'react';
import { Shield, Lock, Info, Loader2 } from 'lucide-react';

interface FundEscrowCardProps {
  jobId: string;
  amountCents: number;
  freelancerEmail: string;
  onFunded: () => void;
}

export function FundEscrowCard({ jobId, amountCents, freelancerEmail, onFunded }: FundEscrowCardProps) {
  const [funding, setFunding] = useState(false);
  const [error, setError] = useState('');

  const amountDollars = amountCents / 100;
  const platformFee = amountDollars * 0.02;
  const netPayout = amountDollars - platformFee;

  const handleAuthorizePayment = async () => {
    setFunding(true);
    setError('');

    try {
      const orderRes = await fetch(`/api/jobs/${jobId}/fund/create-order`, {
        method: 'POST',
      });
      const orderData = await orderRes.json();

      if (!orderRes.ok) {
        throw new Error(orderData.error || 'Failed to initialize PayPal order.');
      }

      const authRes = await fetch(`/api/jobs/${jobId}/fund/authorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: orderData.orderId }),
      });
      const authData = await authRes.json();

      if (!authRes.ok) {
        throw new Error(authData.error || 'Failed to complete PayPal authorization hold.');
      }

      onFunded();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Payment authorization failed.';
      setError(message);
    } finally {
      setFunding(false);
    }
  };

  return (
    <div className="bento-card bg-[#080b14]/85 backdrop-blur-xl rounded-2xl p-6 sm:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3.5 mb-6 pb-6 border-b border-white/[0.08]">
        <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Fund Escrow via PayPal</h2>
          <p className="text-xs text-slate-400">
            Authorization Hold (`intent=AUTHORIZE`). Zero funds move until verification passes.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 mb-6">
          {error}
        </div>
      )}

      {/* Escrow Fee & Breakdown Table */}
      <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-5 mb-6 space-y-3 font-mono text-xs">
        <div className="flex justify-between items-center text-sm">
          <span className="font-sans text-slate-300">Agreed Project Amount:</span>
          <span className="font-bold text-white">${amountDollars.toFixed(2)} USD</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="font-sans text-slate-400">PayGuard Platform Fee (2%):</span>
          <span className="text-slate-400">-${platformFee.toFixed(2)} USD</span>
        </div>
        <div className="border-t border-white/[0.08] pt-3 flex justify-between items-center text-sm">
          <span className="font-sans font-bold text-white">Net Deliverable Payout:</span>
          <span className="font-extrabold text-emerald-400 text-base">${netPayout.toFixed(2)} USD</span>
        </div>
        <div className="text-[11px] font-sans text-slate-400 pt-1">
          Authorized Payee: <strong className="text-sky-400 font-mono">{freelancerEmail}</strong>
        </div>
      </div>

      {/* Trust & Guarantee Banner */}
      <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-4 mb-6 flex gap-3">
        <Info className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <p className="font-bold text-white">How the PayPal Escrow Hold Works:</p>
          <p className="leading-relaxed">
            Your ${amountDollars.toFixed(2)} is held safely by PayPal. It isn&apos;t released to the freelancer until the Chromium CDP agent verifies that all agreed checklist criteria are met.
          </p>
        </div>
      </div>

      {/* PayPal Sandbox Authorize Button */}
      <div className="space-y-3">
        <button
          onClick={handleAuthorizePayment}
          disabled={funding}
          className="w-full py-3.5 px-6 bg-white hover:bg-slate-200 text-slate-950 font-bold rounded-full shadow-xl shadow-white/10 active:scale-[0.98] flex items-center justify-center gap-2 transition-transform duration-150 disabled:opacity-50"
        >
          {funding ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Contacting PayPal Sandbox...</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 text-slate-950" />
              <span>Authorize ${amountDollars.toFixed(2)} USD Hold (PayPal)</span>
            </>
          )}
        </button>
        <p className="text-center text-[11px] text-slate-500 font-mono">
          PayPal Sandbox API • 29-day validity hold • Deduplication & Idempotent Safe
        </p>
      </div>
    </div>
  );
}
