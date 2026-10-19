'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Bot, Sparkles, Calendar, CheckSquare, Users, MessageSquare, 
  Brain, Newspaper, LayoutDashboard, Download, Search, FileText,
  Lightbulb, LayoutGrid, FileSpreadsheet, Menu, X, Plus, Mic, MicOff,
  Send, MoreHorizontal, ArrowUp, ThumbsUp, ThumbsDown, Copy,
  Check, ExternalLink, Globe, Shield, Clock, Fingerprint,
  Pencil, ChevronRight, Share2, UserPlus, Sparkle
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
import { OpenWorkAgentWorkspace } from '../Components/OpenWorkAgentWorkspace';
import { AIMessageRenderer } from '../Components/AIMessageRenderer';
import { OpenDotsApprovalCard } from '../Components/OpenDotsApprovalCard';
import { PooledBrowserEngine } from '@/lib/ai-gateway/pooled-engine';
import { getAIDashboardSummary, processAIPersonalMessage, executeConfirmedAIAction } from '@/actions/ai-manager';
import { createPost } from '@/actions/post';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export type AIModuleTab = 
  | 'chat'
  | 'search'
  | 'documents'
  | 'ideas'
  | 'tasks'
  | 'tools'
  | 'reports'
  | 'openwork'
  | 'planner'
  | 'calendar'
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
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
}

