'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Brain, Trash2, Plus, Lock, BellOff, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAIMemories, saveAIMemory, deleteAIMemory, dismissAllAIReminders } from '@/actions/ai-manager';
import { stopRingtoneAlarm } from '@/modules/ai-manager/Core/alarm-engine';

export function AIMemorySettings() {
  const [memories, setMemories] = useState<any[]>([]);
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [turningOff, setTurningOff] = useState(false);
  const [turnedOffMessage, setTurnedOffMessage] = useState(false);

  useEffect(() => {
    loadMemories();
  }, []);

  const loadMemories = async () => {
    const res = await getAIMemories();
    if (res.success) {
      setMemories(res.memories);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key || !value) return;
    setLoading(true);
    await saveAIMemory({ category: 'personal', key, value });
    setKey('');
    setValue('');
    loadMemories();
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    await deleteAIMemory(id);
    loadMemories();
  };

  const handleTurnOffAllAlarms = async () => {
    setTurningOff(true);
    stopRingtoneAlarm();
    await dismissAllAIReminders();
    setTurningOff(false);
    setTurnedOffMessage(true);
    setTimeout(() => setTurnedOffMessage(false), 4000);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* 🔕 Master Alarm Control Card */}
      <div className="bg-gradient-to-r from-rose-50 to-orange-50 dark:from-zinc-900 dark:to-zinc-900 border border-rose-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BellOff className="w-5 h-5 text-rose-600" />
            Master Alarm & Reminder Off Switch
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Turn off, silence, and complete all pending alarms and reminders at once with one click.
          </p>
          {turnedOffMessage && (
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-2">
              <CheckCircle2 className="w-4 h-4" /> All active alarms turned off successfully!
            </p>
          )}
        </div>

        <Button
          type="button"
          onClick={handleTurnOffAllAlarms}
          disabled={turningOff}
          className="rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-6 py-5 shadow-lg shadow-rose-600/30 shrink-0"
        >
          <BellOff className="w-4 h-4 mr-2" />
          {turningOff ? 'Turning Off All...' : 'Turn Off All Alarms'}
        </Button>
      </div>

      {/* Memory Controls */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-violet-600" />
            AI Conversation Memory & Privacy Controls
          </h2>
          <p className="text-xs text-slate-500">Manage what your AI Personal Manager remembers about your schedule, preferences, and important dates</p>
        </div>

        <form onSubmit={handleSave} className="p-4 bg-slate-50 dark:bg-zinc-800/40 rounded-2xl space-y-3">
          <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">Add New Memory</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Input 
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Memory Key (e.g. wife_birthday, car_insurance_due)"
              className="bg-white dark:bg-zinc-900 text-sm"
            />
            <Input 
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Value (e.g. October 15th, Premium 12k)"
              className="bg-white dark:bg-zinc-900 text-sm"
            />
          </div>
          <Button type="submit" disabled={loading} className="rounded-full bg-violet-600 hover:bg-violet-700 text-white text-xs">
            <Plus className="w-4 h-4 mr-1" /> Save Memory Context
          </Button>
        </form>

        <div className="space-y-2">
          {memories.length > 0 ? (
            memories.map((m) => (
              <div 
                key={m.id} 
                className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 rounded-2xl"
              >
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-bold text-xs text-slate-700 dark:text-zinc-300">{m.key}:</span>
                  <span className="text-xs text-slate-900 dark:text-white">{m.value}</span>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => handleDelete(m.id)}
                  className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-xl"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 italic text-center py-4">No AI memories saved yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
