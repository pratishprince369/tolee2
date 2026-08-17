'use client';

import React, { useState } from 'react';
import { Mic, Send, Camera, FileText, Sparkles, MessageSquare, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSpeechToText } from '@/hooks/useSpeechToText';

interface VoiceInputDockProps {
  onSendMessage: (text: string) => void;
  isLoading?: boolean;
}

export function VoiceInputDock({ onSendMessage, isLoading = false }: VoiceInputDockProps) {
  const [input, setInput] = useState('');

  const { isListening, startListening, stopListening, isSupported } = useSpeechToText({
    language: typeof window !== 'undefined' ? (localStorage.getItem('tolee_native_lang') || 'hi-IN') : 'hi-IN',
    onResult: (spokenText) => {
      if (spokenText && spokenText.trim()) {
        setInput('');
        onSendMessage(spokenText.trim());
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const toggleRecording = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="sticky bottom-0 left-0 right-0 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-t border-slate-200 dark:border-zinc-800 p-2 sm:p-4 z-50 shadow-2xl shrink-0">
      <div className="max-w-4xl mx-auto space-y-2">
        {/* Quick Voice Command Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
          <button 
            type="button"
            onClick={() => onSendMessage('Kal mera kya schedule hai?')}
            className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-violet-100 hover:text-violet-700 font-medium whitespace-nowrap text-[11px] transition-colors shrink-0"
          >
            🗓️ Schedule Kal Kya Hai?
          </button>
          <button 
            type="button"
            onClick={() => onSendMessage('Remind me to pay electricity bill tonight')}
            className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-violet-100 hover:text-violet-700 font-medium whitespace-nowrap text-[11px] transition-colors shrink-0"
          >
            ⚡ Bill Reminder Set Karo
          </button>
          <button 
            type="button"
            onClick={() => onSendMessage('Create a community post announcement')}
            className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-violet-100 hover:text-violet-700 font-medium whitespace-nowrap text-[11px] transition-colors shrink-0"
          >
            📢 Create Group Announcement
          </button>
          <button 
            type="button"
            onClick={() => onSendMessage('Follow up with Rahul CRM lead')}
            className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-violet-100 hover:text-violet-700 font-medium whitespace-nowrap text-[11px] transition-colors shrink-0"
          >
            👨‍💼 CRM Follow-up
          </button>
        </div>

        {/* Input Bar Form */}
        <form onSubmit={handleSubmit} className="flex items-center gap-1.5 sm:gap-2">
          {/* Action Dock Buttons */}
          <div className="flex items-center gap-1">
            <Button 
              type="button" 
              variant="outline" 
              size="icon" 
              className="rounded-full w-8 h-8 sm:w-10 sm:h-10 border-slate-200 dark:border-zinc-800 text-slate-500 hover:text-violet-600 shrink-0"
              title="Upload Document"
            >
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="icon" 
              className="rounded-full w-8 h-8 sm:w-10 sm:h-10 border-slate-200 dark:border-zinc-800 text-slate-500 hover:text-violet-600 shrink-0"
              title="Camera Scan"
            >
              <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
          </div>

          {/* Text Input */}
          <div className="relative flex-1 min-w-0">
            <Input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? '🎙️ Listening... (बोलिए)...' : 'Ask your AI Personal Employee...'}
              className={`w-full rounded-full pl-3.5 pr-9 py-4 sm:py-5 border-slate-200 dark:border-zinc-800 text-xs sm:text-sm focus-visible:ring-violet-500 ${
                isListening ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-400 animate-pulse ring-2 ring-rose-500/20' : 'bg-slate-50 dark:bg-zinc-900'
              }`}
            />
            <Button 
              type="button"
              onClick={toggleRecording}
              size="icon"
              variant="ghost"
              className={`absolute right-1 top-1/2 -translate-y-1/2 rounded-full w-7 h-7 sm:w-8 sm:h-8 ${
                isListening ? 'text-rose-600 animate-bounce bg-rose-100 dark:bg-rose-900/50' : 'text-slate-400 hover:text-violet-600'
              }`}
              title="Voice Assistant (बोलकर पूछें)"
            >
              <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
          </div>

          {/* Send Button */}
          <Button 
            type="submit" 
            disabled={!input.trim() || isLoading}
            className="rounded-full w-9 h-9 sm:w-11 sm:h-11 bg-violet-600 hover:bg-violet-700 text-white shrink-0 shadow-md flex items-center justify-center"
          >
            <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
