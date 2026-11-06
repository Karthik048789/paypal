'use client';

import React, { useState, useEffect, useRef } from 'react';
import { RunEvent, TestResultDTO } from '@/types';
import { Monitor, Smartphone, Terminal, CheckCircle2, XCircle, Loader2, Play, ShieldAlert, ShieldCheck } from 'lucide-react';

interface LiveVerificationViewProps {
  jobId: string;
  runId: string;
  checklistItems: Array<{
    id: string;
    description: string;
    testType: string;
    weight: number;
    critical: boolean;
  }>;
  onComplete: () => void;
}

export function LiveVerificationView({
  jobId,
  runId,
  checklistItems,
  onComplete,
}: LiveVerificationViewProps) {
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [activeViewport, setActiveViewport] = useState<'Desktop' | 'Mobile'>('Desktop');
  const [activeStep, setActiveStep] = useState(1);
  const [totalSteps, setTotalSteps] = useState(checklistItems.length + 3);
  const [itemStatuses, setItemStatuses] = useState<Record<string, 'pending' | 'running' | 'pass' | 'fail'>>(
    Object.fromEntries(checklistItems.map((i) => [i.id, 'pending']))
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [finalTier, setFinalTier] = useState<string | null>(null);

  const feedEndRef = useRef<HTMLDivElement>(null);

  // Stopwatch timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Server-Sent Events (SSE) Listener (FR-32)
  useEffect(() => {
    const sse = new EventSource(`/api/jobs/${jobId}/events`);

    sse.addEventListener('run_event', (e) => {
      try {
        const event: RunEvent = JSON.parse(e.data);
        // Only process events for our specific run (or events without a runId that belong to this job)
        if (event.runId !== runId) return;

        setEvents((prev) => [...prev, event]);

        // Handle viewport updates
        if (event.type === 'viewport' && event.data?.device) {
          setActiveViewport(event.data.device as 'Desktop' | 'Mobile');
        }

        // Handle step updates
        if (event.type === 'step') {
          if (event.data?.step) setActiveStep(Number(event.data.step));
          if (event.data?.totalSteps) setTotalSteps(Number(event.data.totalSteps));
          if (event.data?.itemId) {
            setItemStatuses((prev) => ({
              ...prev,
              [event.data!.itemId as string]: 'running',
            }));
          }
        }

        // Handle test result updates
        if (event.type === 'test_result' && event.data?.itemId) {
          const result = event.data.result as 'pass' | 'fail';
          setItemStatuses((prev) => ({
            ...prev,
            [event.data!.itemId as string]: result,
          }));
        }

        // Handle score reveal
        if (event.type === 'score' && event.data?.score !== undefined) {
          setFinalScore(Number(event.data.score));
          setFinalTier(String(event.data.tier));
        }

        // Handle payout settlement & completion
        if (event.type === 'payout') {
          setIsFinished(true);
        }
      } catch (err) {
        console.error('Failed to parse SSE event:', err);
      }
    });

    return () => {
      sse.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, runId]); // onComplete intentionally excluded to avoid reconnection loops

  // Trigger onComplete when isFinished becomes true (delayed)
  useEffect(() => {
    if (!isFinished) return;
    const timer = setTimeout(() => {
      onComplete();
    }, 3000);
    return () => clearTimeout(timer);
  }, [isFinished, onComplete]);

  // Auto-scroll activity feed to bottom
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-lg">
      {/* Top Bar with Live Pill, Stopwatch, Step Counter */}
      <div className="bg-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            Live Cloud Verification
          </span>
          <span className="text-xs font-mono text-slate-400">
            Session: <strong className="text-white">{runId.slice(0, 10)}...</strong>
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold">
          {/* Viewport badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-800 text-slate-200 border border-slate-700">
            {activeViewport === 'Mobile' ? (
              <>
                <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                <span>Mobile (390×844)</span>
              </>
            ) : (
              <>
                <Monitor className="w-3.5 h-3.5 text-sky-400" />
                <span>Desktop (1440×900)</span>
              </>
            )}
          </div>

          <div className="px-3 py-1 rounded-md bg-slate-800 text-slate-200 border border-slate-700 font-mono">
            ⏱ {formatTime(elapsedSeconds)}
          </div>

          <div className="px-3 py-1 rounded-md bg-sky-950 text-sky-300 border border-sky-800 font-mono">
            Test {activeStep} of {totalSteps}
          </div>
        </div>
      </div>

      {/* Progress Checklist Stepper Strip */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex gap-3 overflow-x-auto">
        {checklistItems.map((item, idx) => {
          const status = itemStatuses[item.id] || 'pending';
          return (
            <div
              key={item.id}
              className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                status === 'pass'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : status === 'fail'
                  ? 'bg-rose-50 border-rose-300 text-rose-800'
                  : status === 'running'
                  ? 'bg-sky-50 border-sky-300 text-sky-800 shadow-xs ring-1 ring-sky-300'
                  : 'bg-white border-slate-200 text-slate-400'
              }`}
            >
              {status === 'pass' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
              {status === 'fail' && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
              {status === 'running' && <Loader2 className="w-3.5 h-3.5 text-sky-600 animate-spin" />}
              {status === 'pending' && <span className="w-3.5 h-3.5 text-slate-300 font-mono">○</span>}
              <span className="truncate max-w-[150px]">{item.description}</span>
              <span className="font-mono text-[10px] text-slate-400">({item.weight}p)</span>
            </div>
          );
        })}
      </div>

      {/* Two-Pane Body: Embedded Cloud Browser (Left) & Realtime Activity Log (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px]">
        {/* Left Pane: Cloud Browser Session Embed */}
        <div className="lg:col-span-7 bg-slate-900 p-6 flex flex-col items-center justify-center relative border-b lg:border-b-0 lg:border-r border-slate-800">
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 rounded-xl border border-slate-800 p-6 shadow-inner relative overflow-hidden">
            {/* Viewport Frame */}
            <div
              className={`transition-all duration-500 ease-in-out border border-slate-700 bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden ${
                activeViewport === 'Mobile' ? 'w-[320px] h-[400px]' : 'w-full h-[380px]'
              }`}
            >
              {/* Browser Address Bar */}
              <div className="bg-slate-100 border-b border-slate-200 px-3 py-1.5 flex items-center gap-2 text-[11px] text-slate-500">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-rose-400" />
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <div className="flex-1 bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700 font-mono text-[10px] truncate">
                  🔒 https://deliverable-preview.cloud/
                </div>
              </div>

              {/* Simulated Render / Stream view */}
              <div className="flex-1 p-4 bg-slate-50 flex flex-col justify-between font-sans">
                <div>
                  <div className="h-4 bg-slate-200 rounded w-1/3 mb-3 animate-pulse" />
                  <div className="h-3 bg-slate-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-slate-200 rounded w-1/2 mb-4" />
                  <div className="p-3 bg-white border border-slate-200 rounded shadow-xs">
                    <span className="text-xs font-bold text-slate-800">Kernel CDP Agent Active</span>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Executing DOM assertions, console error listeners, and responsive layout audit.
                    </p>
                  </div>
                </div>

                <div className="text-[10px] font-mono text-slate-400 text-center">
                  Live Viewport: {activeViewport === 'Mobile' ? '390×844 (Mobile)' : '1440×900 (Desktop)'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Pane: Live Activity Feed */}
        <div className="lg:col-span-5 bg-slate-900/95 text-slate-200 p-5 flex flex-col font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <span className="flex items-center gap-1.5 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <Terminal className="w-3.5 h-3.5 text-sky-400" />
              Activity Feed (aria-live)
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">CONNECTED</span>
          </div>

          <div
            className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[380px]"
            aria-live="polite"
          >
            {events.length === 0 ? (
              <div className="text-slate-500 italic py-8 text-center">
                Connecting to live agent stream...
              </div>
            ) : (
              events.map((evt, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded border text-[11px] leading-relaxed ${
                    evt.type === 'score'
                      ? 'bg-sky-950/80 border-sky-800 text-sky-200 font-bold'
                      : evt.type === 'payout'
                      ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200 font-bold'
                      : evt.type === 'test_result' && evt.message.includes('FAIL')
                      ? 'bg-rose-950/50 border-rose-900 text-rose-300'
                      : evt.type === 'test_result' && evt.message.includes('PASS')
                      ? 'bg-emerald-950/40 border-emerald-900 text-emerald-300'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] opacity-60 mb-0.5">
                    <span className="uppercase font-semibold">[{evt.type}]</span>
                    <span>{new Date(evt.ts).toLocaleTimeString()}</span>
                  </div>
                  <div className="font-mono">{evt.message}</div>
                </div>
              ))
            )}
            <div ref={feedEndRef} />
          </div>
        </div>
      </div>

      {/* Completion Overlay if Finished */}
      {isFinished && finalScore !== null && (
        <div className="p-6 bg-gradient-to-r from-slate-900 to-sky-950 text-white border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center font-extrabold text-xl text-sky-300">
              {finalScore}
            </div>
            <div>
              <h4 className="font-bold text-base text-white">Verification Complete ({finalScore}/100)</h4>
              <p className="text-xs text-slate-300">
                Deterministic tier: <strong>{finalTier}</strong>. Settlement actions applied automatically.
              </p>
            </div>
          </div>
          <button
            onClick={onComplete}
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg shadow transition"
          >
            View Detailed Decision Report →
          </button>
        </div>
      )}
    </div>
  );
}

