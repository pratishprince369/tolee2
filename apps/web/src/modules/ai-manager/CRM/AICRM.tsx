'use client';

import React from 'react';
import { Users, PhoneCall, Send, AlertTriangle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AICRM() {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            AI CRM Manager
          </h2>
          <p className="text-xs text-slate-500">Lead tracking, automated WhatsApp follow-ups & revenue prediction</p>
        </div>

        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-900 dark:text-amber-200">Follow-up Alert: Rahul Sharma</p>
              <p className="text-xs text-amber-700 dark:text-amber-400">Rahul has not been contacted for 5 days. Send WhatsApp proposal draft?</p>
            </div>
          </div>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs">
            <Send className="w-3.5 h-3.5 mr-1" /> WhatsApp Draft
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-zinc-800/40 rounded-2xl space-y-2">
            <span className="text-xs font-bold text-indigo-600 uppercase">Active Leads Pipeline</span>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">15 Leads</p>
            <p className="text-xs text-slate-500">4 In Discussion • 2 Proposal Sent</p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-zinc-800/40 rounded-2xl space-y-2">
            <span className="text-xs font-bold text-emerald-600 uppercase">Predicted Revenue</span>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">₹1,25,000</p>
            <p className="text-xs text-slate-500">Based on active proposal conversions</p>
          </div>
        </div>
      </div>
    </div>
  );
}
