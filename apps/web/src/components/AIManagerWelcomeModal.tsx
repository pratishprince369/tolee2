'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Bot, Sparkles, Target, TrendingUp, Clock, AlertCircle, X, ArrowRight, MessageSquare 
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export function AIManagerWelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!session?.user) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const lastShown = localStorage.getItem('tolee_ai_manager_daily_welcome');
      if (lastShown !== today) {
        setIsOpen(true);
      }
    } catch (err) {
      console.error(err);
    }
  }, [session]);

  const handleDismiss = () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem('tolee_ai_manager_daily_welcome', today);
    } catch (err) {}
    setIsOpen(false);
  };

  const handleAction = (tab?: string) => {
    handleDismiss();
    if (tab) {
      router.push(`/ai-manager?tab=${tab}`);
    } else {
      router.push('/ai-manager');
    }
  };

  if (!isOpen || !session?.user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg overflow-hidden border border-indigo-500/20 dark:border-zinc-800 bg-white dark:bg-[#0c0c0e] rounded-[28px] shadow-2xl p-6 sm:p-8 text-gray-900 dark:text-gray-100 flex flex-col gap-5 animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button 
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-900 p-1.5 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header section */}
        <div className="flex items-center gap-3 border-b border-gray-100 dark:border-zinc-900/60 pb-4">
          <div className="relative flex-shrink-0">
            <Avatar className="w-12 h-12 border-2 border-indigo-500/30">
              <AvatarImage src="https://api.dicebear.com/7.x/bottts/svg?seed=ToleeManager" />
              <AvatarFallback>AI</AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#0c0c0e] rounded-full"></span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <h2 className="text-[17px] font-black text-gray-900 dark:text-white leading-none">Tolee AI Manager</h2>
              <Bot className="w-4 h-4 text-indigo-500 animate-pulse" />
            </div>
            <span className="text-[10px] font-extrabold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest mt-1">Your Personal Social Manager</span>
          </div>
        </div>

        {/* Greeting */}
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Hey, {session.user.name || 'Creator'}! 👋
          </h3>
          <p className="text-xs text-gray-500 dark:text-zinc-400">
            Here is your personalized daily growth checklist and recommendations checklist:
          </p>
        </div>

        {/* Dashboard scores and statistics */}
        <div className="grid grid-cols-2 gap-3.5 bg-indigo-50/20 dark:bg-zinc-900/30 border border-indigo-500/10 dark:border-zinc-800/60 p-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 dark:text-zinc-500">Growth Score</span>
              <span className="text-base font-extrabold text-gray-900 dark:text-white leading-tight">84 / 100</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 dark:text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 dark:text-zinc-500">Reach Score</span>
              <span className="text-base font-extrabold text-gray-900 dark:text-white leading-tight">+6.8% <span className="text-[10px] text-emerald-500 font-bold">▲</span></span>
            </div>
          </div>
        </div>

        {/* Today's Recommendations */}
        <div className="space-y-3.5">
          {/* 1. Content Suggestion */}
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 dark:bg-indigo-950/20 border border-indigo-500/20 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
              <Target className="w-4.5 h-4.5" />
            </div>
            <div className="flex flex-col gap-1">
              <h4 className="text-xs font-extrabold text-gray-700 dark:text-zinc-300 uppercase tracking-wider leading-none">Best Post to Create Today</h4>
              <p className="text-sm text-gray-900 dark:text-zinc-100 font-medium">"Introduce your new real estate projects in Kalyan with a video."</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] font-extrabold uppercase bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded">Mumbai Real Estate</span>
                <span className="text-[9px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded">Thane Properties</span>
              </div>
            </div>
          </div>

          {/* 2. Engagement Priority */}
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/20 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <MessageSquare className="w-4.5 h-4.5" />
            </div>
            <div className="flex flex-col gap-1">
              <h4 className="text-xs font-extrabold text-gray-700 dark:text-zinc-300 uppercase tracking-wider leading-none">High Priority Tasks</h4>
              <p className="text-sm text-gray-900 dark:text-zinc-100 font-medium">You have <span className="text-emerald-500 dark:text-emerald-400 font-bold">2 prospective buyer leads</span> and <span className="text-indigo-500 dark:text-indigo-400 font-bold">3 pending comment inquiries</span> awaiting reply.</p>
            </div>
          </div>

          {/* 3. Optimal Posting Time */}
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/20 dark:border-amber-900/40 text-amber-600 dark:text-amber-450 flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="w-4.5 h-4.5" />
            </div>
            <div className="flex flex-col gap-1">
              <h4 className="text-xs font-extrabold text-gray-700 dark:text-zinc-300 uppercase tracking-wider leading-none">Optimal Posting Window</h4>
              <p className="text-sm text-gray-900 dark:text-zinc-100 font-medium">Post between <span className="font-bold text-amber-600 dark:text-amber-400">7:00 PM and 9:00 PM</span> today for maximum local engagement.</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row gap-2 border-t border-gray-100 dark:border-zinc-900/60 pt-4 mt-2">
          <Button 
            onClick={() => handleAction('post_creator')}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold h-11 rounded-xl shadow-lg border border-indigo-400/20 gap-1.5 transition-all"
          >
            Create Post copy
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button 
            onClick={() => handleAction('dashboard')}
            variant="outline"
            className="flex-1 border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-900 text-gray-700 dark:text-zinc-300 font-bold h-11 rounded-xl transition-all"
          >
            Open Dashboard
          </Button>
          <Button 
            onClick={handleDismiss}
            variant="ghost"
            className="text-xs text-gray-400 hover:text-gray-200 font-semibold h-11 rounded-xl sm:w-20 transition-all"
          >
            Dismiss
          </Button>
        </div>

      </div>
    </div>
  );
}
