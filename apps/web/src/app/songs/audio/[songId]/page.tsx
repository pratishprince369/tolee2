'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSongByIdAction } from '@/actions/songs';
import { useMusicPlayer } from '@/context/MusicPlayerContext';
import { AudioWaveformTrimmer } from '@/components/AudioWaveformTrimmer';
import { formatDuration } from '@/lib/audioLibrary';
import {
  Play,
  Pause,
  Heart,
  Share2,
  Film,
  Disc,
  ArrowLeft,
  Sparkles,
  Music,
} from 'lucide-react';
import Link from 'next/link';

export default function AudioSongPage() {
  const params = useParams();
  const router = useRouter();
  const songId = params.songId as string;
  const { playTrack, currentTrack, isPlaying, togglePlay, toggleLike, likedSongIds } =
    useMusicPlayer();

  const [song, setSong] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (songId) {
      getSongByIdAction(songId).then((res) => {
        if (res.success && res.song) {
          setSong(res.song);
        }
        setLoading(false);
      });
    }
  }, [songId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#2dd4bf] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!song) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-8 text-center space-y-4">
        <h2 className="text-xl font-bold">Song not found</h2>
        <button
          onClick={() => router.push('/songs')}
          className="px-4 py-2 bg-[#0a7c85] rounded-full text-xs font-bold"
        >
          Back to Songs
        </button>
      </div>
    );
  }

  const isCurrent = currentTrack?.id === song.id;
  const isTrackPlaying = isCurrent && isPlaying;
  const isLiked = likedSongIds.has(song.id);

  const handleUseInReel = (clipStart?: number, clipDur?: number) => {
    const startParam = clipStart !== undefined ? `&clipStart=${clipStart}` : '';
    const durParam = clipDur !== undefined ? `&clipDuration=${clipDur}` : '';
    router.push(
      `/reels?action=create&audioId=${encodeURIComponent(song.id)}&audioTitle=${encodeURIComponent(
        song.title
      )}${startParam}${durParam}`
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-36 font-sans">
      {/* Top Banner */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#0a7c85]/40 via-zinc-900 to-zinc-950 px-4 sm:px-8 pt-8 pb-12">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-6 p-2 rounded-full bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center sm:items-end gap-6">
          <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-3xl overflow-hidden shadow-2xl border border-white/10 shrink-0">
            <img
              src={song.coverUrl || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500'}
              alt={song.title}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="space-y-3 text-center sm:text-left flex-1">
            <span className="text-xs uppercase font-extrabold tracking-wider text-[#2dd4bf]">
              Song & Reels Audio
            </span>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
              {song.title}
            </h1>
            <p className="text-sm sm:text-base text-zinc-300">
              By{' '}
              <Link
                href={`/songs/artist/${song.artistId}`}
                className="font-bold text-white hover:underline"
              >
                {song.artist?.name}
              </Link>{' '}
              {song.album && (
                <>
                  • From{' '}
                  <Link
                    href={`/songs/album/${song.albumId}`}
                    className="font-semibold text-zinc-300 hover:underline"
                  >
                    {song.album.title}
                  </Link>
                </>
              )}{' '}
              • {formatDuration(song.duration)} • {song.genre}
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
              <button
                type="button"
                onClick={() => (isCurrent ? togglePlay() : playTrack(song))}
                className="px-6 py-2.5 rounded-full bg-[#2dd4bf] text-zinc-950 font-bold text-xs sm:text-sm flex items-center gap-2 hover:bg-[#5eead4] shadow-lg shadow-[#2dd4bf]/20 transition-all"
              >
                {isTrackPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
                {isTrackPlaying ? 'Pause' : 'Play Song'}
              </button>

              <button
                type="button"
                onClick={() => toggleLike(song.id)}
                className={`p-2.5 rounded-full border border-zinc-700 transition-colors ${
                  isLiked ? 'text-rose-500 bg-rose-500/10' : 'text-zinc-300 hover:text-white bg-zinc-900'
                }`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => handleUseInReel()}
                className="px-5 py-2.5 rounded-full bg-[#0a7c85] hover:bg-[#086b73] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-colors"
              >
                <Film className="w-4 h-4" />
                <span>Use This Audio in Reel</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-10">
        {/* Audio Waveform Trimmer for Reels */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Music className="w-5 h-5 text-[#2dd4bf]" />
            Audio Waveform & 15s / 30s Trimmer
          </h3>
          <AudioWaveformTrimmer
            track={song}
            onTrimChange={(start, end, duration) => {
              // Allows user to test the trimmed segment
            }}
          />
        </div>

        {/* Popular Reels using this audio */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Film className="w-5 h-5 text-[#2dd4bf]" />
            Reels Using This Audio
          </h3>

          {song.reelAudios && song.reelAudios.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {song.reelAudios.map((ra: any) => (
                <Link
                  key={ra.id}
                  href={`/reels?videoId=${ra.postId}`}
                  className="group relative aspect-[9/16] rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800"
                >
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <Play className="w-8 h-8 text-white opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 text-[11px] text-white font-semibold truncate">
                    @{ra.post?.author?.username || 'creator'}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 text-center space-y-3">
              <Film className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-xs text-zinc-400">Be the first creator to create a Reel with this audio!</p>
              <button
                type="button"
                onClick={() => handleUseInReel()}
                className="px-4 py-2 rounded-full bg-[#0a7c85] hover:bg-[#086b73] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
              >
                <Film className="w-3.5 h-3.5" />
                Upload Reel Now
              </button>
            </div>
          )}
        </div>

        {/* Other songs by this artist */}
        {song.artist?.songs && song.artist.songs.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">
              More by {song.artist.name}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {song.artist.songs.map((otherSong: any) => (
                <div
                  key={otherSong.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => playTrack(otherSong)}
                      className="w-9 h-9 rounded-xl bg-zinc-800 text-zinc-200 hover:bg-[#2dd4bf] hover:text-zinc-950 flex items-center justify-center shrink-0 transition-colors"
                    >
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/songs/audio/${otherSong.id}`}
                        className="text-xs sm:text-sm font-bold text-zinc-200 hover:text-[#2dd4bf] truncate block"
                      >
                        {otherSong.title}
                      </Link>
                      <p className="text-[11px] text-zinc-500 font-mono">
                        {formatDuration(otherSong.duration)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
