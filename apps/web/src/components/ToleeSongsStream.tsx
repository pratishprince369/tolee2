'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Search,
  Music,
  Disc,
  Film,
  Sparkles,
  Scissors,
  Share2,
  Heart,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import {
  AudioTrack,
  Album,
  CURATED_AUDIO_LIBRARY,
  TOLEE_ALBUMS,
  formatDuration,
  searchMusic,
} from '@/lib/audioLibrary';
import { AudioWaveformTrimmer } from '@/components/AudioWaveformTrimmer';

export function ToleeSongsStream() {
  const router = useRouter();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [filteredTracks, setFilteredTracks] = useState<AudioTrack[]>(CURATED_AUDIO_LIBRARY);
  const [currentTrack, setCurrentTrack] = useState<AudioTrack>(CURATED_AUDIO_LIBRARY[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [likedTrackIds, setLikedTrackIds] = useState<Set<string>>(new Set(['lofi-chill-1']));
  const [trimmerTrack, setTrimmerTrack] = useState<AudioTrack | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const genres = ['All', 'Trending', 'Bollywood', 'Lo-Fi', 'Punjabi', 'Devotional', 'Indie', 'Party'];

  // Handle Search & Filter
  useEffect(() => {
    searchMusic(searchQuery, selectedGenre).then((results) => {
      setFilteredTracks(results);
    });
  }, [searchQuery, selectedGenre]);

  // Audio element management
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(currentTrack.url);
    } else {
      audioRef.current.src = currentTrack.url;
    }

    const audio = audioRef.current;
    audio.volume = isMuted ? 0 : volume;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || currentTrack.duration);
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

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    }

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrack]);

  // Handle Play/Pause
  const togglePlay = (track?: AudioTrack) => {
    if (track && track.id !== currentTrack.id) {
      setCurrentTrack(track);
      setIsPlaying(true);
      if (audioRef.current) {
        audioRef.current.src = track.url;
        audioRef.current.play().catch(() => setIsPlaying(false));
      }
      return;
    }

    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const handleNextTrack = () => {
    const list = filteredTracks.length > 0 ? filteredTracks : CURATED_AUDIO_LIBRARY;
    if (isShuffling) {
      const randomIndex = Math.floor(Math.random() * list.length);
      setCurrentTrack(list[randomIndex]);
      return;
    }
    const currentIndex = list.findIndex((t) => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % list.length;
    setCurrentTrack(list[nextIndex]);
  };

  const handlePrevTrack = () => {
    const list = filteredTracks.length > 0 ? filteredTracks : CURATED_AUDIO_LIBRARY;
    const currentIndex = list.findIndex((t) => t.id === currentTrack.id);
    const prevIndex = (currentIndex - 1 + list.length) % list.length;
    setCurrentTrack(list[prevIndex]);
  };

  const handleSeek = (newTime: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
    }
    if (newVol > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.muted = false;
      audioRef.current.volume = volume;
      setIsMuted(false);
    } else {
      audioRef.current.muted = true;
      setIsMuted(true);
    }
  };

  const toggleLike = (id: string) => {
    setLikedTrackIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleUseInReel = (track: AudioTrack) => {
    // Navigate to Reels with preloaded audio parameter or trigger creation
    router.push(`/reels?action=create&audioId=${encodeURIComponent(track.id)}&audioTitle=${encodeURIComponent(track.title)}`);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-36 font-sans">
      {/* Top Header / Search */}
      <div className="sticky top-16 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-900 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0a7c85] to-[#2dd4bf] flex items-center justify-center shadow-lg shadow-[#0a7c85]/20">
              <Disc className="w-6 h-6 text-white animate-[spin_6s_linear_infinite]" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-[#2dd4bf] bg-clip-text text-transparent flex items-center gap-2">
                Tolee Songs
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0a7c85]/20 text-[#2dd4bf] border border-[#0a7c85]/30">
                  Spotify & Nuclear Mode
                </span>
              </h1>
              <p className="text-xs text-zinc-400">
                Stream albums, explore viral hits & trim sound clips for Reels
              </p>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search songs, albums, artists, moods..."
              className="w-full bg-zinc-900/90 border border-zinc-800 rounded-full pl-10 pr-4 py-2 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#2dd4bf] transition-colors"
            />
          </div>
        </div>

        {/* Genre Filter Pills */}
        <div className="max-w-7xl mx-auto flex items-center gap-2 mt-4 overflow-x-auto no-scrollbar pb-1">
          {genres.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setSelectedGenre(g)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedGenre === g
                  ? 'bg-[#0a7c85] text-white shadow-md shadow-[#0a7c85]/30'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800/80'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-10">
        {/* Hero Banner: Featured Album */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#073b3e] via-[#094d52] to-zinc-900 border border-[#0a7c85]/30 p-6 sm:p-10 shadow-2xl">
          <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#2dd4bf] via-transparent to-transparent blur-2xl" />

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div className="relative group w-48 h-48 sm:w-56 sm:h-56 rounded-2xl overflow-hidden shadow-2xl border border-white/10 shrink-0">
              <img
                src={TOLEE_ALBUMS[0].coverUrl}
                alt={TOLEE_ALBUMS[0].title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => togglePlay(TOLEE_ALBUMS[0].tracks[0])}
                  className="w-14 h-14 rounded-full bg-[#2dd4bf] text-zinc-950 flex items-center justify-center shadow-xl hover:scale-110 transition-transform"
                >
                  <Play className="w-6 h-6 fill-current ml-1" />
                </button>
              </div>
            </div>

            <div className="space-y-3 text-center md:text-left flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs text-[#2dd4bf] font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                Trending Album of the Week
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
                {TOLEE_ALBUMS[0].title}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 max-w-xl">
                {TOLEE_ALBUMS[0].description}
              </p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => togglePlay(TOLEE_ALBUMS[0].tracks[0])}
                  className="px-6 py-2.5 rounded-full bg-[#2dd4bf] text-zinc-950 font-bold text-xs sm:text-sm flex items-center gap-2 hover:bg-[#5eead4] transition-colors shadow-lg shadow-[#2dd4bf]/20"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Play Album
                </button>
                <button
                  type="button"
                  onClick={() => setTrimmerTrack(TOLEE_ALBUMS[0].tracks[0])}
                  className="px-5 py-2.5 rounded-full bg-zinc-900/90 border border-zinc-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 hover:bg-zinc-800 transition-colors"
                >
                  <Scissors className="w-4 h-4 text-[#2dd4bf]" />
                  Trim Clip for Reel
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal / Inline Waveform Trimmer for selected track */}
        {trimmerTrack && (
          <div className="p-6 bg-zinc-900 border border-[#0a7c85]/40 rounded-3xl shadow-2xl space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <img
                  src={trimmerTrack.coverUrl || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=100'}
                  alt={trimmerTrack.title}
                  className="w-12 h-12 rounded-xl object-cover"
                />
                <div>
                  <h3 className="font-bold text-sm text-white">{trimmerTrack.title}</h3>
                  <p className="text-xs text-zinc-400">{trimmerTrack.artist} • {trimmerTrack.genre}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleUseInReel(trimmerTrack)}
                  className="px-4 py-2 bg-[#2dd4bf] text-zinc-950 font-bold text-xs rounded-full flex items-center gap-1.5 shadow-md hover:bg-[#5eead4]"
                >
                  <Film className="w-3.5 h-3.5" />
                  Apply & Open Reel Creator
                </button>
                <button
                  type="button"
                  onClick={() => setTrimmerTrack(null)}
                  className="text-xs text-zinc-400 hover:text-white px-2 py-1"
                >
                  Close
                </button>
              </div>
            </div>

            <AudioWaveformTrimmer track={trimmerTrack} />
          </div>
        )}

        {/* Albums & Playlists Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <Disc className="w-5 h-5 text-[#2dd4bf]" />
              Popular Albums & Playlists
            </h3>
            <span className="text-xs text-zinc-500">{TOLEE_ALBUMS.length} Collections</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {TOLEE_ALBUMS.map((album) => (
              <div
                key={album.id}
                className="group p-3 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col justify-between"
              >
                <div className="relative aspect-square rounded-xl overflow-hidden mb-3">
                  <img
                    src={album.coverUrl}
                    alt={album.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <button
                    type="button"
                    onClick={() => togglePlay(album.tracks[0])}
                    className="absolute right-2 bottom-2 w-9 h-9 rounded-full bg-[#2dd4bf] text-zinc-950 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:scale-105"
                  >
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </button>
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-zinc-100 truncate">
                    {album.title}
                  </h4>
                  <p className="text-[11px] text-zinc-400 truncate">{album.artist}</p>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500">
                    <span>{album.genre}</span>
                    <span>{album.tracks.length} tracks</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Curated Tracklist Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#2dd4bf]" />
              {selectedGenre === 'All' ? 'All Soundtracks' : `${selectedGenre} Tracks`}
            </h3>
            <span className="text-xs text-zinc-500">{filteredTracks.length} songs</span>
          </div>

          <div className="space-y-2">
            {filteredTracks.map((track, idx) => {
              const isCurrent = currentTrack.id === track.id;
              const isTrackPlaying = isCurrent && isPlaying;
              const isLiked = likedTrackIds.has(track.id);

              return (
                <div
                  key={track.id}
                  className={`flex items-center justify-between p-3 rounded-2xl transition-all border ${
                    isCurrent
                      ? 'bg-zinc-900 border-[#0a7c85]/50 shadow-md'
                      : 'bg-zinc-900/40 hover:bg-zinc-900/80 border-zinc-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <span className="text-xs text-zinc-500 font-mono w-4 text-center hidden sm:inline">
                      {idx + 1}
                    </span>

                    <button
                      type="button"
                      onClick={() => togglePlay(track)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform ${
                        isTrackPlaying
                          ? 'bg-[#2dd4bf] text-zinc-950 scale-105 shadow-md shadow-[#2dd4bf]/20'
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      }`}
                    >
                      {isTrackPlaying ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <h4
                        className={`text-xs sm:text-sm font-bold truncate ${
                          isCurrent ? 'text-[#2dd4bf]' : 'text-zinc-100'
                        }`}
                      >
                        {track.title}
                      </h4>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {track.artist} {track.album && `• ${track.album}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleLike(track.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        isLiked ? 'text-rose-500' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                    </button>

                    {/* Waveform Trimmer Button */}
                    <button
                      type="button"
                      onClick={() => setTrimmerTrack(track)}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-semibold text-zinc-200 flex items-center gap-1.5 border border-zinc-700 transition-colors"
                      title="Trim 15s/30s segment"
                    >
                      <Scissors className="w-3.5 h-3.5 text-[#2dd4bf]" />
                      <span className="hidden sm:inline">Trim</span>
                    </button>

                    {/* Use in Reel Button */}
                    <button
                      type="button"
                      onClick={() => handleUseInReel(track)}
                      className="px-3 py-1.5 rounded-lg bg-[#0a7c85] hover:bg-[#086b73] text-[11px] font-bold text-white flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Film className="w-3.5 h-3.5" />
                      <span>Use in Reel</span>
                    </button>

                    <span className="text-xs text-zinc-500 font-mono w-12 text-right hidden sm:inline">
                      {formatDuration(track.duration)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Persistent Bottom Floating Player */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/80 px-4 py-3 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Track Info */}
          <div className="flex items-center gap-3 w-full sm:w-1/4">
            <img
              src={
                currentTrack.coverUrl ||
                'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=100'
              }
              alt={currentTrack.title}
              className="w-12 h-12 rounded-xl object-cover border border-zinc-800"
            />
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-zinc-100 truncate">
                {currentTrack.title}
              </h4>
              <p className="text-[10px] text-zinc-400 truncate">
                {currentTrack.artist} • {currentTrack.genre || 'Soundtrack'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleLike(currentTrack.id)}
              className={`p-1.5 rounded-lg ${
                likedTrackIds.has(currentTrack.id) ? 'text-rose-500' : 'text-zinc-500'
              }`}
            >
              <Heart className={`w-4 h-4 ${likedTrackIds.has(currentTrack.id) ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Central Controls & Progress Scrubber */}
          <div className="flex flex-col items-center gap-1.5 w-full sm:w-2/4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setIsShuffling(!isShuffling)}
                className={`text-xs ${isShuffling ? 'text-[#2dd4bf]' : 'text-zinc-500 hover:text-zinc-300'}`}
                title="Shuffle"
              >
                <Shuffle className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handlePrevTrack}
                className="text-zinc-400 hover:text-white"
                title="Previous"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => togglePlay()}
                className="w-9 h-9 rounded-full bg-[#2dd4bf] text-zinc-950 flex items-center justify-center font-bold hover:scale-105 active:scale-95 transition-all shadow-md shadow-[#2dd4bf]/20"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={handleNextTrack}
                className="text-zinc-400 hover:text-white"
                title="Next"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsLooping(!isLooping)}
                className={`text-xs ${isLooping ? 'text-[#2dd4bf]' : 'text-zinc-500 hover:text-zinc-300'}`}
                title="Loop"
              >
                <Repeat className="w-4 h-4" />
              </button>
            </div>

            {/* Scrubber */}
            <div className="w-full flex items-center gap-2 text-[10px] text-zinc-400 font-mono">
              <span className="w-8 text-right">{formatDuration(Math.round(currentTime))}</span>
              <input
                type="range"
                min={0}
                max={duration || currentTrack.duration || 100}
                step={0.5}
                value={currentTime}
                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#2dd4bf]"
              />
              <span className="w-8">
                {formatDuration(Math.round(duration || currentTrack.duration))}
              </span>
            </div>
          </div>

          {/* Volume & Use in Reel Quick Action */}
          <div className="flex items-center justify-end gap-3 w-full sm:w-1/4">
            <button
              type="button"
              onClick={() => setTrimmerTrack(currentTrack)}
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white flex items-center gap-1 text-xs"
              title="Trim Waveform"
            >
              <Scissors className="w-3.5 h-3.5 text-[#2dd4bf]" />
            </button>

            <button
              type="button"
              onClick={() => handleUseInReel(currentTrack)}
              className="px-3 py-1.5 rounded-full bg-[#0a7c85] hover:bg-[#086b73] text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
            >
              <Film className="w-3 h-3" />
              <span className="hidden sm:inline">Use in Reel</span>
            </button>

            <div className="hidden lg:flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMute}
                className="text-zinc-400 hover:text-white"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-16 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#2dd4bf]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
