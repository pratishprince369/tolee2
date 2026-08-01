'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { BellRing, Clock, Check, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  getDueAIReminders, 
  getMissedAIReminders, 
  dismissAIReminder, 
  snoozeAIReminder 
} from '@/actions/ai-manager';
import { 
  playRingtoneAlarm, 
  stopRingtoneAlarm, 
  speakAlarmVoice, 
  triggerSystemNotification 
} from '@/modules/ai-manager/Core/alarm-engine';

interface ActiveAlarm {
  id: string;
  title: string;
  type: string;
  remindAt: Date | string;
}

interface MissedReminder {
  id: string;
  title: string;
  remindAt: Date | string;
}

export function GlobalAlarmListener() {
  const { data: session } = useSession();
  const [activeAlarm, setActiveAlarm] = useState<ActiveAlarm | null>(null);
  const [missedAlerts, setMissedAlerts] = useState<MissedReminder[]>([]);
  const dismissedIdsRef = useRef<Set<string>>(new Set());

  // 1. Check for Missed Reminders silently on login/mount (no loud audio alarm)
  useEffect(() => {
    if (!session?.user) return;

    const checkMissed = async () => {
      try {
        const res = await getMissedAIReminders();
        if (res.success && res.missedReminders && res.missedReminders.length > 0) {
          setMissedAlerts(res.missedReminders as any);
        }
      } catch (e) {}
    };

    checkMissed();
  }, [session]);

  // 2. Active Alarm Poller (Runs every 4 seconds for due reminders)
  useEffect(() => {
    if (!session?.user) return;

    const checkAlarms = async () => {
      try {
        const res = await getDueAIReminders();
        if (res.success && res.dueReminders && res.dueReminders.length > 0) {
          const due = res.dueReminders.find((r: any) => !dismissedIdsRef.current.has(r.id));
          
          if (due && (!activeAlarm || activeAlarm.id !== due.id)) {
            setActiveAlarm(due as any);
            playRingtoneAlarm();
            speakAlarmVoice(`Sir! Alarm alert! Time for your reminder: ${due.title}`);
            triggerSystemNotification("⏰ TOLEE AI ALARM REMINDER", due.title);
          }
        }
      } catch (err) {}
    };

    checkAlarms();
    const interval = setInterval(checkAlarms, 4000);
    return () => clearInterval(interval);
  }, [session, activeAlarm]);

  const handleStopAlarm = async () => {
    if (!activeAlarm) return;
    const alarmId = activeAlarm.id;

    // Immediately stop ringtone & speech
    stopRingtoneAlarm();
    dismissedIdsRef.current.add(alarmId);
    setActiveAlarm(null);

    // Update DB to COMPLETED or schedule next recurrence
    await dismissAIReminder(alarmId);
  };

  const handleSnoozeAlarm = async () => {
    if (!activeAlarm) return;
    const alarmId = activeAlarm.id;

    // Immediately stop ringtone & speech
    stopRingtoneAlarm();
    dismissedIdsRef.current.add(alarmId);
    setActiveAlarm(null);

    // Update DB for +5 mins snooze
    await snoozeAIReminder(alarmId, 5);
  };

  return (
    <>
      {/* 🚨 ACTIVE RINGING ALARM MODAL */}
      {activeAlarm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-violet-500/50 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-6 shadow-2xl relative overflow-hidden">
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
      )}

      {/* ⚠️ SILENT MISSED REMINDERS TOAST BANNER */}
      {missedAlerts.length > 0 && !activeAlarm && (
        <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-[9990] max-w-sm w-full bg-amber-50 dark:bg-zinc-900 border border-amber-300 dark:border-amber-700/60 rounded-2xl p-4 shadow-xl animate-in slide-in-from-bottom duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
              <AlertCircle className="w-4 h-4 shrink-0" /> Missed Reminder Alert
            </div>
            <button 
              onClick={() => setMissedAlerts([])} 
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2 space-y-1">
            {missedAlerts.map(m => (
              <p key={m.id} className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                • {m.title} ({new Date(m.remindAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
              </p>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-2">
            These reminders passed while you were offline.
          </p>
        </div>
      )}
    </>
  );
}
