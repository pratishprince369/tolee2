'use client';

import React, { useState, useRef, useEffect, useTransition } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  X, ArrowLeft, ArrowRight, Image as ImageIcon, Video, Music,
  Sparkles, Check, Play, Pause, Volume2, VolumeX, MapPin,
  Shield, CheckCircle2, Sliders, ChevronDown, Wand2, Newspaper,
  Film, HelpCircle, Loader2, Plus, Tag, RefreshCw, FileText, ChevronRight
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { getSidebarData } from '@/actions/user';
import { useUpload, MediaItem } from './UploadContext';
import { detectPostCategoryAction, CategoryDetectionResult, PostCategoryType } from '@/actions/aiPostClassifier';
import { CURATED_AUDIO_LIBRARY, AudioTrack, formatDuration } from '@/lib/audioLibrary';

const FILTER_PRESETS = [
  { name: 'Normal', filter: 'none' },
  { name: 'Vivid', filter: 'contrast(1.15) saturate(1.25)' },
  { name: 'Warm', filter: 'sepia(0.2) saturate(1.2) brightness(1.05)' },
  { name: 'Noir', filter: 'grayscale(1) contrast(1.2)' },
  { name: 'Vintage', filter: 'sepia(0.4) contrast(0.9) brightness(1.1)' },
  { name: 'Cinematic', filter: 'contrast(1.2) brightness(0.95) saturate(1.1)' },
];

const ASPECT_RATIOS = [
  { name: '1:1 Square', value: '1 / 1' },
  { name: '4:5 Portrait', value: '4 / 5' },
  { name: '16:9 Wide', value: '16 / 9' },
  { name: '9:16 Reel', value: '9 / 16' },
];

interface UnifiedCreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPost?: (post: any, postData?: any) => void;
  initialMode?: 'default' | 'requirement' | 'regular' | 'reel' | 'news';
  toleeId?: string;
}

