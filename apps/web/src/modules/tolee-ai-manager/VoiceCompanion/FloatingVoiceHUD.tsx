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

      // Unlock mobile audio channel immediately upon command capture
      unlockMobileAudio();

      // Pause recognition while server processes request and generates response
      vEngine.stopListening();

      const parsed = parseVoiceCommand(transcript);
      setSpeechText(`🗣️ Processing: "${transcript}"...`);

      // 1. Send command to central AI Manager Core via onSendMessage
      let aiResultText = '';
      try {
        const res = await onSendMessage(transcript);
        if (typeof res === 'string' && res.trim().length > 0) {
          aiResultText = res;
        }
      } catch (err) {
        console.error('onSendMessage error in voice command handler:', err);
      }

      // 2. Handle module tab switching if requested by intent
      if (parsed.intent === 'OPEN_MODULE' && parsed.targetModule) {
        onSelectTab(parsed.targetModule);
      }

      // 3. Spoken text MUST be the exact AI Core response
      let spokenReply = aiResultText || 'माफ़ कीजिए, अभी मैं आपका जवाब तैयार नहीं कर पा रहा हूँ। कृपया थोड़ी देर बाद फिर कोशिश करें।';
      if (parsed.intent === 'READ_NOTIFICATIONS' && !aiResultText) {
        try {
          const briefingRes = await getVoiceNotificationBriefing();
          if (briefingRes?.briefing) spokenReply = briefingRes.briefing;
        } catch (e) {}
      }

      // Clean markdown syntax for speech synthesis while preserving exact words
      const cleanSpoken = spokenReply
        .replace(/✅\s*\*\*Tolee AI Manager\*\*:\s*/gi, '')
        .replace(/🔔\s*\*\*Tolee AI Manager\*\*:\s*/gi, '')
        .replace(/[*_#`[\]()]/g, '')
        .replace(/https?:\/\/\S+/gi, '')
        .trim();

      let spokenLang = parsed.detectedLang;
      if (/[\u0900-\u097F]/.test(cleanSpoken)) {
        spokenLang = 'hi-IN';
      }

      setSpeechText(cleanSpoken);

      // Re-unlock mobile audio context right before invoking speak()
      unlockMobileAudio();
      vEngine.speak(cleanSpoken, spokenLang);
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

  const handleMicTap = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    unlockMobileAudio();
    if (engine) {
      if (isListening) {
        engine.stopListening();
        setSpeechText('Processing voice input...');
      } else {
        engine.startListening();
        setSpeechText('🎙️ Listening... Speak your command!');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-20 left-2 right-2 sm:left-auto sm:right-6 z-[9999999] flex items-center justify-between gap-3 bg-slate-900/95 backdrop-blur-2xl border border-cyan-500/50 text-white rounded-2xl sm:rounded-full px-4 py-3 shadow-[0_0_35px_rgba(6,182,212,0.5)] transition-all animate-in fade-in slide-in-from-bottom-5 max-w-[calc(100vw-16px)] mx-auto sm:mx-0">
      {/* Glowing Orb Animation / Tap to Speak Button */}
      <button 
        type="button"
        onClick={handleMicTap}
        className={`relative flex items-center justify-center w-11 h-11 rounded-full border cursor-pointer active:scale-95 transition-all shrink-0 ${
          isSpeaking 
            ? 'border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.9)] bg-cyan-950/90 animate-pulse' 
            : wakeWordActive || isListening
            ? 'border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.9)] bg-emerald-950/90 animate-pulse'
            : 'border-cyan-500/40 bg-slate-800 hover:border-cyan-400'
        }`}
        title="Tap to Speak (Mobile)"
      >
        {isSpeaking ? (
          <Volume2 className="w-5 h-5 text-cyan-300 animate-bounce" />
        ) : (
          <Mic className={`w-5 h-5 ${isListening ? 'text-emerald-300 animate-pulse' : 'text-cyan-300'}`} />
        )}
      </button>

      {/* Text Info */}
      <div 
        onClick={handleMicTap}
        className="flex-1 min-w-0 text-xs overflow-hidden cursor-pointer select-none"
      >
        <div className="font-bold flex items-center gap-1.5 text-cyan-300 text-xs sm:text-xs">
          <span>Tolee Voice AI</span>
          <span className={`w-2 h-2 rounded-full shrink-0 ${isSpeaking ? 'bg-cyan-400 animate-ping' : isListening ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
          {!isListening && !isSpeaking && (
            <span className="text-[10px] text-amber-400 bg-amber-950/70 px-2 py-0.5 rounded-full font-mono ml-auto sm:ml-0 border border-amber-500/30">Tap Mic 🎙️</span>
          )}
        </div>
        <p className="text-[11px] sm:text-xs text-slate-200 truncate mt-0.5">{speechText}</p>
      </div>

      {/* Close/Turn OFF Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleTurnOff}
        className="w-8 h-8 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 shrink-0 active:scale-90"
        title="Turn Voice Manager OFF"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
