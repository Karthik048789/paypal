'use client';

import React, { useState } from 'react';
import { ChecklistItemDTO, JobStatus } from '@/types';
import { Check, ShieldAlert, AlertCircle, Lock, Edit3, Save, RefreshCw, CheckCircle2 } from 'lucide-react';

interface ChecklistEditorProps {
  jobId: string;
  checklist: {
    id: string;
    version: number;
    isLocked: boolean;
    approvedByClientAt?: string | null;
    approvedByFreelancerAt?: string | null;
    items: Array<{
      id: string;
      description: string;
      testType: string;
      criteria: string;
      weight: number;
      critical: boolean;
    }>;
  };
  jobStatus: JobStatus | string;
  currentUserId?: string;
  isClient: boolean;
  isFreelancer: boolean;
  onRefresh: () => void;
}

export function ChecklistEditor({
  jobId,
  checklist,
  jobStatus,
  isClient,
  isFreelancer,
  onRefresh,
}: ChecklistEditorProps) {
  const [items, setItems] = useState<ChecklistItemDTO[]>(
    checklist.items.map((i) => ({
      description: i.description,
      testType: i.testType as any,
      criteria: i.criteria,
      weight: i.weight,
      critical: i.critical,
    }))
  );

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState('');

  const totalWeight = items.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
  const isSumValid = totalWeight === 100;
  const hasConsoleHealth = items.some(
    (i) => (i.testType === 'console_errors' || i.description.toLowerCase().includes('console')) && i.weight >= 10
  );

  const canEdit = !checklist.isLocked && ['DRAFT', 'AWAITING_APPROVAL'].includes(jobStatus);

  const handleWeightChange = (index: number, newWeight: number) => {
    const updated = [...items];
    updated[index].weight = Number(newWeight) || 0;
    setItems(updated);
  };

  const handleDescChange = (index: number, newDesc: string) => {
    const updated = [...items];
    updated[index].description = newDesc;
    setItems(updated);
  };

  const handleCriteriaChange = (index: number, newCriteria: string) => {
    const updated = [...items];
    updated[index].criteria = newCriteria;
    setItems(updated);
  };

  const handleSave = async () => {
    if (!isSumValid) {
      setError(`Weights must sum to exactly 100 (current: ${totalWeight})`);
      return;
    }
    if (!hasConsoleHealth) {
      setError('Console/network health must carry at least weight 10');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/jobs/${jobId}/checklist`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save checklist');
      } else {
        setIsEditing(false);
        onRefresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    setError('');
    try {
      const res = await fetch(`/api/jobs/${jobId}/checklist/approve`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to approve checklist');
      } else {
        onRefresh();
      }
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="bento-card bg-[#080b14]/85 backdrop-blur-xl rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-4 bg-white/[0.02]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white">
              AI Verification Checklist (v{checklist.version})
            </h3>
            {checklist.isLocked ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <Lock className="w-3 h-3 text-emerald-400" />
                Locked & Immutable
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                Awaiting Dual Approval
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic test rubric generated from client specifications. Both parties must approve to lock.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {canEdit && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-200 bg-white/[0.05] border border-white/[0.1] rounded-full hover:bg-white/[0.1] transition-colors duration-150"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-400" />
              Edit Criteria / Weights
            </button>
          )}

          {isEditing && (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-slate-950 bg-white rounded-full hover:bg-slate-200 transition-colors duration-150"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setError('');
                }}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-300 bg-white/[0.04] border border-white/[0.1] rounded-full hover:bg-white/[0.08] transition-colors duration-150"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Checklist Items Table */}
      <div className="divide-y divide-white/[0.06]">
        {items.map((item, idx) => (
          <div key={idx} className="p-4 sm:p-5 hover:bg-white/[0.02] transition-colors duration-150">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="font-mono text-xs font-bold text-slate-500">#{idx + 1}</span>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-white/[0.05] text-sky-400 border border-white/[0.08]">
                    {item.testType}
                  </span>
                  {item.critical && (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/25">
                      Hard-Fail Critical (BR-5)
                    </span>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-2 mt-2">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleDescChange(idx, e.target.value)}
                      className="w-full px-3 py-1.5 text-sm font-semibold bg-[#05070c] text-white border border-white/[0.12] rounded-lg focus:outline-none focus:border-sky-500"
                    />
                    <textarea
                      value={item.criteria}
                      onChange={(e) => handleCriteriaChange(idx, e.target.value)}
                      rows={2}
                      className="w-full px-3 py-1.5 text-xs bg-[#05070c] text-slate-300 border border-white/[0.12] rounded-lg focus:outline-none focus:border-sky-500"
                    />
                  </div>
                ) : (
                  <>
                    <h4 className="text-sm font-semibold text-white">{item.description}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{item.criteria}</p>
                  </>
                )}
              </div>

              {/* Weight Pill / Input */}
              <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                <span className="text-[11px] text-slate-500 font-medium">Test Weight</span>
                {isEditing ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={item.weight}
                      onChange={(e) => handleWeightChange(idx, Number(e.target.value))}
                      className="w-16 px-2 py-1 text-center font-bold font-mono text-sm bg-[#05070c] text-white border border-white/[0.12] rounded-lg focus:outline-none focus:border-sky-500"
                    />
                    <span className="text-xs font-semibold text-slate-400">pts</span>
                  </div>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    {item.weight} pts
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer / Dual Approval Status */}
      <div className="p-6 bg-white/[0.02] border-t border-white/[0.08]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Weight Totals Validation */}
          <div className="flex items-center gap-3">
            <div className="text-xs">
              <span className="text-slate-400">Total Rubric Weight: </span>
              <strong className={isSumValid ? 'text-emerald-400 font-bold font-mono' : 'text-rose-400 font-bold font-mono'}>
                {totalWeight} / 100 pts
              </strong>
            </div>
            {!isSumValid && (
              <span className="text-[11px] text-rose-400 font-medium">
                (Must equal 100 before approval)
              </span>
            )}
          </div>

          {/* Dual Approval Controls */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Client:</span>
              {checklist.approvedByClientAt ? (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Approved
                </span>
              ) : (
                <span className="text-slate-500">Pending</span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Freelancer:</span>
              {checklist.approvedByFreelancerAt ? (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Approved
                </span>
              ) : (
                <span className="text-slate-500">Pending</span>
              )}
            </div>

            {!checklist.isLocked && (
              <button
                onClick={handleApprove}
                disabled={approving || !isSumValid || !hasConsoleHealth}
                className="px-5 py-2 bg-white hover:bg-slate-200 disabled:bg-white/10 disabled:text-slate-500 text-slate-950 text-xs font-bold rounded-full shadow-lg shadow-white/10 active:scale-[0.98] transition-transform duration-150 inline-flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                {approving ? 'Approving...' : isClient ? 'Approve as Client' : 'Approve as Freelancer'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

