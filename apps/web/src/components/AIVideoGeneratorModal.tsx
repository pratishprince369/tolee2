'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Video, Sparkles, RefreshCw, Check, X, Loader2, Play, Film, Move } from 'lucide-react';

interface AIVideoGeneratorModalProps {
  onSelectVideo: (videoUrl: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const MOTION_PRESETS = [
  { id: 'ltx_cinematic', name: 'Cinematic Movie', description: 'Smooth 50 FPS camera pan & dramatic lighting', icon: '🎥' },
  { id: 'ltx_drone', name: 'Aerial Drone', description: 'Sweeping forward landscape flight', icon: '🚁' },
  { id: 'ltx_commercial', name: 'Commercial 3D Ad', description: 'Fluid product rotation & studio softbox', icon: '✨' },
  { id: 'ltx_cyber', name: 'Cyberpunk Glow', description: 'High-tech neon motion & light trails', icon: '⚡' },
  { id: 'ltx_slowmo', name: 'Ultra Slow-Mo', description: '120 FPS high-speed dynamic particle focus', icon: '⏱️' },
];

const ASPECT_RATIOS = [
  { id: 'portrait', name: 'Vertical Reel (9:16)', icon: '📱', desc: 'Reels, Shorts & Stories' },
  { id: 'landscape', name: 'Cinematic (16:9)', icon: '🎬', desc: 'Widescreen Feed Posts' },
  { id: 'square', name: 'Square (1:1)', icon: '▢', desc: 'Classic Feed Square' },
];

const SUGGESTED_VIDEO_PROMPTS = [
  'Indian Independence Day 15th August patriotic celebration with waving Tiranga in bright sky',
  'Futuristic electric sports car accelerating on highway with glowing neon light trails at night',
  'Cinematic sunrise over Himalayan mountains with floating clouds and soaring golden eagle',
  'Luxury coffee being poured into porcelain cup with rising steam and morning golden light',
  'Modern tech startup founder giving presentation on holographic 3D stage',
];

const LOADING_STEPS = [
  'Initializing LTX-2 Video Neural Engine...',
  'Composing 50 FPS Motion Vectors...',
  'Rendering Photorealistic Keyframes...',
  'Applying Cinematic Lighting & Camera Physics...',
  'Finalizing 4K Video Reel...',
];

export function AIVideoGeneratorModal({ onSelectVideo, isOpen, setIsOpen }: AIVideoGeneratorModalProps) {
  const [prompt, setPrompt] = useState('');
  const [selectedMotion, setSelectedMotion] = useState('ltx_cinematic');
  const [selectedRatio, setSelectedRatio] = useState('portrait');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [loadingStepIdx, setLoadingStepIdx] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      interval = setInterval(() => {
        setLoadingStepIdx((prev) => (prev + 1) % LOADING_STEPS.length);
      }, 2400);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setGeneratedVideoUrl(null);
    setLoadingStepIdx(0);

    try {
      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          style: selectedMotion,
          aspectRatio: selectedRatio,
        }),
      });

      const data = await res.json();
      if (data.success && data.videoUrl) {
        setGeneratedVideoUrl(data.videoUrl);
      } else {
        alert(data.error || 'Failed to generate video. Please try again.');
      }
    } catch (err: any) {
      alert('Video generation failed: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAttachVideo = () => {
    if (generatedVideoUrl) {
      onSelectVideo(generatedVideoUrl);
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl">
        {/* Header */}
        <div className="p-6 pb-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="bg-white/20 hover:bg-white/30 text-white border-none text-[10px] font-bold uppercase tracking-wider">
                  <Film className="w-3 h-3 mr-1" /> LTX-2 Video Foundation
                </Badge>
                <span className="text-xs text-white/80">50 FPS 4K</span>
              </div>
              <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-white">
                AI Video & Reel Creator
              </DialogTitle>
              <p className="text-xs text-white/90">
                Transform any idea, topic, or script into a cinematic motion video reel.
              </p>
            </div>
            <DialogClose className="p-2 rounded-full hover:bg-white/10 text-white transition-colors">
              <X className="w-5 h-5" />
            </DialogClose>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Prompt Input Area */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
              <span>Video Scene or Action Description</span>
              <span className="text-[10px] font-normal text-zinc-400">Hindi / Hinglish / English</span>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. 15 August Indian Independence Day celebration with tricolor flag waving majestically, cinematic lighting..."
              rows={3}
              className="w-full p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              disabled={isGenerating}
            />

            {/* Quick Inspiration Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] font-bold text-zinc-400 self-center mr-1">Ideas:</span>
              {SUGGESTED_VIDEO_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPrompt(p)}
                  className="text-[10px] px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 transition-colors truncate max-w-[200px]"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio Selector */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Format & Aspect Ratio
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ASPECT_RATIOS.map((ratio) => (
                <button
                  key={ratio.id}
                  type="button"
                  onClick={() => setSelectedRatio(ratio.id)}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    selectedRatio === ratio.id
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 shadow-sm'
                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                  }`}
                >
                  <div className="text-lg mb-1">{ratio.icon}</div>
                  <div className="text-xs font-bold">{ratio.name}</div>
                  <div className="text-[10px] text-zinc-400">{ratio.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Motion Style Selector */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Camera Motion & Cinematic Preset
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {MOTION_PRESETS.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setSelectedMotion(style.id)}
                  className={`p-2.5 rounded-2xl border text-left transition-all ${
                    selectedMotion === style.id
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-100'
                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{style.icon}</span>
                    <span className="text-xs font-bold">{style.name}</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1 line-clamp-1">{style.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Generated Video Preview Canvas */}
          {generatedVideoUrl && (
            <div className="p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-blue-600" />
                  Generated AI Video Preview
                </span>
                <Badge className="bg-emerald-500 text-white text-[10px]">
                  Ready to Attach
                </Badge>
              </div>

              <div className="rounded-2xl overflow-hidden bg-black aspect-video relative flex items-center justify-center">
                <img 
                  src={generatedVideoUrl} 
                  alt="Generated Video" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-xl text-white text-[10px] font-bold flex items-center gap-1">
                  <Film className="w-3 h-3 text-blue-400" /> 4K 50 FPS LTX-2
                </div>
              </div>
            </div>
          )}

          {/* Loading Animation Box */}
          {isGenerating && (
            <div className="p-6 rounded-3xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-blue-900 dark:text-blue-100">
                  {LOADING_STEPS[loadingStepIdx]}
                </h4>
                <p className="text-xs text-blue-600 dark:text-blue-300">
                  Synthesizing camera movement & photorealistic visual frames...
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="rounded-xl px-4 text-xs font-semibold"
            >
              Cancel
            </Button>

            {generatedVideoUrl ? (
              <Button
                type="button"
                onClick={handleAttachVideo}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-6 text-xs shadow-md shadow-emerald-500/20 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Attach AI Video to Post</span>
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
                className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-bold rounded-xl px-7 text-xs shadow-lg shadow-blue-500/25 flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating Video...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate AI Video</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
