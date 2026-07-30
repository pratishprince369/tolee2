'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Bot, Sparkles, Calendar, CheckSquare, Users, MessageSquare, 
  Brain, Newspaper, LayoutDashboard, Send, User, ChevronRight,
  BellRing, Volume2, VolumeX, Clock, Check
} from 'lucide-react';
import { DailySummaryGrid } from '../Components/DailySummaryGrid';
import { VoiceInputDock } from '../Components/VoiceInputDock';
import { DailyPlanner } from '../Personal/DailyPlanner';
import { AICalendar } from '../Calendar/AICalendar';
import { AITasks } from '../Tasks/AITasks';
import { AICRM } from '../CRM/AICRM';
import { AICommunity } from '../Community/AICommunity';
import { AINews } from '../News/AINews';
import { AIMemorySettings } from '../Settings/AIMemorySettings';
import { 
  getAIDashboardSummary, 
  processAIPersonalMessage, 
  getDueAIReminders, 
  dismissAIReminder, 
  snoozeAIReminder 
} from '@/actions/ai-manager';
import { 
  playRingtoneAlarm, 
  stopRingtoneAlarm, 
  speakAlarmVoice, 
  triggerSystemNotification 
} from '../Core/alarm-engine';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export type AIModuleTab = 
  | 'dashboard'
  | 'planner'
  | 'calendar'
  | 'tasks'
  | 'crm'
  | 'community'
  | 'news'
  | 'settings';

interface Message {
  id: string;
  sender: string;
  text: string;
  isAI: boolean;
  time: string;
}

interface ActiveAlarm {
  id: string;
  title: string;
  type: string;
  remindAt: Date | string;
}

