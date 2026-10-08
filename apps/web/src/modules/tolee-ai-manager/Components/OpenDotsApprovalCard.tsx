'use client';

import React from 'react';
import { 
  CheckCircle2, XCircle, AlertTriangle, Send, Share2, 
  Trash2, Mail, MessageSquare, DollarSign, ExternalLink, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ActionApprovalPayload {
  actionType: 'PUBLISH_POST' | 'SEND_EMAIL' | 'SEND_WHATSAPP' | 'CREATE_AD' | 'DELETE_POST' | 'NAVIGATE';
  title: string;
  description: string;
  target?: string;
  summary?: string;
  data?: Record<string, any>;
  cost?: string;
}

interface OpenDotsApprovalCardProps {
  approval: ActionApprovalPayload;
  onApprove: (payload: any) => Promise<void> | void;
  onReject: () => void;
  isExecuting?: boolean;
  isExecuted?: boolean;
}

/**
 * 🛡️ OpenDots Human-in-the-Loop Action Approval Card
 * Inspired by CopilotKit/OpenDots specification.
 * Ensures that high-risk actions (sending email, WhatsApp, ad spend, post publish, deletion)
 * require verified user approval before mutating real database state.
 */
export function OpenDotsApprovalCard({
  approval,
  onApprove,
  onReject,
  isExecuting = false,
  isExecuted = false,
}: OpenDotsApprovalCardProps) {
  const getActionBadge = () => {
    switch (approval.actionType) {
      case 'SEND_EMAIL':
        return { icon: <Mail className="w-3.5 h-3.5 text-blue-500" />, label: 'Email Action', border: 'border-blue-500/20 bg-blue-500/5' };
      case 'SEND_WHATSAPP':
        return { icon: <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />, label: 'WhatsApp Action', border: 'border-emerald-500/20 bg-emerald-500/5' };
      case 'PUBLISH_POST':
        return { icon: <Share2 className="w-3.5 h-3.5 text-violet-500" />, label: 'Feed Publish', border: 'border-violet-500/20 bg-violet-500/5' };
      case 'CREATE_AD':
        return { icon: <DollarSign className="w-3.5 h-3.5 text-amber-500" />, label: 'Ad Campaign Spend', border: 'border-amber-500/20 bg-amber-500/5' };
      case 'DELETE_POST':
        return { icon: <Trash2 className="w-3.5 h-3.5 text-red-500" />, label: 'Delete Content', border: 'border-red-500/20 bg-red-500/5' };
      default:
        return { icon: <AlertTriangle className="w-3.5 h-3.5 text-zinc-500" />, label: 'Platform Action', border: 'border-zinc-500/20 bg-zinc-500/5' };
    }
  };

  const badge = getActionBadge();

  if (isExecuted) {
    return (
      <div className="my-2.5 p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-200 font-semibold shadow-xs">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>Action Verified & Executed: {approval.title}</span>
      </div>
    );
  }

  return (
    <div className={`my-3 p-4 rounded-2xl border ${badge.border} bg-white dark:bg-zinc-900 shadow-md space-y-3`}>
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border border-slate-200 dark:border-zinc-800">
          {badge.icon}
          <span>{badge.label}</span>
        </div>
        {approval.cost && (
          <span className="text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-lg border border-amber-200 dark:border-amber-900/50">
            {approval.cost}
          </span>
        )}
      </div>

      <div>
        <h4 className="text-sm font-black text-slate-900 dark:text-zinc-100">{approval.title}</h4>
        <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 font-medium leading-relaxed">
          {approval.description}
        </p>
      </div>

      {approval.summary && (
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800/80 text-xs text-slate-700 dark:text-zinc-300 font-mono whitespace-pre-wrap leading-snug">
          {approval.summary}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          disabled={isExecuting}
          onClick={() => onApprove(approval.data)}
          className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs h-9 rounded-xl shadow-xs gap-1.5"
        >
          {isExecuting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Executing Action...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approve & Execute</span>
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isExecuting}
          onClick={onReject}
          className="px-3 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 h-9 rounded-xl border-slate-200 dark:border-zinc-800"
        >
          <XCircle className="w-3.5 h-3.5 text-slate-400 mr-1" />
          <span>Cancel</span>
        </Button>
      </div>
    </div>
  );
}
