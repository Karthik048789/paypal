'use client';

import React, { useState } from 'react';
import { Shield, Lock, Info, Check, ArrowRight, Loader2 } from 'lucide-react';

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
  const platformFee = amountDollars * 0.02; // 2% fee (BR-6)
  const netPayout = amountDollars - platformFee;

  const handleAuthorizePayment = async () => {
    setFunding(true);
    setError('');

    try {
      // Step 1: Create PayPal order with intent=AUTHORIZE
      const orderRes = await fetch(`/api/jobs/${jobId}/fund/create-order`, {
        method: 'POST',
      });
      const orderData = await orderRes.json();

      if (!orderRes.ok) {
        throw new Error(orderData.error || 'Failed to initialize PayPal order.');
      }

      // Step 2: Authorize hold (simulating buyer approval via PayPal JS SDK in sandbox)
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
    <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
        <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Fund Escrow via PayPal</h2>
          <p className="text-xs text-slate-500">
            Authorization Hold (intent=AUTHORIZE). No money moves until verification passes.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 mb-6">
          {error}
        </div>
      )}

      {/* Escrow Fee & Breakdown Table */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 mb-6 space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-600">Agreed Project Amount:</span>
          <span className="font-semibold text-slate-900">${amountDollars.toFixed(2)} USD</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-600">PayGuard Platform Fee (2%):</span>
          <span className="font-medium text-slate-500">-${platformFee.toFixed(2)} USD</span>
        </div>
        <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-sm">
          <span className="font-bold text-slate-900">Net Deliverable Payout:</span>
          <span className="font-extrabold text-blue-600 text-base">${netPayout.toFixed(2)} USD</span>
        </div>
        <div className="text-[11px] text-slate-500 pt-1">
          Authorized Payee: <strong className="text-slate-700">{freelancerEmail}</strong>
        </div>
      </div>

      {/* Trust & Guarantee Banner */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-4 mb-6 flex gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 space-y-1">
          <p className="font-bold">How the PayPal Escrow Hold Works:</p>
          <p className="text-blue-800 leading-relaxed">
            &quot;Your ${amountDollars.toFixed(2)} is held safely by PayPal. It isn&apos;t released to the freelancer until the AI Cloud Browser agent verifies that all agreed checklist criteria are met.&quot;
          </p>
        </div>
      </div>

      {/* PayPal Sandbox Authorize Button */}
      <div className="space-y-3">
        <button
          onClick={handleAuthorizePayment}
          disabled={funding}
          className="w-full py-3.5 px-6 bg-[#0070BA] hover:bg-[#003087] text-white font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
        >
          {funding ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Contacting PayPal Sandbox...</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 text-sky-200" />
              <span>Authorize ${amountDollars.toFixed(2)} USD Hold (PayPal)</span>
            </>
          )}
        </button>
        <p className="text-center text-[11px] text-slate-400">
          PayPal Sandbox API • 29-day validity hold • Deduplication & Idempotent Safe
        </p>
      </div>
    </div>
  );
}
