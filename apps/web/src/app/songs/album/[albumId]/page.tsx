'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAlbumByIdAction } from '@/actions/songs';
import { useMusicPlayer } from '@/context/MusicPlayerContext';
import { formatDuration } from '@/lib/audioLibrary';
import {
  Play,
  Pause,
  Shuffle,
  Heart,
  ArrowLeft,
  Film,
  Disc,
  Clock,
  Share2,
} from 'lucide-react';
import Link from 'next/link';

export default function AlbumPage() {
  const params = useParams();
  const router = useRouter();
  const albumId = params.albumId as string;
  const { playTrack, currentTrack, isPlaying, togglePlay, toggleShuffle } = useMusicPlayer();

  const [album, setAlbum] = useState<any>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (albumId) {
      getAlbumByIdAction(albumId).then((res) => {
        if (res.success && res.album) {
          setAlbum(res.album);
          setIsLiked(!!res.isLiked);
        }
        setLoading(false);
      });
    }
  }, [albumId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#2dd4bf] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!album) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-8 text-center space-y-4">
        <h2 className="text-xl font-bold">Album not found</h2>
        <button
          onClick={() => router.push('/songs')}
          className="px-4 py-2 bg-[#0a7c85] rounded-full text-xs font-bold"
        >
          Back to Songs
        </button>
      </div>
    );
  }

  const totalDurationSeconds = (album.songs || []).reduce(
    (acc: number, s: any) => acc + (s.duration || 0),
    0
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-36 font-sans">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#0a7c85]/40 via-zinc-900 to-zinc-950 px-4 sm:px-8 pt-8 pb-12">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-6 p-2 rounded-full bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center sm:items-end gap-6">
          <div className="w-44 h-44 sm:w-56 sm:h-56 rounded-2xl overflow-hidden shadow-2xl border border-white/10 shrink-0">
            <img
              src={album.coverUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500'}
              alt={album.title}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="space-y-3 text-center sm:text-left flex-1">
            <span className="text-xs uppercase font-extrabold tracking-wider text-[#2dd4bf]">
              Album
            </span>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              {album.title}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300">
              By{' '}
              <Link
                href={`/songs/artist/${album.artistId}`}
                className="font-bold text-white hover:underline"
              >
                {album.artist?.name || 'Various Artists'}
              </Link>{' '}
              • {album.releaseYear || '2026'} • {album.songs?.length || 0} songs (
              {Math.round(totalDurationSeconds / 60)} min)
            </p>
            <p className="text-xs text-zinc-400 max-w-xl">{album.description}</p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-2">
              {album.songs?.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => playTrack(album.songs[0], album.songs)}
                    className="px-6 py-2.5 rounded-full bg-[#2dd4bf] text-zinc-950 font-bold text-xs sm:text-sm flex items-center gap-2 hover:bg-[#5eead4] shadow-lg shadow-[#2dd4bf]/20 transition-all"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Play All
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      toggleShuffle();
                      playTrack(album.songs[0], album.songs);
                    }}
                    className="px-5 py-2.5 rounded-full bg-zinc-900 border border-zinc-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 hover:bg-zinc-800 transition-colors"
                  >
                    <Shuffle className="w-4 h-4 text-[#2dd4bf]" />
                    Shuffle
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-4">
        <h3 className="text-lg font-bold text-white">Tracklist</h3>

        <div className="space-y-2">
          {album.songs?.map((song: any, idx: number) => {
            const isCurrent = currentTrack?.id === song.id;
            const isTrackPlaying = isCurrent && isPlaying;

            return (
              <div
                key={song.id}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                  isCurrent
                    ? 'bg-zinc-900 border-[#0a7c85]/50'
                    : 'bg-zinc-900/40 hover:bg-zinc-900/80 border-zinc-800/60'
                }`}
              >
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  <span className="text-xs text-zinc-500 font-mono w-4 text-center">
                    {idx + 1}
                  </span>

                  <button
                    type="button"
                    onClick={() => (isCurrent ? togglePlay() : playTrack(song, album.songs))}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform ${
                      isTrackPlaying
                        ? 'bg-[#2dd4bf] text-zinc-950 scale-105'
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
                      {song.title}
                    </h4>
                    <p className="text-[11px] text-zinc-400 truncate">
                      {album.artist?.name || song.artist?.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/reels?action=create&audioId=${encodeURIComponent(song.id)}&audioTitle=${encodeURIComponent(song.title)}`
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-[#0a7c85]/20 hover:bg-[#0a7c85]/40 text-[#2dd4bf] text-[11px] font-bold flex items-center gap-1 border border-[#0a7c85]/30"
                  >
                    <Film className="w-3 h-3" />
                    <span className="hidden sm:inline">Use in Reel</span>
                  </button>
                  <span className="text-xs text-zinc-500 font-mono">
                    {formatDuration(song.duration)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
