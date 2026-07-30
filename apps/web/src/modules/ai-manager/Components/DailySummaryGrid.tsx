'use client';

import React from 'react';
import { 
  Calendar, CheckSquare, MessageSquare, DollarSign, 
  Cake, MapPin, Users, HeartPulse, CloudSun, Newspaper, Sparkles, AlertCircle, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SummaryData {
  pendingTasksCount: number;
  remindersCount: number;
  memoriesCount: number;
  myGroupsCount: number;
  tasks: any[];
  reminders: any[];
  myGroups: any[];
}

interface DailySummaryGridProps {
  userName: string;
  summary: SummaryData;
  onSelectAction: (action: string) => void;
}

export function DailySummaryGrid({ userName, summary, onSelectAction }: DailySummaryGridProps) {
  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> 24×7 Personal AI Employee Active
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">
            👋 Good Morning, {userName || 'Friend'}!
          </h1>
          <p className="text-sm md:text-base text-violet-100 max-w-xl">
            Here is your daily personal executive summary. You have <span className="font-bold underline">{summary.pendingTasksCount} pending tasks</span> and <span className="font-bold underline">{summary.remindersCount} reminders</span> today.
          </p>
        </div>
      </div>

      {/* Quick Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {/* Calendar / Meetings */}
        <div 
          onClick={() => onSelectAction('calendar')}
          className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 cursor-pointer hover:border-violet-500 transition-all shadow-sm hover:shadow-md group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400 group-hover:text-blue-500">View</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">3</p>
          <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Scheduled Meetings</p>
        </div>

        {/* Pending Tasks */}
        <div 
          onClick={() => onSelectAction('tasks')}
          className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 cursor-pointer hover:border-violet-500 transition-all shadow-sm hover:shadow-md group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl">
              <CheckSquare className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400 group-hover:text-amber-500">View</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{summary.pendingTasksCount}</p>
          <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Pending Tasks</p>
        </div>

        {/* Payments / EMI */}
        <div 
          onClick={() => onSelectAction('finance')}
          className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 cursor-pointer hover:border-violet-500 transition-all shadow-sm hover:shadow-md group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400 group-hover:text-emerald-500">View</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">5</p>
          <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Pending Payments</p>
        </div>

        {/* Birthdays */}
        <div 
          onClick={() => onSelectAction('family')}
          className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 cursor-pointer hover:border-violet-500 transition-all shadow-sm hover:shadow-md group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 bg-pink-50 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400 rounded-xl">
              <Cake className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400 group-hover:text-pink-500">View</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">2</p>
          <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Birthdays Today</p>
        </div>
      </div>

      {/* Detail Widgets Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Widget: Today's Priorities */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-violet-600" />
              AI Priority Digest
            </h3>
            <Button variant="ghost" size="sm" onClick={() => onSelectAction('tasks')} className="text-xs text-violet-600">
              Manage Tasks <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          <div className="space-y-2.5">
            {summary.tasks.length > 0 ? (
              summary.tasks.slice(0, 3).map((task: any, index: number) => (
                <div key={task.id || index} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-violet-600 mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{task.title}</p>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">Category: {task.category}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="space-y-2">
                <div className="p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-xl text-sm text-slate-700 dark:text-zinc-300 flex items-center justify-between">
                  <span>🏢 Society General Body Meeting</span>
                  <span className="text-xs text-slate-500 font-medium">7:00 PM</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-xl text-sm text-slate-700 dark:text-zinc-300 flex items-center justify-between">
                  <span>👨‍💼 CRM Client Follow-up: 15 Leads</span>
                  <span className="text-xs text-slate-500 font-medium">2:00 PM</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-xl text-sm text-slate-700 dark:text-zinc-300 flex items-center justify-between">
                  <span>⚡ Electricity Bill Payment</span>
                  <span className="text-xs text-amber-600 font-bold">Due Today</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Widget: Quick AI Capability Shortcuts */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-600" />
            Personal AI Modules
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            <button 
              onClick={() => onSelectAction('community')}
              className="p-3 text-left border border-slate-200 dark:border-zinc-800 hover:border-violet-500 rounded-xl transition-all hover:bg-violet-50/50 dark:hover:bg-violet-950/20"
            >
              <Users className="w-4 h-4 text-violet-600 mb-1" />
              <p className="text-xs font-bold text-slate-900 dark:text-white">Community AI</p>
              <p className="text-[11px] text-slate-500">Group Assistant</p>
            </button>

            <button 
              onClick={() => onSelectAction('crm')}
              className="p-3 text-left border border-slate-200 dark:border-zinc-800 hover:border-violet-500 rounded-xl transition-all hover:bg-violet-50/50 dark:hover:bg-violet-950/20"
            >
              <MessageSquare className="w-4 h-4 text-indigo-600 mb-1" />
              <p className="text-xs font-bold text-slate-900 dark:text-white">CRM Manager</p>
              <p className="text-[11px] text-slate-500">Leads & Follow-ups</p>
            </button>

            <button 
              onClick={() => onSelectAction('health')}
              className="p-3 text-left border border-slate-200 dark:border-zinc-800 hover:border-violet-500 rounded-xl transition-all hover:bg-violet-50/50 dark:hover:bg-violet-950/20"
            >
              <HeartPulse className="w-4 h-4 text-rose-600 mb-1" />
              <p className="text-xs font-bold text-slate-900 dark:text-white">Health & Water</p>
              <p className="text-[11px] text-slate-500">Reminders & Log</p>
            </button>

            <button 
              onClick={() => onSelectAction('news')}
              className="p-3 text-left border border-slate-200 dark:border-zinc-800 hover:border-violet-500 rounded-xl transition-all hover:bg-violet-50/50 dark:hover:bg-violet-950/20"
            >
              <Newspaper className="w-4 h-4 text-emerald-600 mb-1" />
              <p className="text-xs font-bold text-slate-900 dark:text-white">News Digest</p>
              <p className="text-[11px] text-slate-500">Personalized Feed</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
