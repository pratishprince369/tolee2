'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Play,
  Pause,
  Search,
  Disc,
  Film,
  Sparkles,
  Scissors,
  Heart,
  TrendingUp,
  User,
  ListMusic,
  Clock,
  Radio,
  Music,
} from 'lucide-react';
import { getSongsFeedAction, searchSongsAction } from '@/actions/songs';
import { useMusicPlayer } from '@/context/MusicPlayerContext';
import { formatDuration } from '@/lib/audioLibrary';
import { AudioWaveformTrimmer } from '@/components/AudioWaveformTrimmer';

export function ToleeSongsStream() {
  const router = useRouter();
  const { playTrack, currentTrack, isPlaying, togglePlay, toggleLike, likedSongIds } =
    useMusicPlayer();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedLanguage, setSelectedLanguage] = useState('All');
  const [feedData, setFeedData] = useState<any>({
    trendingSongs: [],
    featuredSongs: [],
    newReleases: [],
    popularArtists: [],
    featuredAlbums: [],
    genres: [],
  });
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [trimmerTrack, setTrimmerTrack] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const genres = [
    'All',
    'Bollywood',
    'Punjabi',
    'Lo-Fi',
    'Devotional',
    'Indie',
    'Party',
    'Workout',
    'Romantic',
    'Marathi',
  ];

  const languages = ['All', 'Hindi', 'Punjabi', 'Marathi', 'English', 'Instrumental'];

  // Load Feed Data from Database
  useEffect(() => {
    getSongsFeedAction().then((res) => {
      if (res.success) {
        setFeedData(res);
      }
      setIsLoading(false);
    });
  }, []);

  // Handle Dynamic Search
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchQuery.trim().length > 0 || (selectedGenre !== 'All' && selectedGenre !== '')) {
        setIsSearching(true);
        searchSongsAction(searchQuery, selectedGenre, selectedLanguage).then((res) => {
          if (res.success) {
            setSearchResults(res);
          }
          setIsSearching(false);
        });
      } else {
        setSearchResults(null);
      }
    }, 250);

    return () => clearTimeout(handler);
  }, [searchQuery, selectedGenre, selectedLanguage]);

  const handleUseInReel = (track: any) => {
    router.push(
      `/reels?action=create&audioId=${encodeURIComponent(track.id)}&audioTitle=${encodeURIComponent(
        track.title
      )}`
    );
  };

  const activeSongsList = searchResults
    ? searchResults.songs
    : feedData.trendingSongs?.length > 0
    ? feedData.trendingSongs
    : [];

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-36 font-sans">
      {/* Top Header & Search Bar */}
      <div className="sticky top-16 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-900 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0a7c85] to-[#2dd4bf] flex items-center justify-center shadow-lg shadow-[#0a7c85]/20">
                <Disc className="w-6 h-6 text-white animate-[spin_8s_linear_infinite]" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-[#2dd4bf] bg-clip-text text-transparent flex items-center gap-2">
                  Tolee Songs
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0a7c85]/20 text-[#2dd4bf] border border-[#0a7c85]/30">
                    Music & Reels
                  </span>
                </h1>
                <p className="text-xs text-zinc-400">Stream albums, explore viral hits & clip Reels audio</p>
              </div>
            </div>

            {/* Link to My Music */}
            <Link
              href="/songs/my-music"
              className="md:hidden p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-bold flex items-center gap-1.5"
            >
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-current" />
              <span>Library</span>
            </Link>
          </div>

          {/* Search Box & Library button */}
          <div className="flex items-center gap-3 w-full md:w-auto flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search songs, artists, albums, moods..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-full pl-10 pr-4 py-2 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#2dd4bf] transition-colors"
              />
            </div>
            <Link
              href="/songs/my-music"
              className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-bold transition-colors whitespace-nowrap shadow-sm"
            >
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-current" />
              <span>My Music</span>
            </Link>
          </div>
        </div>

        {/* Genre & Language Filter Pills */}
        <div className="max-w-7xl mx-auto flex items-center gap-2 mt-4 overflow-x-auto no-scrollbar pb-1">
          {genres.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setSelectedGenre(g)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedGenre === g
                  ? 'bg-[#0a7c85] text-white shadow-md shadow-[#0a7c85]/30 font-bold'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800/80'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-10">
        {/* If Search Results are present */}
        {searchResults && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h2 className="text-xl font-extrabold flex items-center gap-2">
              <Search className="w-5 h-5 text-[#2dd4bf]" />
              Search Results {isSearching && <span className="text-xs text-zinc-500">(Searching...)</span>}
            </h2>

            {/* Found Artists */}
            {searchResults.artists?.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-zinc-400">Artists</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                  {searchResults.artists.map((artist: any) => (
                    <Link
                      key={artist.id}
                      href={`/songs/artist/${artist.id}`}
                      className="p-3 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 text-center block transition-all"
                    >
                      <div className="w-20 h-20 mx-auto rounded-full overflow-hidden mb-2 border border-zinc-700">
                        <img
                          src={artist.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200'}
                          alt={artist.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <h4 className="font-bold text-xs text-white truncate">{artist.name}</h4>
                      <p className="text-[10px] text-zinc-400">{artist.genre}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Found Songs */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-zinc-400">Songs ({searchResults.songs?.length || 0})</h3>
              {searchResults.songs?.map((song: any, idx: number) => {
                const isCurrent = currentTrack?.id === song.id;
                const isTrackPlaying = isCurrent && isPlaying;
                const isLiked = likedSongIds.has(song.id);

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
                      <span className="text-xs text-zinc-500 font-mono w-4 text-center hidden sm:inline">
                        {idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => (isCurrent ? togglePlay() : playTrack(song, searchResults.songs))}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform ${
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
                        <Link
                          href={`/songs/audio/${song.id}`}
                          className={`text-xs sm:text-sm font-bold truncate block ${
                            isCurrent ? 'text-[#2dd4bf]' : 'text-zinc-100 hover:text-white'
                          }`}
                        >
                          {song.title}
                        </Link>
                        <p className="text-[11px] text-zinc-400 truncate">
                          {song.artist?.name || song.artistName || 'Tolee Artist'}{' '}
                          {song.album && `• ${song.album.title}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleLike(song.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          isLiked ? 'text-rose-500' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setTrimmerTrack(song)}
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-semibold text-zinc-200 flex items-center gap-1.5 border border-zinc-700 transition-colors"
                      >
                        <Scissors className="w-3.5 h-3.5 text-[#2dd4bf]" />
                        <span className="hidden sm:inline">Trim</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUseInReel(song)}
                        className="px-3 py-1.5 rounded-lg bg-[#0a7c85] hover:bg-[#086b73] text-[11px] font-bold text-white flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Film className="w-3.5 h-3.5" />
                        <span>Use in Reel</span>
                      </button>
                      <span className="text-xs text-zinc-500 font-mono w-12 text-right hidden sm:inline">
                        {formatDuration(song.duration)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Regular Feed Sections (when not searching) */}
        {!searchResults && (
          <>
            {/* Featured Hero Banner */}
            {feedData.featuredAlbums?.length > 0 && (
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#073b3e] via-[#094d52] to-zinc-900 border border-[#0a7c85]/30 p-6 sm:p-10 shadow-2xl">
                <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-25 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#2dd4bf] via-transparent to-transparent blur-2xl" />

                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                  <div className="relative group w-48 h-48 sm:w-56 sm:h-56 rounded-2xl overflow-hidden shadow-2xl border border-white/10 shrink-0">
                    <img
                      src={feedData.featuredAlbums[0].coverUrl}
                      alt={feedData.featuredAlbums[0].title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() =>
                          playTrack(
                            feedData.featuredAlbums[0].songs?.[0] || feedData.trendingSongs[0],
                            feedData.featuredAlbums[0].songs || feedData.trendingSongs
                          )
                        }
                        className="w-14 h-14 rounded-full bg-[#2dd4bf] text-zinc-950 flex items-center justify-center shadow-xl hover:scale-110 transition-transform"
                      >
                        <Play className="w-6 h-6 fill-current ml-1" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 text-center md:text-left flex-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs text-[#2dd4bf] font-bold">
                      <Sparkles className="w-3.5 h-3.5" />
                      Featured Album on Tolee
                    </div>
                    <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
                      {feedData.featuredAlbums[0].title}
                    </h2>
                    <p className="text-xs sm:text-sm text-zinc-300 max-w-xl">
                      {feedData.featuredAlbums[0].description}
                    </p>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          playTrack(
                            feedData.featuredAlbums[0].songs?.[0] || feedData.trendingSongs[0],
                            feedData.featuredAlbums[0].songs || feedData.trendingSongs
                          )
                        }
                        className="px-6 py-2.5 rounded-full bg-[#2dd4bf] text-zinc-950 font-bold text-xs sm:text-sm flex items-center gap-2 hover:bg-[#5eead4] transition-colors shadow-lg shadow-[#2dd4bf]/20"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        Play Album
                      </button>
                      <Link
                        href={`/songs/album/${feedData.featuredAlbums[0].id}`}
                        className="px-5 py-2.5 rounded-full bg-zinc-900 border border-zinc-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 hover:bg-zinc-800 transition-colors"
                      >
                        <Disc className="w-4 h-4 text-[#2dd4bf]" />
                        View Album Details
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Trimmer Drawer if active */}
            {trimmerTrack && (
              <div className="p-6 bg-zinc-900 border border-[#0a7c85]/40 rounded-3xl shadow-2xl space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={trimmerTrack.coverUrl || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=100'}
                      alt={trimmerTrack.title}
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                    <div>
                      <h3 className="font-bold text-sm text-white">{trimmerTrack.title}</h3>
                      <p className="text-xs text-zinc-400">
                        {trimmerTrack.artist?.name || trimmerTrack.artistName}
                      </p>
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

            {/* Popular Artists Carousel */}
            {feedData.popularArtists?.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-white">
                    <User className="w-5 h-5 text-[#2dd4bf]" />
                    Popular Artists
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                  {feedData.popularArtists.map((artist: any) => (
                    <Link
                      key={artist.id}
                      href={`/songs/artist/${artist.id}`}
                      className="group p-3 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 text-center transition-all block"
                    >
                      <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-full overflow-hidden mb-3 border-2 border-zinc-700/80 group-hover:border-[#2dd4bf] transition-colors shadow-lg">
                        <img
                          src={artist.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300'}
                          alt={artist.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <h4 className="font-bold text-xs sm:text-sm text-zinc-100 truncate group-hover:text-[#2dd4bf] transition-colors">
                        {artist.name}
                      </h4>
                      <p className="text-[10px] text-zinc-400">{artist.genre || 'Artist'}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Featured Albums */}
            {feedData.featuredAlbums?.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-white">
                    <Disc className="w-5 h-5 text-[#2dd4bf]" />
                    Featured Albums & Playlists
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {feedData.featuredAlbums.map((album: any) => (
                    <Link
                      key={album.id}
                      href={`/songs/album/${album.id}`}
                      className="group p-3 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 transition-all flex flex-col justify-between block"
                    >
                      <div className="aspect-square rounded-xl overflow-hidden mb-3">
                        <img
                          src={album.coverUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300'}
                          alt={album.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-zinc-100 truncate">
                          {album.title}
                        </h4>
                        <p className="text-[11px] text-zinc-400 truncate">
                          {album.artist?.name || 'Various'}
                        </p>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500">
                          <span>{album.genre}</span>
                          <span>{album.songs?.length || 2} tracks</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Trending Songs List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-white">
                  <TrendingUp className="w-5 h-5 text-[#2dd4bf]" />
                  Trending on Reels & Stories
                </h3>
              </div>

              <div className="space-y-2">
                {feedData.trendingSongs?.map((song: any, idx: number) => {
                  const isCurrent = currentTrack?.id === song.id;
                  const isTrackPlaying = isCurrent && isPlaying;
                  const isLiked = likedSongIds.has(song.id);

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
                        <span className="text-xs text-zinc-500 font-mono w-4 text-center hidden sm:inline">
                          {idx + 1}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            isCurrent
                              ? togglePlay()
                              : playTrack(song, feedData.trendingSongs)
                          }
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

                        <img
                          src={song.coverUrl || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=100'}
                          alt={song.title}
                          className="w-10 h-10 rounded-lg object-cover"
                        />

                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/songs/audio/${song.id}`}
                            className={`text-xs sm:text-sm font-bold truncate block ${
                              isCurrent ? 'text-[#2dd4bf]' : 'text-zinc-100 hover:text-white'
                            }`}
                          >
                            {song.title}
                          </Link>
                          <p className="text-[11px] text-zinc-400 truncate">
                            {song.artist?.name || song.artistName || 'Tolee Artist'}{' '}
                            {song.album && `• ${song.album.title}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleLike(song.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            isLiked ? 'text-rose-500' : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setTrimmerTrack(song)}
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-semibold text-zinc-200 flex items-center gap-1.5 border border-zinc-700 transition-colors"
                        >
                          <Scissors className="w-3.5 h-3.5 text-[#2dd4bf]" />
                          <span className="hidden sm:inline">Trim</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUseInReel(song)}
                          className="px-3 py-1.5 rounded-lg bg-[#0a7c85] hover:bg-[#086b73] text-[11px] font-bold text-white flex items-center gap-1.5 transition-colors shadow-sm"
                        >
                          <Film className="w-3.5 h-3.5" />
                          <span>Use in Reel</span>
                        </button>

                        <span className="text-xs text-zinc-500 font-mono w-12 text-right hidden sm:inline">
                          {formatDuration(song.duration)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
