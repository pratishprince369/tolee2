'use client';

import React from 'react';
import { Calendar, Plus, Clock, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AICalendar() {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-violet-600" />
              AI Smart Calendar
            </h2>
            <p className="text-xs text-slate-500">Auto-synced with Tolee Groups, EMIs & Personal Reminders</p>
          </div>
          <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white rounded-full">
            <Plus className="w-4 h-4 mr-1" /> Add Event
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-violet-200 dark:border-violet-900/50 bg-violet-50/50 dark:bg-violet-950/20 rounded-2xl space-y-2">
            <span className="text-xs font-bold text-violet-600 uppercase">Today</span>
            <p className="text-sm font-bold text-slate-900 dark:text-white">Doctor Appointment</p>
            <p className="text-xs text-slate-500">📍 City Hospital • 04:00 PM</p>
          </div>

          <div className="p-4 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/40 rounded-2xl space-y-2">
            <span className="text-xs font-bold text-amber-600 uppercase">Tomorrow</span>
            <p className="text-sm font-bold text-slate-900 dark:text-white">Car Insurance EMI Due</p>
            <p className="text-xs text-slate-500">💰 ₹4,500 • Auto-Pay Scheduled</p>
          </div>

          <div className="p-4 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/40 rounded-2xl space-y-2">
            <span className="text-xs font-bold text-pink-600 uppercase">This Saturday</span>
            <p className="text-sm font-bold text-slate-900 dark:text-white">Priya's Birthday Celebration</p>
            <p className="text-xs text-slate-500">🎉 Family Reminder • All Day</p>
          </div>
        </div>
      </div>
    </div>
  );
}
