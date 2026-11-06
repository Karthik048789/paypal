import React from 'react';
import { JobStatus } from '@/types';
import { CheckCircle2, AlertCircle, Clock, ShieldCheck, PauseCircle, XCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: JobStatus | string;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  switch (status) {
    case 'PAID':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Paid in full (100%)</span>
        </span>
      );
    case 'PARTIALLY_PAID':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 ${className}`}
        >
          <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
          <span>Partially paid (70%)</span>
        </span>
      );
    case 'HELD':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 ${className}`}
        >
          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
          <span>Held, fixes needed (0%)</span>
        </span>
      );
    case 'FUNDED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 ${className}`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>Funds held in Escrow</span>
        </span>
      );
    case 'VERIFYING':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-300 animate-pulse ${className}`}
        >
          <div className="w-2 h-2 rounded-full bg-sky-600" />
          <span>Verifying Deliverable</span>
        </span>
      );
    case 'AWAITING_FUNDING':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 ${className}`}
        >
          <Clock className="w-3.5 h-3.5 text-indigo-600" />
          <span>Awaiting Escrow Funding</span>
        </span>
      );
    case 'AWAITING_APPROVAL':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300 ${className}`}
        >
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>Checklist Review</span>
        </span>
      );
    case 'DISPUTED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 ${className}`}
        >
          <AlertCircle className="w-3.5 h-3.5 text-purple-600" />
          <span>Disputed (Admin Review)</span>
        </span>
      );
    case 'EXPIRED':
    case 'CANCELLED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200 ${className}`}
        >
          <XCircle className="w-3.5 h-3.5 text-slate-400" />
          <span>{status === 'EXPIRED' ? 'Expired' : 'Cancelled'}</span>
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 ${className}`}
        >
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{status}</span>
        </span>
      );
  }
}