export function UnifiedCreatePostModal({
  isOpen,
  onClose,
  onPost,
  initialMode = 'default',
  toleeId,
}: UnifiedCreatePostModalProps) {
  const { data: session } = useSession();
  const { startUpload } = useUpload();
  const [isPending, startTransition] = useTransition();

  // Wizard Steps: 1: Select -> 2: Edit -> 3: Audio -> 4: Caption -> 5: AI & Preview
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Media state
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [isTextOnly, setIsTextOnly] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit state
  const [selectedRatio, setSelectedRatio] = useState('4 / 5');
  const [selectedFilter, setSelectedFilter] = useState('none');

  // Audio / Music state
  const [selectedAudio, setSelectedAudio] = useState<AudioTrack | null>(null);
  const [previewingAudioId, setPreviewingAudioId] = useState<string | null>(null);
  const [customAudioFile, setCustomAudioFile] = useState<File | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  // Caption & Meta state
  const [caption, setCaption] = useState('');
  const [headline, setHeadline] = useState('');
  const [location, setLocation] = useState('');
  const [subLocation, setSubLocation] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [selectedTolees, setSelectedTolees] = useState<string[]>(toleeId ? [toleeId] : []);
  const [joinedTolees, setJoinedTolees] = useState<any[]>([]);

  // AI Classification state
  const [detectedResult, setDetectedResult] = useState<CategoryDetectionResult | null>(null);
  const [manualCategory, setManualCategory] = useState<PostCategoryType | null>(null);
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);

  // Load user's joined Tolees
  useEffect(() => {
    if (isOpen) {
      getSidebarData().then((res) => {
        if (res.success) {
          const all = [...(res.managedTolees || []), ...(res.joinedTolees || [])];
          setJoinedTolees(all);
          if (selectedTolees.length === 0 && all.length > 0) {
            setSelectedTolees(toleeId ? [toleeId] : [all[0].id]);
          }
        }
      });

      // Handle initial mode preset
      if (initialMode && initialMode !== 'default') {
        setManualCategory(initialMode as PostCategoryType);
        if (initialMode === 'reel') {
          setSelectedRatio('9 / 16');
        }
      }
    }
  }, [isOpen, initialMode, toleeId]);

  // Cleanup audio preview on close or step change
  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
    };
  }, [isOpen, step]);

  const toggleAudioPreview = (track: AudioTrack) => {
    if (previewingAudioId === track.id) {
      audioPlayerRef.current?.pause();
      setPreviewingAudioId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const player = new Audio(track.url);
      player.play().catch(() => {});
      player.onended = () => setPreviewingAudioId(null);
      audioPlayerRef.current = player;
      setPreviewingAudioId(track.id);
    }
  };

  const handleCustomAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomAudioFile(file);
      setSelectedAudio({
        id: 'custom-audio',
        title: file.name.replace(/\.[^/.]+$/, ''),
        artist: session?.user?.name || 'My Audio',
        mood: 'Custom Audio',
        duration: 0,
        url,
      });
    }
  };

  const triggerFileInput = (customAccept?: string) => {
    if (fileInputRef.current) {
      if (customAccept !== undefined) {
        fileInputRef.current.accept = customAccept;
      } else {
        const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
        // On Android, accept="*/*" prevents ColorOS / Realme from auto-selecting the [Videos] filter chip,
        // allowing all photos and videos to be displayed mixed together in Recents.
        fileInputRef.current.accept = isAndroid ? '*/*' : 'image/*,video/*';
      }
      fileInputRef.current.click();
    }
  };

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newItems: MediaItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm|3gp|m4v)$/i.test(file.name);
        const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp|heic|heif|svg)$/i.test(file.name);

        if (!isVideo && !isImage) {
          continue;
        }

        newItems.push({
          type: isVideo ? 'video' : 'image',
          url: URL.createObjectURL(file),
          file,
        });
      }

      if (newItems.length === 0) {
        alert('Please select valid photos or videos.');
        return;
      }

      setMediaList((prev) => [...prev, ...newItems]);
      setIsTextOnly(false);
      if (newItems[0]?.type === 'video') {
        setSelectedRatio('9 / 16');
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeMediaItem = (index: number) => {
    setMediaList((prev) => prev.filter((_, i) => i !== index));
    if (activeMediaIndex >= index && activeMediaIndex > 0) {
      setActiveMediaIndex((prev) => prev - 1);
    }
  };

  // Run NVIDIA AI classification when moving to preview screen
  const runAIClassification = async () => {
    setIsAnalyzingAI(true);
    const hasVideo = mediaList.some((m) => m.type === 'video');
    const hasImages = mediaList.some((m) => m.type === 'image');

    try {
      const res = await detectPostCategoryAction({
        caption,
        hasVideo,
        hasImages,
        fileName: mediaList[0]?.file?.name,
      });
      setDetectedResult(res);
      if (!manualCategory) {
        setManualCategory(res.category);
      }
    } catch {
      // Fallback handled inside action
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  const handleNextStep = async () => {
    if (step === 1) {
      if (mediaList.length === 0 && !isTextOnly) {
        setIsTextOnly(true);
        setStep(4);
        return;
      }
      setStep(isTextOnly ? 4 : 2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    } else if (step === 4) {
      setStep(5);
      await runAIClassification();
    }
  };

  const handlePrevStep = () => {
    if (step === 5) setStep(4);
    else if (step === 4) setStep(isTextOnly ? 1 : 3);
    else if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
  };

  const handlePublish = () => {
    const finalCategory = manualCategory || detectedResult?.category || 'regular';
    const firstSelectedTolee = joinedTolees.find((t) => t.id === selectedTolees[0]);

    // Format media list: attach custom audio file if provided
    const payloadMedia: MediaItem[] = [...mediaList];
    if (customAudioFile && selectedAudio) {
      payloadMedia.push({
        type: 'video' as any, // upload provider handles audio file similarly
        url: selectedAudio.url,
        file: customAudioFile,
      });
    }

    const postData = {
      content: caption,
      postType: finalCategory,
      toleeName: selectedTolees.length === 1 ? firstSelectedTolee?.name : `${selectedTolees.length} Tolees`,
      toleeSlug: selectedTolees.length === 1 ? firstSelectedTolee?.slug : 'multiple',
      selectedToleeIds: selectedTolees,
      location: location || null,
      subLocation: subLocation || null,
      isAnonymous,
      headline: finalCategory === 'news' ? (headline || caption.slice(0, 80)) : undefined,
      category: finalCategory === 'news' ? 'Community News' : undefined,
    };

    // Trigger upload
    startUpload(
      payloadMedia,
      postData,
      finalCategory === 'reel' ? 'reel' : 'feed',
      onPost
    );

    // Reset and close
    resetModal();
    onClose();
  };

  const resetModal = () => {
    setStep(1);
    setMediaList([]);
    setActiveMediaIndex(0);
    setIsTextOnly(false);
    setSelectedRatio('4 / 5');
    setSelectedFilter('none');
    setSelectedAudio(null);
    setCaption('');
    setHeadline('');
    setLocation('');
    setSubLocation('');
    setIsAnonymous(false);
    setDetectedResult(null);
    setManualCategory(null);
  };

  const activeCategory = manualCategory || detectedResult?.category || 'regular';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-full sm:max-w-[700px] h-[100dvh] sm:h-[680px] p-0 bg-white dark:bg-[#121212] rounded-none sm:rounded-3xl border-none sm:border border-gray-100 dark:border-zinc-800 flex flex-col overflow-hidden shadow-2xl relative select-none">
        
        {/* Ambient Pastel Mint Accents matching mockup */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[#EAF7F6] dark:bg-teal-950/20 blur-2xl pointer-events-none -z-10" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[#EAF7F6] dark:bg-teal-950/20 blur-2xl pointer-events-none -z-10" />

        {/* Top Header Bar matching user mockup */}
        <div className="flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-3.5 border-b border-gray-100/80 dark:border-zinc-800/80 shrink-0 bg-white/90 dark:bg-[#121212]/90 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={step > 1 ? handlePrevStep : onClose}
              className="p-1.5 -ml-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full text-gray-800 dark:text-zinc-200 transition-colors cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
            </button>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-[#101828] dark:text-white leading-tight">
                {step === 1 && 'Create New Post'}
                {step === 2 && 'Edit & Enhance'}
                {step === 3 && 'Add Music & Sound'}
                {step === 4 && 'Add Caption & Details'}
                {step === 5 && 'Smart AI Review'}
              </h2>
              <p className="text-[11px] sm:text-xs text-[#667085] dark:text-zinc-400 mt-0.5">
                {step === 1 ? 'Share with your Tolee community' : `Step ${step} of 5`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Modal Body Wizard Screens */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
          
          {/* STEP 1: THREE VERTICAL SELECTION BOXES */}
          {step === 1 && (
            <div className="flex-1 flex flex-col justify-between p-4 sm:p-6 overflow-y-auto max-w-xl mx-auto w-full">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleMediaSelect}
              />

              {mediaList.length === 0 ? (
                <div className="space-y-4 my-auto py-2">
                  {/* BOX 1: SELECT PHOTOS */}
                  <div
                    onClick={() => triggerFileInput('image/*')}
                    className="group relative flex items-start gap-4 p-5 rounded-[26px] bg-white dark:bg-[#181818] border border-[#DCF1EE] dark:border-zinc-800 hover:border-[#0a7c85]/50 hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.99] shadow-xs"
                  >
                    <div className="w-16 h-16 rounded-[22px] bg-[#EAF7F5] dark:bg-teal-950/40 text-[#0a7c85] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-200">
                      <ImageIcon className="w-8 h-8 stroke-[2.2]" />
                    </div>
                    <div className="flex-1 min-w-0 pr-1">
                      <h3 className="text-[17px] font-black text-[#101828] dark:text-white group-hover:text-[#0a7c85] transition-colors">
                        Select Photos
                      </h3>
                      <p className="text-xs text-[#667085] dark:text-zinc-400 mt-1 leading-relaxed">
                        Choose photos from your device to share with the community.
                      </p>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E2F7F5] dark:bg-teal-950/60 text-[#0a7c85] text-[11px] font-bold mt-3">
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>JPG, PNG, WEBP (Max 100MB)</span>
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-[#EAF7F6] dark:bg-zinc-800 text-[#0a7c85] flex items-center justify-center flex-shrink-0 group-hover:bg-[#0a7c85] group-hover:text-white transition-all duration-200 self-center">
                      <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                    </div>
                  </div>

                  {/* BOX 2: SELECT VIDEOS */}
                  <div
                    onClick={() => triggerFileInput('video/*')}
                    className="group relative flex items-start gap-4 p-5 rounded-[26px] bg-white dark:bg-[#181818] border border-[#DCF1EE] dark:border-zinc-800 hover:border-[#0a7c85]/50 hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.99] shadow-xs"
                  >
                    <div className="w-16 h-16 rounded-[22px] bg-[#EAF7F5] dark:bg-teal-950/40 text-[#0a7c85] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-200">
                      <Video className="w-8 h-8 stroke-[2.2]" />
                    </div>
                    <div className="flex-1 min-w-0 pr-1">
                      <h3 className="text-[17px] font-black text-[#101828] dark:text-white group-hover:text-[#0a7c85] transition-colors">
                        Select Videos
                      </h3>
                      <p className="text-xs text-[#667085] dark:text-zinc-400 mt-1 leading-relaxed">
                        Choose videos from your device to share with the community.
                      </p>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E2F7F5] dark:bg-teal-950/60 text-[#0a7c85] text-[11px] font-bold mt-3">
                        <Video className="w-3.5 h-3.5" />
                        <span>MP4, MOV, WEBM (Max 100MB)</span>
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-[#EAF7F6] dark:bg-zinc-800 text-[#0a7c85] flex items-center justify-center flex-shrink-0 group-hover:bg-[#0a7c85] group-hover:text-white transition-all duration-200 self-center">
                      <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                    </div>
                  </div>

                  {/* BOX 3: POST WITH TEXT ONLY */}
                  <div
                    onClick={() => {
                      setIsTextOnly(true);
                      setStep(4);
                    }}
                    className="group relative flex items-start gap-4 p-5 rounded-[26px] bg-white dark:bg-[#181818] border border-[#DCF1EE] dark:border-zinc-800 hover:border-[#0a7c85]/50 hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.99] shadow-xs"
                  >
                    <div className="w-16 h-16 rounded-[22px] bg-[#EAF7F5] dark:bg-teal-950/40 text-[#0a7c85] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-200">
                      <FileText className="w-8 h-8 stroke-[2.2]" />
                    </div>
                    <div className="flex-1 min-w-0 pr-1">
                      <h3 className="text-[17px] font-black text-[#101828] dark:text-white group-hover:text-[#0a7c85] transition-colors">
                        Post with Text Only
                      </h3>
                      <p className="text-xs text-[#667085] dark:text-zinc-400 mt-1 leading-relaxed">
                        Share your thoughts, updates or ask something from the community.
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-[#EAF7F6] dark:bg-zinc-800 text-[#0a7c85] flex items-center justify-center flex-shrink-0 group-hover:bg-[#0a7c85] group-hover:text-white transition-all duration-200 self-center">
                      <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                    </div>
                  </div>
                </div>
              ) : (
                /* Selected Media Preview */
                <div className="w-full h-full flex flex-col justify-between py-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold text-[#101828] dark:text-white">
                      Selected Media ({mediaList.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setMediaList([])}
                      className="text-xs font-bold text-rose-500 hover:underline"
                    >
                      Change / Clear
                    </button>
                  </div>

                  <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-zinc-950 rounded-3xl p-4 overflow-hidden relative">
                    {mediaList[activeMediaIndex]?.type === 'video' ? (
                      <video
                        src={mediaList[activeMediaIndex].url}
                        controls
                        className="max-h-[340px] max-w-full rounded-2xl object-contain shadow-lg"
                      />
                    ) : (
                      <img
                        src={mediaList[activeMediaIndex]?.url}
                        alt="Selected"
                        className="max-h-[340px] max-w-full rounded-2xl object-contain shadow-lg"
                      />
                    )}
                  </div>

                  {/* Thumbnail Row */}
                  <div className="flex items-center gap-3 mt-4 overflow-x-auto pb-2 px-1">
                    {mediaList.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => setActiveMediaIndex(idx)}
                        className={`relative w-16 h-16 rounded-xl overflow-hidden cursor-pointer border-2 transition-all shrink-0 ${
                          activeMediaIndex === idx
                            ? 'border-[#0a7c85] scale-105 shadow-md'
                            : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                      >
                        {item.type === 'video' ? (
                          <div className="w-full h-full bg-black flex items-center justify-center text-white text-[10px]">
                            <Video className="w-5 h-5" />
                          </div>
                        ) : (
                          <img src={item.url} alt="Thumb" className="w-full h-full object-cover" />
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeMediaItem(idx);
                          }}
                          className="absolute top-1 right-1 bg-black/70 hover:bg-black text-white p-0.5 rounded-full"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => triggerFileInput()}
                      className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 dark:border-zinc-700 hover:border-[#0a7c85] flex flex-col items-center justify-center text-gray-400 hover:text-[#0a7c85] transition-colors shrink-0"
                    >
                      <Plus className="w-5 h-5" />
                      <span className="text-[10px] font-bold">Add</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Media Edit (Crop / Aspect Ratio / Filter) */}
          {step === 2 && (
            <div className="flex-1 flex flex-col sm:flex-row h-full">
              {/* Media Canvas */}
              <div className="flex-1 flex items-center justify-center bg-black p-4 relative overflow-hidden">
                <div
                  className="relative overflow-hidden flex items-center justify-center transition-all duration-300"
                  style={{
                    aspectRatio: selectedRatio,
                    maxHeight: '360px',
                    maxWidth: '100%',
                    filter: selectedFilter,
                  }}
                >
                  {mediaList[activeMediaIndex]?.type === 'video' ? (
                    <video
                      src={mediaList[activeMediaIndex].url}
                      autoPlay
                      loop
                      muted
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <img
                      src={mediaList[activeMediaIndex]?.url}
                      alt="Edit Preview"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  )}
                </div>
              </div>

              {/* Adjustments Sidebar */}
              <div className="w-full sm:w-64 border-t sm:border-t-0 sm:border-l border-gray-100 dark:border-zinc-800 p-5 space-y-5 overflow-y-auto">
                {/* Aspect Ratio */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2.5">
                    Aspect Ratio
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {ASPECT_RATIOS.map((ratio) => (
                      <button
                        key={ratio.value}
                        onClick={() => setSelectedRatio(ratio.value)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-left ${
                          selectedRatio === ratio.value
                            ? 'bg-[#0a7c85]/10 border-[#0a7c85] text-[#0a7c85]'
                            : 'border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-50'
                        }`}
                      >
                        {ratio.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filter Presets */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2.5">
                    Filters & Style
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {FILTER_PRESETS.map((p) => (
                      <button
                        key={p.name}
                        onClick={() => setSelectedFilter(p.filter)}
                        className={`flex flex-col items-center p-2 rounded-xl border transition-all ${
                          selectedFilter === p.filter
                            ? 'border-[#0a7c85] bg-[#0a7c85]/10 text-[#0a7c85] font-bold'
                            : 'border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-400'
                        }`}
                      >
                        <div
                          className="w-8 h-8 rounded-lg bg-cover bg-center mb-1 border"
                          style={{
                            backgroundImage: `url(${mediaList[activeMediaIndex]?.url})`,
                            filter: p.filter,
                          }}
                        />
                        <span className="text-[10px]">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Music / Audio Attachment */}
          {step === 3 && (
            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
              <input
                ref={audioFileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleCustomAudioUpload}
              />

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-extrabold text-gray-900 dark:text-zinc-100">
                    Add Music to your Post
                  </h4>
                  <p className="text-xs text-gray-500">
                    Choose royalty-free background audio or upload your custom audio track.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => audioFileInputRef.current?.click()}
                  className="rounded-full border-gray-200 dark:border-zinc-800 text-xs font-bold"
                >
                  <Music className="w-3.5 h-3.5 mr-1 text-[#0a7c85]" />
                  Upload Audio
                </Button>
              </div>

              {/* Current Attached Track Card */}
              {selectedAudio && (
                <div className="flex items-center justify-between p-3.5 bg-teal-50 dark:bg-teal-950/30 border border-[#0a7c85]/30 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0a7c85] text-white flex items-center justify-center font-bold">
                      <Music className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                        {selectedAudio.title}
                      </h5>
                      <p className="text-[11px] text-[#0a7c85] font-semibold">
                        {selectedAudio.artist} • {selectedAudio.mood}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedAudio(null)}
                    className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-bold rounded-full"
                  >
                    Remove
                  </Button>
                </div>
              )}

              {/* Curated Sound Library Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CURATED_AUDIO_LIBRARY.map((track) => {
                  const isSelected = selectedAudio?.id === track.id;
                  const isPlaying = previewingAudioId === track.id;

                  return (
                    <div
                      key={track.id}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                        isSelected
                          ? 'border-[#0a7c85] bg-teal-50/40 dark:bg-teal-950/20'
                          : 'border-gray-100 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => toggleAudioPreview(track)}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                            isPlaying
                              ? 'bg-[#0a7c85] text-white scale-105 shadow-md'
                              : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-200'
                          }`}
                        >
                          {isPlaying ? (
                            <Pause className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          )}
                        </button>
                        <div>
                          <h5 className="font-bold text-xs text-gray-900 dark:text-zinc-100 truncate max-w-[140px]">
                            {track.title}
                          </h5>
                          <p className="text-[10px] text-gray-500">
                            {track.artist} • {formatDuration(track.duration)}
                          </p>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant={isSelected ? 'default' : 'outline'}
                        onClick={() => setSelectedAudio(isSelected ? null : track)}
                        className={`h-7 px-3 text-xs rounded-full font-bold ${
                          isSelected
                            ? 'bg-[#0a7c85] text-white'
                            : 'border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-300'
                        }`}
                      >
                        {isSelected ? 'Added' : 'Select'}
                      </Button>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-gray-50 dark:bg-zinc-900/40 rounded-xl text-center">
                <p className="text-[11px] text-gray-400">
                  Audio tracks are optional. You can click Next to continue without music.
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: Caption, Tolees & Details */}
          {step === 4 && (
            <div className="flex-1 p-5 sm:p-6 space-y-4 overflow-y-auto">
              
              {/* User Avatar + Group Selector */}
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 border border-gray-200 dark:border-zinc-800">
                  <AvatarImage src={session?.user?.image || undefined} />
                  <AvatarFallback>{session?.user?.name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-bold text-xs sm:text-sm text-gray-900 dark:text-zinc-100">
                    {session?.user?.name}
                  </div>
                  <div className="text-[11px] text-[#0a7c85] font-semibold">
                    Posting to {selectedTolees.length} Tolee{selectedTolees.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              {/* News Headline (if news mode) */}
              {(manualCategory === 'news' || activeCategory === 'news') && (
                <div>
                  <label className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block mb-1">
                    News Headline *
                  </label>
                  <Input
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="Enter catchy and factual news headline..."
                    className="font-bold text-sm rounded-xl border-indigo-200 dark:border-indigo-900"
                  />
                </div>
              )}

              {/* Main Caption Box */}
              <div>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder={
                    manualCategory === 'requirement'
                      ? 'Describe what you are looking for (e.g. 2BHK flatmate in Koramangala, budget 15k)...'
                      : 'Write a caption, mention @friends or use #hashtags...'
                  }
                  rows={4}
                  className="w-full p-3.5 rounded-2xl bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0a7c85] resize-none"
                />
                <div className="flex items-center justify-between text-[11px] text-gray-400 mt-1 px-1">
                  <span>Hashtags & keywords help AI match your post</span>
                  <span>{caption.length}/2000</span>
                </div>
              </div>

              {/* Hashtag Quick Suggestions */}
              <div className="flex flex-wrap gap-1.5">
                {['#requirement', '#bangalore', '#reels', '#urgent', '#tech', '#trending'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setCaption((prev) => `${prev.trim()} ${tag} `)}
                    className="px-2.5 py-1 bg-gray-100 dark:bg-zinc-800 hover:bg-teal-50 dark:hover:bg-teal-950/30 text-gray-600 dark:text-zinc-300 text-[11px] font-semibold rounded-full transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Tolee Groups Selection Pill Grid */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                  Select Tolee Communities
                </label>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-1">
                  {joinedTolees.map((t) => {
                    const isChecked = selectedTolees.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() =>
                          setSelectedTolees((prev) =>
                            isChecked ? prev.filter((id) => id !== t.id) : [...prev, t.id]
                          )
                        }
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                          isChecked
                            ? 'bg-[#0a7c85] text-white shadow-sm'
                            : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-200'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        <span>{t.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Location Tagging */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="City / Area (e.g. Bangalore)"
                    className="pl-9 rounded-xl text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <Input
                    value={subLocation}
                    onChange={(e) => setSubLocation(e.target.value)}
                    placeholder="Neighborhood (e.g. Koramangala 4th Block)"
                    className="rounded-xl text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Anonymous Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4 text-[#0a7c85]" />
                  <div>
                    <span className="font-bold text-xs text-gray-800 dark:text-zinc-200 block">
                      Post Anonymously
                    </span>
                    <span className="text-[10px] text-gray-400">
                      Hide your profile name and photo from public feed
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="w-4 h-4 text-[#0a7c85] rounded cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* STEP 5: Smart AI Classification & Final Live Preview */}
          {step === 5 && (
            <div className="flex-1 p-5 sm:p-6 space-y-5 overflow-y-auto">
              
              {/* NVIDIA AI Auto-Detection Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-50 via-cyan-50 to-emerald-50 dark:from-teal-950/40 dark:via-zinc-900 dark:to-emerald-950/30 border border-teal-200 dark:border-teal-800/60 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[#0a7c85] text-white shadow-xs">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <span className="font-extrabold text-xs sm:text-sm text-teal-900 dark:text-teal-200">
                      NVIDIA AI Auto Category Detection
                    </span>
                  </div>
                  {isAnalyzingAI ? (
                    <div className="flex items-center gap-1.5 text-xs text-[#0a7c85] font-bold">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyzing...</span>
                    </div>
                  ) : (
                    <div className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-teal-500/20 text-[#0a7c85]">
                      {Math.round((detectedResult?.confidence || 0.9) * 100)}% Match
                    </div>
                  )}
                </div>

                {/* Detected Badge & Explanation */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-black/40 p-3.5 rounded-xl border border-teal-100 dark:border-teal-900/40">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                      Target Destination
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-gray-900 dark:text-white capitalize">
                        {activeCategory === 'requirement' && '🎯 Post Your Requirement'}
                        {activeCategory === 'reel' && '🎬 Tolee Reel (Feed + Reels Tab)'}
                        {activeCategory === 'news' && '📰 Tolee News Post'}
                        {activeCategory === 'regular' && '📝 Normal Community Post'}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1">
                      {detectedResult?.reason || 'Automatically classified by content context.'}
                    </p>
                  </div>

                  {/* Category Switcher Dropdown (Manual Override) */}
                  <div className="shrink-0">
                    <select
                      value={activeCategory}
                      onChange={(e) => setManualCategory(e.target.value as PostCategoryType)}
                      className="text-xs font-bold px-3 py-2 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-800 dark:text-zinc-200 cursor-pointer focus:outline-none"
                    >
                      <option value="requirement">Requirement</option>
                      <option value="regular">Normal Post</option>
                      <option value="reel">Reel</option>
                      <option value="news">Tolee News</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Live Card Preview */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2.5">
                  Live Post Preview
                </label>

                <div className="border border-gray-200 dark:border-zinc-800 rounded-2xl p-4 bg-white dark:bg-[#181818] shadow-sm max-w-lg mx-auto">
                  {/* Author Header */}
                  <div className="flex items-center gap-2.5 mb-3">
                    <Avatar className="w-9 h-9 border border-gray-100 dark:border-zinc-800">
                      <AvatarImage src={isAnonymous ? undefined : session?.user?.image || undefined} />
                      <AvatarFallback>{isAnonymous ? '?' : session?.user?.name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="font-bold text-xs text-gray-900 dark:text-zinc-100 block">
                        {isAnonymous ? 'Anonymous Member' : session?.user?.name}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {location ? `${location} • ` : ''}Just now
                      </span>
                    </div>
                  </div>

                  {/* Caption & Headline */}
                  {headline && (
                    <h4 className="font-extrabold text-sm text-gray-900 dark:text-zinc-100 mb-1.5">
                      {headline}
                    </h4>
                  )}
                  {caption && (
                    <p className="text-xs text-gray-700 dark:text-zinc-300 mb-3 whitespace-pre-wrap">
                      {caption}
                    </p>
                  )}

                  {/* Media Preview Box */}
                  {mediaList.length > 0 && (
                    <div
                      className="rounded-xl overflow-hidden bg-black flex items-center justify-center relative mb-3"
                      style={{
                        aspectRatio: selectedRatio,
                        maxHeight: '260px',
                        filter: selectedFilter,
                      }}
                    >
                      {mediaList[0].type === 'video' ? (
                        <video src={mediaList[0].url} className="w-full h-full object-cover" />
                      ) : (
                        <img src={mediaList[0].url} alt="Preview" className="w-full h-full object-cover" />
                      )}
                    </div>
                  )}

                  {/* Audio Pill Sticker */}
                  {selectedAudio && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-zinc-800/80 rounded-full w-fit mb-2">
                      <Music className="w-3.5 h-3.5 text-[#0a7c85] animate-pulse" />
                      <span className="text-[11px] font-bold text-gray-800 dark:text-zinc-200 truncate max-w-[200px]">
                        {selectedAudio.title} • {selectedAudio.artist}
                      </span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Bottom Sticky Action Button matching user mockup */}
        <div className="p-4 sm:p-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] bg-white/95 dark:bg-[#121212]/95 backdrop-blur-md border-t border-gray-100 dark:border-zinc-800 shrink-0 w-full max-w-xl mx-auto">
          {step < 5 ? (
            <Button
              onClick={handleNextStep}
              disabled={step === 1 && mediaList.length === 0 && !isTextOnly}
              className={`w-full h-14 rounded-full font-bold text-base flex items-center justify-center gap-2 transition-all duration-200 shadow-md ${
                step === 1 && mediaList.length === 0 && !isTextOnly
                  ? 'bg-[#8ec5c5] hover:bg-[#8ec5c5] text-white opacity-90 cursor-not-allowed'
                  : 'bg-[#0a7c85] hover:bg-[#086970] text-white cursor-pointer active:scale-[0.99]'
              }`}
            >
              <span>Next</span>
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </Button>
          ) : (
            <Button
              onClick={handlePublish}
              disabled={isAnalyzingAI || (!caption.trim() && mediaList.length === 0)}
              className="w-full h-14 rounded-full bg-gradient-to-r from-[#0a7c85] to-teal-500 hover:opacity-95 text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-[0.99]"
            >
              <span>Share Now</span>
              <Check className="w-5 h-5 stroke-[3]" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
