'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, Volume2, X } from 'lucide-react';
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
    text: 'Namaste! Tolee Voice AI Manager active hai. Bolen, main aapki kya madad kar sakta hoon?',
    langCode: 'hi-IN'
  },
  'en-IN': {
    text: 'Hello! Tolee Voice AI Manager is active. How can I help you today?',
    langCode: 'en-IN'
  },
  'mr-IN': {
    text: 'Namaskar! Mi tumcha Tolee Voice AI Manager active ahe. Mi tumhala kay madad karu?',
    langCode: 'mr-IN'
  },
  'gu-IN': {
    text: 'Namaste! Tamaroo Tolee Voice AI Manager active chhe. Hu tamne shu madad kari shaku?',
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
  const inactivityTimerRef = useRef<any>(null);

  // ⏰ Reset 2-Minute Inactivity Auto-OFF Timer (120,000ms)
  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(() => {
      console.log('⏰ Voice AI 2-minute inactivity limit reached. Shutting down Voice AI...');
      if ('speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch (e) {}
      }
      onClose();
    }, 120000); // 2 minutes (120 seconds) inactivity limit
  };

  useEffect(() => {
    if (!isOpen) {
      hasSpokenOnOpen.current = false;
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if ('speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch (e) {}
      }
      return;
    }

    const savedLang = typeof window !== 'undefined' ? (localStorage.getItem('tolee_native_lang') || 'hi-IN') : 'hi-IN';
    const activeAnnouncement = ON_ANNOUNCEMENTS[savedLang] || ON_ANNOUNCEMENTS['hi-IN'];

    const vEngine = new VoiceCompanionEngine(mode);
    setSpeechText(activeAnnouncement.text);
    resetInactivityTimer();

    // Play native language activation announcement on explicit open
    if (!hasSpokenOnOpen.current) {
      hasSpokenOnOpen.current = true;
      setTimeout(() => {
        if (isOpen) {
          vEngine.speak(activeAnnouncement.text, activeAnnouncement.langCode);
        }
      }, 300);
    }

    vEngine.onStatusChange((listening, speaking, wakeWord) => {
      setIsListening(listening);
      setIsSpeaking(speaking);
      setWakeWordActive(wakeWord);
    });

    vEngine.onWakeWord(() => {
      resetInactivityTimer();
      setSpeechText('Listening for your command...');
    });

    // Real-time live transcript display as user speaks into microphone
    vEngine.onInterim((liveText) => {
      resetInactivityTimer();
      setSpeechText(`🎙️ Hearing: "${liveText}"`);
    });

    vEngine.onCommand(async (transcript) => {
      if (!transcript || transcript.trim().length === 0) return;
      resetInactivityTimer();

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
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      vEngine.cancelSpeech();
      vEngine.stopListening();
    };
  }, [isOpen]);

  const handleTurnOff = () => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    
    // Strict Immediate Voice Output Cancellation
    if (engine) {
      engine.cancelSpeech();
      engine.stopListening();
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    onClose();
  };

  const handleMicTap = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    resetInactivityTimer();
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
