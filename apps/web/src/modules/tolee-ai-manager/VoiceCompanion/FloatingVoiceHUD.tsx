'use client';

import React, { useState, useEffect } from 'react';
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
}

export function FloatingVoiceHUD({ isOpen, onClose, onSelectTab }: FloatingVoiceHUDProps) {
  const [engine, setEngine] = useState<VoiceCompanionEngine | null>(null);
  const [mode, setMode] = useState<VoiceCompanionMode>('ALWAYS_LISTENING');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [wakeWordActive, setWakeWordActive] = useState(false);
  const [speechText, setSpeechText] = useState('Voice Active: Say "Tolee" or speak any command');

  useEffect(() => {
    if (!isOpen) return;

    const vEngine = new VoiceCompanionEngine(mode);

    vEngine.onStatusChange((listening, speaking, wakeWord) => {
      setIsListening(listening);
      setIsSpeaking(speaking);
      setWakeWordActive(wakeWord);
    });

    vEngine.onWakeWord(() => {
      setSpeechText('Listening! What can I do for you?');
    });

    vEngine.onCommand(async (transcript) => {
      const parsed = parseVoiceCommand(transcript);
      setSpeechText(parsed.responseText);
      vEngine.speak(parsed.responseText, parsed.detectedLang);

      if (parsed.intent === 'READ_NOTIFICATIONS') {
        const briefingRes = await getVoiceNotificationBriefing();
        setSpeechText(briefingRes.briefing);
        vEngine.speak(briefingRes.briefing, 'hi-IN');
      } else if (parsed.intent === 'OPEN_MODULE' && parsed.targetModule) {
        onSelectTab(parsed.targetModule);
      }
    });

    setEngine(vEngine);
    vEngine.setMode(mode);

    return () => {
      vEngine.stopListening();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-50 flex items-center gap-3 bg-slate-900/90 backdrop-blur-xl border border-cyan-500/40 text-white rounded-full px-4 py-2.5 shadow-[0_0_30px_rgba(6,182,212,0.3)] transition-all animate-in fade-in slide-in-from-bottom-5">
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
          Tolee Voice Companion
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </div>
        <p className="text-[11px] text-slate-300 truncate">{speechText}</p>
      </div>

      {/* Close Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="w-7 h-7 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
