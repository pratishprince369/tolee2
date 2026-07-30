'use client';

import React, { useState } from 'react';
import { Mic, Send, Camera, FileText, Sparkles, MessageSquare, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface VoiceInputDockProps {
  onSendMessage: (text: string) => void;
  isLoading?: boolean;
}

export function VoiceInputDock({ onSendMessage, isLoading = false }: VoiceInputDockProps) {
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
      // Simulate Voice recognition prompt
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
    <div className="sticky bottom-0 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-t border-slate-200 dark:border-zinc-800 p-3 md:p-4 z-30">
      <div className="max-w-4xl mx-auto space-y-3">
        {/* Quick Voice Command Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
          <button 
            type="button"
            onClick={() => onSendMessage('Kal mera kya schedule hai?')}
            className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-violet-100 hover:text-violet-700 font-medium whitespace-nowrap transition-colors"
          >
            🗓️ Schedule Kal Kya Hai?
          </button>
          <button 
            type="button"
            onClick={() => onSendMessage('Remind me to pay electricity bill tonight')}
            className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-violet-100 hover:text-violet-700 font-medium whitespace-nowrap transition-colors"
          >
            ⚡ Bill Reminder Set Karo
          </button>
          <button 
            type="button"
            onClick={() => onSendMessage('Create a community post announcement')}
            className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-violet-100 hover:text-violet-700 font-medium whitespace-nowrap transition-colors"
          >
            📢 Create Group Announcement
          </button>
          <button 
            type="button"
            onClick={() => onSendMessage('Follow up with Rahul CRM lead')}
            className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-violet-100 hover:text-violet-700 font-medium whitespace-nowrap transition-colors"
          >
            👨‍💼 CRM Follow-up Remind
          </button>
        </div>

        {/* Input Bar Form */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          {/* Action Dock Buttons (Camera / Document) */}
          <div className="flex items-center gap-1">
            <Button 
              type="button" 
              variant="outline" 
              size="icon" 
              className="rounded-full w-10 h-10 border-slate-200 dark:border-zinc-800 text-slate-500 hover:text-violet-600"
              title="Upload Document"
            >
              <FileText className="w-4 h-4" />
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="icon" 
              className="rounded-full w-10 h-10 border-slate-200 dark:border-zinc-800 text-slate-500 hover:text-violet-600"
              title="Camera Scan"
            >
              <Camera className="w-4 h-4" />
            </Button>
          </div>

          {/* Text Input */}
          <div className="relative flex-1">
            <Input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isRecording ? 'Listening... Speak now...' : 'Ask your AI Personal Employee... (Voice, Chat, Tasks)'}
              className={`w-full rounded-full pl-4 pr-10 py-6 border-slate-200 dark:border-zinc-800 text-sm focus-visible:ring-violet-500 ${
                isRecording ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-400 animate-pulse' : 'bg-slate-50 dark:bg-zinc-900'
              }`}
            />
            <Button 
              type="button"
              onClick={toggleRecording}
              size="icon"
              variant="ghost"
              className={`absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full w-8 h-8 ${
                isRecording ? 'text-rose-600 animate-bounce' : 'text-slate-400 hover:text-violet-600'
              }`}
              title="Voice Assistant"
            >
              <Mic className="w-4 h-4" />
            </Button>
          </div>

          {/* Send Button */}
          <Button 
            type="submit" 
            disabled={!input.trim() || isLoading}
            className="rounded-full w-12 h-12 bg-violet-600 hover:bg-violet-700 text-white shrink-0 shadow-md"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
