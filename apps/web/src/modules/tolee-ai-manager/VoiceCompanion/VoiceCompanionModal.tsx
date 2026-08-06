'use client';

import React, { useState, useEffect } from 'react';
import { 
  Mic, MicOff, Volume2, ShieldAlert, Sparkles, X, Settings, 
  Car, Bell, CheckCircle, Radio, Play, Pause 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VoiceCompanionEngine } from './voiceCompanionEngine';
import { VoiceCompanionMode, VoicePriorityConfig } from './voiceTypes';
import { parseVoiceCommand } from './voiceCommandParser';
import { getVoiceNotificationBriefing } from '@/actions/voice-companion';

interface VoiceCompanionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: string) => void;
}

export function VoiceCompanionModal({ isOpen, onClose, onSelectTab }: VoiceCompanionModalProps) {
  const [engine, setEngine] = useState<VoiceCompanionEngine | null>(null);
  const [mode, setMode] = useState<VoiceCompanionMode>('ALWAYS_LISTENING');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [wakeWordActive, setWakeWordActive] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [aiSpeechText, setAiSpeechText] = useState('Greeting! Say "Hey Tolee" or "Tolee" to command me hands-free.');
  const [showSettings, setShowSettings] = useState(false);

  const [priorityConfig, setPriorityConfig] = useState<VoicePriorityConfig>({
    highPriority: { alarms: true, meetings: true, emergencyAlerts: true, crmUrgentFollowups: true },
    mediumPriority: { messages: true, comments: true, crmLeads: true },
    lowPriority: { likes: false, followers: false, dailyAnalytics: true }
  });

  useEffect(() => {
    const vEngine = new VoiceCompanionEngine(mode);

    vEngine.onStatusChange((listening, speaking, wakeWord) => {
      setIsListening(listening);
      setIsSpeaking(speaking);
      setWakeWordActive(wakeWord);
    });

    vEngine.onWakeWord(() => {
      setAiSpeechText('I am listening! What would you like me to do?');
    });

    vEngine.onCommand(async (transcript) => {
      setLiveTranscript(transcript);
      const parsed = parseVoiceCommand(transcript);

      setAiSpeechText(parsed.responseText);
      vEngine.speak(parsed.responseText);

      if (parsed.intent === 'READ_NOTIFICATIONS') {
        const briefingRes = await getVoiceNotificationBriefing();
        setAiSpeechText(briefingRes.briefing);
        vEngine.speak(briefingRes.briefing);
      } else if (parsed.intent === 'OPEN_MODULE' && parsed.targetModule) {
        onSelectTab(parsed.targetModule);
      }
    });

    setEngine(vEngine);
    vEngine.setMode(mode);

    return () => {
      vEngine.stopListening();
    };
  }, []);

  const handleModeChange = (newMode: VoiceCompanionMode) => {
    setMode(newMode);
    if (engine) {
      engine.setMode(newMode);
    }
  };

  const handleTriggerBriefing = async () => {
    const briefingRes = await getVoiceNotificationBriefing();
    setAiSpeechText(briefingRes.briefing);
    if (engine) {
      engine.speak(briefingRes.briefing);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-4">
      <div className="relative w-full max-w-lg bg-slate-900 border border-violet-500/30 rounded-3xl p-6 text-white shadow-2xl overflow-hidden">
        {/* Background Glowing Ambient Orbs */}
        <div className="absolute -top-20 -left-20 w-60 h-60 bg-violet-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6 z-10 relative">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-violet-600 to-cyan-400 rounded-2xl text-white shadow-lg shadow-violet-500/20">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-cyan-200 to-white">
                Tolee Voice Companion
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  J.A.R.V.I.S. Mode
                </span>
              </h2>
              <p className="text-xs text-slate-400">Continuous Wake-Word Voice Companion</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
              className="text-slate-400 hover:text-white rounded-xl"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-slate-400 hover:text-white rounded-xl"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* J.A.R.V.I.S. Reactive Orb Core Visualizer */}
        <div className="flex flex-col items-center justify-center my-6 relative z-10">
          <div 
            className={`relative flex items-center justify-center w-36 h-36 rounded-full border-2 transition-all duration-500 ${
              isSpeaking
                ? 'border-cyan-400 shadow-[0_0_50px_rgba(34,211,238,0.5)] scale-105'
                : wakeWordActive
                ? 'border-emerald-400 shadow-[0_0_50px_rgba(52,211,153,0.5)] scale-110'
                : isListening
                ? 'border-violet-500 shadow-[0_0_35px_rgba(139,92,246,0.3)] animate-pulse'
                : 'border-slate-700 opacity-60'
            }`}
          >
            {/* Concentric Pulsing Rings */}
            <div className={`absolute inset-2 rounded-full border border-cyan-500/20 ${isSpeaking ? 'animate-spin' : ''}`} />
            <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-violet-950 via-slate-900 to-cyan-950 flex items-center justify-center">
              {isSpeaking ? (
                <Volume2 className="w-10 h-10 text-cyan-300 animate-bounce" />
              ) : wakeWordActive ? (
                <Sparkles className="w-10 h-10 text-emerald-300 animate-spin" />
              ) : isListening ? (
                <Mic className="w-10 h-10 text-violet-300 animate-pulse" />
              ) : (
                <MicOff className="w-10 h-10 text-slate-500" />
              )}
            </div>
          </div>

          <div className="mt-4 text-center">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300">
              {wakeWordActive 
                ? '🟢 Wake Word Triggered!' 
                : isListening 
                ? '🎙️ Listening for "Hey Tolee"...' 
                : '⏸️ Standby'}
            </span>
          </div>
        </div>

        {/* Live Conversation Display Box */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 mb-6 space-y-2 z-10 relative">
          <p className="text-xs text-cyan-300 font-medium leading-relaxed">
            🤖 <span className="font-bold">Tolee:</span> {aiSpeechText}
          </p>
          {liveTranscript && (
            <p className="text-xs text-slate-400 italic">
              🗣️ <span className="font-semibold text-slate-300">You:</span> "{liveTranscript}"
            </p>
          )}
        </div>

        {/* Mode Selector Selector Pills */}
        <div className="space-y-2 mb-6 z-10 relative">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Voice Companion Mode
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'ALWAYS_LISTENING', label: 'Always Listening' },
              { id: 'PUSH_TO_TALK', label: 'Push to Talk' },
              { id: 'DRIVING', label: 'Driving Mode' },
              { id: 'MEETING', label: 'Meeting Mode' },
              { id: 'SILENT', label: 'Silent Mode' },
              { id: 'OFF', label: 'OFF' }
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => handleModeChange(m.id as VoiceCompanionMode)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                  mode === m.id
                    ? 'bg-violet-600 border-violet-400 text-white shadow-lg shadow-violet-600/30'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex gap-2 z-10 relative">
          <Button
            onClick={handleTriggerBriefing}
            className="flex-1 h-11 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-bold text-xs rounded-xl shadow-lg"
          >
            <Bell className="w-4 h-4 mr-2" /> Read Voice Notification Briefing
          </Button>
        </div>
      </div>
    </div>
  );
}
