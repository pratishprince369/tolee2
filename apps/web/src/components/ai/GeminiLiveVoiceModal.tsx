'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  X,
  Volume2,
  VolumeX,
  Sparkles,
  Bot,
  User,
  Radio,
  Settings2,
} from 'lucide-react';
import { AIPersonaConfig } from '@/lib/ai-gateway/types';

interface GeminiLiveVoiceModalProps {
  persona?: AIPersonaConfig | null;
  onClose: () => void;
}

export default function GeminiLiveVoiceModal({ persona, onClose }: GeminiLiveVoiceModalProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [transcriptHistory, setTranscriptHistory] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [volumeLevel, setVolumeLevel] = useState(0);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isSpeakingRef = useRef<boolean>(false);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    startVoiceSession();
    return () => {
      cleanupVoice();
    };
  }, []);

  const cleanupVoice = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
  };

  const startVoiceSession = async () => {
    try {
      // 1. Setup Audio Frequency Visualizer
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setVolumeLevel(avg / 128); // 0 to 1
        animFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      // 2. Setup Speech Recognition
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = persona?.language && persona.language !== 'auto' ? persona.language : 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          // BARGE-IN INTERRUPTION HANDLING:
          // If user starts speaking while AI is talking, cancel speech synthesis immediately!
          if (isSpeakingRef.current && typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
          }

          let interim = '';
          let final = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }

          setLiveTranscript(interim || final);

          if (final.trim()) {
            handleUserUtterance(final.trim());
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
        };

        recognition.onend = () => {
          if (!isMuted && streamRef.current?.active) {
            try {
              recognition.start();
            } catch {}
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } else {
        setLiveTranscript('Voice recognition is not supported in this browser. Please use Chrome/Edge.');
      }
    } catch (err: any) {
      console.error('Microphone access denied:', err);
      setLiveTranscript('Microphone access denied. Please allow microphone permissions.');
    }
  };

  const handleUserUtterance = async (text: string) => {
    setTranscriptHistory((prev) => [...prev, { role: 'user', text }]);
    setLiveTranscript('');

    try {
      const res = await fetch('/api/ai/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...transcriptHistory.map((t) => ({ role: t.role, content: t.text })),
            { role: 'user', content: text },
          ],
          persona: persona || undefined,
          model: 'gemini-2.0-flash',
          maxTokens: 200,
        }),
      });

      if (!res.ok || !res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantResponse = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':') || trimmed === 'data: [DONE]') continue;
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              if (data.text) {
                assistantResponse += data.text;
              }
            } catch {}
          }
        }
      }

      if (assistantResponse.trim()) {
        speakResponse(assistantResponse.trim());
      }
    } catch (err) {
      console.error('Failed to get voice reply:', err);
    }
  };

  const speakResponse = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    setIsSpeaking(true);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = persona?.voiceSpeed || 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      // Pick natural sounding voice if available
      const preferred = voices.find((v) => v.name.includes('Google') || v.name.includes('Natural')) || voices[0];
      utterance.voice = preferred;
    }

    utterance.onend = () => {
      setIsSpeaking(false);
      setTranscriptHistory((prev) => [...prev, { role: 'assistant', text }]);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      try {
        recognitionRef.current?.start();
      } catch {}
    } else {
      setIsMuted(true);
      try {
        recognitionRef.current?.stop();
      } catch {}
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
    }
  };

  const orbScale = isSpeaking ? 1.2 + volumeLevel * 0.4 : 1.0 + volumeLevel * 0.3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-2xl p-4 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-xl shadow-lg shadow-teal-500/10">
            {persona?.avatar || '✨'}
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-wide flex items-center gap-2">
              <span>{persona?.name || 'Tolee AI'}</span>
              <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-teal-900/60 text-teal-300 border border-teal-700/50">
                <Radio className="w-3 h-3 animate-pulse text-teal-400" />
                Live Voice
              </span>
            </h2>
            <p className="text-xs text-gray-400">
              {isSpeaking ? 'Speaking...' : isListening ? 'Listening... Speak naturally' : 'Muted'}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors border border-gray-700 shadow-xl"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Center Glowing Orb */}
      <div className="relative flex flex-col items-center justify-center my-auto">
        <div
          className="relative w-48 h-48 md:w-64 md:h-64 rounded-full flex items-center justify-center transition-transform duration-100 ease-out"
          style={{ transform: `scale(${orbScale})` }}
        >
          {/* Multi-layered radial glowing aura */}
          <div
            className={`absolute inset-0 rounded-full blur-3xl opacity-70 transition-colors duration-500 ${
              isSpeaking
                ? 'bg-gradient-to-tr from-cyan-500 via-teal-400 to-indigo-500 animate-spin-slow'
                : 'bg-gradient-to-tr from-teal-600 via-emerald-500 to-cyan-500'
            }`}
          />
          <div className="absolute inset-4 rounded-full bg-gradient-to-r from-teal-400 to-blue-500 blur-xl opacity-80 animate-pulse" />
          <div className="relative w-36 h-36 md:w-48 md:h-48 rounded-full bg-gradient-to-br from-teal-300 via-teal-600 to-blue-900 shadow-2xl flex items-center justify-center border-2 border-teal-200/50 backdrop-blur-md">
            <Sparkles className="w-12 h-12 text-white/90 animate-bounce" />
          </div>
        </div>

        {/* Live Subtitle Transcript */}
        <div className="mt-8 max-w-lg text-center px-4 min-h-[48px]">
          {liveTranscript ? (
            <p className="text-base md:text-lg text-teal-200 font-medium animate-fade-in drop-shadow">
              "{liveTranscript}"
            </p>
          ) : (
            <p className="text-xs text-gray-400 font-light">
              {isSpeaking ? 'Listening while speaking (you can interrupt anytime)' : 'Speak naturally to start conversation...'}
            </p>
          )}
        </div>
      </div>

      {/* Bottom Floating Controls */}
      <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-4 z-20">
        <button
          onClick={toggleMute}
          className={`p-4 rounded-full transition-all shadow-2xl transform active:scale-95 ${
            isMuted
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/50'
              : 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-900/50 ring-4 ring-teal-500/20'
          }`}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6 animate-pulse" />}
        </button>

        <button
          onClick={() => {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
              window.speechSynthesis.cancel();
              setIsSpeaking(false);
            }
          }}
          className="p-4 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 shadow-xl transition-all"
          title="Interrupt / Stop speech"
        >
          <VolumeX className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
