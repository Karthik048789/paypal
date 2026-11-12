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
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ${className}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Paid in full (100%)</span>
        </span>
      );
    case 'PARTIALLY_PAID':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 ${className}`}
        >
          <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
          <span>Partially paid (70%)</span>
        </span>
      );
    case 'HELD':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 ${className}`}
        >
          <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
          <span>Held, fixes needed (0%)</span>
        </span>
      );
    case 'FUNDED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 ${className}`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
          <span>Funds held in Escrow</span>
        </span>
      );
    case 'VERIFYING':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span>Verifying Deliverable</span>
        </span>
      );
    case 'AWAITING_FUNDING':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 ${className}`}
        >
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          <span>Awaiting Escrow Funding</span>
        </span>
      );
    case 'AWAITING_APPROVAL':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800/80 text-slate-300 border border-slate-700 ${className}`}
        >
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>Checklist Review</span>
        </span>
      );
    case 'DISPUTED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 ${className}`}
        >
          <AlertCircle className="w-3.5 h-3.5 text-purple-400" />
          <span>Disputed (Admin Review)</span>
        </span>
      );
    case 'EXPIRED':
    case 'CANCELLED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800/60 text-slate-400 border border-slate-700/60 ${className}`}
        >
          <XCircle className="w-3.5 h-3.5 text-slate-500" />
          <span>{status === 'EXPIRED' ? 'Expired' : 'Cancelled'}</span>
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800/60 text-slate-300 border border-slate-700/60 ${className}`}
        >
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{status}</span>
        </span>
      );
  }
}
