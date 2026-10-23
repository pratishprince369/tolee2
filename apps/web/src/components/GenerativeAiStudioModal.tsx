'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Image as ImageIcon, Video, Mic, Wand2, Loader2, Download, 
  Check, RefreshCw, X, Play, Sliders, Key, Layers, ArrowRight, Share2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface GenerativeAiStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'image' | 'video' | 'lipsync' | 'social';
  initialPrompt?: string;
  targetAspectRatio?: '16:9' | '9:16' | '1:1';
  onSelectMedia?: (url: string, type: 'image' | 'video') => void;
  title?: string;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500&q=80',
];

const PROMPT_SUGGESTIONS = [
  'Futuristic smart city in India with hyperloop and neon skies, cinematic lighting 8k',
  'Breaking financial news studio backdrop with digital globe and dynamic lighting',
  'Cinematic drone footage sweeping over Varanasi ghats at twilight with floating lanterns',
  'Traditional Indian wedding celebration in high-definition ultra-photorealistic style',
  'Electric sports car drifting on a rain-slicked highway at midnight, reflections',
];

export function GenerativeAiStudioModal({
  isOpen,
  onClose,
  initialTab = 'image',
  initialPrompt = '',
  targetAspectRatio = '16:9',
  onSelectMedia,
  title = 'Tolee AI Creative Studio'
}: GenerativeAiStudioModalProps) {
  const [activeTab, setActiveTab] = useState<'image' | 'video' | 'lipsync' | 'social'>(initialTab);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>(targetAspectRatio);
  const [customApiKey, setCustomApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMediaUrl, setGeneratedMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Lip-sync specific state
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);
  const [audioUrl, setAudioUrl] = useState('https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3');

  useEffect(() => {
    if (initialPrompt) setPrompt(initialPrompt);
    if (initialTab) setActiveTab(initialTab);
    if (targetAspectRatio) setAspectRatio(targetAspectRatio);
    const stored = localStorage.getItem('tolee_muapi_key');
    if (stored) setCustomApiKey(stored);
  }, [initialPrompt, initialTab, targetAspectRatio, isOpen]);

  if (!isOpen) return null;

  const handleSaveApiKey = () => {
    if (customApiKey.trim()) {
      localStorage.setItem('tolee_muapi_key', customApiKey.trim());
    } else {
      localStorage.removeItem('tolee_muapi_key');
    }
    setShowKeyInput(false);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && activeTab !== 'lipsync') {
      setErrorMessage('Please enter a description or prompt.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setGeneratedMediaUrl(null);

    try {
      let action = 'generate_image';
      let body: any = {
        prompt: prompt.trim(),
        options: {
          aspectRatio,
          apiKey: customApiKey.trim() || undefined,
        }
      };

      if (activeTab === 'video') {
        action = 'generate_video';
        setMediaType('video');
      } else if (activeTab === 'lipsync') {
        action = 'generate_lipsync';
        body = {
          audioUrl,
          imageUrl: selectedAvatar,
          options: { apiKey: customApiKey.trim() || undefined }
        };
        setMediaType('video');
      } else {
        setMediaType('image');
      }

      const res = await fetch('/api/ai/generative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...body })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Generation failed');
      }

      if (data.url) {
        setGeneratedMediaUrl(data.url);
      } else if (data.requestId) {
        setErrorMessage('Generation job queued. Processing on AI cluster...');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Generation error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseMedia = () => {
    if (generatedMediaUrl && onSelectMedia) {
      onSelectMedia(generatedMediaUrl, mediaType);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-gray-900 dark:text-white flex items-center gap-2">
                {title}
                <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-[10px] uppercase font-bold px-2 py-0.5">
                  Open AI Studio
                </Badge>
              </h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400">Generate high-fidelity AI Images, Reels, and Lip-Sync media</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowKeyInput(!showKeyInput)}
              className="text-xs text-gray-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-800 transition-colors"
              title="Add MuAPI Key for 600+ Models (Optional)"
            >
              <Key className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{customApiKey ? 'API Key Saved' : 'Add API Key'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Optional Custom API Key Drawer */}
        {showKeyInput && (
          <div className="px-6 py-3 bg-indigo-50/60 dark:bg-indigo-950/20 border-b border-indigo-100 dark:border-indigo-900/40 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[240px]">
              <input
                type="password"
                placeholder="Paste MuAPI Key (optional for 600+ cloud models)..."
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-800 text-gray-900 dark:text-zinc-100 focus:outline-none"
              />
            </div>
            <Button size="sm" onClick={handleSaveApiKey} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8">
              Save Key
            </Button>
            <span className="text-[11px] text-gray-500 dark:text-zinc-400">
              Without an API key, free instant Flux generation is used automatically.
            </span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-gray-100 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 overflow-x-auto scrollbar-none">
          <button
            onClick={() => { setActiveTab('image'); setMediaType('image'); }}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'image'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4" /> AI Image / Thumbnail
          </button>
          
          <button
            onClick={() => { setActiveTab('video'); setMediaType('video'); setAspectRatio('9:16'); }}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'video'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'
            }`}
          >
            <Video className="w-4 h-4" /> AI Reel & Video (Kling/Veo)
          </button>

          <button
            onClick={() => { setActiveTab('lipsync'); setMediaType('video'); }}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'lipsync'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'
            }`}
          >
            <Mic className="w-4 h-4" /> Lip-Sync Talking Avatar
          </button>

          <button
            onClick={() => { setActiveTab('social'); setMediaType('image'); setAspectRatio('1:1'); }}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'social'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" /> Social Creative
          </button>
        </div>

        {/* Main Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Lip-Sync Avatar Selector */}
          {activeTab === 'lipsync' ? (
            <div className="space-y-4">
              <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block">
                1. Select Talking Avatar
              </label>
              <div className="grid grid-cols-4 gap-3">
                {PRESET_AVATARS.map((avatar, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedAvatar(avatar)}
                    className={`aspect-square rounded-2xl overflow-hidden cursor-pointer border-2 transition-all ${
                      selectedAvatar === avatar ? 'border-indigo-600 ring-2 ring-indigo-500/30 scale-95' : 'border-transparent hover:opacity-80'
                    }`}
                  >
                    <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block">
                  2. Audio Track URL (or Voice Sample)
                </label>
                <input
                  type="text"
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  placeholder="https://.../speech.mp3"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-zinc-100"
                />
              </div>
            </div>
          ) : (
            /* Prompt Input & Aspect Ratio */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
                  Describe what you want to create:
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const random = PROMPT_SUGGESTIONS[Math.floor(Math.random() * PROMPT_SUGGESTIONS.length)];
                    setPrompt(random);
                  }}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                >
                  <Wand2 className="w-3.5 h-3.5" /> Inspire Me
                </button>
              </div>

              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  activeTab === 'video'
                    ? "e.g. 4k cinematic aerial drone footage of Himalayan snow peaks at sunset, slow motion..."
                    : "e.g. A hyper-realistic breaking news cover showing modern renewable energy solar farm in Rajasthan..."
                }
                className="w-full text-sm p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-all"
              />

              {/* Aspect Ratio Selector */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-medium">Aspect Ratio:</span>
                  {(['16:9', '9:16', '1:1'] as const).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setAspectRatio(ratio)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        aspectRatio === ratio
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:bg-slate-200'
                      }`}
                    >
                      {ratio === '16:9' ? '16:9 (Landscape)' : ratio === '9:16' ? '9:16 (Reel / Story)' : '1:1 (Square)'}
                    </button>
                  ))}
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-6 rounded-xl shadow-md flex items-center gap-2 h-10"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Media
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {/* Generated Result Preview Area */}
          {generatedMediaUrl && (
            <div className="pt-4 border-t border-gray-100 dark:border-zinc-800/80 space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-500" /> Generated Preview:
                </span>
                <a
                  href={generatedMediaUrl}
                  target="_blank"
                  rel="noreferrer"
                  download="tolee-ai-generated"
                  className="text-xs text-gray-500 hover:text-black dark:text-zinc-400 dark:hover:text-white flex items-center gap-1 font-semibold"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
              </div>

              <div className="relative w-full max-h-[380px] bg-black rounded-2xl overflow-hidden flex items-center justify-center border border-gray-200 dark:border-zinc-800">
                {mediaType === 'video' ? (
                  <video
                    src={generatedMediaUrl}
                    controls
                    autoPlay
                    loop
                    className="max-h-[380px] w-auto object-contain mx-auto"
                  />
                ) : (
                  <img
                    src={generatedMediaUrl}
                    alt="AI Generated"
                    className="max-h-[380px] w-auto object-contain mx-auto"
                  />
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerate}
                  className="rounded-xl flex items-center gap-1.5 text-xs font-semibold"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                </Button>
                {onSelectMedia && (
                  <Button
                    size="sm"
                    onClick={handleUseMedia}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-1.5 text-xs font-bold shadow-md"
                  >
                    <Check className="w-4 h-4" />
                    Use in Article / Post
                  </Button>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
