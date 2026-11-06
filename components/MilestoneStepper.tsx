'use client';

import React from 'react';
import { JobStatus } from '@/types';
import { Check, ShieldAlert, ShieldCheck, Clock, FileCheck, CircleDot } from 'lucide-react';

interface MilestoneStepperProps {
  status: JobStatus | string;
  hasSubmission?: boolean;
}

export function MilestoneStepper({ status, hasSubmission = false }: MilestoneStepperProps) {
  // Steps: 1. Created, 2. Funded, 3. Submitted, 4. Verified, 5. Settled
  const isCreatedComplete = status !== 'DRAFT';
  const isFundedComplete = !['DRAFT', 'AWAITING_APPROVAL', 'AWAITING_FUNDING'].includes(status);
  const isSubmittedComplete = isFundedComplete && (hasSubmission || ['VERIFYING', 'PAID', 'PARTIALLY_PAID', 'HELD', 'DISPUTED'].includes(status));
  const isVerifiedComplete = ['PAID', 'PARTIALLY_PAID', 'HELD'].includes(status);

  // Settlement specific styling
  let settledColor = 'border-slate-300 text-slate-400 bg-white';
  let settledLabel = 'Settled';
  let settledSublabel = 'Awaiting verification';
  let settledIcon = <CircleDot className="w-4 h-4" />;

  if (status === 'PAID') {
    settledColor = 'border-emerald-600 bg-emerald-600 text-white shadow-emerald-100 shadow-md';
    settledLabel = 'Paid in Full';
    settledSublabel = '100% captured';
    settledIcon = <Check className="w-4 h-4" />;
  } else if (status === 'PARTIALLY_PAID') {
    settledColor = 'border-amber-600 bg-amber-600 text-white shadow-amber-100 shadow-md';
    settledLabel = 'Partially Paid';
    settledSublabel = '70% captured, 30% held';
    settledIcon = <ShieldCheck className="w-4 h-4" />;
  } else if (status === 'HELD') {
    settledColor = 'border-rose-600 bg-rose-600 text-white shadow-rose-100 shadow-md';
    settledLabel = 'Funds Held';
    settledSublabel = '0% captured, fixes needed';
    settledIcon = <ShieldAlert className="w-4 h-4" />;
  } else if (status === 'DISPUTED') {
    settledColor = 'border-purple-600 bg-purple-600 text-white shadow-purple-100 shadow-md';
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
      colorClass: isCreatedComplete ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-300 text-slate-500',
    },
    {
      id: 'funded',
      label: 'Funded',
      sublabel: 'PayPal hold locked',
      isCompleted: isFundedComplete,
      isActive: status === 'AWAITING_FUNDING',
      icon: isFundedComplete ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />,
      colorClass: isFundedComplete ? 'bg-blue-600 text-white border-blue-600 shadow-blue-100 shadow-md' : 'bg-white border-slate-300 text-slate-400',
    },
    {
      id: 'submitted',
      label: 'Submitted',
      sublabel: 'Deliverable live URL',
      isCompleted: isSubmittedComplete,
      isActive: status === 'FUNDED' && !hasSubmission,
      icon: isSubmittedComplete ? <Check className="w-4 h-4" /> : <FileCheck className="w-4 h-4" />,
      colorClass: isSubmittedComplete ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-300 text-slate-400',
    },
    {
      id: 'verifying',
      label: 'Verified',
      sublabel: 'Cloud browser QA',
      isCompleted: isVerifiedComplete,
      isActive: status === 'VERIFYING',
      icon: isVerifiedComplete ? <Check className="w-4 h-4" /> : <CircleDot className="w-4 h-4" />,
      colorClass: isVerifiedComplete
        ? 'bg-blue-600 text-white border-blue-600'
        : status === 'VERIFYING'
        ? 'bg-sky-500 text-white border-sky-500 animate-pulse'
        : 'bg-white border-slate-300 text-slate-400',
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
    <div className="w-full bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between relative">
        {/* Connecting Line */}
        <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 h-1 bg-slate-200 -z-0 transition-all duration-300">
          <div
            className="h-full bg-blue-600 transition-all duration-500 ease-in-out"
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

        {steps.map((step, idx) => (
          <div key={step.id} className="relative z-10 flex flex-col items-center text-center">
            <div
              className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${step.colorClass}`}
            >
              {step.icon}
            </div>
            <div className="mt-2.5">
              <span className={`text-xs font-semibold block ${step.isActive ? 'text-slate-900 font-bold' : 'text-slate-600'}`}>
                {step.label}
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:block mt-0.5">
                {step.sublabel}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
