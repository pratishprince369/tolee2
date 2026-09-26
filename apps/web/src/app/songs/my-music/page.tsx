'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserMusicAction, createMusicPlaylistAction } from '@/actions/songs';
import { useMusicPlayer } from '@/context/MusicPlayerContext';
import { formatDuration } from '@/lib/audioLibrary';
import {
  Heart,
  Disc,
  User,
  History,
  ListMusic,
  Play,
  Pause,
  Plus,
  ArrowLeft,
  Music,
  Film,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { LaunchMusicModal } from '@/components/LaunchMusicModal';

export default function MyMusicPage() {
  const router = useRouter();
  const { playTrack, currentTrack, isPlaying, togglePlay } = useMusicPlayer();

  const [activeTab, setActiveTab] = useState<'liked' | 'recent' | 'playlists' | 'artists' | 'albums' | 'uploads'>('liked');
  const [data, setData] = useState<any>({
    likedSongs: [],
    likedAlbums: [],
    followedArtists: [],
    recentlyPlayed: [],
    playlists: [],
    uploadedSongs: [],
    uploadedAlbums: [],
  });
  const [loading, setLoading] = useState(true);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);

  const fetchMyMusic = () => {
    getUserMusicAction().then((res) => {
      if (res.success) {
        setData(res);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchMyMusic();
  }, []);

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistTitle.trim()) return;

    const res = await createMusicPlaylistAction(newPlaylistTitle.trim());
    if (res.success && res.playlist) {
      setData((prev: any) => ({
        ...prev,
        playlists: [res.playlist, ...(prev.playlists || [])],
      }));
      setNewPlaylistTitle('');
      setIsCreatingPlaylist(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-36 font-sans">
      <div className="sticky top-16 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-900 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/songs')}
              className="p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
                My Music
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0a7c85]/20 text-[#2dd4bf] border border-[#0a7c85]/30">
                  Library
                </span>
              </h1>
              <p className="text-xs text-zinc-400">Your personalized favorites, playlists & listening history</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsLaunchModalOpen(true)}
              className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#0a7c85] to-[#2dd4bf] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#0a7c85]/20"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Launch Song / Album</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCreatingPlaylist(!isCreatingPlaylist)}
              className="px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Playlist</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="max-w-7xl mx-auto flex items-center gap-2 mt-4 overflow-x-auto no-scrollbar">
          {[
            { id: 'liked', label: 'Liked Songs', icon: Heart, count: data.likedSongs?.length },
            { id: 'uploads', label: 'My Launched Music', icon: Sparkles, count: (data.uploadedSongs?.length || 0) + (data.uploadedAlbums?.length || 0) },
            { id: 'recent', label: 'Recently Played', icon: History, count: data.recentlyPlayed?.length },
            { id: 'playlists', label: 'My Playlists', icon: ListMusic, count: data.playlists?.length },
            { id: 'artists', label: 'Followed Artists', icon: User, count: data.followedArtists?.length },
            { id: 'albums', label: 'Saved Albums', icon: Disc, count: data.likedAlbums?.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#2dd4bf] text-zinc-950 font-bold shadow-md shadow-[#2dd4bf]/20'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive && tab.id === 'liked' ? 'fill-current' : ''}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Create Playlist Modal Form */}
        {isCreatingPlaylist && (
          <form
            onSubmit={handleCreatePlaylist}
            className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col sm:flex-row items-center gap-3 animate-in fade-in duration-200"
          >
            <input
              type="text"
              value={newPlaylistTitle}
              onChange={(e) => setNewPlaylistTitle(e.target.value)}
              placeholder="Enter playlist name (e.g. Rainy Day Lo-Fi, Gym Anthems)..."
              className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#2dd4bf]"
              autoFocus
            />
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="submit"
                className="flex-1 sm:flex-initial px-5 py-2 rounded-xl bg-[#2dd4bf] text-zinc-950 text-xs font-bold shadow-md"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingPlaylist(false)}
                className="px-3 py-2 text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Tab 1: Liked Songs */}
        {activeTab === 'liked' && (
          <div className="space-y-3">
            {data.likedSongs?.length > 0 ? (
              data.likedSongs.map((song: any, idx: number) => {
                const isCurrent = currentTrack?.id === song.id;
                const isTrackPlaying = isCurrent && isPlaying;
                return (
                  <div
                    key={song.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-800/60 transition-all"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-xs font-mono text-zinc-500 w-4 text-center">
                        {idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => (isCurrent ? togglePlay() : playTrack(song, data.likedSongs))}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isTrackPlaying ? 'bg-[#2dd4bf] text-zinc-950' : 'bg-zinc-800 text-zinc-300'
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
                          className="text-xs sm:text-sm font-bold text-zinc-100 hover:text-[#2dd4bf] truncate block"
                        >
                          {song.title}
                        </Link>
                        <p className="text-[11px] text-zinc-400 truncate">
                          {song.artist?.name || 'Tolee Artist'}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-zinc-500">
                      {formatDuration(song.duration)}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center text-zinc-500 space-y-2">
                <Heart className="w-10 h-10 mx-auto text-zinc-700" />
                <p className="text-sm font-semibold">No liked songs yet.</p>
                <p className="text-xs">Tap the heart icon on any song to add it to your favorites!</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Recently Played */}
        {activeTab === 'recent' && (
          <div className="space-y-3">
            {data.recentlyPlayed?.length > 0 ? (
              data.recentlyPlayed.map((song: any, idx: number) => {
                const isCurrent = currentTrack?.id === song.id;
                const isTrackPlaying = isCurrent && isPlaying;
                return (
                  <div
                    key={`${song.id}-${idx}`}
                    className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-800/60 transition-all"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => (isCurrent ? togglePlay() : playTrack(song, data.recentlyPlayed))}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isTrackPlaying ? 'bg-[#2dd4bf] text-zinc-950' : 'bg-zinc-800 text-zinc-300'
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
                          className="text-xs sm:text-sm font-bold text-zinc-100 hover:text-[#2dd4bf] truncate block"
                        >
                          {song.title}
                        </Link>
                        <p className="text-[11px] text-zinc-400 truncate">
                          {song.artist?.name || 'Tolee Artist'}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-zinc-500">
                      {formatDuration(song.duration)}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center text-zinc-500 space-y-2">
                <History className="w-10 h-10 mx-auto text-zinc-700" />
                <p className="text-sm font-semibold">No listening history yet.</p>
                <p className="text-xs">Start streaming music on Tolee Songs to build your history!</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Playlists */}
        {activeTab === 'playlists' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {data.playlists?.map((p: any) => (
              <div
                key={p.id}
                className="group p-3 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 transition-all flex flex-col justify-between"
              >
                <div className="aspect-square rounded-xl bg-zinc-800 flex items-center justify-center mb-3">
                  <ListMusic className="w-10 h-10 text-[#2dd4bf]" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-zinc-100 truncate">{p.title}</h4>
                  <p className="text-[11px] text-zinc-500">{p.songs?.length || 0} songs</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: Followed Artists */}
        {activeTab === 'artists' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {data.followedArtists?.map((artist: any) => (
              <Link
                key={artist.id}
                href={`/songs/artist/${artist.id}`}
                className="group p-3 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 text-center transition-all block"
              >
                <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-full overflow-hidden mb-3 border-2 border-zinc-700">
                  <img
                    src={artist.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300'}
                    alt={artist.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <h4 className="font-bold text-xs sm:text-sm text-zinc-100 truncate">{artist.name}</h4>
                <p className="text-[10px] text-zinc-400">{artist.genre || 'Artist'}</p>
              </Link>
            ))}
          </div>
        )}

        {/* Tab 5: Saved Albums */}
        {activeTab === 'albums' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {data.likedAlbums?.map((album: any) => (
              <Link
                key={album.id}
                href={`/songs/album/${album.id}`}
                className="group p-3 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 transition-all block"
              >
                <div className="aspect-square rounded-xl overflow-hidden mb-3">
                  <img
                    src={album.coverUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300'}
                    alt={album.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <h4 className="font-bold text-xs sm:text-sm text-zinc-100 truncate">{album.title}</h4>
                <p className="text-[10px] text-zinc-400">{album.artist?.name || 'Artist'}</p>
              </Link>
            ))}
          </div>
        )}

        {/* Tab 6: My Uploaded Tracks & Albums */}
        {activeTab === 'uploads' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Action Bar */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#2dd4bf]" />
                  Your Released Music
                </h3>
                <p className="text-xs text-zinc-400">
                  Manage songs and albums you launched on Tolee Songs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLaunchModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0a7c85] to-[#2dd4bf] hover:opacity-90 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-[#0a7c85]/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Launch New Track / Album</span>
              </button>
            </div>

            {(!data.uploadedSongs || data.uploadedSongs.length === 0) &&
            (!data.uploadedAlbums || data.uploadedAlbums.length === 0) ? (
              <div className="p-12 text-center rounded-3xl bg-zinc-900/40 border border-zinc-800 space-y-3">
                <Music className="w-10 h-10 text-zinc-600 mx-auto" />
                <h4 className="text-sm font-bold text-white">No tracks launched yet</h4>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Are you an artist, musician, or creator? Launch your original tracks or full albums to reach everyone on Tolee.
                </p>
                <button
                  type="button"
                  onClick={() => setIsLaunchModalOpen(true)}
                  className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#0a7c85] to-[#2dd4bf] text-white text-xs font-bold inline-flex items-center gap-2 shadow-lg shadow-[#0a7c85]/20 hover:opacity-95"
                >
                  <Sparkles className="w-4 h-4" />
                  Launch Your First Track
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Uploaded Albums */}
                {data.uploadedAlbums?.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Your Albums ({data.uploadedAlbums.length})
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                      {data.uploadedAlbums.map((album: any) => (
                        <Link
                          key={album.id}
                          href={`/songs/album/${album.id}`}
                          className="group p-3 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 transition-all block"
                        >
                          <div className="aspect-square rounded-xl overflow-hidden mb-3">
                            <img
                              src={album.coverUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300'}
                              alt={album.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                          <h4 className="font-bold text-xs sm:text-sm text-zinc-100 truncate">{album.title}</h4>
                          <p className="text-[10px] text-zinc-400">{album.songs?.length || 0} tracks • {album.genre}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Uploaded Songs */}
                {data.uploadedSongs?.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Your Audio Tracks ({data.uploadedSongs.length})
                    </h4>
                    <div className="space-y-2">
                      {data.uploadedSongs.map((song: any, idx: number) => {
                        const isCurrent = currentTrack?.id === song.id;
                        const isTrackPlaying = isCurrent && isPlaying;

                        return (
                          <div
                            key={song.id}
                            className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                              song.isSuspended
                                ? 'bg-rose-950/20 border-rose-900/50'
                                : isCurrent
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
                                disabled={song.isSuspended}
                                onClick={() =>
                                  isCurrent ? togglePlay() : playTrack(song, data.uploadedSongs)
                                }
                                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform ${
                                  song.isSuspended
                                    ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                                    : isTrackPlaying
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
                                <div className="flex items-center gap-2">
                                  <Link
                                    href={`/songs/audio/${song.id}`}
                                    className={`text-xs sm:text-sm font-bold truncate block ${
                                      isCurrent ? 'text-[#2dd4bf]' : 'text-zinc-100 hover:text-white'
                                    }`}
                                  >
                                    {song.title}
                                  </Link>
                                  {song.isSuspended ? (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                      SUSPENDED BY MODERATION
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                      LIVE
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-zinc-400 truncate">
                                  {song.artist?.name || 'Artist'} {song.album?.title && `• ${song.album.title}`} • {song.genre}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-xs text-zinc-500 font-mono">
                                {formatDuration(song.duration)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Launch Music Modal */}
      <LaunchMusicModal
        isOpen={isLaunchModalOpen}
        onClose={() => setIsLaunchModalOpen(false)}
        onSuccess={fetchMyMusic}
      />
    </div>
  );
}
