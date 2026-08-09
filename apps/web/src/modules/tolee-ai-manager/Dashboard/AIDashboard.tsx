'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Bot, Sparkles, Calendar, CheckSquare, Users, MessageSquare, 
  Brain, Newspaper, LayoutDashboard
} from 'lucide-react';
import { DailySummaryGrid } from '../Components/DailySummaryGrid';
import { VoiceInputDock } from '../Components/VoiceInputDock';
import { FloatingVoiceHUD } from '../VoiceCompanion/FloatingVoiceHUD';
import { DailyPlanner } from '../Personal/DailyPlanner';
import { AICalendar } from '../Calendar/AICalendar';
import { AITasks } from '../Tasks/AITasks';
import { AICRM } from '../CRM/AICRM';
import { AICommunity } from '../Community/AICommunity';
import { AINews } from '../News/AINews';
import { AIMemorySettings } from '../Settings/AIMemorySettings';
import { AIFinance } from '../Finance/AIFinance';
import { AIBirthdays } from '../Personal/AIBirthdays';
import { getAIDashboardSummary, processAIPersonalMessage } from '@/actions/ai-manager';
import { createPost } from '@/actions/post';
import { Button } from '@/components/ui/button';

export type AIModuleTab = 
  | 'chat'
  | 'dashboard'
  | 'planner'
  | 'calendar'
  | 'tasks'
  | 'crm'
  | 'community'
  | 'news'
  | 'settings'
  | 'finance'
  | 'birthdays';

interface Message {
  id: string;
  sender: string;
  text: string;
  isAI: boolean;
  time: string;
  interactiveAction?: {
    type: string;
    label: string;
    payload: any;
    executed?: boolean;
  };
}

function formatTime(d: Date = new Date()) {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
}

