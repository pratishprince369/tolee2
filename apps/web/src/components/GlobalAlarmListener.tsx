'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { BellRing, Clock, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDueAIReminders, dismissAIReminder, snoozeAIReminder } from '@/actions/ai-manager';
import { playRingtoneAlarm, stopRingtoneAlarm, speakAlarmVoice, triggerSystemNotification } from '@/modules/ai-manager/Core/alarm-engine';

interface ActiveAlarm {
  id: string;
  title: string;
  type: string;
  remindAt: Date | string;
}

export function GlobalAlarmListener() {
  const { data: session } = useSession();
  const [activeAlarm, setActiveAlarm] = useState<ActiveAlarm | null>(null);
  const dismissedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!session?.user) return;

    const checkAlarms = async () => {
      try {
        const res = await getDueAIReminders();
        if (res.success && res.dueReminders && res.dueReminders.length > 0) {
          // Find the first reminder that hasn't been locally stopped/dismissed
          const due = res.dueReminders.find((r: any) => !dismissedIdsRef.current.has(r.id));
          
          if (due && (!activeAlarm || activeAlarm.id !== due.id)) {
            setActiveAlarm(due as any);
            playRingtoneAlarm();
            speakAlarmVoice(`Sir! Alarm alert! Time for your reminder: ${due.title}`);
            triggerSystemNotification("⏰ TOLEE AI ALARM REMINDER", due.title);
          }
        }
      } catch (err) {
        // Silently handle error
      }
    };

    checkAlarms();
    const interval = setInterval(checkAlarms, 4000);
    return () => clearInterval(interval);
  }, [session, activeAlarm]);

  const handleStopAlarm = async () => {
    if (!activeAlarm) return;
    const alarmId = activeAlarm.id;

    // 1. Immediately silence audio & speech
    stopRingtoneAlarm();

    // 2. Mark locally as suppressed so poller never re-triggers it
    dismissedIdsRef.current.add(alarmId);

    // 3. Immediately close Modal
    setActiveAlarm(null);

    // 4. Update Database in Background
    await dismissAIReminder(alarmId);
  };

  const handleSnoozeAlarm = async () => {
    if (!activeAlarm) return;
    const alarmId = activeAlarm.id;

    // 1. Immediately silence audio & speech
    stopRingtoneAlarm();

    // 2. Mark locally as suppressed for this cycle
    dismissedIdsRef.current.add(alarmId);

    // 3. Immediately close Modal
    setActiveAlarm(null);

    // 4. Update Database for +5 mins in Background
    await snoozeAIReminder(alarmId, 5);
  };

  if (!activeAlarm) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-violet-500/50 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-6 shadow-2xl relative overflow-hidden">
        {/* Glowing Ringing Background Pulse */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-500/20 rounded-full blur-3xl animate-ping" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-violet-500/20 rounded-full blur-3xl animate-ping" />

        <div className="inline-flex p-4 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 animate-bounce">
          <BellRing className="w-10 h-10 sm:w-12 sm:h-12" />
        </div>

        <div>
          <span className="text-xs font-bold tracking-widest text-rose-500 uppercase">⏰ ALARM RINGING NOW</span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
            {activeAlarm.title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
            Tolee AI Alarm Engine is playing loud ringtone and voice alert.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleSnoozeAlarm}
            className="flex-1 rounded-2xl py-6 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 font-bold hover:bg-slate-100 dark:hover:bg-zinc-800"
          >
            <Clock className="w-4 h-4 mr-2" /> Snooze 5 Min
          </Button>
          <Button
            type="button"
            onClick={handleStopAlarm}
            className="flex-1 rounded-2xl py-6 bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-lg shadow-rose-600/30"
          >
            <Check className="w-4 h-4 mr-2" /> Stop Alarm
          </Button>
        </div>
      </div>
    </div>
  );
}