export function AIDashboard() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<AIModuleTab>('dashboard');
  const [summaryData, setSummaryData] = useState({
    pendingTasksCount: 0,
    remindersCount: 0,
    memoriesCount: 0,
    myGroupsCount: 0,
    tasks: [],
    reminders: [],
    myGroups: []
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeAlarm, setActiveAlarm] = useState<ActiveAlarm | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 🚨 Real-time Alarm Ringing Poller (Checks database every 4 seconds)
  useEffect(() => {
    const checkAlarms = async () => {
      if (activeAlarm) return; // Already ringing an alarm

      const res = await getDueAIReminders();
      if (res.success && res.dueReminders && res.dueReminders.length > 0) {
        const due = res.dueReminders[0];
        setActiveAlarm(due as any);

        // 1. Play Loud Ringtone Audio Alarm
        playRingtoneAlarm();

        // 2. Speak AI Voice Alarm Announcement
        speakAlarmVoice(`Sir! Alarm alert! Time for your reminder: ${due.title}`);

        // 3. Trigger Web Browser Push Notification
        triggerSystemNotification("⏰ TOLEE AI ALARM REMINDER", due.title);
      }
    };

    checkAlarms();
    const interval = setInterval(checkAlarms, 4000);
    return () => clearInterval(interval);
  }, [activeAlarm]);

  const handleStopAlarm = async () => {
    if (!activeAlarm) return;
    stopRingtoneAlarm();
    await dismissAIReminder(activeAlarm.id);
    setActiveAlarm(null);
    loadSummary();
  };

  const handleSnoozeAlarm = async () => {
    if (!activeAlarm) return;
    stopRingtoneAlarm();
    await snoozeAIReminder(activeAlarm.id, 5);
    setActiveAlarm(null);
    loadSummary();
  };

  const loadSummary = async () => {
    const res = await getAIDashboardSummary();
    if (res.success && res.summary) {
      setSummaryData(res.summary as any);
    }
  };

  const handleSendMessage = async (text: string) => {
    const userMsg: Message = {
      id: `u_${Date.now()}`,
      sender: session?.user?.name || 'You',
      text,
      isAI: false,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    const result = await processAIPersonalMessage(text);

    const aiMsg: Message = {
      id: `ai_${Date.now()}`,
      sender: 'Tolee AI Employee',
      text: result.response,
      isAI: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, aiMsg]);
    setIsLoading(false);
    loadSummary();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] bg-slate-50 dark:bg-[#09090b] relative">
      {/* 🚨 RINGING AUDIO ALARM POPUP MODAL */}
      {activeAlarm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
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
      )}

      {/* Top AI Navigation Bar */}
      <div className="sticky top-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 z-20 px-4 py-2">
        <div className="max-w-6xl mx-auto flex items-center justify-between overflow-x-auto no-scrollbar gap-2">
          <div className="flex items-center gap-1.5 shrink-0 pr-4 border-r border-slate-200 dark:border-zinc-800">
            <div className="p-1.5 bg-violet-600 rounded-xl text-white">
              <Bot className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-sm text-slate-900 dark:text-white hidden sm:inline">Tolee AI Manager</span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant={activeTab === 'dashboard' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('dashboard')}
              className={`rounded-full text-xs font-semibold ${activeTab === 'dashboard' ? 'bg-violet-600 text-white' : ''}`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 mr-1" /> Workspace
            </Button>
            <Button
              variant={activeTab === 'tasks' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('tasks')}
              className={`rounded-full text-xs font-semibold ${activeTab === 'tasks' ? 'bg-violet-600 text-white' : ''}`}
            >
              <CheckSquare className="w-3.5 h-3.5 mr-1" /> Tasks
            </Button>
            <Button
              variant={activeTab === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('calendar')}
              className={`rounded-full text-xs font-semibold ${activeTab === 'calendar' ? 'bg-violet-600 text-white' : ''}`}
            >
              <Calendar className="w-3.5 h-3.5 mr-1" /> Calendar
            </Button>
            <Button
              variant={activeTab === 'crm' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('crm')}
              className={`rounded-full text-xs font-semibold ${activeTab === 'crm' ? 'bg-violet-600 text-white' : ''}`}
            >
              <Users className="w-3.5 h-3.5 mr-1" /> CRM
            </Button>
            <Button
              variant={activeTab === 'community' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('community')}
              className={`rounded-full text-xs font-semibold ${activeTab === 'community' ? 'bg-violet-600 text-white' : ''}`}
            >
              <MessageSquare className="w-3.5 h-3.5 mr-1" /> Community
            </Button>
            <Button
              variant={activeTab === 'news' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('news')}
              className={`rounded-full text-xs font-semibold ${activeTab === 'news' ? 'bg-violet-600 text-white' : ''}`}
            >
              <Newspaper className="w-3.5 h-3.5 mr-1" /> News
            </Button>
            <Button
              variant={activeTab === 'settings' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('settings')}
              className={`rounded-full text-xs font-semibold ${activeTab === 'settings' ? 'bg-violet-600 text-white' : ''}`}
            >
              <Brain className="w-3.5 h-3.5 mr-1" /> Memory
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Workspace View */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6 max-w-6xl mx-auto w-full">
        {activeTab === 'dashboard' && (
          <>
            <DailySummaryGrid summary={summaryData} onTabChange={setActiveTab} />
            
            {/* Live Interactive Chat Messages Stream */}
            {messages.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-4 sm:p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-violet-600" /> LIVE AI CONVERSATION STREAM
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">Real-Time Execution</span>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto pr-2 no-scrollbar">
                  {messages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`flex gap-3 ${msg.isAI ? 'justify-start' : 'justify-end'}`}
                    >
                      {msg.isAI && (
                        <div className="p-2 bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 rounded-2xl h-fit">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}
                      <div 
                        className={`max-w-[85%] rounded-3xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                          msg.isAI 
                            ? 'bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border border-slate-200/60 dark:border-zinc-700/50' 
                            : 'bg-violet-600 text-white font-medium shadow-md shadow-violet-600/20'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{msg.text}</div>
                        <span className={`block text-[10px] mt-1.5 text-right ${msg.isAI ? 'text-slate-400' : 'text-violet-200'}`}>
                          {msg.time}
                        </span>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3 items-center text-xs text-slate-400 italic">
                      <Bot className="w-4 h-4 text-violet-600 animate-spin" /> Tolee AI Employee is processing...
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'planner' && <DailyPlanner />}
        {activeTab === 'calendar' && <AICalendar />}
        {activeTab === 'tasks' && <AITasks />}
        {activeTab === 'crm' && <AICRM />}
        {activeTab === 'community' && <AICommunity />}
        {activeTab === 'news' && <AINews />}
        {activeTab === 'settings' && <AIMemorySettings />}
      </div>

      {/* Sticky Bottom Voice & Text Input Dock */}
      <VoiceInputDock onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
}
