'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Radio, Mic, Volume2, Sparkles, X, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VoiceCompanionEngine, unlockMobileAudio } from './voiceCompanionEngine';
import { VoiceCompanionMode } from './voiceTypes';
import { parseVoiceCommand } from './voiceCommandParser';
import { getVoiceNotificationBriefing } from '@/actions/voice-companion';

interface FloatingVoiceHUDProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: string) => void;
  onSendMessage: (text: string) => Promise<string | void>;
}

const ON_ANNOUNCEMENTS: Record<string, { text: string; langCode: string }> = {
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

const OFF_ANNOUNCEMENTS: Record<string, { text: string; langCode: string }> = {
  'hi-IN': {
    text: 'Aapka Tolee Voice AI Manager OFF ho chuka hai.',
    langCode: 'hi-IN'
  },
  'en-IN': {
    text: 'Your Tolee Voice AI Manager is OFF.',
    langCode: 'en-IN'
  },
  'mr-IN': {
    text: 'Tumcha Tolee Voice AI Manager OFF jala ahe.',
    langCode: 'mr-IN'
  },
  'gu-IN': {
    text: 'Tamaroo Tolee Voice AI Manager OFF thai gayoo chhe.',
    langCode: 'gu-IN'
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
    const activeAnnouncement = ON_ANNOUNCEMENTS[savedLang] || ON_ANNOUNCEMENTS['hi-IN'];

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

      // 1. ALWAYS append message to Chat UI box first!
      let aiResultText = '';
      try {
        const res = await onSendMessage(transcript);
        if (typeof res === 'string') {
          aiResultText = res;
        }
      } catch (err) {
        console.error('onSendMessage error in voice command handler:', err);
      }

      // 2. Handle module tab switching if requested by intent
      if (parsed.intent === 'OPEN_MODULE' && parsed.targetModule) {
        onSelectTab(parsed.targetModule);
      }

      // 3. Prepare clean spoken text
      let spokenReply = aiResultText || parsed.responseText;
      if (parsed.intent === 'READ_NOTIFICATIONS') {
        try {
          const briefingRes = await getVoiceNotificationBriefing();
          if (briefingRes?.briefing) spokenReply = briefingRes.briefing;
        } catch (e) {}
      }

      // Strip Markdown formatting symbols (*, _, #, `, [ ]) for clean natural spoken voice
      spokenReply = spokenReply.replace(/[*_#`[\]()]/g, '').trim();

      let spokenLang = parsed.detectedLang;
      if (/[\u0900-\u097F]/.test(spokenReply)) {
        spokenLang = 'hi-IN';
      }

      setSpeechText(spokenReply);
      vEngine.speak(spokenReply, spokenLang);
    });

    setEngine(vEngine);
    vEngine.setMode(mode);

    return () => {
      vEngine.stopListening();
    };
  }, [isOpen]);

  const handleTurnOff = () => {
    const savedLang = typeof window !== 'undefined' ? (localStorage.getItem('tolee_native_lang') || 'hi-IN') : 'hi-IN';
    const offAnnouncement = OFF_ANNOUNCEMENTS[savedLang] || OFF_ANNOUNCEMENTS['hi-IN'];
    if (engine) {
      engine.stopListening();
      engine.speak(offAnnouncement.text, offAnnouncement.langCode);
    } else if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(offAnnouncement.text);
      u.lang = offAnnouncement.langCode;
      window.speechSynthesis.speak(u);
    }
    onClose();
  };

  const handleMicTap = () => {
    unlockMobileAudio();
    if (engine) {
      engine.startListening();
      setSpeechText('🎙️ Listening... Speak your command!');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-20 right-3 sm:bottom-24 sm:right-6 z-[99999] flex items-center gap-2.5 bg-slate-900/95 backdrop-blur-xl border border-cyan-500/40 text-white rounded-full px-3.5 py-2.5 shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all animate-in fade-in slide-in-from-bottom-5 max-w-[calc(100vw-24px)]">
      {/* Glowing Orb Animation / Tap to Speak Button */}
      <div 
        onClick={handleMicTap}
        onTouchEnd={handleMicTap}
        className={`relative flex items-center justify-center w-9 h-9 rounded-full border cursor-pointer active:scale-95 transition-all shrink-0 ${
          isSpeaking 
            ? 'border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)] bg-cyan-950/50' 
            : wakeWordActive
            ? 'border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)] bg-emerald-950/50'
            : isListening
            ? 'border-violet-400 animate-pulse bg-violet-950/50'
            : 'border-slate-600 bg-slate-800'
        }`}
        title="Tap to Speak (Mobile)"
      >
        <Radio className={`w-4 h-4 ${isSpeaking ? 'text-cyan-300 animate-bounce' : isListening ? 'text-emerald-300' : 'text-violet-300'}`} />
      </div>

      {/* Text Info */}
      <div className="max-w-[150px] sm:max-w-[240px] text-xs overflow-hidden">
        <div className="font-bold flex items-center gap-1 text-cyan-300 text-[11px] sm:text-xs">
          Tolee Voice Manager
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
        </div>
        <p className="text-[10px] sm:text-[11px] text-slate-300 truncate">{speechText}</p>
      </div>

      {/* Close/Turn OFF Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleTurnOff}
        onTouchEnd={handleTurnOff}
        className="w-7 h-7 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 shrink-0"
        title="Turn Voice Manager OFF"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
