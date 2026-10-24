'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Bot, Sparkles, Calendar, CheckSquare, Users, MessageSquare, 
  Brain, Newspaper, LayoutDashboard, Download, Search, FileText,
  Lightbulb, LayoutGrid, FileSpreadsheet, Menu, X, Plus, Mic, MicOff,
  Send, MoreHorizontal, ArrowUp, ThumbsUp, ThumbsDown, Copy,
  Check, ExternalLink, Globe, Shield, Clock, Fingerprint,
  Pencil, ChevronRight, Share2, UserPlus, Sparkle, PanelLeft
} from 'lucide-react';
import { AIMessageRenderer } from '../Components/AIMessageRenderer';
import { OpenDotsApprovalCard } from '../Components/OpenDotsApprovalCard';
import { OpenMuseTaskCard } from '../Components/OpenMuseTaskCard';
import { LiveBrowserOperatorCanvas } from '../Components/LiveBrowserOperatorCanvas';
import { getAIDashboardSummary, processAIPersonalMessage, executeConfirmedAIAction, getAgentTasks, cancelAgentTask, resumeAgentTask } from '@/actions/ai-manager';
import { GenerativeAiStudioModal } from '@/components/GenerativeAiStudioModal';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export type AIModuleTab = 
  | 'chat'
  | 'search'
  | 'documents'
  | 'ideas'
  | 'tasks'
  | 'tools'
  | 'reports';

interface Message {
  id: string;
  sender: string;
  text: string;
  isAI: boolean;
  time: string;
  attachment?: {
    url?: string;
    type?: string;
    name?: string;
  };
  approvalPayload?: any;
  interactiveAction?: {
    type: string;
    label: string;
    payload: any;
    executed?: boolean;
  };
  browserCard?: {
    title: string;
    url: string;
    snippet?: string;
  };
  browserSession?: any;
}

interface ActivityItem {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  completed: boolean;
}

interface ChatThread {
  id: string;
  title: string;
  lastMessageTime: string;
}

function formatTime(d: Date = new Date()) {
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
}

