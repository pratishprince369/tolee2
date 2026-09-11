'use client';

import React, { useState } from 'react';
import { Mic, Send, Camera, FileText, Sparkles, MessageSquare, Paperclip, X, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { unlockMobileAudio } from '../VoiceCompanion/voiceCompanionEngine';

interface VoiceInputDockProps {
  onSendMessage: (text: string, attachment?: { url?: string; type?: string; name?: string; content?: string }) => void;
  onToggleVoiceCompanion?: () => void;
  isVoiceActive?: boolean;
  isLoading?: boolean;
}

export function VoiceInputDock({ onSendMessage, onToggleVoiceCompanion, isVoiceActive = false, isLoading = false }: VoiceInputDockProps) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [attachment, setAttachment] = useState<{ url?: string; type?: string; name?: string; content?: string } | null>(null);

  const docInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isImage: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isTextLike = 
      file.type.startsWith('text/') || 
      file.name.endsWith('.txt') || 
      file.name.endsWith('.csv') || 
      file.name.endsWith('.json') || 
      file.name.endsWith('.js') || 
      file.name.endsWith('.ts') || 
      file.name.endsWith('.py') || 
      file.name.endsWith('.md') ||
      file.name.endsWith('.html') ||
      file.name.endsWith('.css');

    if (isImage || file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachment({
          url: reader.result as string,
          type: file.type || 'image/jpeg',
          name: file.name
        });
      };
      reader.readAsDataURL(file);
    } else if (isTextLike) {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachment({
          content: reader.result as string,
          type: file.type || 'text/plain',
          name: file.name
        });
      };
      reader.readAsText(file);
    } else {
      // PDF or other binary doc
      const reader = new FileReader();
      reader.onload = () => {
        setAttachment({
          url: reader.result as string,
          type: file.type || 'application/pdf',
          name: file.name
        });
      };
      reader.readAsDataURL(file);
    }

    // Reset input so re-selecting same file triggers onChange
    e.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !attachment) || isLoading) return;
    onSendMessage(input.trim(), attachment || undefined);
    setInput('');
    setAttachment(null);
  };

  const handleToggleVoice = () => {
    unlockMobileAudio();
    if (onToggleVoiceCompanion) {
      onToggleVoiceCompanion();
    }
  };

  const toggleRecording = () => {
    unlockMobileAudio();
    // If Voice Companion HUD is active, toggle Voice Companion directly to avoid duplicate SpeechRecognition instances
    if (isVoiceActive && onToggleVoiceCompanion) {
      onToggleVoiceCompanion();
      return;
    }

    if (!isRecording) {
      setIsRecording(true);
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        const savedLang = localStorage.getItem('tolee_native_lang') || 'hi-IN';
        recognition.lang = savedLang;
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0]?.transcript;
          setIsRecording(false);
          if (transcript && transcript.trim()) {
            setInput('');
            onSendMessage(transcript.trim(), attachment || undefined);
            setAttachment(null);
          }
        };
        recognition.onerror = () => setIsRecording(false);
        recognition.onend = () => setIsRecording(false);
        recognition.start();
      } else {
        setTimeout(() => {
          setIsRecording(false);
        }, 1500);
      }
    } else {
      setIsRecording(false);
    }
  };

  return (
    <div className="sticky bottom-0 left-0 right-0 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-t border-slate-200 dark:border-zinc-800 p-2 sm:p-4 z-50 shadow-2xl shrink-0">
      <div className="max-w-4xl mx-auto space-y-2">
        {/* Hidden File Inputs */}
        <input 
          type="file" 
          ref={docInputRef} 
          onChange={(e) => handleFileChange(e, false)} 
          accept=".pdf,.txt,.csv,.json,.md,.js,.ts,.py,.html,.css,.doc,.docx" 
          className="hidden" 
        />
        <input 
          type="file" 
          ref={cameraInputRef} 
          onChange={(e) => handleFileChange(e, true)} 
          accept="image/*" 
          className="hidden" 
        />

        {/* Attachment Preview Chip */}
        {attachment && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 rounded-xl text-xs text-violet-900 dark:text-violet-200 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 truncate">
              {attachment.type?.startsWith('image/') ? (
                <span className="text-sm">🖼️</span>
              ) : (
                <span className="text-sm">📄</span>
              )}
              <span className="font-semibold truncate max-w-xs">{attachment.name || 'Attached File'}</span>
              <span className="text-[10px] text-violet-500 uppercase font-mono">Ready for AI Analysis</span>
            </div>
            <button
              type="button"
              onClick={() => setAttachment(null)}
              className="p-1 hover:bg-violet-200 dark:hover:bg-violet-800 rounded-full transition-colors ml-2 shrink-0"
              title="Remove attachment"
            >
              <X className="w-3.5 h-3.5 text-violet-700 dark:text-violet-300" />
            </button>
          </div>
        )}

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
              onClick={() => docInputRef.current?.click()}
              className="rounded-full w-8 h-8 sm:w-10 sm:h-10 border-slate-200 dark:border-zinc-800 text-slate-500 hover:text-violet-600 shrink-0"
              title="Upload Document (PDF, Code, Data, Text)"
            >
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="icon" 
              onClick={() => cameraInputRef.current?.click()}
              className="rounded-full w-8 h-8 sm:w-10 sm:h-10 border-slate-200 dark:border-zinc-800 text-slate-500 hover:text-violet-600 shrink-0"
              title="Camera Scan / Image Vision"
            >
              <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
          </div>

          {/* Text Input */}
          <div className="relative flex-1 min-w-0">
            <Input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isRecording ? 'Listening... Speak now...' : (attachment ? `Ask AI about ${attachment.name}...` : 'Ask your AI Assistant or generate image...')}
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
              onClick={handleToggleVoice}
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
