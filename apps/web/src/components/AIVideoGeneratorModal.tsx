'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wand2, Sparkles, Check, X, Loader2, Video, Image as ImageIcon, UploadCloud } from 'lucide-react';

interface AIVideoGeneratorModalProps {
  onSelectVideo: (url: string) => void;
  triggerButton?: React.ReactNode;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const LOADING_STEPS = [
  'Initializing AI Engine...',
  'Processing prompt context...',
  'Synthesizing video frames...',
  'Applying cinematic motion...',
  'Finalizing video render...',
];

// Helper to convert base64 Data URI to a local Blob URL for high-performance preview without black screen
function dataURItoBlobURL(dataURI: string): string {
  try {
    const parts = dataURI.split(',');
    if (parts.length < 2) return dataURI;
    
    let byteString;
    if (parts[0].indexOf('base64') >= 0) {
      byteString = atob(parts[1]);
    } else {
      byteString = unescape(parts[1]);
    }

    const mimeString = parts[0].split(':')[1].split(';')[0];
    const ia = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    const blob = new Blob([ia], { type: mimeString });
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error('Error converting data URI to blob:', e);
    return dataURI;
  }
}

export function AIVideoGeneratorModal({ onSelectVideo, triggerButton, isOpen, setIsOpen }: AIVideoGeneratorModalProps) {
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [prompt, setPrompt] = useState('');
  
  // Image-to-video state
  const [initImage, setInitImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [polling, setPolling] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  
  // generatedUrl is the previewable Blob or Mixkit URL, rawGeneratedSource stores original base64/Mixkit for uploading
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [rawGeneratedSource, setRawGeneratedSource] = useState<string | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [loadingStepIdx, setLoadingStepIdx] = useState(0);

  // Rotate loading steps while generating or polling
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating || polling) {
      interval = setInterval(() => {
        setLoadingStepIdx((prev) => (prev + 1) % LOADING_STEPS.length);
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [isGenerating, polling]);

  // Polling loop
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    
    const checkStatus = async () => {
      if (!jobId) return;
      try {
        const res = await fetch(`/api/generate-video-status?id=${jobId}`);
        const data = await res.json();
        
        if (data.status === 'success' && data.url) {
          setRawGeneratedSource(data.url);
          
          let finalUrl = data.url;
          if (finalUrl.startsWith('data:')) {
            finalUrl = dataURItoBlobURL(finalUrl);
          }
          setGeneratedUrl(finalUrl);
          
          setPolling(false);
          setJobId(null);
          setIsGenerating(false);
        } else if (data.status === 'error' || data.status === 'failed') {
          alert(data.error || 'Video generation failed.');
          setPolling(false);
          setJobId(null);
          setIsGenerating(false);
        }
        // If processing/pending, it will check again on the next interval
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    if (polling && jobId) {
      pollInterval = setInterval(checkStatus, 5000); // Check every 5 seconds
    }

    return () => clearInterval(pollInterval);
  }, [polling, jobId]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setInitImage(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (mode === 'image' && !initImage) {
      alert('Please upload an initial image for Image-to-Video mode.');
      return;
    }

    setIsGenerating(true);
    setGeneratedUrl(null);
    setRawGeneratedSource(null);
    setJobId(null);
    setLoadingStepIdx(0);

    try {
      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          mode,
          init_image: initImage
        }),
      });

      const data = await res.json();
      
      if (data.success && data.status === 'processing' && data.id) {
        // Asynchronous workflow
        setJobId(data.id);
        setPolling(true);
      } else if (data.success && data.url) {
        // Synchronous fast return (if supported)
        setRawGeneratedSource(data.url);
        
        let finalUrl = data.url;
        if (finalUrl.startsWith('data:')) {
          finalUrl = dataURItoBlobURL(finalUrl);
        }
        setGeneratedUrl(finalUrl);
        
        setIsGenerating(false);
      } else {
        alert(data.error || 'Failed to generate video. Please try again.');
        setIsGenerating(false);
      }
    } catch (err) {
      console.error(err);
      alert('Network error while generating. Please try again.');
      setIsGenerating(false);
    }
  };

