'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Radio, Mic, Volume2, Sparkles, X, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VoiceCompanionEngine } from './voiceCompanionEngine';
import { VoiceCompanionMode } from './voiceTypes';
import { parseVoiceCommand } from './voiceCommandParser';
import { getVoiceNotificationBriefing } from '@/actions/voice-companion';

interface FloatingVoiceHUDProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: string) => void;
  onSendMessage: (text: string) => Promise<string | void>;
}

const NATIVE_ANNOUNCEMENTS: Record<string, { text: string; langCode: string }> = {
  'hi-IN': {
    text: 'Aapka Tolee Voice AI Manager ON ho chuka hai. Ab aap mujhe voice mein operate kar sakte hain.',
    langCode: 'hi-IN'
  },
  'en-IN': {
    text: 'Your Tolee Voice AI Manager is now ON. You can now operate me using your voice.',
    langCode: 'en-IN'
  },
  'mr-IN': {
    text: 'Tumcha Tolee Voice AI Manager ON jala ahe. Aata tumhi majhashi aawajane bolu shakta.',
    langCode: 'mr-IN'
  },
  'gu-IN': {
    text: 'Tamaroo Tolee Voice AI Manager ON thai gayoo chhe. Aawaj thi operate kari shako chho.',
    langCode: 'gu-IN'
  },
  'ta-IN': {
    text: 'Ungal Tolee Voice AI Manager ON aagivittathu.',
    langCode: 'ta-IN'
  },
  'te-IN': {
    text: 'Mee Tolee Voice AI Manager ON ayyindi.',
    langCode: 'te-IN'
  }
};

export function FloatingVoiceHUD({ isOpen, onClose, onSelectTab, onSendMessage }: FloatingVoiceHUDProps) {
  const [engine, setEngine] = useState<VoiceCompanionEngine | null>(null);
  const [mode, setMode] = useState<VoiceCompanionMode>('ALWAYS_LISTENING');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [wakeWordActive, setWakeWordActive] = useState(false);
  const [speechText, setSpeechText] = useState('Tolee Voice AI Manager Active');
  const hasSpokenOnOpen = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      hasSpokenOnOpen.current = false;
      return;
    }

    const savedLang = typeof window !== 'undefined' ? (localStorage.getItem('tolee_native_lang') || 'hi-IN') : 'hi-IN';
    const activeAnnouncement = NATIVE_ANNOUNCEMENTS[savedLang] || NATIVE_ANNOUNCEMENTS['hi-IN'];

    const vEngine = new VoiceCompanionEngine(mode);
    setSpeechText(activeAnnouncement.text);

    // Play native language activation announcement on explicit click trigger
    if (!hasSpokenOnOpen.current) {
      hasSpokenOnOpen.current = true;
      setTimeout(() => {
        vEngine.speak(activeAnnouncement.text, activeAnnouncement.langCode);
      }, 300);
    }

    vEngine.onStatusChange((listening, speaking, wakeWord) => {
      setIsListening(listening);
      setIsSpeaking(speaking);
      setWakeWordActive(wakeWord);
    });

    vEngine.onWakeWord(() => {
      setSpeechText('Listening for your command...');
    });

    // Real-time live transcript display as user speaks into microphone
    vEngine.onInterim((liveText) => {
      setSpeechText(`🎙️ Hearing: "${liveText}"`);
    });

    vEngine.onCommand(async (transcript) => {
      if (!transcript || transcript.trim().length === 0) return;

      // Pause recognition while server processes request and generates response
      vEngine.stopListening();

      const parsed = parseVoiceCommand(transcript);
      setSpeechText(`🗣️ Processing: "${transcript}"`);

      let spokenReply = parsed.responseText;

      if (parsed.intent === 'READ_NOTIFICATIONS') {
        const briefingRes = await getVoiceNotificationBriefing();
        spokenReply = briefingRes.briefing;
      } else if (parsed.intent === 'OPEN_MODULE' && parsed.targetModule) {
        onSelectTab(parsed.targetModule);
      } else {
        const aiResult = await onSendMessage(transcript);
        if (typeof aiResult === 'string' && aiResult.trim().length > 0) {
          // Strip Markdown formatting symbols (*, _, #, `, [ ]) for clean natural spoken voice
          spokenReply = aiResult.replace(/[*_#`[\]]/g, '').trim();
        }
      }

      setSpeechText(spokenReply);
      vEngine.speak(spokenReply, parsed.detectedLang);
    });

    setEngine(vEngine);
    vEngine.setMode(mode);

    return () => {
      vEngine.stopListening();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-50 flex items-center gap-3 bg-slate-900/95 backdrop-blur-xl border border-cyan-500/40 text-white rounded-full px-4 py-2.5 shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all animate-in fade-in slide-in-from-bottom-5">
      {/* Glowing Orb Animation */}
      <div 
        className={`relative flex items-center justify-center w-8 h-8 rounded-full border ${
          isSpeaking 
            ? 'border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)]' 
            : wakeWordActive
            ? 'border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]'
            : isListening
            ? 'border-violet-400 animate-pulse'
            : 'border-slate-600'
        }`}
      >
        <Radio className={`w-4 h-4 ${isSpeaking ? 'text-cyan-300 animate-bounce' : 'text-violet-300'}`} />
      </div>

      {/* Text Info */}
      <div className="max-w-[180px] sm:max-w-[240px] text-xs">
        <div className="font-bold flex items-center gap-1 text-cyan-300">
          Tolee Voice Manager ON
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </div>
        <p className="text-[11px] text-slate-300 truncate">{speechText}</p>
      </div>

      {/* Close/Turn OFF Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="w-7 h-7 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
        title="Turn Voice Manager OFF"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
