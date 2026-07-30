'use client';

import React from 'react';
import { Calendar, CloudSun, AlertCircle, CheckCircle, Clock } from 'lucide-react';

export function DailyPlanner() {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-violet-600" />
          AI Daily Planner
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-violet-600">Morning Executive Briefing</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">🌤️ Weather: 28°C Partly Cloudy</p>
            <p className="text-sm text-slate-600 dark:text-zinc-400">Traffic: Moderate on Main Highway (15 min delay)</p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Daily Health & Wellness</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">💧 Water Intake: 1.5L / 3.0L Target</p>
            <p className="text-sm text-slate-600 dark:text-zinc-400">💊 Evening Medicine: 8:00 PM Reminder</p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Today's Timeline</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-zinc-800/40 rounded-xl">
              <Clock className="w-4 h-4 text-violet-600 shrink-0" />
              <div className="flex-1 text-sm">
                <span className="font-bold text-slate-900 dark:text-white">09:30 AM</span> — Team Daily Standup Meeting
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-zinc-800/40 rounded-xl">
              <Clock className="w-4 h-4 text-violet-600 shrink-0" />
              <div className="flex-1 text-sm">
                <span className="font-bold text-slate-900 dark:text-white">02:00 PM</span> — CRM Client Follow-ups (Rahul & Priya)
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-zinc-800/40 rounded-xl">
              <Clock className="w-4 h-4 text-violet-600 shrink-0" />
              <div className="flex-1 text-sm">
                <span className="font-bold text-slate-900 dark:text-white">07:00 PM</span> — Tolee Society Management Meeting
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