  const handleUseVideo = async () => {
    if (!rawGeneratedSource) return;
    
    setIsSaving(true);
    try {
      // PERSIST GENERATED VIDEO TO CLOUDINARY TO AVOID SENDING GIANT BASE64 DATA URI TO POST API
      const res = await fetch('/api/save-generated-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: rawGeneratedSource }),
      });

      const data = await res.json();
      if (data.success && data.url) {
        onSelectVideo(data.url);
        
        // Reset and close
        setPrompt('');
        setInitImage(null);
        setGeneratedUrl(null);
        setRawGeneratedSource(null);
        setIsOpen(false);
      } else {
        alert(data.error || 'Failed to upload generated video to Cloudinary storage.');
      }
    } catch (err) {
      console.error(err);
      alert('Error uploading generated video to storage. Please check connection.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!isGenerating && !polling && !isSaving) {
        setIsOpen(open);
      }
    }}>
      {triggerButton && (
        <DialogTrigger asChild>
          {triggerButton}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[700px] w-[95vw] p-0 overflow-y-auto max-h-[92vh] rounded-3xl border border-zinc-200/60 dark:border-zinc-800/80 bg-white/95 dark:bg-black/95 backdrop-blur-2xl shadow-2xl flex flex-col font-sans">
        
        {/* Modal Header */}
        <DialogHeader className="p-6 border-b border-zinc-100 dark:border-zinc-900 flex flex-row items-center justify-between shrink-0 bg-zinc-50/50 dark:bg-zinc-950/20">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <Video className="w-5 h-5 text-blue-500 animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">AI Video Creator</DialogTitle>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Generate high-quality video content using AI</p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 p-6 space-y-6 overflow-y-auto max-h-[65vh]">
          
          {/* Mode Selector */}
          <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => setMode('text')}
              disabled={isGenerating || polling}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                mode === 'text' 
                  ? 'bg-white dark:bg-black text-blue-500 shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <Wand2 className="w-4 h-4" /> Text to Video
            </button>
            <button
              onClick={() => setMode('image')}
              disabled={isGenerating || polling}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                mode === 'image' 
                  ? 'bg-white dark:bg-black text-blue-500 shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <ImageIcon className="w-4 h-4" /> Image to Video
            </button>
          </div>

          {/* Prompt Section */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <span>Video Concept Description</span>
              <span className="text-red-500">*</span>
            </label>
            <textarea
              placeholder="Describe your video idea in detail (e.g. 'A cinematic slow motion shot of a cyberpunk city at night with neon lights...')"
              className="w-full min-h-[90px] rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 p-4 text-[15px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all resize-none placeholder:text-zinc-400"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isGenerating || polling || isSaving}
            />
          </div>

          {/* Image Upload for Image-to-Video */}
          {mode === 'image' && (
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <span>Initial Image (Base Frame)</span>
                <span className="text-red-500">*</span>
              </label>
              
              <div 
                onClick={() => !isGenerating && !polling && fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer ${
                  initImage 
                    ? 'border-blue-500/50 bg-blue-50/50 dark:bg-blue-900/10' 
                    : 'border-zinc-300 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-500 bg-zinc-50 dark:bg-zinc-900/40'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/jpeg,image/png,image/webp" 
                  onChange={handleImageUpload} 
                  className="hidden" 
                />
                
                {initImage ? (
                  <div className="relative w-full max-w-[200px] aspect-video rounded-xl overflow-hidden shadow-sm">
                    <img src={initImage} alt="Initial frame" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <span className="text-white text-xs font-bold">Change Image</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <UploadCloud className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Click to upload an image</p>
                      <p className="text-xs text-zinc-500 mt-1">JPEG, PNG or WebP (Max 5MB)</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Generator Action */}
          <div className="pt-2">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || polling || isSaving || !prompt.trim() || (mode === 'image' && !initImage)}
              className="w-full h-12 rounded-xl text-[15px] font-bold flex items-center justify-center gap-2 shadow-md hover:scale-[1.01] transition-transform active:scale-[0.99] bg-blue-600 hover:bg-blue-700 text-white"
            >
              {(isGenerating || polling) ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{LOADING_STEPS[loadingStepIdx]}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Generate AI Video</span>
                </>
              )}
            </Button>
          </div>

          {/* Loading Indicator */}
          {(isGenerating || polling) && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-blue-200 dark:border-blue-900/50 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
              </div>
              <div className="text-center">
                <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Processing Video</h4>
                <p className="text-xs text-zinc-500 mt-1">This can take a few minutes. Please wait...</p>
              </div>
            </div>
          )}

          {/* Generated Video Display */}
          {generatedUrl && !isGenerating && !polling && (
            <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Video Generated Successfully</span>
                </h4>
              </div>

              <div className="relative rounded-2xl overflow-hidden border-2 border-zinc-200 dark:border-zinc-800 bg-black aspect-video shadow-lg">
                <video 
                  key={generatedUrl}
                  src={generatedUrl} 
                  controls 
                  autoPlay 
                  muted
                  playsInline
                  className="w-full h-full object-contain"
                />
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
              disabled={isGenerating || polling || isSaving}
              className="flex-1 h-12 rounded-xl text-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-900"
            >
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleUseVideo}
            disabled={!generatedUrl || isGenerating || polling || isSaving}
            className="flex-[2] h-12 rounded-xl font-bold flex items-center justify-center gap-2 bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-black transition-colors"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Attaching...</span>
              </>
            ) : (
              <>
                <Video className="w-4 h-4" />
                <span>Use This Video</span>
              </>
            )}
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
