'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Brain, Trash2, Plus, Lock, BellOff, CheckCircle2, Globe, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAIMemories, saveAIMemory, deleteAIMemory, dismissAllAIReminders } from '@/actions/ai-manager';
import { stopRingtoneAlarm } from '@/modules/ai-manager/Core/alarm-engine';

const SUPPORTED_LANGUAGES = [
  { code: 'hi-IN', label: 'Hindi (हिंदी)', announcement: 'Aapka Tolee Voice AI Manager ON ho chuka hai. Ab aap mujhe voice mein operate kar sakte hain.' },
  { code: 'en-IN', label: 'English (English)', announcement: 'Your Tolee Voice AI Manager is now ON. You can now operate me using your voice.' },
  { code: 'mr-IN', label: 'Marathi (मराठी)', announcement: 'Tumcha Tolee Voice AI Manager ON jala ahe. Aata tumhi majhashi aawajane bolu shakta.' },
  { code: 'gu-IN', label: 'Gujarati (ગુજરાતી)', announcement: 'Tamaroo Tolee Voice AI Manager ON thai gayoo chhe. Aawaj thi operate kari shako chho.' },
  { code: 'ta-IN', label: 'Tamil (தமிழ்)', announcement: 'Ungal Tolee Voice AI Manager ON aagivittathu.' },
  { code: 'te-IN', label: 'Telugu (తెలుగు)', announcement: 'Mee Tolee Voice AI Manager ON ayyindi.' },
];

export function AIMemorySettings() {
  const [memories, setMemories] = useState<any[]>([]);
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [turningOff, setTurningOff] = useState(false);
  const [turnedOffMessage, setTurnedOffMessage] = useState(false);
  const [nativeLang, setNativeLang] = useState('hi-IN');
  const [langSavedNotice, setLangSavedNotice] = useState(false);

  useEffect(() => {
    loadMemories();
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('tolee_native_lang') || 'hi-IN';
      setNativeLang(savedLang);
    }
  }, []);

  const loadMemories = async () => {
    const res = await getAIMemories();
    if (res.success) {
      setMemories(res.memories);
    }
  };

  const handleSaveLang = async (langCode: string) => {
    setNativeLang(langCode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tolee_native_lang', langCode);
    }
    await saveAIMemory({ category: 'personal', key: 'native_language', value: langCode });
    setLangSavedNotice(true);
    setTimeout(() => setLangSavedNotice(false), 3000);
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
      {/* 🌐 Native Language Selection Card */}
      <div className="bg-gradient-to-r from-cyan-900/90 to-slate-900 border border-cyan-500/30 rounded-3xl p-6 text-white shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 flex items-center justify-center text-cyan-300">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                User Native Language Preference
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </h3>
              <p className="text-xs text-slate-300">
                Select your primary language for Voice AI Manager greetings, announcements, and briefings.
              </p>
            </div>
          </div>
          {langSavedNotice && (
            <span className="text-xs font-bold text-emerald-400 bg-emerald-900/40 px-3 py-1 rounded-full border border-emerald-500/40 animate-pulse">
              ✓ Language Saved!
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleSaveLang(lang.code)}
              className={`flex items-center justify-between px-4 py-3 rounded-2xl border text-xs font-bold transition-all ${
                nativeLang === lang.code
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)] scale-[1.02]'
                  : 'bg-slate-800/80 text-slate-200 border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800'
              }`}
            >
              <span>{lang.label}</span>
              {nativeLang === lang.code && <CheckCircle2 className="w-4 h-4 text-slate-950" />}
            </button>
          ))}
        </div>
      </div>

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
