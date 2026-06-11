'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { X, ChevronLeft, ChevronRight, Volume2, VolumeX, Pause, Play, Send, MoreVertical, Trash2, Download, AlertTriangle, Music } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { HLSVideo } from '@/components/HLSVideo';
import { markStoryAsViewed, sendStoryReply } from '@/actions/story';
import { deleteStory } from '@/actions/highlight';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Story {
  id: string;
  mediaUrl: string;
  mediaType: string;
  createdAt: Date | string;
  expiresAt: Date | string;
  viewed: boolean;
  caption?: string | null;
  overlays?: string | null;
}

const STYLES_FILTERS = [
  { name: 'Normal', filter: 'none' },
  { name: 'Vintage', filter: 'sepia(0.5) contrast(1.1) brightness(0.95)' },
  { name: 'B&W', filter: 'grayscale(1) contrast(1.15)' },
  { name: 'Warm', filter: 'saturate(1.25) sepia(0.2) hue-rotate(-10deg)' },
  { name: 'Cool', filter: 'saturate(0.9) hue-rotate(15deg) contrast(1.05)' },
  { name: 'Vivid', filter: 'saturate(1.5) contrast(1.1)' },
  { name: 'Blurry', filter: 'blur(3px) brightness(1.05)' }
];

interface StoryGroup {
  user: {
    id: string;
    username: string;
    name: string;
    avatar: string;
  };
  stories: Story[];
  hasUnviewed: boolean;
}

interface StoryViewerProps {
  isOpen: boolean;
  onClose: () => void;
  storyGroups: StoryGroup[];
  initialGroupIndex: number;
  initialSlideId?: string;
  currentUserId?: string; // owner check — only show management controls to author
  onStoryViewed?: (storyId: string, userId: string) => void;
  onStoryDeleted?: (storyId: string, userId: string) => void; // callback after delete
}

const QUICK_EMOJIS = ['❤️', '😂', '😮', '😢', '👏', '🔥'];