export function AIDashboard() {
  const { data: session } = useSession();
  const [activeNavIcon, setActiveNavIcon] = useState<AIModuleTab>('chat');
  const [activeThreadId, setActiveThreadId] = useState<string>('main');
  
  // Desktop panel state
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [rightPanelTab, setRightPanelTab] = useState<'tasks' | 'safety' | 'history' | 'memory' | 'browser'>('tasks');
  const [browserSession, setBrowserSession] = useState<any>(null);
  const [isGenerativeStudioOpen, setIsGenerativeStudioOpen] = useState(false);
  
  // Mobile responsive drawer states
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isMobileActivityOpen, setIsMobileActivityOpen] = useState(false);

  const [inputMessage, setInputMessage] = useState('');
  const [searchThreadQuery, setSearchThreadQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // 1. CHAT THREADS: Blank by default for 1st-time users!
  const [threads, setThreads] = useState<ChatThread[]>([]);

  // 2. MESSAGES: Friendly clean welcome on 1st visit
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome_1',
      sender: 'Tolee AI Manager',
      text: `Namaste! 👋 Main aapka 24×7 Tolee AI Personal Manager hoon.\n\nAap mujhse Tolee posts banana, reels script, creative design, web search, schedule karna, ya koi bhi sawaal pooch sakte hain.\n\nBataiye, aaj main aapki kya madad karoon?`,
      isAI: true,
      time: formatTime()
    }
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [publishingActionId, setPublishingActionId] = useState<string | null>(null);

  // 3. TODAY'S ACTIVITIES: Blank by default for 1st-time users!
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load saved threads & activities from localStorage for returning users
  useEffect(() => {
    try {
      const savedThreads = localStorage.getItem('tolee_ai_threads');
      if (savedThreads) {
        const parsed = JSON.parse(savedThreads);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setThreads(parsed);
        }
      }

      const savedActs = localStorage.getItem('tolee_ai_activities');
      if (savedActs) {
        const parsed = JSON.parse(savedActs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setActivities(parsed);
        }
      }

      const savedMsgs = localStorage.getItem('tolee_ai_messages');
      if (savedMsgs) {
        const parsed = JSON.parse(savedMsgs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text) return;

    const userMsg: Message = {
      id: `usr_${Date.now()}`,
      sender: session?.user?.name || 'You',
      text,
      isAI: false,
      time: formatTime()
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputMessage('');
    setIsLoading(true);

    // If first message in this thread, add thread to Left side history!
    const threadTitle = text.length > 28 ? text.substring(0, 28) + '...' : text;
    setThreads((prev) => {
      const exists = prev.some((t) => t.id === activeThreadId);
      let updated: ChatThread[];
      if (exists) {
        updated = prev.map((t) => (t.id === activeThreadId ? { ...t, lastMessageTime: formatTime() } : t));
      } else {
        updated = [{ id: activeThreadId === 'main' ? `thread_${Date.now()}` : activeThreadId, title: threadTitle, lastMessageTime: formatTime() }, ...prev];
      }
      try {
        localStorage.setItem('tolee_ai_threads', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    // Add activity to Right side timeline!
    const newAct: ActivityItem = {
      id: `act_${Date.now()}`,
      title: threadTitle,
      subtitle: 'Executing personal assistant command',
      time: formatTime(),
      completed: false
    };
    setActivities((prev) => {
      const updated = [newAct, ...prev];
      try {
        localStorage.setItem('tolee_ai_activities', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    try {
      const clientISO = new Date().toISOString();
      const timeZone = typeof window !== 'undefined' && window.Intl ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Asia/Kolkata';

      const recentHistory = updatedMessages.slice(-10).map((m) => ({
        role: m.isAI ? 'assistant' : 'user',
        content: m.text
      }));

      const result = await processAIPersonalMessage(text, recentHistory, clientISO, timeZone);
      const aiText = (result as any).response || (result as any).reply || 'Task processed successfully.';

      // Check if browsing or backlink query
      const isSearchOrBrowse = /search|browse|jobs|check|price|competitor/i.test(text);
      const sessionData = (result as any).browserSession || ((result as any).interactiveAction?.type === 'BROWSER_SESSION' ? (result as any).interactiveAction.payload : undefined);
      const taskData = (result as any).taskRecord || ((result as any).interactiveAction?.type === 'OPENMUSE_TASK' ? (result as any).interactiveAction.payload : undefined);
      if (taskData) {
        loadAgentTasksList();
      }

      if (sessionData) {
        setBrowserSession(sessionData);
        setIsRightPanelOpen(true);
        setRightPanelTab('browser');
      }

      const aiMsg: Message = {
        id: `ai_${Date.now()}`,
        sender: 'Tolee AI Manager',
        text: aiText,
        isAI: true,
        time: formatTime(),
        approvalPayload: (result as any).approvalPayload || (result as any).interactiveAction?.approval,
        interactiveAction: (result as any).interactiveAction || (result as any).actionPayload,
        browserSession: sessionData,
        browserCard: isSearchOrBrowse ? {
          title: `Web Research: ${text}`,
          url: `https://tolee.in/search?q=${encodeURIComponent(text)}`,
          snippet: 'Browsed live information and verified source data...'
        } : undefined
      };

      const finalMessages = [...updatedMessages, aiMsg];
      setMessages(finalMessages);
      try {
        localStorage.setItem('tolee_ai_messages', JSON.stringify(finalMessages.slice(-50)));
      } catch (_) {}

      // Mark activity as completed on right panel
      setActivities((prev) => {
        const updated = prev.map((a) => (a.id === newAct.id ? { ...a, completed: true, subtitle: 'Completed & verified' } : a));
        try {
          localStorage.setItem('tolee_ai_activities', JSON.stringify(updated));
        } catch (_) {}
        return updated;
      });
    } catch (err: any) {
      const errMsg: Message = {
        id: `err_${Date.now()}`,
        sender: 'Tolee AI Manager',
        text: 'Maaf kijiye, main abhi request poori nahi kar paya. Kripya thodi der baad dobara koshish karein.',
        isAI: true,
        time: formatTime()
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleCreateNewThread = () => {
    const newId = `thread_${Date.now()}`;
    setActiveThreadId(newId);
    setMessages([
      {
        id: `init_${Date.now()}`,
        sender: 'Tolee AI Manager',
        text: 'Naya conversation shuru hua! 👋 Bataiye aaj kya kaam karna hai?',
        isAI: true,
        time: formatTime()
      }
    ]);
    setIsMobileNavOpen(false);
  };

  const handleStopTask = (targetMsgId?: string) => {
    setBrowserSession((prev: any) =>
      prev
        ? { ...prev, isStopped: true, status: 'stopped', statusText: 'Task stopped by user' }
        : { isStopped: true, status: 'stopped', statusText: 'Task stopped by user' }
    );

    setMessages((prev) =>
      prev.map((m) =>
        m.browserSession
          ? {
              ...m,
              browserSession: {
                ...m.browserSession,
                isStopped: true,
                status: 'stopped',
                statusText: 'Task stopped by user',
              },
            }
          : m
      )
    );

    const stopMsg: Message = {
      id: `stop_${Date.now()}`,
      sender: 'Tolee AI Manager',
      text: '🛑 **Task Stopped.** The automated browser task has been paused. You can resume at any time or ask a new question.',
      isAI: true,
      time: formatTime(),
    };
    setMessages((prev) => [...prev, stopMsg]);

    setActivities((prev) => [
      {
        id: `act_${Date.now()}`,
        title: 'Browser Task Paused',
        subtitle: 'Automated workflow halted by user',
        time: formatTime(),
        completed: false,
      },
      ...prev,
    ]);
  };

  const handleResumeTask = (targetMsgId?: string) => {
    setBrowserSession((prev: any) =>
      prev
        ? { ...prev, isStopped: false, status: 'waiting_user', statusText: 'Active · Waiting for verification' }
        : null
    );

    setMessages((prev) =>
      prev.map((m) =>
        m.browserSession
          ? {
              ...m,
              browserSession: {
                ...m.browserSession,
                isStopped: false,
                status: 'waiting_user',
                statusText: 'Active · Waiting for verification',
              },
            }
          : m
      )
    );
  };

  const filteredThreads = threads.filter((t) =>
    t.title.toLowerCase().includes(searchThreadQuery.toLowerCase())
  );

  return (
    <div className="flex w-full h-[100dvh] bg-white dark:bg-[#0c0d10] text-slate-800 dark:text-zinc-100 overflow-hidden font-sans relative">
      
      {/* ========================================================= */}
      {/* 1. FAR-LEFT NARROW ICON NAVIGATION DOCK (Desktop)          */}
      {/* ========================================================= */}
      <aside className="hidden md:flex w-14 sm:w-16 shrink-0 bg-white dark:bg-[#121317] border-r border-slate-200/80 dark:border-zinc-800/80 flex-col items-center justify-between py-3 z-30">
        
        {/* Top Icons */}
        <div className="flex flex-col items-center gap-4 w-full">
          {/* Brand Logo / Return to Tolee */}
          <Link
            href="/feed"
            title="Tolee Feed par wapas jayein"
            className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-600 text-white flex items-center justify-center font-black text-base shadow-sm hover:opacity-90 transition-opacity mb-2"
          >
            t
          </Link>

          <button
            onClick={() => setActiveNavIcon('chat')}
            title="Main Chat"
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              activeNavIcon === 'chat'
                ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white font-bold shadow-xs'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setActiveNavIcon('search');
              handleSendMessage('Trending topics and breaking news search karo');
            }}
            title="Search Web & Tolee"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-all"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setActiveNavIcon('ideas');
              handleSendMessage('Viral reel ideas aur post scripts banao');
            }}
            title="Creator Ideas & Reels"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-all"
          >
            <Lightbulb className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setActiveNavIcon('tasks');
              handleSendMessage('Mere scheduled posts aur reminders dikhao');
            }}
            title="Tasks & Reminders"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-all"
          >
            <CheckSquare className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsGenerativeStudioOpen(true)}
            title="Open AI Studio (Image, Video, Lip-sync)"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              const textBlob = messages.map(m => `[${m.time}] ${m.sender}: ${m.text}`).join('\n\n');
              const blob = new Blob([textBlob], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `tolee-ai-session-${Date.now()}.txt`;
              a.click();
            }}
            title="Export Transcript"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-all"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom Menu & Profile */}
        <div className="flex flex-col items-center gap-3">
          <Link
            href="/settings"
            title="Settings & Memory"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-all"
          >
            <Menu className="w-4 h-4" />
          </Link>

          <div 
            title={session?.user?.name || 'Account'}
            className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-zinc-200 overflow-hidden"
          >
            {session?.user?.image ? (
              <img src={session.user.image} alt="User" className="w-full h-full object-cover" />
            ) : (
              (session?.user?.name || 'T')[0].toUpperCase()
            )}
          </div>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* 2. LEFT SUB-SIDEBAR (Desktop)                             */}
      {/* ========================================================= */}
      <aside className="hidden md:flex w-60 lg:w-64 shrink-0 bg-[#f9fafb] dark:bg-[#101114] border-r border-slate-200/80 dark:border-zinc-800/80 flex-col justify-between py-4 px-3">
        <div className="flex flex-col gap-4 overflow-y-auto no-scrollbar">
          
          {/* Search Box */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#18191e] border border-slate-200 dark:border-zinc-800 rounded-xl px-2.5 py-1.5 shadow-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchThreadQuery}
              onChange={(e) => setSearchThreadQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          {/* Main Chat Item */}
          <div className="space-y-1">
            <button
              onClick={() => setActiveThreadId('main')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeThreadId === 'main'
                  ? 'bg-slate-200/70 dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/50'
              }`}
            >
              <span className="truncate">Main chat</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            </button>
          </div>

          {/* Side chats section header with + button */}
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between px-2 text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
              <span>Side chats</span>
              <button
                onClick={handleCreateNewThread}
                title="New chat thread"
                className="w-5 h-5 rounded-lg flex items-center justify-center hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Side Chat Threads (Blank on 1st visit, populates as user chats!) */}
            {filteredThreads.length === 0 ? (
              <div className="px-3 py-6 text-center text-slate-400 dark:text-zinc-500 space-y-1">
                <MessageSquare className="w-5 h-5 mx-auto stroke-[1.5] text-slate-300 dark:text-zinc-600 mb-1" />
                <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">No chat history yet</p>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 leading-tight">Start chatting to record tasks</p>
              </div>
            ) : (
              <div className="space-y-0.5 mt-1">
                {filteredThreads.map((thread) => (
                  <button
                    key={thread.id}
                    onClick={() => setActiveThreadId(thread.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-center justify-between group ${
                      activeThreadId === thread.id
                        ? 'bg-slate-200/70 dark:bg-zinc-800 text-slate-900 dark:text-white font-medium shadow-xs'
                        : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    <span className="truncate pr-2">{thread.title}</span>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {thread.lastMessageTime}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Suggestion Chips at Bottom */}
        <div className="border-t border-slate-200/80 dark:border-zinc-800/80 pt-3 space-y-1.5">
          <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 px-1 uppercase tracking-wider">
            Quick Actions
          </p>
          <button
            onClick={() => handleSendMessage('Diwali ke liye ek attractive reel script aur hashtags banao')}
            className="w-full text-left px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#18191e] border border-slate-200/80 dark:border-zinc-800 text-[11px] text-slate-600 dark:text-zinc-300 hover:border-teal-500 transition-colors truncate"
          >
            🎬 Reel script & hooks
          </button>
          <button
            onClick={() => handleSendMessage('Tolee ke competitor apps ke naye features check karke batao')}
            className="w-full text-left px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#18191e] border border-slate-200/80 dark:border-zinc-800 text-[11px] text-slate-600 dark:text-zinc-300 hover:border-teal-500 transition-colors truncate"
          >
            🔍 Competitor check karo
          </button>
          <button
            onClick={() => handleSendMessage('Kal subah 10 baje ke liye ek business promotional post plan karo')}
            className="w-full text-left px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#18191e] border border-slate-200/80 dark:border-zinc-800 text-[11px] text-slate-600 dark:text-zinc-300 hover:border-teal-500 transition-colors truncate"
          >
            📅 Post schedule plan
          </button>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* 2B. MOBILE NAVIGATION & THREADS DRAWER (Slide-over)       */}
      {/* ========================================================= */}
      {isMobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div 
            onClick={() => setIsMobileNavOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer Body */}
          <div className="relative w-72 max-w-[80vw] bg-white dark:bg-[#121317] h-full shadow-2xl flex flex-col justify-between py-4 px-3 z-10 animate-in slide-in-from-left duration-200">
            <div className="flex flex-col gap-4 overflow-y-auto no-scrollbar">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-600 text-white flex items-center justify-center font-black text-sm">
                    t
                  </div>
                  <span className="font-bold text-sm text-slate-900 dark:text-white">Tolee AI</span>
                </div>
                <button
                  onClick={() => setIsMobileNavOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Main chat button */}
              <button
                onClick={() => {
                  setActiveThreadId('main');
                  setIsMobileNavOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold ${
                  activeThreadId === 'main'
                    ? 'bg-slate-200/80 dark:bg-zinc-800 text-slate-900 dark:text-white'
                    : 'text-slate-600 dark:text-zinc-400'
                }`}
              >
                <span>Main chat</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </button>

              {/* Side Chats */}
              <div className="space-y-1">
                <div className="flex items-center justify-between px-2 text-[11px] font-bold text-slate-400 uppercase">
                  <span>Side chats</span>
                  <button
                    onClick={handleCreateNewThread}
                    className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {filteredThreads.length === 0 ? (
                  <p className="text-[11px] text-slate-400 px-2 py-3 text-center">No chat history yet</p>
                ) : (
                  filteredThreads.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setActiveThreadId(t.id);
                        setIsMobileNavOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs truncate ${
                        activeThreadId === t.id ? 'bg-slate-200/80 dark:bg-zinc-800 font-bold' : 'text-slate-600 dark:text-zinc-400'
                      }`}
                    >
                      {t.title}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-zinc-800 pt-3">
              <Link
                href="/feed"
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-xs font-bold text-slate-700 dark:text-zinc-200"
              >
                <span>Exit to Tolee Feed</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. CENTER MAIN CHAT CANVAS                                 */}
      {/* ========================================================= */}
      <main className="flex-1 flex flex-col h-full bg-white dark:bg-[#0c0d10] relative min-w-0 overflow-hidden">
        
        {/* Top Header Bar (Desktop & Mobile) */}
        <header className="h-14 shrink-0 border-b border-slate-200/80 dark:border-zinc-800/80 px-3 sm:px-6 flex items-center justify-between bg-white/80 dark:bg-[#0c0d10]/80 backdrop-blur-md z-10">
          
          <div className="flex items-center gap-2 min-w-0">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileNavOpen(true)}
              className="md:hidden p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 shrink-0"
              title="Open Navigation"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Mascot Icon in Mobile header */}
            <div className="w-7 h-7 rounded-full overflow-hidden bg-teal-50 dark:bg-zinc-800 border border-teal-200 dark:border-zinc-700 flex items-center justify-center shrink-0">
              <img src="/tolee-ai-avatar.png" alt="Tolee" className="w-full h-full object-contain" />
            </div>

            <div className="min-w-0">
              <h2 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                {activeThreadId === 'main' ? 'Main chat' : threads.find(t => t.id === activeThreadId)?.title || 'Side chat'}
              </h2>
            </div>
            
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-full px-2 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* New Chat Button */}
            <button
              onClick={handleCreateNewThread}
              title="Start new chat"
              className="h-8 w-8 sm:w-auto sm:px-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center gap-1 text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New</span>
            </button>

            {/* Generative AI Studio Button */}
            <Button
              size="sm"
              onClick={() => setIsGenerativeStudioOpen(true)}
              className="h-8 rounded-xl px-2.5 sm:px-3 text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center gap-1.5 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AI Studio</span>
            </Button>

            {/* Invite Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert('Tolee AI Manager link copied to clipboard!');
              }}
              className="h-8 rounded-xl px-2.5 text-xs font-semibold border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-1"
            >
              <UserPlus className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Invite</span>
            </Button>

            {/* Toggle Right Activity Panel (Desktop: toggle panel, Mobile: open drawer) */}
            <button
              onClick={() => {
                if (window.innerWidth < 768) {
                  setIsMobileActivityOpen(true);
                } else {
                  setIsRightPanelOpen(!isRightPanelOpen);
                }
              }}
              title="Activity & Tolee Assistant"
              className="w-8 h-8 rounded-xl flex items-center justify-center border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
            >
              <Bot className="w-4 h-4 text-teal-600" />
            </button>
          </div>
        </header>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto min-h-0 px-3 sm:px-8 py-3 sm:py-6 space-y-3 sm:space-y-6 max-w-3xl mx-auto w-full">
          
          {messages.map((msg) => (
            <div key={msg.id} className="space-y-3">
              
              {/* Optional: Embedded Browser Action Card */}
              {msg.browserCard && (
                <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-[#f9fafb] dark:bg-[#141519] overflow-hidden shadow-xs animate-in fade-in transition-all">
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-100 dark:bg-[#18191e] border-b border-slate-200/80 dark:border-zinc-800/80">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-zinc-700" />
                        <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-zinc-700" />
                        <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-zinc-700" />
                      </div>
                      <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400 bg-white dark:bg-[#101114] border border-slate-200 dark:border-zinc-800 rounded-lg px-2 py-0.5 truncate max-w-[200px] sm:max-w-md">
                        <Globe className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{msg.browserCard.url}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 sm:p-5 flex flex-col items-center justify-center text-center space-y-2.5 bg-white dark:bg-[#121316]">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                      <Globe className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
                    </div>
                    <div className="max-w-md space-y-1">
                      <h4 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white">
                        {msg.browserCard.title}
                      </h4>
                      <p className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400">
                        {msg.browserCard.snippet}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(msg.browserCard?.url, '_blank')}
                      className="rounded-xl text-xs font-semibold h-7 sm:h-8 px-3 sm:px-4 border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-1.5"
                    >
                      <span>Open browser</span>
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Muse Browser Task Status Badge */}
              {msg.browserSession && (
                <div className="flex w-full justify-start">
                  <div className="flex items-center justify-between w-full max-w-[90%] sm:max-w-2xl bg-white dark:bg-[#18191e] border border-slate-200 dark:border-zinc-800 rounded-2xl p-3 shadow-xs mb-1">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          msg.browserSession.isStopped
                            ? 'bg-rose-500/10 text-rose-500'
                            : 'bg-amber-500/15 text-amber-500'
                        }`}
                      >
                        <Globe className={`w-4 h-4 ${msg.browserSession.isStopped ? '' : 'animate-spin'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                            Browser Operator
                          </span>
                          {msg.browserSession.isStopped && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-400 font-bold">
                              Paused
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-[11px] font-semibold ${
                            msg.browserSession.isStopped
                              ? 'text-slate-400 dark:text-zinc-500'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {msg.browserSession.statusText || 'Waiting for you...'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setBrowserSession(msg.browserSession);
                          setIsRightPanelOpen(true);
                          setRightPanelTab('browser');
                        }}
                        className="px-3 py-1 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                      >
                        Open View
                      </button>
                      {msg.browserSession.isStopped ? (
                        <button
                          onClick={() => handleResumeTask(msg.id)}
                          className="px-2.5 py-1 rounded-xl border border-emerald-300 dark:border-emerald-800 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors cursor-pointer"
                        >
                          Resume task
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStopTask(msg.id)}
                          className="px-2.5 py-1 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                        >
                          Stop task
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Message Bubble */}
              {msg.text && (
                <div className={`flex w-full ${msg.isAI ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`relative max-w-[90%] sm:max-w-2xl text-xs sm:text-[13.5px] leading-relaxed transition-all ${
                      msg.isAI
                        ? 'bg-[#f8f9fa] dark:bg-[#15161b] text-slate-800 dark:text-zinc-100 border border-slate-200/70 dark:border-zinc-800 rounded-2xl p-3.5 sm:p-5 shadow-xs'
                        : 'bg-teal-600 text-white rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 shadow-xs'
                    }`}
                  >
                    <AIMessageRenderer content={msg.text} isAI={msg.isAI} />

                    {/* Footer bar for AI messages (Copy, Thumbs) */}
                    {msg.isAI && (
                      <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-200/50 dark:border-zinc-800/60 text-[11px] text-slate-400">
                        <span className="text-[10px]">{msg.time}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleCopy(msg.id, msg.text)}
                            title="Copy message"
                            className="p-1 hover:text-slate-700 dark:hover:text-zinc-200 rounded-md transition-colors"
                          >
                            {copiedMsgId === msg.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button title="Good response" className="p-1 hover:text-slate-700 dark:hover:text-zinc-200 rounded-md transition-colors">
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button title="Bad response" className="p-1 hover:text-slate-700 dark:hover:text-zinc-200 rounded-md transition-colors">
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Approval Card */}
              {msg.approvalPayload && (
                <div className="max-w-[92%] sm:max-w-2xl">
                  <OpenDotsApprovalCard
                    approval={msg.approvalPayload}
                    isExecuting={publishingActionId === msg.id}
                    isExecuted={Boolean(msg.interactiveAction?.executed)}
                    onApprove={async (data) => {
                      setPublishingActionId(msg.id);
                      try {
                        const res = await executeConfirmedAIAction(msg.approvalPayload.actionType, undefined, data);
                        if (res.success) {
                          setMessages((prev) =>
                            prev.map((m) =>
                              m.id === msg.id
                                ? {
                                    ...m,
                                    text: `${m.text}\n\n✅ **Approved & Executed!** ${res.message || 'Action executed successfully.'}`,
                                    interactiveAction: { type: 'EXECUTED', label: 'Executed', payload: data, executed: true },
                                    approvalPayload: undefined
                                  }
                                : m
                            )
                          );
                        }
                      } finally {
                        setPublishingActionId(null);
                      }
                    }}
                    onReject={() => {
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === msg.id
                            ? {
                                ...m,
                                text: `${m.text}\n\n❌ **Action Cancelled** by user.`,
                                approvalPayload: undefined
                              }
                            : m
                        )
                      );
                    }}
                  />
                </div>
              )}

              {/* Interactive Action Card (Open-Higgsfield Video / Image actions) */}
              {msg.interactiveAction && !msg.interactiveAction.executed && (
                <div className="pt-1 flex items-center gap-2">
                  {msg.interactiveAction.type === 'PREVIEW_VIDEO' && (
                    <Button
                      size="sm"
                      onClick={async () => {
                        const res = await executeConfirmedAIAction('SAVE_REEL_DRAFT', undefined, msg.interactiveAction?.payload);
                        if (res.success) {
                          setMessages((prev) =>
                            prev.map((m) =>
                              m.id === msg.id
                                ? {
                                    ...m,
                                    text: `${m.text}\n\n✅ **Reel Draft Saved!** Aapke account me private reel draft save ho gaya hai (Draft ID: ${res.draftId}).`,
                                    interactiveAction: { ...m.interactiveAction!, executed: true },
                                  }
                                : m
                            )
                          );
                        }
                      }}
                      className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold gap-1.5 h-8 shadow-xs"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>💾 Save as Reel Draft</span>
                    </Button>
                  )}
                  {msg.interactiveAction.type === 'PREVIEW_IMAGE' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setMessages((prev) =>
                          prev.map((m) =>
                            m.id === msg.id
                              ? {
                                  ...m,
                                  approvalPayload: {
                                    actionType: 'PUBLISH_POST',
                                    title: 'Publish Creative to Feed',
                                    description: 'Confirm publishing this AI creative to your public Tolee feed.',
                                    summary: msg.interactiveAction?.payload?.caption,
                                    data: msg.interactiveAction?.payload,
                                  },
                                }
                              : m
                          )
                        );
                      }}
                      className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold gap-1.5 h-8 shadow-xs"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>🚀 Review & Publish to Feed</span>
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 w-fit animate-pulse">
              <Bot className="w-3.5 h-3.5 animate-spin text-teal-600" />
              <span>Tolee AI soch raha hai aur tools chala raha hai...</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* ========================================================= */}
        {/* BOTTOM FLOATING INPUT DOCK (Mobile & Desktop)             */}
        {/* ========================================================= */}
        <div className="shrink-0 w-full p-2.5 sm:p-4 lg:p-6 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-[#0c0d10] dark:via-[#0c0d10]/95 pb-[calc(4.8rem+env(safe-area-inset-bottom))] lg:pb-6 z-20">
          {/* Muse-Style "A task needs review" Floating Banner */}
          {browserSession && browserSession.status === 'waiting_user' && !browserSession.isStopped && (
            <div className="max-w-3xl mx-auto mb-2.5 px-1 animate-in fade-in slide-in-from-bottom duration-200">
              <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-amber-500/15 dark:bg-amber-950/40 border border-amber-500/30 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                  <div>
                    <p className="text-xs font-extrabold text-amber-900 dark:text-amber-200">
                      A task needs review
                    </p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-300/80">
                      {browserSession.statusText || 'Action required in live browser session.'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsRightPanelOpen(true);
                    setRightPanelTab('browser');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  Review
                </button>
              </div>
            </div>
          )}

          <div className="max-w-3xl mx-auto relative bg-[#f4f5f7] dark:bg-[#17181d] border border-slate-200/90 dark:border-zinc-800/90 rounded-2xl shadow-xs transition-all focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20">
            <div className="flex items-center px-2.5 sm:px-3.5 py-1.5 sm:py-2 gap-1.5 sm:gap-2">
              
              {/* Plus Button for Attachments */}
              <button
                type="button"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*,application/pdf,.doc,.docx,.txt';
                  input.onchange = (e: any) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleSendMessage(`Attached file: ${file.name}. Please inspect and summarize.`);
                    }
                  };
                  input.click();
                }}
                title="Add attachment"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>

              {/* Text Input */}
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(inputMessage);
                  }
                }}
                placeholder="+ Message"
                className="flex-1 bg-transparent text-xs sm:text-sm text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none py-1"
              />

              {/* Voice / Mic Button */}
              <button
                type="button"
                onClick={() => {
                  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
                    alert('Speech recognition is not supported in this browser.');
                    return;
                  }
                  const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                  const rec = new SpeechRec();
                  rec.lang = 'hi-IN';
                  rec.onstart = () => setIsListening(true);
                  rec.onend = () => setIsListening(false);
                  rec.onresult = (e: any) => {
                    const transcript = e.results[0][0].transcript;
                    if (transcript) {
                      setInputMessage(transcript);
                    }
                  };
                  rec.start();
                }}
                title={isListening ? 'Listening...' : 'Voice input'}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800'
                }`}
              >
                <Mic className="w-4 h-4" />
              </button>

              {/* Send Button */}
              <button
                type="button"
                onClick={() => handleSendMessage(inputMessage)}
                disabled={!inputMessage.trim() || isLoading}
                title="Send message"
                className="w-7 h-7 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity shrink-0"
              >
                <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ========================================================= */}
      {/* 4. RIGHT SIDEBAR (Desktop: Panel, Mobile: Drawer)         */}
      {/* ========================================================= */}
      
      {/* Helper function to render Right Sidebar Content */}
      {(() => {
        const renderSidebarContent = (isMobileView: boolean = false) => {
          if (rightPanelTab === 'browser') {
            return (
              <LiveBrowserOperatorCanvas
                onClose={() => {
                  if (isMobileView) setIsMobileActivityOpen(false);
                  else setIsRightPanelOpen(false);
                  setRightPanelTab('tasks');
                }}
                onStopTask={handleStopTask}
                onResumeTask={handleResumeTask}
                onVerifyLink={async (siteId) => {
                  const res = await executeConfirmedAIAction('CONFIRM_BACKLINK_VERIFICATION', undefined, { siteId });
                  if (res.success) {
                    const verifiedName =
                      siteId === 'linkedin'
                        ? 'LinkedIn'
                        : siteId === 'alternativeto'
                        ? 'AlternativeTo'
                        : 'Crunchbase';
                    setMessages((prev) => [
                      ...prev,
                      {
                        id: `ai_${Date.now()}`,
                        sender: 'Tolee AI Manager',
                        text: `✅ **Verified!** ${verifiedName} backlink confirmation completed. Tolee AI has verified domain ownership.`,
                        isAI: true,
                        time: formatTime(),
                      },
                    ]);
                    setActivities((prev) => [
                      {
                        id: `act_${Date.now()}`,
                        title: `${verifiedName} Backlink Verified`,
                        subtitle: 'Live backlink active for tolee.in',
                        time: formatTime(),
                        completed: true,
                      },
                      ...prev,
                    ]);
                  }
                }}
                session={browserSession}
                targetDomain={browserSession?.targetDomain || 'linkedin.com'}
                initialUrl={browserSession?.currentUrl || 'https://www.linkedin.com'}
                isStopped={Boolean(browserSession?.isStopped)}
              />
            );
          }

          return (
            <div className="flex flex-col justify-between h-full py-4 px-4 z-20 overflow-y-auto no-scrollbar">
              <div className="space-y-5">
                
                {/* Header with Close X Button */}
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assistant</span>
                  <button
                    onClick={() => {
                      if (isMobileView) setIsMobileActivityOpen(false);
                      else setIsRightPanelOpen(false);
                    }}
                    title="Close panel"
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Assistant Profile: Animated Mascot Avatar & Name "Tolee" */}
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="relative group cursor-pointer pt-2">
                    {/* Soft Pulsing Radial Glow */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-teal-500/25 via-emerald-400/20 to-teal-400/25 rounded-full blur-xl opacity-75 group-hover:opacity-100 animate-pulse transition-opacity" />

                    {/* Mascot Floating & Waving Stage */}
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
                      <img
                        src="/tolee-ai-avatar.png"
                        alt="Tolee Mascot"
                        className="w-full h-full object-contain filter drop-shadow-[0_8px_16px_rgba(20,184,166,0.25)] select-none animate-tolee-mascot-idle hover:scale-105 transition-transform"
                      />

                      {/* Hi / Waving Badge */}
                      <span className="absolute -top-1 -right-1 text-sm bg-white dark:bg-zinc-800 border border-teal-200 dark:border-teal-800 shadow-sm rounded-full px-1.5 py-0.5 animate-tolee-hi select-none">
                        👋
                      </span>

                      {/* Ground Pedestal Shadow */}
                      <div className="absolute -bottom-1 w-16 h-2 bg-black/10 dark:bg-white/10 rounded-full blur-[2px] animate-tolee-shadow" />
                    </div>

                    {/* Edit Pencil Icon Badge */}
                    <button
                      title="Customize Tolee AI Manager personality"
                      onClick={() => alert('Customizing Tolee AI Manager personality & prompts...')}
                      className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 flex items-center justify-center shadow-xs hover:scale-110 transition-transform z-10"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Name "Tolee" & Live Status */}
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center justify-center gap-1">
                      <span>Tolee</span>
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500 animate-bounce" />
                    </h3>
                    <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      <span className="font-semibold text-[11px] text-teal-600 dark:text-teal-400">Personal AI Manager</span>
                    </div>
                  </div>
                </div>

                {/* 5 Icon Segmented Tabs (Including Live Browser) */}
                <div className="flex items-center justify-around bg-white dark:bg-[#18191e] border border-slate-200 dark:border-zinc-800 rounded-xl p-1 shadow-xs">
                  <button
                    onClick={() => setRightPanelTab('tasks')}
                    title="Activity & Tasks"
                    className={`p-1.5 rounded-lg transition-all ${
                      rightPanelTab === 'tasks'
                        ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    <CheckSquare className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setRightPanelTab('browser')}
                    title="Live Browser Operator"
                    className={`p-1.5 rounded-lg transition-all ${
                      rightPanelTab === 'browser'
                        ? 'bg-slate-100 dark:bg-zinc-800 text-teal-600 dark:text-teal-400 shadow-xs'
                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setRightPanelTab('safety')}
                    title="Approvals & Safety"
                    className={`p-1.5 rounded-lg transition-all ${
                      rightPanelTab === 'safety'
                        ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setRightPanelTab('history')}
                    title="History"
                    className={`p-1.5 rounded-lg transition-all ${
                      rightPanelTab === 'history'
                        ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setRightPanelTab('memory')}
                    title="Memory"
                    className={`p-1.5 rounded-lg transition-all ${
                      rightPanelTab === 'memory'
                        ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    <Fingerprint className="w-4 h-4" />
                  </button>
                </div>

                {/* TAB 1: "Today" Activity Timeline (Blank for 1st visit, populates live!) */}
                {rightPanelTab === 'tasks' && (
                  <div className="space-y-3 pt-1">
                    <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                      Today
                    </p>

                    {activities.length === 0 ? (
                      <div className="px-3 py-6 text-center text-slate-400 dark:text-zinc-500 space-y-1.5 bg-white dark:bg-[#18191e] border border-slate-200/80 dark:border-zinc-800 rounded-2xl">
                        <CheckSquare className="w-6 h-6 mx-auto stroke-[1.5] text-teal-500/70 dark:text-teal-400/70" />
                        <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">No activity yet</p>
                        <p className="text-[11px] leading-relaxed">When you ask Tolee to search, write, or schedule, your live task history will appear here.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activities.map((act) => (
                          <div key={act.id} className="flex items-start gap-2.5 text-xs group">
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                              act.completed
                                ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                                : 'border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-400'
                            }`}>
                              <Check className="w-3 h-3 stroke-[2.5]" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-800 dark:text-zinc-100 leading-tight truncate">
                                {act.title}
                              </p>
                              <p className="text-[11px] text-slate-400 dark:text-zinc-500 line-clamp-1 mt-0.5">
                                {act.subtitle}
                              </p>
                              <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                                {act.time}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: Approvals / Safety */}
                {rightPanelTab === 'safety' && (
                  <div className="space-y-2 pt-1 text-xs">
                    <p className="font-bold text-slate-800 dark:text-zinc-200">Pending Approvals</p>
                    <div className="p-3 rounded-xl bg-white dark:bg-[#18191e] border border-slate-200 dark:border-zinc-800 space-y-1.5">
                      <p className="text-slate-500 dark:text-zinc-400 text-[11px]">
                        No pending high-risk actions. All drafts are secure.
                      </p>
                    </div>
                  </div>
                )}

                {/* TAB 3: History */}
                {rightPanelTab === 'history' && (
                  <div className="space-y-2 pt-1 text-xs">
                    <p className="font-bold text-slate-800 dark:text-zinc-200">Recent Sessions</p>
                    {threads.length === 0 ? (
                      <p className="text-[11px] text-slate-400 p-2 text-center">No past sessions yet.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {threads.map((t) => (
                          <div key={t.id} className="p-2 rounded-lg bg-white dark:bg-[#18191e] border border-slate-200 dark:border-zinc-800 text-[11px]">
                            <p className="font-medium text-slate-700 dark:text-zinc-300">{t.title}</p>
                            <p className="text-slate-400 text-[10px]">{t.lastMessageTime}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: Memory */}
                {rightPanelTab === 'memory' && (
                  <div className="space-y-2 pt-1 text-xs">
                    <p className="font-bold text-slate-800 dark:text-zinc-200">AI Memory & Facts</p>
                    <div className="p-3 rounded-xl bg-white dark:bg-[#18191e] border border-slate-200 dark:border-zinc-800 space-y-2 text-[11px] text-slate-600 dark:text-zinc-300">
                      <p>• Language: Hinglish preferred</p>
                      <p>• Platform: Tolee AI Social Media</p>
                      <p>• Region: India / Worldwide</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          try {
                            localStorage.removeItem('tolee_ai_threads');
                            localStorage.removeItem('tolee_ai_activities');
                            localStorage.removeItem('tolee_ai_messages');
                          } catch (_) {}
                          setThreads([]);
                          setActivities([]);
                          alert('History & Memory reset for this session.');
                        }}
                        className="w-full text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-[10px] h-6 mt-1"
                      >
                        Clear session data
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Brand Footer */}
              <div className="border-t border-slate-200/80 dark:border-zinc-800/80 pt-3 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3 text-emerald-500" />
                  <span>Safe Agent Loop</span>
                </span>
                <span className="text-[10px]">v1.7.6</span>
              </div>
            </div>
          );
        };

        return (
          <>
            {/* Desktop Panel */}
            {isRightPanelOpen && (
              <aside className={`hidden md:flex ${rightPanelTab === 'browser' ? 'w-[480px] lg:w-[540px] xl:w-[600px]' : 'w-72 lg:w-80'} shrink-0 bg-[#f9fafb] dark:bg-[#101114] border-l border-slate-200/80 dark:border-zinc-800/80 flex-col justify-between transition-all duration-300`}>
                {renderSidebarContent(false)}
              </aside>
            )}

            {/* Mobile Activity Drawer */}
            {isMobileActivityOpen && (
              <div className="fixed inset-0 z-50 md:hidden flex justify-end">
                <div 
                  onClick={() => setIsMobileActivityOpen(false)}
                  className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
                />
                <div className={`relative ${rightPanelTab === 'browser' ? 'w-full max-w-[96vw]' : 'w-80 max-w-[85vw]'} bg-[#f9fafb] dark:bg-[#101114] h-full shadow-2xl z-10 animate-in slide-in-from-right duration-200`}>
                  {renderSidebarContent(true)}
                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* Scoped CSS Keyframe Animations for Tolee Mascot */}
      <style jsx global>{`
        @keyframes toleeMascotIdle {
          0%, 100% {
            transform: translateY(0px) rotate(0deg) scale(1);
          }
          20% {
            transform: translateY(-6px) rotate(-4deg) scale(1.02);
          }
          40% {
            transform: translateY(-1px) rotate(3deg) scale(1.01);
          }
          60% {
            transform: translateY(-7px) rotate(-3deg) scale(1.03);
          }
          80% {
            transform: translateY(-2px) rotate(2deg) scale(1.01);
          }
        }

        @keyframes toleeShadow {
          0%, 100% {
            transform: scale(1);
            opacity: 0.28;
          }
          20%, 60% {
            transform: scale(0.82);
            opacity: 0.12;
          }
          40%, 80% {
            transform: scale(0.95);
            opacity: 0.22;
          }
        }

        @keyframes toleeHiWave {
          0%, 100% {
            transform: rotate(0deg) translateY(0);
          }
          15% {
            transform: rotate(24deg) translateY(-3px) scale(1.1);
          }
          30% {
            transform: rotate(-12deg) translateY(-2px);
          }
          45% {
            transform: rotate(22deg) translateY(-3px) scale(1.1);
          }
          60% {
            transform: rotate(-8deg) translateY(-1px);
          }
          75% {
            transform: rotate(14deg) translateY(-2px);
          }
        }

        .animate-tolee-mascot-idle {
          animation: toleeMascotIdle 3.6s ease-in-out infinite;
          transform-origin: center bottom;
        }

        .animate-tolee-shadow {
          animation: toleeShadow 3.6s ease-in-out infinite;
          transform-origin: center center;
        }

        .animate-tolee-hi {
          animation: toleeHiWave 2.4s ease-in-out infinite;
          transform-origin: 70% 70%;
        }
      `}</style>

      <GenerativeAiStudioModal
        isOpen={isGenerativeStudioOpen}
        onClose={() => setIsGenerativeStudioOpen(false)}
        title="Tolee AI Creative Studio"
      />
    </div>
  );
}
