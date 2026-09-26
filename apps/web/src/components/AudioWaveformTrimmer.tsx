'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Scissors, Volume2, VolumeX } from 'lucide-react';
import { AudioTrack, formatDuration, generateWaveform } from '@/lib/audioLibrary';

interface AudioWaveformTrimmerProps {
  track: AudioTrack;
  initialClipDuration?: number; // default 15
  initialClipStart?: number; // default 0
  onTrimChange?: (clipStart: number, clipEnd: number, clipDuration: number) => void;
  className?: string;
}

export function AudioWaveformTrimmer({
  track,
  initialClipDuration = 15,
  initialClipStart = 0,
  onTrimChange,
  className = '',
}: AudioWaveformTrimmerProps) {
  const totalDuration = Math.max(5, track.duration || 60);
  const [clipDuration, setClipDuration] = useState<number>(Math.min(initialClipDuration, totalDuration));
  const [clipStart, setClipStart] = useState<number>(initialClipStart);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(initialClipStart);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [waveformBars, setWaveformBars] = useState<number[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Generate or read waveform bars
  useEffect(() => {
    if (track.waveform && track.waveform.length > 0) {
      setWaveformBars(track.waveform);
    } else {
      setWaveformBars(generateWaveform(track.id + track.title));
    }
  }, [track]);

  // Ensure clip doesn't overflow duration
  useEffect(() => {
    const maxStart = Math.max(0, totalDuration - clipDuration);
    if (clipStart > maxStart) {
      const adjusted = Math.max(0, maxStart);
      setClipStart(adjusted);
      onTrimChange?.(adjusted, adjusted + clipDuration, clipDuration);
    } else {
      onTrimChange?.(clipStart, clipStart + clipDuration, clipDuration);
    }
  }, [clipDuration, totalDuration]);

  // Audio preview loop handling
  useEffect(() => {
    const audio = new Audio(track.url);
    audio.preload = 'metadata';
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      if (!audio) return;
      setCurrentTime(audio.currentTime);

      const clipEnd = clipStart + clipDuration;
      // Loop within the trimmed segment
      if (audio.currentTime >= clipEnd || audio.currentTime < clipStart) {
        audio.currentTime = clipStart;
      }
    };

    const handleEnded = () => {
      audio.currentTime = clipStart;
      audio.play().catch(() => {});
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audioRef.current = null;
    };
  }, [track.url, clipStart, clipDuration]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.currentTime = clipStart;
      audioRef.current.muted = isMuted;
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const handleStartChange = (newStart: number) => {
    const clamped = Math.max(0, Math.min(newStart, totalDuration - clipDuration));
    setClipStart(clamped);
    if (audioRef.current) {
      audioRef.current.currentTime = clamped;
    }
    setCurrentTime(clamped);
    onTrimChange?.(clamped, clamped + clipDuration, clipDuration);
  };

  const handlePresetSelect = (durationSec: number) => {
    const dur = Math.min(durationSec, totalDuration);
    setClipDuration(dur);
    const maxStart = Math.max(0, totalDuration - dur);
    const adjustedStart = Math.min(clipStart, maxStart);
    setClipStart(adjustedStart);
    if (audioRef.current) {
      audioRef.current.currentTime = adjustedStart;
    }
    setCurrentTime(adjustedStart);
    onTrimChange?.(adjustedStart, adjustedStart + dur, dur);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const clipEnd = Math.min(totalDuration, clipStart + clipDuration);
  const startPercent = (clipStart / totalDuration) * 100;
  const widthPercent = (clipDuration / totalDuration) * 100;
  const playheadPercent = ((currentTime - clipStart) / clipDuration) * 100;

  return (
    <div className={`p-4 bg-zinc-950 text-white rounded-2xl border border-zinc-800 shadow-xl space-y-4 ${className}`}>
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#0a7c85]/20 text-[#0a7c85] flex items-center justify-center font-bold">
            <Scissors className="w-3.5 h-3.5" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
              Audio Waveform & Trimmer
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0a7c85]/20 text-[#2dd4bf] font-medium">
                Reels Ready
              </span>
            </h5>
            <p className="text-[11px] text-zinc-400">
              Cut high-energy segment for your Reel ({clipDuration}s clip)
            </p>
          </div>
        </div>

        {/* Clip Length Presets */}
        <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
          {[15, 30, 60].map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={() => handlePresetSelect(sec)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                clipDuration === sec
                  ? 'bg-[#0a7c85] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              {sec}s
            </button>
          ))}
          <button
            type="button"
            onClick={() => handlePresetSelect(totalDuration)}
            className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all ${
              clipDuration === totalDuration
                ? 'bg-[#0a7c85] text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            Full
          </button>
        </div>
      </div>

      {/* Waveform Visualization Box */}
      <div className="relative w-full h-20 bg-zinc-900/90 rounded-xl border border-zinc-800/80 px-3 py-2 flex items-center select-none overflow-hidden group">
        {/* Full Track Waveform Bars */}
        <div className="w-full h-full flex items-center justify-between gap-[2px]">
          {waveformBars.map((val, idx) => {
            const barPosPercent = (idx / waveformBars.length) * 100;
            const isInTrimWindow = barPosPercent >= startPercent && barPosPercent <= startPercent + widthPercent;

            return (
              <div
                key={idx}
                style={{ height: `${Math.round(val * 100)}%` }}
                className={`flex-1 rounded-full transition-colors ${
                  isInTrimWindow ? 'bg-[#0a7c85]' : 'bg-zinc-700/50'
                }`}
              />
            );
          })}
        </div>

        {/* Highlighted Trim Region Overlay */}
        <div
          style={{
            left: `${startPercent}%`,
            width: `${Math.min(100 - startPercent, widthPercent)}%`,
          }}
          className="absolute top-0 bottom-0 border-y-2 border-[#2dd4bf] bg-[#0a7c85]/15 pointer-events-none rounded-sm transition-[width,left] duration-75"
        >
          {/* Left Handle */}
          <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-[#2dd4bf] flex items-center justify-center shadow-md cursor-ew-resize">
            <div className="w-0.5 h-4 bg-zinc-900 rounded-full" />
          </div>
          {/* Right Handle */}
          <div className="absolute right-0 top-0 bottom-0 w-2.5 bg-[#2dd4bf] flex items-center justify-center shadow-md cursor-ew-resize">
            <div className="w-0.5 h-4 bg-zinc-900 rounded-full" />
          </div>

          {/* Playing Playhead Cursor */}
          {isPlaying && (
            <div
              style={{ left: `${Math.max(0, Math.min(100, playheadPercent))}%` }}
              className="absolute top-0 bottom-0 w-1 bg-white shadow-lg pointer-events-none"
            />
          )}
        </div>
      </div>

      {/* Scrub Slider */}
      <div className="space-y-1">
        <input
          type="range"
          min={0}
          max={Math.max(0, totalDuration - clipDuration)}
          step={0.5}
          value={clipStart}
          onChange={(e) => handleStartChange(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#2dd4bf]"
        />
        <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
          <span>Start: {formatDuration(Math.round(clipStart))}</span>
          <span className="text-zinc-200 font-bold">
            Clip: {formatDuration(Math.round(clipStart))} - {formatDuration(Math.round(clipEnd))} ({Math.round(clipDuration)}s)
          </span>
          <span>End: {formatDuration(Math.round(clipEnd))}</span>
        </div>
      </div>

      {/* Controls & Actions */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold transition-transform active:scale-95 ${
              isPlaying
                ? 'bg-[#2dd4bf] text-zinc-950 shadow-md shadow-[#2dd4bf]/20'
                : 'bg-zinc-800 text-white hover:bg-zinc-700'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => handleStartChange(0)}
            title="Reset Start"
            className="w-8 h-8 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white flex items-center justify-center"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={toggleMute}
            className="w-8 h-8 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white flex items-center justify-center"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="text-[11px] text-zinc-400 text-right">
          <p className="font-semibold text-zinc-300">
            {track.title}
          </p>
          <p className="text-[10px] text-zinc-500">{track.artist}</p>
        </div>
      </div>
    </div>
  );
}
