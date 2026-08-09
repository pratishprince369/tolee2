'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, Mic, Video, Volume2, Radio, Zap, Swords, 
  Smile, Flame, Award, CheckCircle2, Play, RefreshCw 
} from 'lucide-react';

const toast = {
  success: (msg: string) => typeof window !== 'undefined' && console.log('✅ ' + msg),
  error: (msg: string) => typeof window !== 'undefined' && console.log('❌ ' + msg),
  info: (msg: string) => typeof window !== 'undefined' && console.log('ℹ️ ' + msg),
  loading: (msg: string) => typeof window !== 'undefined' && console.log('⏳ ' + msg),
  dismiss: () => {}
};

interface ToleeAIDuetModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoTitle: string;
  videoId?: string;
  coverImage?: string;
}

export function ToleeAIDuetModal({
  isOpen,
  onClose,
  videoTitle,
  videoId,
  coverImage
}: ToleeAIDuetModalProps) {
  const [selectedVoice, setSelectedVoice] = useState('bollywood');
  const [selectedLanguage, setSelectedLanguage] = useState('hi');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDubbedSuccess, setIsDubbedSuccess] = useState(false);

  const voicePresets = [
    { id: 'bollywood', name: '🎬 Bollywood Hero Voice', desc: 'Dramatic cinematic Hindi voiceover' },
    { id: 'reporter', name: '🎙️ News Anchor AI', desc: 'Fast breaking news reporter tone' },
    { id: 'mimic', name: '😂 Comedy Mimic AI', desc: 'Funny viral parody & meme voice' },
    { id: 'english_pro', name: '🌐 Hollywood English', desc: 'Deep professional narrator voice' },
  ];

  const handleStartRecording = () => {
    setIsRecording(true);
    toast.info("🎤 Listening to your voice... Speak now!");
    setTimeout(() => {
      setIsRecording(false);
      setRecordedAudio(true);
      toast.success("✅ Voice recorded! Ready for AI Remixing.");
    }, 4000);
  };

  const handleGenerateAIDuet = () => {
    setIsProcessing(true);
    toast.loading("✨ Tolee AI is dubbing & creating side-by-side Duet Reel...");

    setTimeout(() => {
      setIsProcessing(false);
      setIsDubbedSuccess(true);
      toast.dismiss();
      toast.success("🔥 Tolee AI Duet Reel Created & Published to Feed!");
    }, 2500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-zinc-950 text-white border-zinc-800 rounded-3xl p-6 shadow-2xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge className="bg-gradient-to-r from-teal-500 to-indigo-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border-none flex items-center gap-1 shadow-md">
              <Sparkles className="w-3 h-3 animate-spin" /> World 1st AI Feature
            </Badge>
            <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
              Viral Duet & Dub
            </Badge>
          </div>
          <DialogTitle className="text-xl font-black text-white flex items-center gap-2">
            <Swords className="w-6 h-6 text-teal-400" /> Tolee AI Duet & Voice Reaction
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Create an instant side-by-side AI reaction or dubbed reel over <span className="text-teal-400 font-bold">"{videoTitle.slice(0, 45)}..."</span>
          </DialogDescription>
        </DialogHeader>

        {!isDubbedSuccess ? (
          <div className="space-y-5 pt-2">
            {/* Step 1: Select AI Voice Style */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-zinc-300 uppercase tracking-wider block flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-teal-400" /> 1. Select AI Voice Style
              </label>
              <div className="grid grid-cols-2 gap-2">
                {voicePresets.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVoice(v.id)}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      selectedVoice === v.id
                        ? 'bg-teal-500/15 border-teal-500 text-white ring-1 ring-teal-500/50 shadow-lg'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:border-zinc-700'
                    }`}
                  >
                    <span className="text-xs font-extrabold block text-white">{v.name}</span>
                    <span className="text-[10px] text-zinc-400 mt-1">{v.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Language Selector */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-zinc-300 uppercase tracking-wider block flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-indigo-400" /> 2. AI Auto-Translation Language
              </label>
              <div className="flex gap-2">
                {[
                  { code: 'hi', label: '🇮🇳 Hindi' },
                  { code: 'mr', label: '🚩 Marathi' },
                  { code: 'en', label: '🇬🇧 English' },
                  { code: 'ta', label: '⚡ Tamil / Telugu' }
                ].map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setSelectedLanguage(l.code)}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      selectedLanguage === l.code
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Record Voice or Auto AI Dub */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-white block">Option A: Speak Your Own Reaction</span>
                <span className="text-[11px] text-zinc-400 block">Record 5s voice reaction to overlay</span>
              </div>
              <Button
                size="sm"
                variant={isRecording ? 'destructive' : recordedAudio ? 'outline' : 'default'}
                onClick={handleStartRecording}
                className="rounded-full px-4 text-xs font-bold flex items-center gap-1.5"
              >
                <Mic className={`w-3.5 h-3.5 ${isRecording ? 'animate-pulse' : ''}`} />
                {isRecording ? 'Recording...' : recordedAudio ? 'Re-record' : 'Record Voice'}
              </Button>
            </div>

            {/* Generate Action Button */}
            <Button
              disabled={isProcessing}
              onClick={handleGenerateAIDuet}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-teal-500 via-emerald-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-extrabold text-sm shadow-xl flex items-center justify-center gap-2 border-none active:scale-[0.98] transition-transform"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Generating AI Duet Reel...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 fill-current" />
                  Publish Tolee AI Duet Reel 🔥
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">AI Duet Reel Live!</h3>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                Your AI Voice-Over Duet Reel has been posted to Tolee Feed and earned you <span className="text-amber-400 font-bold">+50 Tolee Coins 🪙</span>!
              </p>
            </div>
            <Button
              onClick={onClose}
              className="rounded-full bg-zinc-800 hover:bg-zinc-700 text-white px-8 text-xs font-bold"
            >
              Close & View in Feed
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
