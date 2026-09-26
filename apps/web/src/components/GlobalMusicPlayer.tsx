'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Shuffle,
  Heart,
  ListMusic,
  Maximize2,
  ChevronDown,
  Film,
  Share2,
  Trash2,
  X,
  Music,
} from 'lucide-react';
import { useMusicPlayer } from '@/context/MusicPlayerContext';
import { formatDuration } from '@/lib/audioLibrary';

export function GlobalMusicPlayer() {
  const router = useRouter();
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isLooping,
    isShuffling,
    queue,
    queueIndex,
    isFullScreenOpen,
    isQueueOpen,
    likedSongIds,
    togglePlay,
    nextTrack,
    prevTrack,
    seek,
    setVolume,
    toggleMute,
    toggleLoop,
    toggleShuffle,
    removeFromQueue,
    clearQueue,
    toggleLike,
    setIsFullScreenOpen,
    setIsQueueOpen,
    playTrack,
  } = useMusicPlayer();

  if (!currentTrack) return null;

  const isLiked = likedSongIds.has(currentTrack.id);
  const artistName = currentTrack.artistName || currentTrack.artist?.name || 'Tolee Artist';
  const albumTitle = currentTrack.albumName || currentTrack.album?.title || 'Tolee Songs';
  const coverUrl = currentTrack.coverUrl || currentTrack.album?.coverUrl || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300';

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleUseInReel = () => {
    setIsFullScreenOpen(false);
    router.push(`/reels?action=create&audioId=${encodeURIComponent(currentTrack.id)}&audioTitle=${encodeURIComponent(currentTrack.title)}`);
  };

  return (
    <>
      {/* ── Mini / Bottom Sticky Player ── */}
      <div className="fixed bottom-[60px] lg:bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/90 shadow-2xl transition-all">
        {/* Mobile thin top progress indicator */}
        <div className="w-full h-1 bg-zinc-800 lg:hidden">
          <div
            style={{ width: `${progressPercent}%` }}
            className="h-full bg-gradient-to-r from-[#0a7c85] to-[#2dd4bf] transition-all duration-150"
          />
        </div>

        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          {/* Left: Track Info & Tap to Open Full Screen */}
          <div
            onClick={() => setIsFullScreenOpen(true)}
            className="flex items-center gap-3 cursor-pointer select-none min-w-0 flex-1 sm:max-w-xs"
          >
            <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 shadow-md border border-zinc-800">
              <img
                src={coverUrl}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
              {isPlaying && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-[#2dd4bf] animate-ping" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-xs sm:text-sm text-zinc-100 truncate hover:text-[#2dd4bf] transition-colors">
                {currentTrack.title}
              </h4>
              <p className="text-[11px] text-zinc-400 truncate">
                {artistName}
              </p>
            </div>
          </div>

          {/* Center: Controls & Scrubber (Desktop) */}
          <div className="hidden lg:flex flex-col items-center gap-1.5 flex-1 max-w-xl">
            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={toggleShuffle}
                className={`p-1 transition-colors ${
                  isShuffling ? 'text-[#2dd4bf]' : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Shuffle"
              >
                <Shuffle className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={prevTrack}
                className="p-1 text-zinc-400 hover:text-white transition-colors"
                title="Previous"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={togglePlay}
                className="w-9 h-9 rounded-full bg-[#2dd4bf] text-zinc-950 flex items-center justify-center font-bold hover:scale-105 active:scale-95 transition-all shadow-md shadow-[#2dd4bf]/20"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={nextTrack}
                className="p-1 text-zinc-400 hover:text-white transition-colors"
                title="Next"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={toggleLoop}
                className={`p-1 transition-colors ${
                  isLooping ? 'text-[#2dd4bf]' : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Repeat"
              >
                <Repeat className="w-4 h-4" />
              </button>
            </div>

            {/* Desktop Scrubber */}
            <div className="w-full flex items-center gap-2.5 text-[10px] text-zinc-400 font-mono">
              <span className="w-8 text-right">{formatDuration(Math.round(currentTime))}</span>
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.5}
                value={currentTime}
                onChange={(e) => seek(parseFloat(e.target.value))}
                className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#2dd4bf]"
              />
              <span className="w-8">{formatDuration(Math.round(duration))}</span>
            </div>
          </div>

          {/* Right: Actions, Volume & Mobile Play Toggle */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Mobile Quick Play/Pause */}
            <button
              type="button"
              onClick={togglePlay}
              className="lg:hidden w-9 h-9 rounded-full bg-[#2dd4bf] text-zinc-950 flex items-center justify-center font-bold active:scale-95 transition-transform shadow-md"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            {/* Like */}
            <button
              type="button"
              onClick={() => toggleLike(currentTrack.id)}
              className={`p-1.5 rounded-lg transition-colors ${
                isLiked ? 'text-rose-500' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            </button>

            {/* Queue Toggle */}
            <button
              type="button"
              onClick={() => setIsQueueOpen(!isQueueOpen)}
              className={`p-1.5 rounded-lg transition-colors ${
                isQueueOpen ? 'text-[#2dd4bf]' : 'text-zinc-400 hover:text-white'
              }`}
              title="Queue"
            >
              <ListMusic className="w-4 h-4" />
            </button>

            {/* Use in Reel Button */}
            <button
              type="button"
              onClick={handleUseInReel}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0a7c85] hover:bg-[#086b73] text-white font-bold text-xs shadow-md transition-colors"
            >
              <Film className="w-3.5 h-3.5" />
              <span>Use in Reel</span>
            </button>

            {/* Volume (Desktop) */}
            <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-zinc-800">
              <button
                type="button"
                onClick={toggleMute}
                className="text-zinc-400 hover:text-white"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-16 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#2dd4bf]"
              />
            </div>

            {/* Expand Modal Button */}
            <button
              type="button"
              onClick={() => setIsFullScreenOpen(true)}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg"
              title="Full screen player"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Full Screen Music Player Modal ── */}
      {isFullScreenOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-950/98 backdrop-blur-2xl flex flex-col justify-between p-6 sm:p-10 animate-in fade-in zoom-in-95 duration-200">
          {/* Top Bar */}
          <div className="flex items-center justify-between max-w-2xl mx-auto w-full">
            <button
              type="button"
              onClick={() => setIsFullScreenOpen(false)}
              className="p-2 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
            >
              <ChevronDown className="w-6 h-6" />
            </button>
            <div className="text-center">
              <span className="text-[10px] tracking-widest uppercase font-bold text-[#2dd4bf]">
                Playing From
              </span>
              <h5 className="text-xs font-bold text-zinc-200 truncate max-w-xs">
                {albumTitle}
              </h5>
            </div>
            <button
              type="button"
              onClick={() => setIsQueueOpen(!isQueueOpen)}
              className={`p-2 rounded-full transition-colors ${
                isQueueOpen ? 'bg-[#0a7c85] text-white' : 'bg-zinc-900/80 text-zinc-300 hover:text-white'
              }`}
            >
              <ListMusic className="w-5 h-5" />
            </button>
          </div>

          {/* Central Artwork */}
          <div className="max-w-md mx-auto w-full flex flex-col items-center my-auto py-6">
            <div className="relative aspect-square w-64 sm:w-80 rounded-3xl overflow-hidden shadow-2xl shadow-[#0a7c85]/20 border border-zinc-800 group">
              <img
                src={coverUrl}
                alt={currentTrack.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* Title & Artist & Like */}
            <div className="w-full flex items-center justify-between mt-6 px-2">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight truncate">
                  {currentTrack.title}
                </h2>
                <p className="text-sm font-semibold text-zinc-400 truncate mt-0.5">
                  {artistName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleLike(currentTrack.id)}
                className={`p-2.5 rounded-full transition-transform active:scale-125 ${
                  isLiked ? 'text-rose-500' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>

          {/* Bottom Player Controls */}
          <div className="max-w-md mx-auto w-full space-y-5">
            {/* Scrubber */}
            <div className="space-y-1">
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.5}
                value={currentTime}
                onChange={(e) => seek(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#2dd4bf]"
              />
              <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                <span>{formatDuration(Math.round(currentTime))}</span>
                <span>{formatDuration(Math.round(duration))}</span>
              </div>
            </div>

            {/* Playback Buttons */}
            <div className="flex items-center justify-between px-2">
              <button
                type="button"
                onClick={toggleShuffle}
                className={`p-2 transition-colors ${
                  isShuffling ? 'text-[#2dd4bf]' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Shuffle className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={prevTrack}
                className="p-2 text-zinc-300 hover:text-white active:scale-95 transition-transform"
              >
                <SkipBack className="w-7 h-7" />
              </button>

              <button
                type="button"
                onClick={togglePlay}
                className="w-16 h-16 rounded-full bg-[#2dd4bf] text-zinc-950 flex items-center justify-center font-bold hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#2dd4bf]/25"
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7 fill-current" />
                ) : (
                  <Play className="w-7 h-7 fill-current ml-1" />
                )}
              </button>

              <button
                type="button"
                onClick={nextTrack}
                className="p-2 text-zinc-300 hover:text-white active:scale-95 transition-transform"
              >
                <SkipForward className="w-7 h-7" />
              </button>

              <button
                type="button"
                onClick={toggleLoop}
                className={`p-2 transition-colors ${
                  isLooping ? 'text-[#2dd4bf]' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Repeat className="w-5 h-5" />
              </button>
            </div>

            {/* Actions: Use in Reel & Share */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleUseInReel}
                className="flex-1 py-3 px-4 rounded-2xl bg-[#0a7c85] hover:bg-[#086b73] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-colors"
              >
                <Film className="w-4 h-4" />
                <span>Use in Reel</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: currentTrack.title,
                      text: `Listen to ${currentTrack.title} on Tolee Songs!`,
                      url: window.location.origin + `/songs/audio/${currentTrack.id}`,
                    }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(window.location.origin + `/songs/audio/${currentTrack.id}`);
                    alert('Song link copied to clipboard!');
                  }
                }}
                className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Queue Drawer Modal ── */}
      {isQueueOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-zinc-950/98 backdrop-blur-2xl border-l border-zinc-800 p-5 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <ListMusic className="w-5 h-5 text-[#2dd4bf]" />
              <h3 className="font-extrabold text-sm text-white">Playback Queue</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                {queue.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearQueue}
                title="Clear Queue"
                className="p-1.5 text-zinc-400 hover:text-rose-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsQueueOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Queue List */}
          <div className="flex-1 overflow-y-auto py-3 space-y-2">
            {queue.map((track, idx) => {
              const isCurrent = idx === queueIndex;
              return (
                <div
                  key={`${track.id}-${idx}`}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-[#0a7c85]/20 border-[#0a7c85]/50'
                      : 'bg-zinc-900/40 hover:bg-zinc-900 border-zinc-800/60'
                  }`}
                >
                  <div
                    onClick={() => playTrack(track, queue)}
                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                  >
                    <span className="text-xs font-mono text-zinc-500 w-4 text-center">
                      {idx + 1}
                    </span>
                    <img
                      src={track.coverUrl || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=100'}
                      alt={track.title}
                      className="w-9 h-9 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <h5
                        className={`text-xs font-bold truncate ${
                          isCurrent ? 'text-[#2dd4bf]' : 'text-zinc-200'
                        }`}
                      >
                        {track.title}
                      </h5>
                      <p className="text-[10px] text-zinc-400 truncate">
                        {track.artistName || track.artist?.name || 'Tolee Artist'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFromQueue(idx)}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 transition-colors ml-2"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