export function AIDashboard() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<AIModuleTab>('chat');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init_1',
      sender: 'Tolee AI Manager',
      text: 'Good morning! I am your 24×7 Personal Tolee AI Manager. How can I manage your posts, Tolees, CRM leads, or calendar today?',
      isAI: true,
      time: formatTime()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [publishingActionId, setPublishingActionId] = useState<string | null>(null);
  const [isVoiceCompanionActive, setIsVoiceCompanionActive] = useState(false);
  const [summaryData, setSummaryData] = useState({
    pendingTasksCount: 0,
    remindersCount: 0,
    memoriesCount: 0,
    myGroupsCount: 0,
    tasks: [],
    reminders: [],
    myGroups: []
  });
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, activeTab]);

  const loadSummary = async () => {
    const res = await getAIDashboardSummary();
    if (res.success && res.summary) {
      setSummaryData(res.summary as any);
    }
  };

  const handleExecuteAction = async (msgId: string, action: any) => {
    if (action.type === 'PUBLISH_POST' && action.payload) {
      setPublishingActionId(msgId);
      try {
        const res = await createPost({
          content: action.payload.caption || '',
          postType: 'post',
          media: action.payload.imageUrl ? { type: 'image', url: action.payload.imageUrl } : null,
          toleeIds: action.payload.toleeId ? [action.payload.toleeId] : undefined
        });

        if (res.success) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msgId
                ? {
                    ...m,
                    text: `${m.text}\n\n✅ **Live Published!** Your post is now live on Tolee Feed${action.payload.toleeName ? ` & ${action.payload.toleeName}` : ''}.`,
                    interactiveAction: m.interactiveAction
                      ? { ...m.interactiveAction, executed: true, label: '✅ Published' }
                      : undefined
                  }
                : m
            )
          );
        } else {
          alert('Failed to publish post: ' + ((res as any).error || 'Unknown error'));
        }
      } catch (err: any) {
        alert('Error publishing post: ' + err.message);
      } finally {
        setPublishingActionId(null);
      }
    }
  };

  const handleSendMessage = async (userText: string) => {
    if (!userText || !userText.trim()) return;

    const userMsg: Message = {
      id: `usr_${Date.now()}`,
      sender: session?.user?.name || 'You',
      text: userText,
      isAI: false,
      time: formatTime()
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const clientISO = new Date().toISOString();
      const timeZone = typeof window !== 'undefined' && window.Intl ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Asia/Kolkata';
      const result = await processAIPersonalMessage(userText, [], clientISO, timeZone);
      
      const aiText = (result as any).response || (result as any).reply || 'Command processed successfully.';

      const aiMsg: Message = {
        id: `ai_${Date.now()}`,
        sender: 'Tolee AI Manager',
        text: aiText,
        isAI: true,
        time: formatTime(),
        interactiveAction: (result as any).interactiveAction || (result as any).actionPayload
      };

      setMessages((prev) => [...prev, aiMsg]);
      return aiText;
    } catch (error: any) {
      const errText = 'I encountered an error processing your request. Please try again.';
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'Tolee AI Manager',
          text: errText,
          isAI: true,
          time: formatTime()
        }
      ]);
      return errText;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] bg-slate-50 dark:bg-[#09090b] relative">
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
              variant={activeTab === 'chat' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('chat')}
              className={`rounded-full text-xs font-semibold ${activeTab === 'chat' ? 'bg-violet-600 text-white' : ''}`}
            >
              <MessageSquare className="w-3.5 h-3.5 mr-1" /> Chat
            </Button>
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

      {/* Main Content View */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 max-w-6xl mx-auto w-full">
        {activeTab === 'chat' && (
          <div className="flex flex-col h-[calc(100vh-140px)] max-w-4xl mx-auto w-full pb-20">
            {/* ChatGPT Style Immersive Stream Container */}
            <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 space-y-4 no-scrollbar">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex gap-3 ${msg.isAI ? 'justify-start' : 'justify-end'}`}
                >
                  {msg.isAI && (
                    <div className="p-2.5 bg-violet-600 text-white rounded-2xl h-fit shadow-md shadow-violet-600/20">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}
                  <div 
                    className={`max-w-[88%] sm:max-w-[80%] rounded-3xl p-4 text-sm leading-relaxed shadow-sm ${
                      msg.isAI 
                        ? 'bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 border border-slate-200/80 dark:border-zinc-800' 
                        : 'bg-violet-600 text-white font-medium shadow-md shadow-violet-600/20'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                    {msg.interactiveAction && (
                      <div className="mt-3 p-3.5 bg-slate-50 dark:bg-zinc-950 rounded-2xl border border-violet-200 dark:border-violet-800/80 shadow-sm space-y-3">
                        {msg.interactiveAction.payload?.imageUrl && (
                          <img 
                            src={msg.interactiveAction.payload.imageUrl} 
                            alt="AI Generated Visual" 
                            className="w-full h-64 sm:h-80 object-cover rounded-xl border border-slate-200 dark:border-zinc-800 shadow-md"
                          />
                        )}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                            ✏️ Edit Post Caption:
                          </label>
                          <textarea
                            rows={3}
                            value={msg.interactiveAction.payload?.caption || ''}
                            onChange={(e) => {
                              const newCaption = e.target.value;
                              setMessages((prev) =>
                                prev.map((m) =>
                                  m.id === msg.id && m.interactiveAction
                                    ? {
                                        ...m,
                                        interactiveAction: {
                                          ...m.interactiveAction,
                                          payload: { ...m.interactiveAction.payload, caption: newCaption }
                                        }
                                      }
                                    : m
                                )
                              );
                            }}
                            placeholder="Type or customize your post caption here..."
                            className="w-full text-xs font-medium text-slate-800 dark:text-zinc-100 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl p-2.5 focus:ring-2 focus:ring-violet-500 focus:outline-none resize-y"
                          />
                        </div>
                        <Button
                          size="sm"
                          disabled={msg.interactiveAction.executed || publishingActionId === msg.id}
                          onClick={() => handleExecuteAction(msg.id, msg.interactiveAction)}
                          className="w-full h-10 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-[0.98]"
                        >
                          {publishingActionId === msg.id ? '🚀 Publishing to Tolees...' : msg.interactiveAction.label}
                        </Button>
                      </div>
                    )}
                    <span suppressHydrationWarning className={`block text-[10px] mt-1.5 text-right ${msg.isAI ? 'text-slate-400' : 'text-violet-200'}`}>
                      {msg.time}
                    </span>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 items-center text-xs text-slate-400 italic bg-white dark:bg-zinc-900 p-3 rounded-2xl w-fit border border-slate-200/60 dark:border-zinc-800 shadow-sm">
                  <Bot className="w-4 h-4 text-violet-600 animate-spin" /> Tolee AI Manager is processing...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <DailySummaryGrid userName={session?.user?.name || 'Friend'} summary={summaryData} onSelectAction={setActiveTab} />
            
            {/* Workspace Secondary Live Stream View */}
            {messages.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-4 sm:p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-violet-600" /> RECENT CONVERSATION
                  </h3>
                  <Button size="sm" variant="ghost" onClick={() => setActiveTab('chat')} className="text-xs text-violet-600 font-bold">
                    Open Full Chat →
                  </Button>
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto pr-2 no-scrollbar">
                  {messages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`flex gap-3 ${msg.isAI ? 'justify-start' : 'justify-end'}`}
                    >
                      <div 
                        className={`max-w-[85%] rounded-3xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                          msg.isAI 
                            ? 'bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border border-slate-200/60 dark:border-zinc-700/50' 
                            : 'bg-violet-600 text-white font-medium shadow-md shadow-violet-600/20'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{msg.text}</div>
                      </div>
                    </div>
                  ))}
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
        {activeTab === 'finance' && <AIFinance />}
        {activeTab === 'birthdays' && <AIBirthdays />}
      </div>

      {/* Non-blocking Floating J.A.R.V.I.S. Voice Widget */}
      <FloatingVoiceHUD
        isOpen={isVoiceCompanionActive}
        onClose={() => setIsVoiceCompanionActive(false)}
        onSelectTab={(tab) => setActiveTab(tab as any)}
        onSendMessage={handleSendMessage}
      />

      {/* Sticky Bottom Voice & Text Input Dock with ChatGPT-Style Start Voice Button */}
      <VoiceInputDock 
        onSendMessage={handleSendMessage} 
        onToggleVoiceCompanion={() => setIsVoiceCompanionActive(!isVoiceCompanionActive)}
        isVoiceActive={isVoiceCompanionActive}
        isLoading={isLoading} 
      />
    </div>
  );
}
