'use client';

import React, { useState } from 'react';
import { Mic, Send, Camera, FileText, Sparkles, MessageSquare, Paperclip, X, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface VoiceInputDockProps {
  onSendMessage: (text: string) => void;
  onToggleVoiceCompanion?: () => void;
  isVoiceActive?: boolean;
  isLoading?: boolean;
}

export function VoiceInputDock({ onSendMessage, onToggleVoiceCompanion, isVoiceActive = false, isLoading = false }: VoiceInputDockProps) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const toggleRecording = () => {
    if (!isRecording) {
      setIsRecording(true);
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput(transcript);
          setIsRecording(false);
        };
        recognition.onerror = () => setIsRecording(false);
        recognition.onend = () => setIsRecording(false);
        recognition.start();
      } else {
        setTimeout(() => {
          setInput('Schedule doctor appointment for tomorrow at 9 AM');
          setIsRecording(false);
        }, 2000);
      }
    } else {
      setIsRecording(false);
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
              placeholder={isRecording ? 'Listening... Speak now...' : 'Ask your AI Personal Employee...'}
              className={`w-full rounded-full pl-3.5 pr-9 py-4 sm:py-5 border-slate-200 dark:border-zinc-800 text-xs sm:text-sm focus-visible:ring-violet-500 ${
                isRecording ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-400 animate-pulse' : 'bg-slate-50 dark:bg-zinc-900'
              }`}
            />
            <Button 
              type="button"
              onClick={toggleRecording}
              size="icon"
              variant="ghost"
              className={`absolute right-1 top-1/2 -translate-y-1/2 rounded-full w-7 h-7 sm:w-8 sm:h-8 ${
                isRecording ? 'text-rose-600 animate-bounce' : 'text-slate-400 hover:text-violet-600'
              }`}
              title="Voice Assistant"
            >
              <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
          </div>

          {/* Dedicated ChatGPT-Style Soundwave ON/OFF Toggle Button */}
          {onToggleVoiceCompanion && (
            <Button
              type="button"
              onClick={onToggleVoiceCompanion}
              className={`rounded-full px-3 py-2 h-9 sm:h-11 border text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 shadow-md ${
                isVoiceActive
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.6)] animate-pulse'
                  : 'bg-slate-900 dark:bg-slate-800 text-white border-slate-700 hover:border-cyan-400'
              }`}
              title={isVoiceActive ? 'Voice Manager ON (Click to turn OFF)' : 'Voice Manager OFF (Click to turn ON)'}
            >
              <div className="flex items-center gap-0.5">
                <span className={`w-0.5 h-3.5 rounded-full ${isVoiceActive ? 'bg-slate-950 animate-bounce' : 'bg-cyan-400'}`} />
                <span className={`w-0.5 h-5 rounded-full ${isVoiceActive ? 'bg-slate-950 animate-bounce delay-75' : 'bg-violet-400'}`} />
                <span className={`w-0.5 h-3 rounded-full ${isVoiceActive ? 'bg-slate-950 animate-bounce delay-150' : 'bg-emerald-400'}`} />
              </div>
              <span className="hidden xs:inline text-[11px] font-extrabold tracking-wide">
                {isVoiceActive ? 'VOICE ON' : 'START VOICE'}
              </span>
            </Button>
          )}

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
