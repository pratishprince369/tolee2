'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Bot, Sparkles, Calendar, CheckSquare, Users, MessageSquare, 
  Brain, Newspaper, LayoutDashboard, Send, User, ChevronRight
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
import { getAIDashboardSummary, processAIPersonalMessage } from '@/actions/ai-manager';
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
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    <div className="flex flex-col h-[calc(100vh-65px)] bg-slate-50 dark:bg-[#09090b]">
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
              <MessageSquare className="w-3.5 h-3.5 mr-1" /> CRM
            </Button>
            <Button
              variant={activeTab === 'community' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('community')}
              className={`rounded-full text-xs font-semibold ${activeTab === 'community' ? 'bg-violet-600 text-white' : ''}`}
            >
              <Users className="w-3.5 h-3.5 mr-1" /> Community
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

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pb-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <DailySummaryGrid
              userName={session?.user?.name || ''}
              summary={summaryData}
              onSelectAction={(tab) => setActiveTab(tab as AIModuleTab)}
            />

            {/* Conversation Stream inside Dashboard */}
            {messages.length > 0 && (
              <div className="max-w-4xl mx-auto px-4 space-y-4 pt-4 border-t border-slate-200 dark:border-zinc-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Live AI Conversation Stream</h3>
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.isAI ? 'justify-start' : 'justify-end'}`}
                    >
                      {msg.isAI && (
                        <Avatar className="w-8 h-8 shrink-0 bg-violet-600 text-white">
                          <AvatarFallback><Bot className="w-4 h-4 text-white" /></AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`max-w-xl p-4 rounded-2xl text-sm ${
                          msg.isAI
                            ? 'bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white shadow-sm'
                            : 'bg-violet-600 text-white shadow-md'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                        <span className="text-[10px] opacity-60 block text-right mt-1">{msg.time}</span>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3 justify-start items-center text-xs text-slate-400">
                      <Bot className="w-4 h-4 animate-spin text-violet-600" /> AI Employee is processing...
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'planner' && <DailyPlanner />}
        {activeTab === 'calendar' && <AICalendar />}
        {activeTab === 'tasks' && <AITasks />}
        {activeTab === 'crm' && <AICRM />}
        {activeTab === 'community' && <AICommunity />}
        {activeTab === 'news' && <AINews />}
        {activeTab === 'settings' && <AIMemorySettings />}
      </div>

      {/* Sticky Bottom Dock */}
      <VoiceInputDock onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
}
