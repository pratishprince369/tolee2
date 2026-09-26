'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getArtistByIdAction, toggleSongLikeAction } from '@/actions/songs';
import { useMusicPlayer } from '@/context/MusicPlayerContext';
import { formatDuration } from '@/lib/audioLibrary';
import {
  Play,
  Pause,
  Heart,
  UserCheck,
  UserPlus,
  Share2,
  Film,
  Disc,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

export default function ArtistPage() {
  const params = useParams();
  const router = useRouter();
  const artistId = params.artistId as string;
  const { playTrack, currentTrack, isPlaying, togglePlay } = useMusicPlayer();

  const [artist, setArtist] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (artistId) {
      getArtistByIdAction(artistId).then((res) => {
        if (res.success && res.artist) {
          setArtist(res.artist);
          setIsFollowing(!!res.isFollowing);
        }
        setLoading(false);
      });
    }
  }, [artistId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#2dd4bf] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-8 text-center space-y-4">
        <h2 className="text-xl font-bold">Artist not found</h2>
        <button
          onClick={() => router.push('/songs')}
          className="px-4 py-2 bg-[#0a7c85] rounded-full text-xs font-bold"
        >
          Back to Songs
        </button>
      </div>
    );
  }

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
          <div className="w-36 h-36 sm:w-48 sm:h-48 rounded-full overflow-hidden shadow-2xl border-4 border-zinc-800/80 shrink-0">
            <img
              src={artist.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500'}
              alt={artist.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="space-y-2 text-center sm:text-left flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-[#2dd4bf] font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              Verified Artist
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
              {artist.name}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl line-clamp-2">
              {artist.bio || `${artist.genre} artist on Tolee Songs.`}
            </p>
            <div className="flex items-center justify-center sm:justify-start gap-4 pt-3">
              <span className="text-xs text-zinc-400 font-mono">
                {artist.monthlyListeners?.toLocaleString() || '1.2M'} monthly listeners
              </span>
              <button
                type="button"
                onClick={() => setIsFollowing(!isFollowing)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  isFollowing
                    ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                    : 'bg-[#2dd4bf] text-zinc-950 shadow-md'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-10">
        {/* Popular Tracks */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Popular Songs</h3>
            {artist.songs?.length > 0 && (
              <button
                type="button"
                onClick={() => playTrack(artist.songs[0], artist.songs)}
                className="px-4 py-1.5 rounded-full bg-[#0a7c85] hover:bg-[#086b73] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Play All
              </button>
            )}
          </div>

          <div className="space-y-2">
            {artist.songs?.map((song: any, idx: number) => {
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
                      onClick={() => (isCurrent ? togglePlay() : playTrack(song, artist.songs))}
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

                    <img
                      src={song.coverUrl || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=100'}
                      alt={song.title}
                      className="w-10 h-10 rounded-lg object-cover"
                    />

                    <div className="min-w-0 flex-1">
                      <h4
                        className={`text-xs sm:text-sm font-bold truncate ${
                          isCurrent ? 'text-[#2dd4bf]' : 'text-zinc-100'
                        }`}
                      >
                        {song.title}
                      </h4>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {song.genre} • {song.language}
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

        {/* Albums */}
        {artist.albums?.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Disc className="w-5 h-5 text-[#2dd4bf]" />
              Albums by {artist.name}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
              {artist.albums.map((album: any) => (
                <Link
                  key={album.id}
                  href={`/songs/album/${album.id}`}
                  className="group p-3 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 transition-all block"
                >
                  <div className="aspect-square rounded-xl overflow-hidden mb-3">
                    <img
                      src={album.coverUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300'}
                      alt={album.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <h4 className="font-bold text-xs sm:text-sm text-zinc-100 truncate">
                    {album.title}
                  </h4>
                  <p className="text-[11px] text-zinc-500">{album.releaseYear || '2026'}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
