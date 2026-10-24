'use client';

import React, { useState } from 'react';
import { 
  CheckCircle2, Clock, Play, Square, RefreshCw, AlertCircle, 
  ChevronDown, ChevronUp, FileText, Globe, Sparkles, ShieldCheck, Check
} from 'lucide-react';

export interface OpenMuseTaskStep {
  id: string;
  stepIndex: number;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'skipped' | 'failed';
  approvalLevel?: 1 | 2 | 3 | 4;
  approvalId?: string;
  result?: any;
  error?: string;
}

export interface OpenMuseTaskRecord {
  id: string;
  userId: string;
  title: string;
  goal: string;
  status: 'created' | 'planning' | 'running' | 'waiting_for_approval' | 'completed' | 'cancelled' | 'failed';
  steps: OpenMuseTaskStep[];
  currentStepIndex: number;
  artifacts?: Array<{ name: string; url?: string; type: string; data?: any }>;
  sources?: Array<{ title: string; url: string; snippet?: string }>;
  checkpointState?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

interface OpenMuseTaskCardProps {
  task: OpenMuseTaskRecord;
  onApprove?: () => void;
  onCancel?: (taskId: string) => void;
  onResume?: (taskId: string) => void;
}

export function OpenMuseTaskCard({
  task,
  onApprove,
  onCancel,
  onResume
}: OpenMuseTaskCardProps) {
  const [expandedStep, setExpandedStep] = useState<number | null>(task.currentStepIndex || 1);
  const [copiedDraftIndex, setCopiedDraftIndex] = useState<number | null>(null);

  const getStatusBadge = () => {
    switch (task.status) {
      case 'running':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin" /> Running
          </span>
        );
      case 'waiting_for_approval':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/30">
            <ShieldCheck className="w-3 h-3" /> Approval Required
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
            <Square className="w-3 h-3" /> Cancelled
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3 h-3" /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Clock className="w-3 h-3" /> Queued
          </span>
        );
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedDraftIndex(index);
    setTimeout(() => setCopiedDraftIndex(null), 2000);
  };

  return (
    <div className="my-3 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121316] shadow-md overflow-hidden transition-all">
      {/* Header */}
      <div className="p-4 bg-slate-50/70 dark:bg-zinc-900/60 border-b border-slate-200/80 dark:border-zinc-800/80 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 font-mono text-[10px] font-extrabold tracking-wider uppercase">
              Agent Task
            </span>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
              {task.title}
            </h4>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-1">
            {task.goal}
          </p>
        </div>
        <div className="shrink-0">{getStatusBadge()}</div>
      </div>

      {/* Stepper Checklist */}
      <div className="p-4 space-y-2.5">
        {task.steps.map((step) => {
          const isDone = step.status === 'completed';
          const isCurrent = step.status === 'running';
          const isExpanded = expandedStep === step.stepIndex;

          return (
            <div
              key={step.id || step.stepIndex}
              className={`rounded-xl border transition-all ${
                isCurrent
                  ? 'border-amber-500/40 bg-amber-500/[0.03] dark:bg-amber-950/10'
                  : isDone
                  ? 'border-slate-200/60 dark:border-zinc-800/60 bg-slate-50/40 dark:bg-zinc-900/30'
                  : 'border-slate-200/40 dark:border-zinc-800/40 opacity-70'
              }`}
            >
              <button
                type="button"
                onClick={() => setExpandedStep(isExpanded ? null : step.stepIndex)}
                className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2.5 text-left text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                    ) : isCurrent ? (
                      <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-zinc-700 flex items-center justify-center text-[10px] text-slate-400">
                        {step.stepIndex}
                      </div>
                    )}
                  </div>
                  <div className="truncate">
                    <span className="font-semibold text-slate-800 dark:text-zinc-200">
                      {step.title}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 text-slate-400 dark:text-zinc-500">
                  {step.result && <FileText className="w-3.5 h-3.5 text-teal-500" />}
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </div>
              </button>

              {/* Step Expanded Content (Result / Artifacts) */}
              {isExpanded && (
                <div className="px-3.5 pb-3 pt-1 text-xs border-t border-slate-100 dark:border-zinc-800/50 space-y-2">
                  <p className="text-slate-500 dark:text-zinc-400 text-[11px] leading-relaxed">
                    {step.description}
                  </p>

                  {step.result?.summary && (
                    <div className="p-2.5 rounded-lg bg-slate-100/70 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 font-mono text-[11px]">
                      {step.result.summary}
                    </div>
                  )}

                  {step.result?.strategyPoints && Array.isArray(step.result.strategyPoints) && (
                    <ul className="space-y-1 list-disc pl-4 text-slate-600 dark:text-zinc-300 text-[11px]">
                      {step.result.strategyPoints.map((pt: string, idx: number) => (
                        <li key={idx}>{pt}</li>
                      ))}
                    </ul>
                  )}

                  {step.result?.posts && Array.isArray(step.result.posts) && (
                    <div className="space-y-2 pt-1">
                      <span className="font-bold text-[11px] text-teal-600 dark:text-teal-400 uppercase tracking-wider">
                        Generated Tolee Drafts:
                      </span>
                      {step.result.posts.map((post: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-2"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-800 dark:text-zinc-200">
                              {post.title}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(post.caption, idx)}
                              className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-600 dark:text-zinc-300 transition-colors"
                            >
                              {copiedDraftIndex === idx ? 'Copied!' : 'Copy Post'}
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-zinc-400 whitespace-pre-line leading-relaxed">
                            {post.caption}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Footer */}
      <div className="px-4 py-3 bg-slate-50/50 dark:bg-zinc-900/40 border-t border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between gap-3 text-xs">
        <div className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-teal-500" />
          <span>Checkpoint state secured</span>
        </div>

        <div className="flex items-center gap-2">
          {task.status === 'running' && onCancel && (
            <button
              type="button"
              onClick={() => onCancel(task.id)}
              className="px-3 py-1 rounded-lg border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-medium transition-colors"
            >
              Ruko / Cancel
            </button>
          )}

          {task.status === 'waiting_for_approval' && onApprove && (
            <button
              type="button"
              onClick={onApprove}
              className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" /> Approve & Broadcast
            </button>
          )}

          {task.status === 'cancelled' && onResume && (
            <button
              type="button"
              onClick={() => onResume(task.id)}
              className="px-3 py-1 rounded-lg border border-teal-500 text-teal-600 dark:text-teal-400 hover:bg-teal-500/10 font-medium transition-colors flex items-center gap-1"
            >
              <Play className="w-3 h-3" /> Resume Task
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
