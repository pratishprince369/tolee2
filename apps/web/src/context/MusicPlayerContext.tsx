'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { recordSongPlayAction, toggleSongLikeAction } from '@/actions/songs';

export interface MusicTrack {
  id: string;
  title: string;
  artistId?: string;
  artistName?: string;
  artist?: { id: string; name: string };
  albumId?: string | null;
  albumName?: string | null;
  album?: { id: string; title: string; coverUrl?: string | null } | null;
  coverUrl?: string | null;
  audioUrl: string;
  duration: number; // in seconds
  genre?: string;
  language?: string;
  waveform?: string | null;
}

interface MusicPlayerContextType {
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isLooping: boolean;
  isShuffling: boolean;
  queue: MusicTrack[];
  queueIndex: number;
  isFullScreenOpen: boolean;
  isQueueOpen: boolean;
  likedSongIds: Set<string>;
  playTrack: (track: MusicTrack, newQueue?: MusicTrack[]) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleLoop: () => void;
  toggleShuffle: () => void;
  addToQueue: (track: MusicTrack) => void;
  playNext: (track: MusicTrack) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  toggleLike: (trackId: string) => Promise<boolean>;
  setIsFullScreenOpen: (open: boolean) => void;
  setIsQueueOpen: (open: boolean) => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | null>(null);

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [isShuffling, setIsShuffling] = useState<boolean>(false);
  const [queue, setQueue] = useState<MusicTrack[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(0);
  const [isFullScreenOpen, setIsFullScreenOpen] = useState<boolean>(false);
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(false);
  const [likedSongIds, setLikedSongIds] = useState<Set<string>>(new Set());

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Audio Object & MediaSession
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || currentTrack?.duration || 0);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      if (isLooping) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        handleNextTrack();
      }
    };

    const handleError = (e: any) => {
      console.warn('[Tolee Music Player] Playback error on audio stream:', e);
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    // Setup native MediaSession action handlers (Headphone / Lock screen controls)
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => togglePlay());
      navigator.mediaSession.setActionHandler('pause', () => togglePlay());
      navigator.mediaSession.setActionHandler('nexttrack', () => handleNextTrack());
      navigator.mediaSession.setActionHandler('previoustrack', () => handlePrevTrack());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) seek(details.seekTime);
      });
    }

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audioRef.current = null;
    };
  }, [isLooping]);

  // Sync current track with audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (audio.src !== currentTrack.audioUrl) {
      audio.src = currentTrack.audioUrl;
      audio.load();
    }
    audio.volume = isMuted ? 0 : volume;

    if (isPlaying) {
      audio.play().catch((err) => {
        console.warn('[Music Player] Autoplay prevented or failed:', err);
        setIsPlaying(false);
      });
    }

    // Update MediaSession metadata
    if ('mediaSession' in navigator) {
      const artistName = currentTrack.artistName || currentTrack.artist?.name || 'Tolee Artist';
      const albumTitle = currentTrack.albumName || currentTrack.album?.title || 'Tolee Songs';
      const coverUrl = currentTrack.coverUrl || currentTrack.album?.coverUrl || '/logo.png';

      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: artistName,
        album: albumTitle,
        artwork: [{ src: coverUrl, sizes: '512x512', type: 'image/jpeg' }],
      });
    }

    // Record song play in database (async, debounced)
    recordSongPlayAction(currentTrack.id, 0).catch(() => {});
  }, [currentTrack]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  }, [isPlaying, currentTrack]);

  const playTrack = useCallback((track: MusicTrack, newQueue?: MusicTrack[]) => {
    setCurrentTrack(track);
    setIsPlaying(true);

    if (newQueue && newQueue.length > 0) {
      setQueue(newQueue);
      const idx = newQueue.findIndex((t) => t.id === track.id);
      setQueueIndex(idx !== -1 ? idx : 0);
    } else {
      // If not provided, add to current queue if not present
      setQueue((prev) => {
        const exists = prev.some((t) => t.id === track.id);
        if (!exists) return [...prev, track];
        return prev;
      });
    }
  }, []);

  const handleNextTrack = useCallback(() => {
    if (queue.length === 0) return;

    if (isShuffling) {
      const randomIdx = Math.floor(Math.random() * queue.length);
      setQueueIndex(randomIdx);
      setCurrentTrack(queue[randomIdx]);
      setIsPlaying(true);
      return;
    }

    const nextIdx = (queueIndex + 1) % queue.length;
    setQueueIndex(nextIdx);
    setCurrentTrack(queue[nextIdx]);
    setIsPlaying(true);
  }, [queue, queueIndex, isShuffling]);

  const handlePrevTrack = useCallback(() => {
    if (queue.length === 0) return;

    const prevIdx = (queueIndex - 1 + queue.length) % queue.length;
    setQueueIndex(prevIdx);
    setCurrentTrack(queue[prevIdx]);
    setIsPlaying(true);
  }, [queue, queueIndex]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = seconds;
    setCurrentTime(seconds);
  }, []);

  const setVolume = useCallback((newVol: number) => {
    const clamped = Math.max(0, Math.min(1, newVol));
    setVolumeState(clamped);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
    if (clamped > 0 && isMuted) {
      setIsMuted(false);
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      audio.muted = false;
      audio.volume = volume;
      setIsMuted(false);
    } else {
      audio.muted = true;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  const toggleLoop = useCallback(() => {
    setIsLooping((prev) => !prev);
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffling((prev) => !prev);
  }, []);

  const addToQueue = useCallback((track: MusicTrack) => {
    setQueue((prev) => [...prev, track]);
  }, []);

  const playNext = useCallback((track: MusicTrack) => {
    setQueue((prev) => {
      const next = [...prev];
      next.splice(queueIndex + 1, 0, track);
      return next;
    });
  }, [queueIndex]);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
    if (index < queueIndex) {
      setQueueIndex((prev) => Math.max(0, prev - 1));
    }
  }, [queueIndex]);

  const clearQueue = useCallback(() => {
    if (currentTrack) {
      setQueue([currentTrack]);
      setQueueIndex(0);
    } else {
      setQueue([]);
      setQueueIndex(0);
    }
  }, [currentTrack]);

  const toggleLike = useCallback(async (trackId: string): Promise<boolean> => {
    // Optimistic update
    let nowLiked = false;
    setLikedSongIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) {
        next.delete(trackId);
        nowLiked = false;
      } else {
        next.add(trackId);
        nowLiked = true;
      }
      return next;
    });

    try {
      const res = await toggleSongLikeAction(trackId);
      if (!res.success) {
        // Rollback
        setLikedSongIds((prev) => {
          const next = new Set(prev);
          if (nowLiked) next.delete(trackId);
          else next.add(trackId);
          return next;
        });
        return !nowLiked;
      }
      return res.liked;
    } catch {
      return nowLiked;
    }
  }, []);

  return (
    <MusicPlayerContext.Provider
      value={{
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
        playTrack,
        togglePlay,
        nextTrack: handleNextTrack,
        prevTrack: handlePrevTrack,
        seek,
        setVolume,
        toggleMute,
        toggleLoop,
        toggleShuffle,
        addToQueue,
        playNext,
        removeFromQueue,
        clearQueue,
        toggleLike,
        setIsFullScreenOpen,
        setIsQueueOpen,
      }}
    >
      {children}
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error('useMusicPlayer must be used within a MusicPlayerProvider');
  }
  return context;
}
