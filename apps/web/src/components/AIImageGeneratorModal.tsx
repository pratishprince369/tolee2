'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wand2, Sparkles, RefreshCw, Check, X, Loader2, Maximize2, Crop, Layout } from 'lucide-react';

interface AIImageGeneratorModalProps {
  onSelectImage: (cloudinaryUrl: string) => void;
  triggerButton?: React.ReactNode;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const STYLE_PRESETS = [
  { id: 'fooocus_v2', name: 'Fooocus V2', description: 'Midjourney-grade photorealism & prompt expansion', gradient: 'from-cyan-500 to-blue-600' },
  { id: 'fooocus_masterpiece', name: 'Masterpiece', description: 'Ultra high-end textures & golden hour light', gradient: 'from-amber-500 to-orange-600' },
  { id: 'fooocus_photography', name: 'Photography', description: '85mm DSLR portrait with natural soft bokeh', gradient: 'from-emerald-500 to-teal-600' },
  { id: 'fooocus_cinematic', name: 'Cinematic Movie', description: 'IMAX anamorphic 70mm movie still aesthetic', gradient: 'from-purple-600 to-indigo-700' },
  { id: 'illustration', name: 'Illustration', description: 'Modern 2D character & vector graphic', gradient: 'from-violet-500 to-fuchsia-500' },
  { id: 'marketing', name: 'Marketing Banner', description: 'Sleek banner ads & corporate design', gradient: 'from-blue-500 to-indigo-500' },
  { id: 'social', name: 'Social Media', description: 'Aesthetic, Pinterest/Instagram styling', gradient: 'from-emerald-500 to-teal-500' },
  { id: 'minimalist', name: 'Minimalist', description: 'Clean negative space & elegant framing', gradient: 'from-zinc-500 to-slate-500' },
];

const ASPECT_RATIOS = [
  { id: 'square', name: 'Square (1:1)', icon: '▢', desc: 'Feed Posts' },
  { id: 'portrait', name: 'Portrait (3:4)', icon: '▯', desc: 'Story/Reels' },
  { id: 'landscape', name: 'Landscape (16:9)', icon: '▬', desc: 'Banners/Cover' },
];

const SUGGESTED_PROMPTS = [
  'Luxury 2 BHK apartment in Mumbai at sunset, interior design',
  'Professional bridal makeup display, soft premium cosmetic branding',
  'Modern office workspace with green plants and warm studio lighting',
  'Delectable dessert pastry on a glossy marble table, gourmet close-up',
  'Minimalist technological gadget design, abstract clean branding banner',
];

const LOADING_STEPS = [
  'Sparking creativity...',
  'Configuring aspect ratios...',
  'Applying premium style presets...',
  'Synthesizing fine details...',
  'Finalizing AI generation...',
];

export function AIImageGeneratorModal({ onSelectImage, triggerButton, isOpen, setIsOpen }: AIImageGeneratorModalProps) {
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('fooocus_v2');
  const [selectedRatio, setSelectedRatio] = useState('square');
  const [generateCount, setGenerateCount] = useState(2); // default generate 2 variants
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedUrls, setGeneratedUrls] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingStepIdx, setLoadingStepIdx] = useState(0);

  // Rotate loading steps while generating
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      interval = setInterval(() => {
        setLoadingStepIdx((prev) => (prev + 1) % LOADING_STEPS.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setGeneratedUrls([]);
    setSelectedImage(null);
    setLoadingStepIdx(0);

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          style: selectedStyle,
          aspectRatio: selectedRatio,
          count: generateCount,
        }),
      });

      const data = await res.json();
      if (data.success && data.urls) {
        setGeneratedUrls(data.urls);
        // Autoselect the first one
        if (data.urls.length > 0) {
          setSelectedImage(data.urls[0]);
        }
      } else {
        alert(data.error || 'Failed to generate images. Please try again.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while generating. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseImage = async () => {
    if (!selectedImage) return;

    setIsSaving(true);
    try {
      const res = await fetch('/api/save-generated-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: selectedImage }),
      });

      const data = await res.json();
      if (data.success && data.url) {
        onSelectImage(data.url);
        // Reset and close
        setPrompt('');
        setGeneratedUrls([]);
        setSelectedImage(null);
        setIsOpen(false);
      } else {
        alert(data.error || 'Failed to save generated image to storage.');
      }
    } catch (err) {
      console.error(err);
      alert('Error uploading generated image. Please check connection.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {triggerButton && (
        <DialogTrigger asChild>
          {triggerButton}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[700px] w-[95vw] p-0 overflow-y-auto max-h-[92vh] rounded-3xl border border-zinc-200/60 dark:border-zinc-800/80 bg-white/95 dark:bg-black/95 backdrop-blur-2xl shadow-2xl flex flex-col font-sans">
        
        {/* Modal Header */}
        <DialogHeader className="p-6 border-b border-zinc-100 dark:border-zinc-900 flex flex-row items-center justify-between shrink-0 bg-zinc-50/50 dark:bg-zinc-950/20">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">AI Image Creator</DialogTitle>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Generate high-quality custom posts instantly using AI</p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 p-6 space-y-6 overflow-y-auto max-h-[65vh]">
          {/* Prompt Section */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <span>What do you want to create?</span>
              <span className="text-red-500">*</span>
            </label>
            <textarea
              placeholder="Describe your design idea in detail (e.g. 'Modern real estate poster featuring a luxury 2 BHK kitchen room, bright sunset rays flowing in, extremely modern aesthetics...')"
              className="w-full min-h-[90px] rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 p-4 text-[15px] focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all resize-none placeholder:text-zinc-400"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isGenerating || isSaving}
            />
            
            {/* Suggestions */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-xs text-zinc-400 font-medium py-1">Try:</span>
              {SUGGESTED_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => setPrompt(p)}
                  disabled={isGenerating || isSaving}
                  className="text-xs bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-3 py-1 rounded-full font-medium transition-colors border border-transparent hover:border-zinc-300/40 dark:hover:border-zinc-700 max-w-[280px] truncate"
                  title={p}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Style & Layout Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Style Presets */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                <span>Select Style Preset</span>
              </label>
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                {STYLE_PRESETS.map((preset) => (
                  <div
                    key={preset.id}
                    onClick={() => !isGenerating && !isSaving && setSelectedStyle(preset.id)}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      selectedStyle === preset.id
                        ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
                        : 'border-zinc-200 dark:border-zinc-850 hover:border-zinc-300 dark:hover:border-zinc-750 bg-white dark:bg-black'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${preset.gradient} shrink-0 flex items-center justify-center text-white shadow-sm`}>
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-xs text-zinc-900 dark:text-white flex items-center gap-1">
                        {preset.name}
                        {selectedStyle === preset.id && <Check className="w-3.5 h-3.5 text-primary" />}
                      </h4>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">{preset.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Layout (Aspect Ratio) */}
            <div className="space-y-3 flex flex-col">
              <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                Layout / Aspect Ratio
              </label>
              <div className="grid grid-cols-3 gap-2 flex-grow">
                {ASPECT_RATIOS.map((ratio) => (
                  <div
                    key={ratio.id}
                    onClick={() => !isGenerating && !isSaving && setSelectedRatio(ratio.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border cursor-pointer text-center transition-all ${
                      selectedRatio === ratio.id
                        ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
                        : 'border-zinc-200 dark:border-zinc-850 hover:border-zinc-300 dark:hover:border-zinc-750 bg-white dark:bg-black'
                    }`}
                  >
                    <span className={`text-2xl font-bold ${selectedRatio === ratio.id ? 'text-primary' : 'text-zinc-400 dark:text-zinc-600'}`}>
                      {ratio.icon}
                    </span>
                    <span className="font-semibold text-[11px] mt-1 text-zinc-800 dark:text-zinc-200">{ratio.name}</span>
                    <span className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-0.5">{ratio.desc}</span>
                  </div>
                ))}
              </div>

              {/* Count Selector */}
              <div className="mt-4 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-900">
                <span className="text-xs font-bold text-zinc-500">Variants to generate</span>
                <div className="flex gap-1.5">
                  {[1, 2, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => !isGenerating && !isSaving && setGenerateCount(n)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                        generateCount === n
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Generator Actions & Display */}
          <div className="pt-2">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || isSaving || !prompt.trim()}
              className="w-full h-12 rounded-xl text-[15px] font-bold flex items-center justify-center gap-2 shadow-md hover:scale-[1.01] transition-transform active:scale-[0.99]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{LOADING_STEPS[loadingStepIdx]}</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  <span>Generate AI Image Variants</span>
                </>
              )}
            </Button>
          </div>

          {/* Loading Placeholder Grid */}
          {isGenerating && (
            <div className="grid grid-cols-2 gap-4 pt-4">
              {Array.from({ length: generateCount }).map((_, i) => (
                <div key={i} className="aspect-square bg-zinc-100 dark:bg-zinc-900 rounded-2xl animate-pulse flex items-center justify-center border border-zinc-200/50 dark:border-zinc-800/50">
                  <div className="flex flex-col items-center text-center gap-2 p-4 text-zinc-400">
                    <Sparkles className="w-6 h-6 animate-bounce" />
                    <span className="text-[10px] font-medium tracking-tight">Creating Masterpiece...</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Generated Gallery Display */}
          {generatedUrls.length > 0 && !isGenerating && (
            <div className="space-y-3 pt-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <span>AI Generated Designs</span>
                  <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/10 text-[10px]">{generatedUrls.length} Variants</Badge>
                </h4>
                <p className="text-[11px] text-zinc-400">Click any image to select</p>
              </div>

              <div className={`grid gap-4 ${generatedUrls.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' : 'grid-cols-2'}`}>
                {generatedUrls.map((url, idx) => {
                  const isSelected = selectedImage === url;
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedImage(url)}
                      className={`relative rounded-2xl overflow-hidden cursor-pointer border-2 transition-all duration-300 group shadow-md ${
                        isSelected 
                          ? 'border-primary ring-4 ring-primary/20 scale-[1.01]' 
                          : 'border-transparent hover:border-zinc-300 dark:hover:border-zinc-750'
                      } ${
                        selectedRatio === 'portrait' ? 'aspect-[3/4]' : selectedRatio === 'landscape' ? 'aspect-[16/9]' : 'aspect-square'
                      }`}
                    >
                      <img
                        src={url}
                        alt={`AI Variant ${idx + 1}`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      
                      {/* Selection Overlay */}
                      <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-200 ${
                        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}>
                        <div className={`p-2.5 rounded-full backdrop-blur-md border border-white/20 shadow-lg text-white transition-all ${
                          isSelected ? 'bg-primary scale-110' : 'bg-black/50 group-hover:scale-100 scale-90'
                        }`}>
                          {isSelected ? (
                            <Check className="w-5 h-5 stroke-[3]" />
                          ) : (
                            <Sparkles className="w-5 h-5" />
                          )}
                        </div>
                      </div>

                      {/* Dimensions Tag */}
                      <span className="absolute bottom-2 left-2 bg-black/60 text-white backdrop-blur-md rounded-md text-[9px] px-1.5 py-0.5 font-bold uppercase tracking-wider">
                        V{idx + 1}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-950/20 flex gap-3 shrink-0">
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              className="flex-1 h-12 rounded-xl text-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-900"
            >
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleUseImage}
            disabled={!selectedImage || isGenerating || isSaving}
            className="flex-[2] h-12 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading & Optimizing...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Use This Design</span>
              </>
            )}
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