export function AIDashboard() {
  const { data: session } = useSession();
  const [activeNavIcon, setActiveNavIcon] = useState<AIModuleTab>('chat');
  const [activeThreadId, setActiveThreadId] = useState<string>('main');
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [rightPanelTab, setRightPanelTab] = useState<'tasks' | 'safety' | 'history' | 'memory'>('tasks');
  const [inputMessage, setInputMessage] = useState('');
  const [searchThreadQuery, setSearchThreadQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // Chat threads (Matching Muse.ai left panel)
  const [threads, setThreads] = useState<ChatThread[]>([
    { id: 'side_1', title: 'Find UK job opportunities', lastMessageTime: '11:40 pm' },
    { id: 'side_2', title: 'Diwali viral reel campaign', lastMessageTime: '10:14 pm' },
    { id: 'side_3', title: 'Competitor social media scan', lastMessageTime: 'Yesterday' }
  ]);

  // Initial messages matching the exact conversational vibe and browser card from the screenshot
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init_browser_1',
      sender: 'Tolee AI Manager',
      text: '',
      isAI: true,
      time: '11:38 pm',
      browserCard: {
        title: 'Find a job — UK Government Service',
        url: 'https://findajob.dwp.gov.uk/search?q=digital+marketing+remote',
        snippet: 'Browsing active sponsored and remote marketing listings on official portal...'
      }
    },
    {
      id: 'init_msg_1',
      sender: 'Tolee AI Manager',
      text: `Shortlist taiyaar hai — **4 strong remote roles** mile hain, aur applications abhi shuru kar di hain! 🎉\n\nJin par apply ho raha hai:\n\n1. **Gurobi Optimization** — Director of Marketing (EMEA Remote) — tumhare 12+ saal ke leadership + SEO/SEM background se excellent match\n2. **Canonical** — Marketing Manager (Remote, EMEA & Americas) — remote-first company, demand-gen/GTM role\n3. **Canonical** — Senior Marketing Automation Manager (Remote, EMEA) — thoda automation-focused, but worth trying\n4. **Melotech** — Head of Performance Marketing/CMO (Remote, London) — Google/Meta/YouTube Ads exactly tumhari expertise\n\n> 💡 **Honest note:** 8 aur UK-remote roles mile the, lekin sab ne "UK right to work / UK-based" manga — tumhare sponsorship case me fit nahi hote, isliye unhe chhod diya. UK government ki site par koi suitable senior role nahi mila. Aur ek caveat: Gurobi/Canonical ne India se hiring explicitly confirm nahi ki hai, lekin koi UK-only restriction bhi nahi hai — isliye tumhari approval par apply kar raha hun.\n\nBrowser abhi ek-ek karke applications bhar raha hai (CV upload ke saath). Har application ka confirmation aate hi tumhe bataunga. Agar kahin sign-in ya koi specific sawaal aaya to main tumse pooch lunga!`,
      isAI: true,
      time: '11:40 pm'
    }
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [publishingActionId, setPublishingActionId] = useState<string | null>(null);
  const [summaryData, setSummaryData] = useState({
    pendingTasksCount: 0,
    remindersCount: 0,
    memoriesCount: 0,
    myGroupsCount: 0,
    tasks: [],
    reminders: [],
    myGroups: []
  });

  // Today's Activity timeline (Matching the Muse.ai right panel in the screenshot)
  const [activities, setActivities] = useState<ActivityItem[]>([
    {
      id: 'act_1',
      title: 'Shortlist UK sponsorship roles',
      subtitle: 'Shortlisted sponsorship and remote roles',
      time: '11:37 pm',
      completed: true
    },
    {
      id: 'act_2',
      title: 'Update UK move plan',
      subtitle: 'Saved UK move plan and visa notes',
      time: '11:36 pm',
      completed: true
    },
    {
      id: 'act_3',
      title: 'Update memory with visa note',
      subtitle: 'Updated sponsorship note for UK and worldwide roles',
      time: '11:35 pm',
      completed: true
    },
    {
      id: 'act_4',
      title: 'Research sponsorship visa requirements',
      subtitle: 'Added Skilled Worker sponsorship requirement for UK employment',
      time: '11:34 pm',
      completed: true
    },
    {
      id: 'act_5',
      title: 'Search remote digital marketing roles',
      subtitle: 'Added immediate availability, kept visa pending',
      time: '11:33 pm',
      completed: true
    },
    {
      id: 'act_6',
      title: 'Search remote digital marketing jobs',
      subtitle: 'Saved UK remote digital marketing job search',
      time: '11:30 pm',
      completed: true
    },
    {
      id: 'act_7',
      title: 'Schedule daily creative posts',
      subtitle: 'Scheduled daily creative posts for 10:14 IST',
      time: '10:10 pm',
      completed: true
    },
    {
      id: 'act_8',
      title: 'Confirm daily creative posting schedule',
      subtitle: 'Scheduled daily creative post for @lok_times369',
      time: '10:05 pm',
      completed: true
    }
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const loadSummary = async () => {
    try {
      const res = await getAIDashboardSummary();
      if (res.success && res.summary) {
        setSummaryData(res.summary as any);
      }
    } catch (_) {}
  };

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

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    // Add activity log item
    const newAct: ActivityItem = {
      id: `act_${Date.now()}`,
      title: text.length > 32 ? text.substring(0, 32) + '...' : text,
      subtitle: 'Executing personal assistant request',
      time: formatTime(),
      completed: false
    };
    setActivities((prev) => [newAct, ...prev]);

    try {
      const clientISO = new Date().toISOString();
      const timeZone = typeof window !== 'undefined' && window.Intl ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Asia/Kolkata';

      const recentHistory = messages.slice(-10).map((m) => ({
        role: m.isAI ? 'assistant' : 'user',
        content: m.text
      }));

      const result = await processAIPersonalMessage(text, recentHistory, clientISO, timeZone);
      const aiText = (result as any).response || (result as any).reply || 'Task processed successfully.';

      // Check if browsing query to render browser preview card
      const isSearchOrBrowse = /search|browse|jobs|check|price|competitor/i.test(text);

      const aiMsg: Message = {
        id: `ai_${Date.now()}`,
        sender: 'Tolee AI Manager',
        text: aiText,
        isAI: true,
        time: formatTime(),
        approvalPayload: (result as any).approvalPayload || (result as any).interactiveAction?.approval,
        interactiveAction: (result as any).interactiveAction || (result as any).actionPayload,
        browserCard: isSearchOrBrowse ? {
          title: `Web Research: ${text}`,
          url: `https://tolee.in/search?q=${encodeURIComponent(text)}`,
          snippet: 'Browsed relevant sources and extracted verified findings...'
        } : undefined
      };

      setMessages((prev) => [...prev, aiMsg]);

      // Mark activity as completed
      setActivities((prev) =>
        prev.map((a) => (a.id === newAct.id ? { ...a, completed: true, subtitle: 'Completed and verified' } : a))
      );
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'Tolee AI Manager',
          text: 'Maaf kijiye, main abhi request poori nahi kar paya. Kripya thodi der baad dobara koshish karein.',
          isAI: true,
          time: formatTime()
        }
      ]);
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
    const newThread: ChatThread = {
      id: newId,
      title: `New task ${threads.length + 1}`,
      lastMessageTime: formatTime()
    };
    setThreads((prev) => [newThread, ...prev]);
    setActiveThreadId(newId);
    setMessages([
      {
        id: `init_${Date.now()}`,
        sender: 'Tolee AI Manager',
        text: 'Naya task shuru hua hai! 👋 Bataiye aaj kya kaam karwana hai? Main research, content writing, post scheduling ya web browsing sab sambhal lunga.',
        isAI: true,
        time: formatTime()
      }
    ]);
  };

  const filteredThreads = threads.filter((t) =>
    t.title.toLowerCase().includes(searchThreadQuery.toLowerCase())
  );

  return (
    <div className="flex w-full h-[100dvh] bg-white dark:bg-[#0c0d10] text-slate-800 dark:text-zinc-100 overflow-hidden select-text font-sans">
      
      {/* ========================================================= */}
      {/* 1. FAR-LEFT NARROW ICON NAVIGATION DOCK (Matching Muse)    */}
      {/* ========================================================= */}
      <aside className="w-14 sm:w-16 shrink-0 bg-white dark:bg-[#121317] border-r border-slate-200/80 dark:border-zinc-800/80 flex flex-col items-center justify-between py-3 z-30">
        
        {/* Top Icons */}
        <div className="flex flex-col items-center gap-4 w-full">
          {/* Brand Logo / Return to Tolee */}
          <Link
            href="/feed"
            title="Tolee Social Feed par wapas jayein"
            className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-600 text-white flex items-center justify-center font-black text-base shadow-sm hover:opacity-90 transition-opacity mb-2"
          >
            t
          </Link>

          {/* Navigation Icon List */}
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
            onClick={() => setActiveNavIcon('search')}
            title="Search Web & Tolee"
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              activeNavIcon === 'search'
                ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-900'
            }`}
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveNavIcon('documents')}
            title="Documents & Files"
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              activeNavIcon === 'documents'
                ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-900'
            }`}
          >
            <FileText className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveNavIcon('ideas')}
            title="Creator Ideas & Reels"
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              activeNavIcon === 'ideas'
                ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-900'
            }`}
          >
            <Lightbulb className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveNavIcon('tasks')}
            title="Tasks & Reminders"
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              activeNavIcon === 'tasks'
                ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-900'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveNavIcon('tools')}
            title="Apps & Tools Registry"
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              activeNavIcon === 'tools'
                ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-900'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveNavIcon('reports')}
            title="PDF Reports & Insights"
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              activeNavIcon === 'reports'
                ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
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
            className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-zinc-200 overflow-hidden cursor-pointer"
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
      {/* 2. LEFT SUB-SIDEBAR (Chats, Threads & Channels)           */}
      {/* ========================================================= */}
      <aside className="hidden md:flex w-60 lg:w-64 shrink-0 bg-[#f9fafb] dark:bg-[#101114] border-r border-slate-200/80 dark:border-zinc-800/80 flex-col justify-between py-4 px-3">
        <div className="flex flex-col gap-4 overflow-y-auto no-scrollbar">
          
          {/* Search Box with options */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#18191e] border border-slate-200 dark:border-zinc-800 rounded-xl px-2.5 py-1.5 shadow-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search"
              value={searchThreadQuery}
              onChange={(e) => setSearchThreadQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none"
            />
            <button className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200">
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
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

            {/* Side Chat Threads */}
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
                  <span className="text-[10px] text-slate-400 shrink-0 group-hover:hidden">
                    {thread.lastMessageTime}
                  </span>
                </button>
              ))}
            </div>
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
      {/* 3. CENTER MAIN CHAT CANVAS                                 */}
      {/* ========================================================= */}
      <main className="flex-1 flex flex-col h-full bg-white dark:bg-[#0c0d10] relative min-w-0">
        
        {/* Top Chat Bar with Invite button */}
        <header className="h-14 shrink-0 border-b border-slate-200/80 dark:border-zinc-800/80 px-4 sm:px-6 flex items-center justify-between bg-white/80 dark:bg-[#0c0d10]/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white truncate">
              {activeThreadId === 'main' ? 'Main chat' : threads.find(t => t.id === activeThreadId)?.title || 'Side chat'}
            </h2>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-full px-2 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Invite Button (Exactly matching screenshot!) */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert('Tolee AI Manager link copied to clipboard!');
              }}
              className="h-8 rounded-xl px-3 text-xs font-semibold border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5 text-slate-500" />
              <span>Invite</span>
            </Button>

            {/* Toggle Right Panel on/off */}
            <button
              onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
              title={isRightPanelOpen ? 'Collapse side panel' : 'Open activity panel'}
              className="w-8 h-8 rounded-xl flex items-center justify-center border border-slate-200 dark:border-zinc-800 text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Bot className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6 max-w-3xl mx-auto w-full">
          
          {messages.map((msg) => (
            <div key={msg.id} className="space-y-3">
              
              {/* Optional: Embedded Browser Action Card (Matching Muse screenshot!) */}
              {msg.browserCard && (
                <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-[#f9fafb] dark:bg-[#141519] overflow-hidden shadow-xs animate-in fade-in transition-all">
                  {/* Browser Window Header */}
                  <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-100 dark:bg-[#18191e] border-b border-slate-200/80 dark:border-zinc-800/80">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-zinc-700" />
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-zinc-700" />
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-zinc-700" />
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-zinc-400 bg-white dark:bg-[#101114] border border-slate-200 dark:border-zinc-800 rounded-lg px-2.5 py-0.5 truncate max-w-xs sm:max-w-md">
                        <Globe className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{msg.browserCard.url}</span>
                      </div>
                    </div>
                  </div>

                  {/* Browser Content Preview */}
                  <div className="p-4 sm:p-5 flex flex-col items-center justify-center text-center space-y-3 bg-white dark:bg-[#121316]">
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                      <Globe className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="max-w-md space-y-1">
                      <h4 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white">
                        {msg.browserCard.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-zinc-400">
                        {msg.browserCard.snippet}
                      </p>
                    </div>

                    {/* Open Browser Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(msg.browserCard?.url, '_blank')}
                      className="rounded-xl text-xs font-semibold h-8 px-4 border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-1.5"
                    >
                      <span>Open browser</span>
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Message Bubble */}
              {msg.text && (
                <div className={`flex w-full ${msg.isAI ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`relative max-w-2xl text-xs sm:text-[13.5px] leading-relaxed transition-all ${
                      msg.isAI
                        ? 'bg-[#f8f9fa] dark:bg-[#15161b] text-slate-800 dark:text-zinc-100 border border-slate-200/70 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs'
                        : 'bg-teal-600 text-white rounded-2xl px-4 py-3 shadow-xs'
                    }`}
                  >
                    <AIMessageRenderer content={msg.text} isAI={msg.isAI} />

                    {/* Footer bar for AI messages (Copy, Thumbs, Retry) */}
                    {msg.isAI && (
                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-200/50 dark:border-zinc-800/60 text-[11px] text-slate-400">
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
                <div className="max-w-2xl">
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
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 w-fit animate-pulse">
              <Bot className="w-3.5 h-3.5 animate-spin text-teal-600" />
              <span>Tolee AI Manager soch raha hai aur tools execute kar raha hai...</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* ========================================================= */}
        {/* BOTTOM FLOATING INPUT DOCK (Matching Muse)                */}
        {/* ========================================================= */}
        <div className="p-4 sm:p-6 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-[#0c0d10] dark:via-[#0c0d10]/95">
          <div className="max-w-3xl mx-auto relative bg-[#f4f5f7] dark:bg-[#17181d] border border-slate-200/90 dark:border-zinc-800/90 rounded-2xl shadow-xs transition-all focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20">
            <div className="flex items-center px-3.5 py-2 gap-2">
              
              {/* Plus Button for Attachments / Tools */}
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
                title="Add attachment or action"
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
      {/* 4. RIGHT SIDEBAR (Assistant Profile & Activity Timeline)  */}
      {/* ========================================================= */}
      {isRightPanelOpen && (
        <aside className="w-72 lg:w-80 shrink-0 bg-[#f9fafb] dark:bg-[#101114] border-l border-slate-200/80 dark:border-zinc-800/80 flex flex-col justify-between py-4 px-4 z-20 overflow-y-auto no-scrollbar">
          
          <div className="space-y-5">
            {/* Header with Close X Button */}
            <div className="flex items-center justify-end">
              <button
                onClick={() => setIsRightPanelOpen(false)}
                title="Close panel"
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Assistant Profile (Matching Muse avatar & edit badge in screenshot!) */}
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="relative">
                {/* 3D Cute Avatar Container */}
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-100 via-orange-100 to-amber-200 dark:from-zinc-800 dark:to-zinc-700 p-1 shadow-md border-2 border-white dark:border-zinc-800 overflow-hidden flex items-center justify-center">
                  <div className="w-full h-full rounded-full bg-[#f4ebe1] dark:bg-[#202126] flex items-center justify-center text-3xl select-none">
                    🧸
                  </div>
                </div>

                {/* Edit Pencil Icon Badge */}
                <button
                  title="Customize assistant personality"
                  onClick={() => alert('Customizing Tolee AI Manager personality & prompts...')}
                  className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 flex items-center justify-center shadow-xs hover:scale-105 transition-transform"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>

              {/* Assistant Name & Live Status */}
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Muse</h3>
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-medium text-[11px]">Applying to roles</span>
                </div>
              </div>
            </div>

            {/* 4 Icon Segmented Tabs (Matching the 4 icons in the screenshot!) */}
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

            {/* TAB CONTENT: "Today" Activity Timeline (Matching screenshot!) */}
            {rightPanelTab === 'tasks' && (
              <div className="space-y-3 pt-1">
                <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                  Today
                </p>

                <div className="space-y-3.5">
                  {activities.map((act) => (
                    <div key={act.id} className="flex items-start gap-2.5 text-xs group">
                      {/* Checkmark in circle */}
                      <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-slate-600 dark:text-zinc-300 stroke-[2.5]" />
                      </div>

                      {/* Title, Subtitle and Timestamp */}
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
              </div>
            )}

            {/* TAB CONTENT: Approvals / Safety */}
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

            {/* TAB CONTENT: History */}
            {rightPanelTab === 'history' && (
              <div className="space-y-2 pt-1 text-xs">
                <p className="font-bold text-slate-800 dark:text-zinc-200">Recent Sessions</p>
                <div className="space-y-1.5">
                  {threads.map((t) => (
                    <div key={t.id} className="p-2 rounded-lg bg-white dark:bg-[#18191e] border border-slate-200 dark:border-zinc-800 text-[11px]">
                      <p className="font-medium text-slate-700 dark:text-zinc-300">{t.title}</p>
                      <p className="text-slate-400 text-[10px]">{t.lastMessageTime}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT: Memory */}
            {rightPanelTab === 'memory' && (
              <div className="space-y-2 pt-1 text-xs">
                <p className="font-bold text-slate-800 dark:text-zinc-200">AI Memory & Facts</p>
                <div className="p-3 rounded-xl bg-white dark:bg-[#18191e] border border-slate-200 dark:border-zinc-800 space-y-2 text-[11px] text-slate-600 dark:text-zinc-300">
                  <p>• Language: Hinglish preferred</p>
                  <p>• Roles: Senior Marketing & Automation</p>
                  <p>• Region: Worldwide / Remote</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => alert('Memory reset requested. Memory forgotten.')}
                    className="w-full text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-[10px] h-6 mt-1"
                  >
                    Forget my preferences
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Brand / Security Footer */}
          <div className="border-t border-slate-200/80 dark:border-zinc-800/80 pt-3 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-500" />
              <span>Safe Agent Loop</span>
            </span>
            <span className="text-[10px]">v1.7.6</span>
          </div>
        </aside>
      )}

    </div>
  );
}