export function StoryViewer({
  isOpen,
  onClose,
  storyGroups,
  initialGroupIndex,
  initialSlideId,
  currentUserId,
  onStoryViewed,
  onStoryDeleted,
}: StoryViewerProps) {
  const router = useRouter();
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [slideIndex, setSlideIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isManuallyPaused, setIsManuallyPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Reply States
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replyStatus, setReplyStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  // Owner management states
  const [showOwnerMenu, setShowOwnerMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingStory, setIsDeletingStory] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const activeGroup = storyGroups[groupIndex];
  const activeStory = activeGroup?.stories[slideIndex];
  const totalSlides = activeGroup?.stories.length || 0;
  const isOwner = !!currentUserId && !!activeGroup && currentUserId === activeGroup.user.id;

  const progressIntervalRef = useRef<any>(null);
  const durationRef = useRef<number>(5000);
  const accumulatedProgressRef = useRef<number>(0);

  // Gesture detection refs
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  // Pause when menu/confirm is open
  const isAnyDialogOpen = showOwnerMenu || showDeleteConfirm;

  useEffect(() => {
    if (isOpen) {
      setGroupIndex(initialGroupIndex);
      const group = storyGroups[initialGroupIndex];
      if (group && initialSlideId) {
        const foundIndex = group.stories.findIndex(s => s.id === initialSlideId);
        setSlideIndex(foundIndex >= 0 ? foundIndex : 0);
      } else {
        setSlideIndex(0);
      }
    }
  }, [isOpen, initialGroupIndex, initialSlideId, storyGroups]);

  useEffect(() => {
    setSlideIndex(0);
    setProgress(0);
    accumulatedProgressRef.current = 0;
    setReplyText('');
    setReplyStatus('idle');
    setIsPaused(false);
    setIsManuallyPaused(false);
    setShowOwnerMenu(false);
    setShowDeleteConfirm(false);
    setDeleteError(null);
  }, [groupIndex]);

  useEffect(() => {
    setProgress(0);
    accumulatedProgressRef.current = 0;
    setIsPaused(false);
    setIsManuallyPaused(false);
    setReplyText('');
    setReplyStatus('idle');
    setShowOwnerMenu(false);
    setShowDeleteConfirm(false);
    setDeleteError(null);

    if (activeStory?.mediaType === 'video') {
      durationRef.current = 15000;
    } else {
      durationRef.current = 5000;
    }

    if (activeStory && !activeStory.viewed) {
      markStoryAsViewed(activeStory.id).then((res) => {
        if (res.success && onStoryViewed) {
          onStoryViewed(activeStory.id, activeGroup.user.id);
        }
      });
    }
  }, [slideIndex, groupIndex, activeStory]);

  useEffect(() => {
    if (!isOpen || !activeStory) return;
    const shouldPause = isPaused || isAnyDialogOpen;

    if (shouldPause) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      return;
    }

    const intervalTime = 50;
    const step = (intervalTime / durationRef.current) * 100;

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + step;
        if (next >= 100) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
          handleNext();
          return 100;
        }
        return next;
      });
    }, intervalTime);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isOpen, activeStory, isPaused, slideIndex, groupIndex, isAnyDialogOpen]);

  if (!isOpen || !activeGroup || !activeStory) return null;

  const handleNext = () => {
    if (slideIndex < totalSlides - 1) {
      setSlideIndex(slideIndex + 1);
    } else if (groupIndex < storyGroups.length - 1) {
      setGroupIndex(groupIndex + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (slideIndex > 0) {
      setSlideIndex(slideIndex - 1);
    } else if (groupIndex > 0) {
      const prevGroup = storyGroups[groupIndex - 1];
      setGroupIndex(groupIndex - 1);
      setTimeout(() => {
        setSlideIndex(prevGroup.stories.length - 1);
      }, 50);
    } else {
      setProgress(0);
    }
  };

  const handleVideoMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (video.duration) {
      durationRef.current = Math.min(video.duration * 1000, 30000);
    }
  };

  const handleScreenClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isAnyDialogOpen) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const boundary = rect.width * 0.3;

    if (clickX < boundary) {
      handlePrev();
    } else {
      handleNext();
    }
  };

  const handleHoldStart = () => {
    if (!isAnyDialogOpen) setIsPaused(true);
  };

  const handleHoldEnd = () => {
    if (!isManuallyPaused && !isAnyDialogOpen) {
      setIsPaused(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    handleHoldStart();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    handleHoldEnd();
    if (isAnyDialogOpen) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchStartX.current - touchEndX;
    const diffY = touchStartY.current - touchEndY;

    if (diffY < -70 && Math.abs(diffY) > Math.abs(diffX)) {
      onClose();
      return;
    }

    if (Math.abs(diffX) > 60 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) {
        if (groupIndex < storyGroups.length - 1) {
          setGroupIndex(groupIndex + 1);
        } else {
          onClose();
        }
      } else {
        if (groupIndex > 0) {
          setGroupIndex(groupIndex - 1);
        }
      }
    }
  };

  const handleSendReply = async (textToSend: string) => {
    if (!textToSend.trim() || isSendingReply) return;
    setIsSendingReply(true);
    setReplyStatus('sending');
    setIsPaused(true);

    try {
      const res = await sendStoryReply(activeStory.id, activeGroup.user.id, textToSend.trim());
      if (res.success) {
        setReplyStatus('success');
        setReplyText('');
        setTimeout(() => {
          setReplyStatus('idle');
          setIsPaused(false);
        }, 1800);
      } else {
        setReplyStatus('error');
        setTimeout(() => {
          setReplyStatus('idle');
          setIsPaused(false);
        }, 2000);
      }
    } catch (err) {
      console.error(err);
      setReplyStatus('error');
      setTimeout(() => {
        setReplyStatus('idle');
        setIsPaused(false);
      }, 2000);
    } finally {
      setIsSendingReply(false);
    }
  };

  // Owner: delete the current story
  const handleDeleteStory = async () => {
    if (isDeletingStory) return;
    setIsDeletingStory(true);
    setDeleteError(null);
    try {
      const res = await deleteStory(activeStory.id);
      if (res.success) {
        setShowDeleteConfirm(false);
        setShowOwnerMenu(false);
        // Notify parent to remove this story from local state
        if (onStoryDeleted) onStoryDeleted(activeStory.id, activeGroup.user.id);
        // Move to next slide or close
        if (totalSlides > 1) {
          if (slideIndex < totalSlides - 1) {
            setSlideIndex(slideIndex); // stay at same index (list shrinks)
          } else {
            setSlideIndex(Math.max(0, slideIndex - 1));
          }
        } else if (groupIndex < storyGroups.length - 1) {
          setGroupIndex(groupIndex + 1);
        } else {
          onClose();
        }
      } else {
        setDeleteError(res.error || 'Failed to delete story');
      }
    } catch (err) {
      setDeleteError('An error occurred. Please try again.');
    } finally {
      setIsDeletingStory(false);
    }
  };

  const getStoryTime = (createdAt: Date | string) => {
    const diffMs = Date.now() - new Date(createdAt).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    return `${diffHours}h`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 dark:bg-black/98 border-none outline-none overflow-hidden select-none gap-0"
        style={{ transform: 'none', top: 0, left: 0, maxWidth: 'none', width: '100vw', height: '100vh', padding: 0 }}
      >
        <DialogTitle className="sr-only">Story Viewer - {activeGroup.user.name}</DialogTitle>

        {/* Global Dark Backdrop Dismiss */}
        <div className="absolute inset-0 cursor-default" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} />

        {/* Global Close Button (desktop) */}
        <button
          onClick={onClose}
          className="hidden md:flex absolute top-5 right-6 z-50 p-2.5 rounded-full bg-zinc-900/60 hover:bg-zinc-800/80 text-zinc-300 hover:text-white transition-all active:scale-95 border border-zinc-800/40"
        >
          <X className="w-6 h-6" />
        </button>

        {/* DESKTOP LEFT PREVIEW */}
        {groupIndex > 0 ? (
          <div
            onClick={() => setGroupIndex(groupIndex - 1)}
            className="hidden lg:flex flex-col items-center justify-center w-[160px] h-[280px] rounded-2xl bg-zinc-900/45 hover:bg-zinc-900/70 border border-zinc-800/40 shadow-xl overflow-hidden cursor-pointer p-4 mr-10 transition-all duration-300 transform hover:scale-[1.03] select-none shrink-0 relative group"
          >
            <div className="absolute inset-0 opacity-15 filter blur-md bg-cover bg-center" style={{ backgroundImage: `url(${storyGroups[groupIndex - 1].stories[0]?.mediaUrl})` }} />
            <div className="relative z-10 flex flex-col items-center text-center gap-3">
              <div className={`w-15 h-15 rounded-full flex items-center justify-center p-[2.5px] ${storyGroups[groupIndex - 1].hasUnviewed ? 'bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600' : 'border border-zinc-700'}`}>
                <div className="w-full h-full rounded-full bg-zinc-950 p-[2px] overflow-hidden">
                  <Avatar className="w-full h-full">
                    <AvatarImage src={storyGroups[groupIndex - 1].user.avatar} />
                    <AvatarFallback className="bg-zinc-800 text-white text-xs font-bold">{storyGroups[groupIndex - 1].user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                </div>
              </div>
              <span className="text-xs font-bold text-zinc-300 group-hover:text-white transition-colors truncate max-w-[120px]">
                {storyGroups[groupIndex - 1].user.username || storyGroups[groupIndex - 1].user.name}
              </span>
            </div>
          </div>
        ) : (
          <div className="hidden lg:block w-[160px] mr-10 shrink-0" />
        )}

        {/* Desktop Previous Button */}
        {groupIndex > 0 || slideIndex > 0 ? (
          <button
            onClick={handlePrev}
            className="hidden md:flex absolute left-8 xl:left-24 z-50 w-11 h-11 items-center justify-center rounded-full bg-zinc-900/50 hover:bg-zinc-850 text-white transition-all active:scale-95 border border-zinc-800/40"
          >
            <ChevronLeft className="w-5.5 h-5.5" />
          </button>
        ) : null}

        {/* CENTER STORY CARD */}
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleHoldStart}
          onMouseUp={handleHoldEnd}
          onMouseLeave={handleHoldEnd}
          className="relative w-full h-full md:w-[400px] md:h-[92vh] md:max-h-[760px] md:rounded-[2rem] overflow-hidden bg-black shadow-2xl flex flex-col z-10 md:border md:border-zinc-900"
        >
          {/* Media Tapping Zone */}
          <div
            onClick={handleScreenClick}
            className="relative flex-grow w-full h-full overflow-hidden flex items-center justify-center cursor-pointer bg-zinc-950"
          >
            {(() => {
              let parsedOverlays: any = null;
              if (activeStory?.overlays) {
                try {
                  parsedOverlays = JSON.parse(activeStory.overlays);
                } catch (e) {
                  console.error(e);
                }
              }

              const transformStyle = parsedOverlays 
                ? `scale(${parsedOverlays.scale || 1}) rotate(${parsedOverlays.rotation || 0}deg) translate(${parsedOverlays.offsetX || 0}px, ${parsedOverlays.offsetY || 0}px)`
                : undefined;

              const filterStyle = parsedOverlays
                ? STYLES_FILTERS.find(f => f.name === parsedOverlays.activeFilter)?.filter || 'none'
                : undefined;

              return (
                <>
                  {activeStory.mediaType === 'video' ? (
                    <HLSVideo
                      src={activeStory.mediaUrl}
                      isActive={isOpen && !isPaused && storyGroups[groupIndex] === activeGroup}
                      shouldLoad={isOpen}
                      onLoadedMetadata={handleVideoMetadata}
                      className="w-full h-full object-cover pointer-events-none transition-all"
                      style={{ transform: transformStyle, filter: filterStyle }}
                      muted={isMuted}
                      playsInline
                      loop={false}
                    />
                  ) : (
                    <img
                      src={activeStory.mediaUrl}
                      alt=""
                      className="w-full h-full object-cover pointer-events-none transition-all"
                      style={{ transform: transformStyle, filter: filterStyle }}
                      draggable={false}
                    />
                  )}

                  {/* Render Custom Draggable Floating elements */}
                  {parsedOverlays?.elements && parsedOverlays.elements.length > 0 && (
                    <div className="absolute inset-0 z-10 pointer-events-none select-none overflow-hidden">
                      {parsedOverlays.elements.map((el: any) => (
                        <div
                          key={el.id}
                          className="absolute pointer-events-none select-none whitespace-nowrap"
                          style={{
                            left: `${el.x}%`,
                            top: `${el.y}%`,
                            transform: `translate(-50%, -50%) rotate(${el.rotation || 0}deg) scale(${el.size || 1})`,
                            transformOrigin: 'center center'
                          }}
                        >
                          {/* Text widget */}
                          {el.type === 'text' && el.text && (
                            <span 
                              className={`block px-3 py-1.5 rounded-2xl text-center whitespace-pre-wrap leading-normal font-black text-xl tracking-tight ${
                                el.highlight 
                                  ? el.color === '#FFFFFF' ? 'bg-black text-white' : 'bg-white text-black' 
                                  : 'text-shadow-heavy'
                              } ${el.font}`}
                              style={{ color: el.highlight ? undefined : el.color }}
                            >
                              {el.text}
                            </span>
                          )}

                          {/* Emoji widget */}
                          {el.type === 'emoji' && el.emoji && (
                            <span className="block text-5xl filter drop-shadow-md">{el.emoji}</span>
                          )}

                          {/* Sticker widget */}
                          {el.type === 'sticker' && el.text && (
                            <span className={`block px-4 py-2 rounded-2xl border-2 text-sm font-black tracking-tight shadow-md ${
                              el.stickerType === 'location' 
                                ? 'bg-zinc-100/90 text-zinc-900 border-zinc-200' 
                                : 'bg-indigo-600/95 text-white border-indigo-400'
                            }`}>
                              {el.text}
                            </span>
                          )}

                          {/* Music widget */}
                          {el.type === 'music' && el.songTitle && (
                            <div className="flex items-center gap-2.5 px-4 py-2 bg-black/75 text-white rounded-2xl border border-white/20 shadow-lg">
                              <Music className="w-4 h-4 text-indigo-400 animate-bounce" />
                              <div className="flex flex-col max-w-[120px]">
                                <span className="text-xs font-black truncate">{el.songTitle}</span>
                                <span className="text-[9px] text-zinc-400 truncate">{el.artist}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Top Overlays */}
          <div className="absolute inset-x-0 top-0 pt-3.5 pb-10 px-4 bg-gradient-to-b from-black/85 via-black/35 to-transparent flex flex-col gap-3.5 z-20 pointer-events-none">
            {/* Progress Bars */}
            <div
              className="flex gap-1.5 w-full pointer-events-auto"
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              {activeGroup.stories.map((s, idx) => {
                let segmentProgress = 0;
                if (idx < slideIndex) segmentProgress = 100;
                else if (idx === slideIndex) segmentProgress = progress;

                return (
                  <div key={s.id} className="h-[2px] flex-grow rounded-full bg-white/25 overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-75 ease-linear"
                      style={{ width: `${segmentProgress}%` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Profile Header */}
            <div
              className="flex items-center justify-between pointer-events-auto"
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              <Link
                href={`/u/${activeGroup.user.username}`}
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="flex items-center gap-2.5 group cursor-pointer"
              >
                <Avatar className="w-8.5 h-8.5 border border-white/20 transition-transform group-hover:scale-105">
                  <AvatarImage src={activeGroup.user.avatar} />
                  <AvatarFallback className="text-xs bg-zinc-800 text-white font-black">
                    {activeGroup.user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold text-white hover:underline leading-tight">
                    {activeGroup.user.username || activeGroup.user.name}
                  </span>
                  <span className="text-[10px] text-zinc-300 leading-none mt-0.5">
                    {getStoryTime(activeStory.createdAt)}
                  </span>
                </div>
              </Link>

              {/* Controls Row */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Play/Pause */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newManual = !isManuallyPaused;
                    setIsManuallyPaused(newManual);
                    setIsPaused(newManual);
                  }}
                  className="p-2 rounded-full bg-black/25 hover:bg-black/55 text-white transition-all active:scale-95 flex items-center justify-center backdrop-blur-sm"
                  aria-label={isPaused ? 'Play story' : 'Pause story'}
                >
                  {isPaused ? <Play className="w-4 h-4 fill-white" /> : <Pause className="w-4 h-4 fill-white" />}
                </button>

                {/* Sound (videos only) */}
                {activeStory.mediaType === 'video' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                    className="p-2 rounded-full bg-black/25 hover:bg-black/55 text-white transition-all active:scale-95 flex items-center justify-center backdrop-blur-sm"
                    aria-label={isMuted ? 'Unmute story' : 'Mute story'}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                )}

                {/* Owner: 3-dot menu */}
                {isOwner && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowOwnerMenu(true);
                      setIsPaused(true);
                    }}
                    className="p-2 rounded-full bg-black/25 hover:bg-black/55 text-white transition-all active:scale-95 flex items-center justify-center backdrop-blur-sm"
                    aria-label="Story options"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                )}

                {/* Mobile Close */}
                <button
                  onClick={(e) => { e.stopPropagation(); onClose(); }}
                  className="md:hidden p-2 rounded-full bg-black/25 hover:bg-black/55 text-white transition-all active:scale-95 flex items-center justify-center backdrop-blur-sm"
                  aria-label="Close story viewer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Caption Overlay */}
          {activeStory.caption && (
            <div 
              className="absolute bottom-28 inset-x-0 p-3 mx-4 text-center z-15 bg-black/65 backdrop-blur-sm rounded-2xl border border-white/10"
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              <p className="text-white text-xs font-bold whitespace-pre-wrap select-text leading-relaxed tracking-tight">{activeStory.caption}</p>
            </div>
          )}

          {/* Bottom Overlays — Reply / Quick Emojis (only for other users' stories) */}
          {!isOwner && (
            <div
              className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col gap-3.5 z-20"
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              {/* Quick Emojis */}
              <div className="flex items-center justify-around px-2 text-xl select-none">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={(e) => { e.stopPropagation(); handleSendReply(emoji); }}
                    className="transition-transform duration-100 hover:scale-130 active:scale-95 cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Reply Input */}
              <div className="flex items-center gap-2 w-full">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onFocus={() => setIsPaused(true)}
                  onBlur={() => { if (!isManuallyPaused) setIsPaused(false); }}
                  placeholder={`Reply to ${activeGroup.user.username}...`}
                  className="flex-grow bg-white/10 focus:bg-white/20 text-white text-xs placeholder-zinc-400 font-semibold px-4 py-3 rounded-full border border-white/10 outline-none focus:ring-1 focus:ring-white/30 transition-all"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendReply(replyText); }}
                />
                <button
                  disabled={!replyText.trim() || isSendingReply}
                  onClick={() => handleSendReply(replyText)}
                  className="w-10 h-10 bg-white/10 hover:bg-white text-white hover:text-black rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-40 disabled:hover:bg-white/10 disabled:hover:text-white flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              {replyStatus === 'sending' && <span className="text-[10px] font-bold text-zinc-300 text-center animate-pulse">Sending reply...</span>}
              {replyStatus === 'success' && <span className="text-[10px] font-bold text-green-400 text-center">Reply sent successfully! ✓</span>}
              {replyStatus === 'error' && <span className="text-[10px] font-bold text-red-400 text-center">Failed to send reply. Please try again.</span>}
            </div>
          )}

          {/* Owner Bottom Bar — Download */}
          {isOwner && (
            <div
              className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-center gap-4 z-20"
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              <a
                href={activeStory.mediaUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold backdrop-blur-sm border border-white/10 transition-all active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                Save Story
              </a>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(true);
                  setIsPaused(true);
                  setShowOwnerMenu(false);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-400 hover:text-red-300 text-xs font-bold backdrop-blur-sm border border-red-500/20 transition-all active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Story
              </button>
            </div>
          )}

          {/* ── OWNER MENU BOTTOM SHEET ── */}
          {showOwnerMenu && (
            <div
              className="absolute inset-0 z-30 flex flex-col justify-end"
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              {/* Scrim */}
              <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => {
                  setShowOwnerMenu(false);
                  if (!isManuallyPaused) setIsPaused(false);
                }}
              />
              {/* Sheet */}
              <div className="relative z-10 bg-zinc-900 rounded-t-3xl border-t border-zinc-700/50 p-2 pb-8 animate-in slide-in-from-bottom duration-200">
                {/* Handle */}
                <div className="w-10 h-1 rounded-full bg-zinc-600 mx-auto mb-4 mt-2" />

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowOwnerMenu(false);
                    setShowDeleteConfirm(true);
                  }}
                  className="w-full flex items-center gap-3.5 px-5 py-4 rounded-2xl hover:bg-red-500/10 active:bg-red-500/20 transition-colors text-red-400 group"
                >
                  <div className="w-9 h-9 rounded-full bg-red-500/15 group-hover:bg-red-500/25 flex items-center justify-center transition-colors">
                    <Trash2 className="w-4.5 h-4.5" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold">Delete Story</div>
                    <div className="text-[11px] text-red-400/70">This cannot be undone</div>
                  </div>
                </button>

                <a
                  href={activeStory.mediaUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => { e.stopPropagation(); setShowOwnerMenu(false); if (!isManuallyPaused) setIsPaused(false); }}
                  className="w-full flex items-center gap-3.5 px-5 py-4 rounded-2xl hover:bg-white/5 active:bg-white/10 transition-colors text-white group"
                >
                  <div className="w-9 h-9 rounded-full bg-white/10 group-hover:bg-white/15 flex items-center justify-center transition-colors">
                    <Download className="w-4.5 h-4.5" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold">Save to Device</div>
                    <div className="text-[11px] text-zinc-400">Download this story</div>
                  </div>
                </a>

                <button
                  onClick={() => {
                    setShowOwnerMenu(false);
                    if (!isManuallyPaused) setIsPaused(false);
                  }}
                  className="w-full mt-1 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-750 text-zinc-400 text-sm font-bold transition-colors active:scale-[0.98]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── DELETE CONFIRMATION DIALOG ── */}
          {showDeleteConfirm && (
            <div
              className="absolute inset-0 z-30 flex items-center justify-center p-6"
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              {/* Scrim */}
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
              {/* Card */}
              <div className="relative z-10 bg-zinc-900 rounded-3xl border border-zinc-700/50 p-6 w-full max-w-[320px] shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-red-500/15 flex items-center justify-center">
                    <AlertTriangle className="w-7 h-7 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white mb-1">Delete this story?</h3>
                    <p className="text-[12px] text-zinc-400 leading-relaxed">
                      This story will be permanently deleted from your profile and all highlights. This action cannot be undone.
                    </p>
                  </div>

                  {deleteError && (
                    <p className="text-[11px] text-red-400 font-semibold bg-red-500/10 rounded-xl px-3 py-2 w-full text-center">
                      {deleteError}
                    </p>
                  )}

                  <div className="flex gap-2.5 w-full">
                    <button
                      disabled={isDeletingStory}
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteError(null);
                        if (!isManuallyPaused) setIsPaused(false);
                      }}
                      className="flex-1 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold transition-all active:scale-[0.97] disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={isDeletingStory}
                      onClick={handleDeleteStory}
                      className="flex-1 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-sm font-black transition-all active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-1.5"
                    >
                      {isDeletingStory ? (
                        <>
                          <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Next Button */}
        {groupIndex < storyGroups.length - 1 || slideIndex < totalSlides - 1 ? (
          <button
            onClick={handleNext}
            className="hidden md:flex absolute right-8 xl:right-24 z-50 w-11 h-11 items-center justify-center rounded-full bg-zinc-900/50 hover:bg-zinc-850 text-white transition-all active:scale-95 border border-zinc-800/40"
          >
            <ChevronRight className="w-5.5 h-5.5" />
          </button>
        ) : null}

        {/* DESKTOP RIGHT PREVIEW */}
        {groupIndex < storyGroups.length - 1 ? (
          <div
            onClick={() => setGroupIndex(groupIndex + 1)}
            className="hidden lg:flex flex-col items-center justify-center w-[160px] h-[280px] rounded-2xl bg-zinc-900/45 hover:bg-zinc-900/70 border border-zinc-800/40 shadow-xl overflow-hidden cursor-pointer p-4 ml-10 transition-all duration-300 transform hover:scale-[1.03] select-none shrink-0 relative group"
          >
            <div className="absolute inset-0 opacity-15 filter blur-md bg-cover bg-center" style={{ backgroundImage: `url(${storyGroups[groupIndex + 1].stories[0]?.mediaUrl})` }} />
            <div className="relative z-10 flex flex-col items-center text-center gap-3">
              <div className={`w-15 h-15 rounded-full flex items-center justify-center p-[2.5px] ${storyGroups[groupIndex + 1].hasUnviewed ? 'bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600' : 'border border-zinc-700'}`}>
                <div className="w-full h-full rounded-full bg-zinc-950 p-[2px] overflow-hidden">
                  <Avatar className="w-full h-full">
                    <AvatarImage src={storyGroups[groupIndex + 1].user.avatar} />
                    <AvatarFallback className="bg-zinc-800 text-white text-xs font-bold">{storyGroups[groupIndex + 1].user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                </div>
              </div>
              <span className="text-xs font-bold text-zinc-300 group-hover:text-white transition-colors truncate max-w-[120px]">
                {storyGroups[groupIndex + 1].user.username || storyGroups[groupIndex + 1].user.name}
              </span>
            </div>
          </div>
        ) : (
          <div className="hidden lg:block w-[160px] ml-10 shrink-0" />
        )}

      </DialogContent>
    </Dialog>
  );
}
