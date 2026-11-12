'use client';

import React from 'react';
import { JobStatus } from '@/types';
import { Check, ShieldAlert, ShieldCheck, Clock, FileCheck, CircleDot } from 'lucide-react';

interface MilestoneStepperProps {
  status: JobStatus | string;
  hasSubmission?: boolean;
}

export function MilestoneStepper({ status, hasSubmission = false }: MilestoneStepperProps) {
  const isCreatedComplete = status !== 'DRAFT';
  const isFundedComplete = !['DRAFT', 'AWAITING_APPROVAL', 'AWAITING_FUNDING'].includes(status);
  const isSubmittedComplete =
    isFundedComplete &&
    (hasSubmission || ['VERIFYING', 'PAID', 'PARTIALLY_PAID', 'HELD', 'DISPUTED'].includes(status));
  const isVerifiedComplete = ['PAID', 'PARTIALLY_PAID', 'HELD'].includes(status);

  let settledColor = 'border-white/[0.15] text-slate-400 bg-[#0b0f19]';
  let settledLabel = 'Settled';
  let settledSublabel = 'Awaiting verification';
  let settledIcon = <CircleDot className="w-4 h-4" />;

  if (status === 'PAID') {
    settledColor = 'border-emerald-400 bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25';
    settledLabel = 'Paid in Full';
    settledSublabel = '100% captured';
    settledIcon = <Check className="w-4 h-4" />;
  } else if (status === 'PARTIALLY_PAID') {
    settledColor = 'border-amber-400 bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25';
    settledLabel = 'Partially Paid';
    settledSublabel = '70% captured, 30% held';
    settledIcon = <ShieldCheck className="w-4 h-4" />;
  } else if (status === 'HELD') {
    settledColor = 'border-rose-400 bg-rose-500 text-white shadow-lg shadow-rose-500/25';
    settledLabel = 'Funds Held';
    settledSublabel = '0% captured, fixes needed';
    settledIcon = <ShieldAlert className="w-4 h-4" />;
  } else if (status === 'DISPUTED') {
    settledColor = 'border-purple-400 bg-purple-600 text-white shadow-lg shadow-purple-500/25';
    settledLabel = 'Disputed';
    settledSublabel = 'Under Admin review';
    settledIcon = <ShieldAlert className="w-4 h-4" />;
  }

  const steps = [
    {
      id: 'created',
      label: 'Created',
      sublabel: 'Checklist drafted',
      isCompleted: isCreatedComplete,
      isActive: status === 'DRAFT' || status === 'AWAITING_APPROVAL',
      icon: isCreatedComplete ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />,
      colorClass: isCreatedComplete
        ? 'bg-white text-slate-950 border-white shadow-md shadow-white/10'
        : 'bg-[#0b0f19] border-white/[0.15] text-slate-400',
    },
    {
      id: 'funded',
      label: 'Funded',
      sublabel: 'PayPal hold locked',
      isCompleted: isFundedComplete,
      isActive: status === 'AWAITING_FUNDING',
      icon: isFundedComplete ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />,
      colorClass: isFundedComplete
        ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-lg shadow-sky-500/25'
        : 'bg-[#0b0f19] border-white/[0.15] text-slate-400',
    },
    {
      id: 'submitted',
      label: 'Submitted',
      sublabel: 'Deliverable live URL',
      isCompleted: isSubmittedComplete,
      isActive: status === 'FUNDED' && !hasSubmission,
      icon: isSubmittedComplete ? <Check className="w-4 h-4" /> : <FileCheck className="w-4 h-4" />,
      colorClass: isSubmittedComplete
        ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-lg shadow-sky-500/25'
        : 'bg-[#0b0f19] border-white/[0.15] text-slate-400',
    },
    {
      id: 'verifying',
      label: 'Verified',
      sublabel: 'Cloud browser QA',
      isCompleted: isVerifiedComplete,
      isActive: status === 'VERIFYING',
      icon: isVerifiedComplete ? <Check className="w-4 h-4" /> : <CircleDot className="w-4 h-4" />,
      colorClass: isVerifiedComplete
        ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-lg shadow-sky-500/25'
        : status === 'VERIFYING'
        ? 'bg-white text-slate-950 border-white animate-pulse shadow-lg shadow-white/30'
        : 'bg-[#0b0f19] border-white/[0.15] text-slate-400',
    },
    {
      id: 'settled',
      label: settledLabel,
      sublabel: settledSublabel,
      isCompleted: isVerifiedComplete,
      isActive: ['PAID', 'PARTIALLY_PAID', 'HELD', 'DISPUTED'].includes(status),
      icon: settledIcon,
      colorClass: settledColor,
    },
  ];

  return (
    <div className="w-full bento-card bg-[#080b14]/85 backdrop-blur-xl rounded-2xl p-6">
      <div className="flex items-center justify-between relative">
        {/* Connecting Line */}
        <div className="absolute top-4.5 left-8 right-8 h-[2px] bg-white/[0.08] z-0">
          <div
            className="h-full bg-gradient-to-r from-sky-400 via-white to-pink-400 transition-all duration-500 ease-in-out"
            style={{
              width: isVerifiedComplete
                ? '100%'
                : isSubmittedComplete
                ? '75%'
                : isFundedComplete
                ? '35%'
                : isCreatedComplete
                ? '10%'
                : '0%',
            }}
          />
        </div>

        {steps.map((step) => (
          <div key={step.id} className="relative z-10 flex flex-col items-center text-center">
            <div
              className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${step.colorClass}`}
            >
              {step.icon}
            </div>
            <div className="mt-2.5">
              <span
                className={`text-xs font-semibold block ${
                  step.isActive || step.isCompleted ? 'text-white' : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
              <span className="text-[11px] text-slate-500 hidden sm:block mt-0.5">
                {step.sublabel}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
