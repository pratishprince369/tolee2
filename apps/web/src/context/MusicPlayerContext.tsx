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
  const isLoopingRef = useRef<boolean>(false);
  const queueRef = useRef<MusicTrack[]>([]);
  const queueIndexRef = useRef<number>(0);
  const isShufflingRef = useRef<boolean>(false);

  // Sync refs to avoid stale closures in audio event listeners
  useEffect(() => {
    isLoopingRef.current = isLooping;
  }, [isLooping]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    queueIndexRef.current = queueIndex;
  }, [queueIndex]);

  useEffect(() => {
    isShufflingRef.current = isShuffling;
  }, [isShuffling]);

  const playAudioInternal = useCallback((audio: HTMLAudioElement) => {
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.warn('[Tolee Music Player] playPromise caught:', err?.message || err);
          setIsPlaying(false);
        });
    }
  }, []);

  const handleNextTrack = useCallback(() => {
    const q = queueRef.current;
    const qIdx = queueIndexRef.current;
    if (q.length === 0) return;

    let nextIdx = 0;
    if (isShufflingRef.current && q.length > 1) {
      do {
        nextIdx = Math.floor(Math.random() * q.length);
      } while (nextIdx === qIdx);
    } else {
      nextIdx = (qIdx + 1) % q.length;
    }

    const nextSong = q[nextIdx];
    if (nextSong) {
      setQueueIndex(nextIdx);
      queueIndexRef.current = nextIdx;
      setCurrentTrack(nextSong);
      setIsPlaying(true);

      const audio = audioRef.current;
      if (audio) {
        audio.src = nextSong.audioUrl;
        audio.currentTime = 0;
        playAudioInternal(audio);
      }
    }
  }, [playAudioInternal]);

  const handlePrevTrack = useCallback(() => {
    const q = queueRef.current;
    const qIdx = queueIndexRef.current;
    if (q.length === 0) return;

    const audio = audioRef.current;
    // If playing for more than 3s, restart current track
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      playAudioInternal(audio);
      return;
    }

    const prevIdx = (qIdx - 1 + q.length) % q.length;
    const prevSong = q[prevIdx];
    if (prevSong) {
      setQueueIndex(prevIdx);
      queueIndexRef.current = prevIdx;
      setCurrentTrack(prevSong);
      setIsPlaying(true);

      if (audio) {
        audio.src = prevSong.audioUrl;
        audio.currentTime = 0;
        playAudioInternal(audio);
      }
    }
  }, [playAudioInternal]);

  // Initialize Singleton Audio Object & Native MediaSession
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      if (isLoopingRef.current) {
        audio.currentTime = 0;
        playAudioInternal(audio);
      } else {
        handleNextTrack();
      }
    };

    const handleError = (e: any) => {
      console.warn('[Tolee Music Player] Audio element error:', e);
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => togglePlay());
      navigator.mediaSession.setActionHandler('pause', () => togglePlay());
      navigator.mediaSession.setActionHandler('nexttrack', () => handleNextTrack());
      navigator.mediaSession.setActionHandler('previoustrack', () => handlePrevTrack());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          audio.currentTime = details.seekTime;
          setCurrentTime(details.seekTime);
        }
      });
    }

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audioRef.current = null;
    };
  }, [handleNextTrack, handlePrevTrack, playAudioInternal]);

  // Update MediaSession and DB play count when currentTrack changes
  useEffect(() => {
    if (!currentTrack) return;

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

    recordSongPlayAction(currentTrack.id, 0).catch(() => {});
  }, [currentTrack]);

  const playTrack = useCallback(
    (track: MusicTrack, newQueue?: MusicTrack[]) => {
      setCurrentTrack(track);
      setIsPlaying(true);

      if (newQueue && newQueue.length > 0) {
        setQueue(newQueue);
        queueRef.current = newQueue;
        const idx = newQueue.findIndex((t) => t.id === track.id);
        const resolvedIdx = idx !== -1 ? idx : 0;
        setQueueIndex(resolvedIdx);
        queueIndexRef.current = resolvedIdx;
      } else {
        setQueue((prev) => {
          const exists = prev.some((t) => t.id === track.id);
          const updated = exists ? prev : [...prev, track];
          queueRef.current = updated;
          return updated;
        });
      }

      const audio = audioRef.current;
      if (audio) {
        // Resolve URL path
        const targetSrc = track.audioUrl.startsWith('http')
          ? track.audioUrl
          : `${window.location.origin}${track.audioUrl.startsWith('/') ? '' : '/'}${track.audioUrl}`;

        if (audio.src !== targetSrc) {
          audio.src = targetSrc;
          audio.currentTime = 0;
        }
        audio.volume = isMuted ? 0 : volume;
        playAudioInternal(audio);
      }
    },
    [isMuted, volume, playAudioInternal]
  );

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.paused) {
      audio.pause();
      setIsPlaying(false);
    } else {
      if (currentTrack) {
        if (!audio.src || audio.src === '' || audio.src === window.location.href) {
          const targetSrc = currentTrack.audioUrl.startsWith('http')
            ? currentTrack.audioUrl
            : `${window.location.origin}${currentTrack.audioUrl.startsWith('/') ? '' : '/'}${currentTrack.audioUrl}`;
          audio.src = targetSrc;
        }
        playAudioInternal(audio);
      }
    }
  }, [currentTrack, playAudioInternal]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = seconds;
    setCurrentTime(seconds);
  }, []);

  const setVolume = useCallback(
    (newVol: number) => {
      const clamped = Math.max(0, Math.min(1, newVol));
      setVolumeState(clamped);
      if (audioRef.current) {
        audioRef.current.volume = clamped;
      }
      if (clamped > 0 && isMuted) {
        setIsMuted(false);
      }
    },
    [isMuted]
  );

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
    setIsLooping((prev) => {
      const next = !prev;
      isLoopingRef.current = next;
      if (audioRef.current) {
        audioRef.current.loop = next;
      }
      return next;
    });
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffling((prev) => {
      const next = !prev;
      isShufflingRef.current = next;
      return next;
    });
  }, []);

  const addToQueue = useCallback((track: MusicTrack) => {
    setQueue((prev) => {
      const updated = [...prev, track];
      queueRef.current = updated;
      return updated;
    });
  }, []);

  const playNext = useCallback((track: MusicTrack) => {
    setQueue((prev) => {
      const next = [...prev];
      next.splice(queueIndexRef.current + 1, 0, track);
      queueRef.current = next;
      return next;
    });
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      queueRef.current = updated;
      return updated;
    });
    if (index < queueIndexRef.current) {
      setQueueIndex((prev) => {
        const nextIdx = Math.max(0, prev - 1);
        queueIndexRef.current = nextIdx;
        return nextIdx;
      });
    }
  }, []);

  const clearQueue = useCallback(() => {
    if (currentTrack) {
      setQueue([currentTrack]);
      queueRef.current = [currentTrack];
      setQueueIndex(0);
      queueIndexRef.current = 0;
    } else {
      setQueue([]);
      queueRef.current = [];
      setQueueIndex(0);
      queueIndexRef.current = 0;
    }
  }, [currentTrack]);

  const toggleLike = useCallback(async (trackId: string): Promise<boolean> => {
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
