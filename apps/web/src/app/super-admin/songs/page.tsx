'use client';

import React, { useEffect, useState } from 'react';
import {
  adminGetMusicStatsAction,
  adminCreateSongAction,
  adminDeleteSongAction,
  adminCreateArtistAction,
  adminDeleteArtistAction,
  adminCreateAlbumAction,
  adminDeleteAlbumAction,
} from '@/actions/songs';
import { formatDuration } from '@/lib/audioLibrary';
import {
  Music,
  User,
  Disc,
  Play,
  Trash2,
  Plus,
  RefreshCw,
  Film,
  TrendingUp,
  Sparkles,
} from 'lucide-react';

export default function AdminSongsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'songs' | 'artists' | 'albums'>('songs');

  // New Song Form State
  const [songTitle, setSongTitle] = useState('');
  const [songArtistId, setSongArtistId] = useState('');
  const [songAlbumId, setSongAlbumId] = useState('');
  const [songAudioUrl, setSongAudioUrl] = useState('');
  const [songCoverUrl, setSongCoverUrl] = useState('');
  const [songDuration, setSongDuration] = useState(120);
  const [songGenre, setSongGenre] = useState('Bollywood');
  const [songLanguage, setSongLanguage] = useState('Hindi');
  const [songIsTrending, setSongIsTrending] = useState(false);
  const [songIsFeatured, setSongIsFeatured] = useState(false);
  const [showAddSongModal, setShowAddSongModal] = useState(false);

  // New Artist Form State
  const [artistName, setArtistName] = useState('');
  const [artistBio, setArtistBio] = useState('');
  const [artistImage, setArtistImage] = useState('');
  const [artistGenre, setArtistGenre] = useState('Bollywood');
  const [showAddArtistModal, setShowAddArtistModal] = useState(false);

  // New Album Form State
  const [albumTitle, setAlbumTitle] = useState('');
  const [albumArtistId, setAlbumArtistId] = useState('');
  const [albumCoverUrl, setAlbumCoverUrl] = useState('');
  const [albumGenre, setAlbumGenre] = useState('Bollywood');
  const [albumDesc, setAlbumDesc] = useState('');
  const [showAddAlbumModal, setShowAddAlbumModal] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    const res = await adminGetMusicStatsAction();
    if (res.success) {
      setData(res);
      if (res.artists?.length > 0 && !songArtistId) {
        setSongArtistId(res.artists[0].id);
        setAlbumArtistId(res.artists[0].id);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleCreateSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!songTitle.trim() || !songAudioUrl.trim() || !songArtistId) {
      alert('Title, artist and audio URL are required.');
      return;
    }

    const res = await adminCreateSongAction({
      title: songTitle,
      artistId: songArtistId,
      albumId: songAlbumId || undefined,
      audioUrl: songAudioUrl,
      coverUrl: songCoverUrl || undefined,
      duration: songDuration,
      genre: songGenre,
      language: songLanguage,
      isTrending: songIsTrending,
      isFeatured: songIsFeatured,
    });

    if (res.success) {
      alert('Song created successfully!');
      setShowAddSongModal(false);
      setSongTitle('');
      setSongAudioUrl('');
      setSongCoverUrl('');
      fetchStats();
    } else {
      alert(res.error || 'Failed to create song');
    }
  };

  const handleCreateArtist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artistName.trim()) return;

    const res = await adminCreateArtistAction({
      name: artistName,
      bio: artistBio,
      image: artistImage,
      genre: artistGenre,
    });

    if (res.success) {
      alert('Artist created!');
      setShowAddArtistModal(false);
      setArtistName('');
      setArtistBio('');
      fetchStats();
    }
  };

  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!albumTitle.trim() || !albumArtistId) return;

    const res = await adminCreateAlbumAction({
      title: albumTitle,
      artistId: albumArtistId,
      coverUrl: albumCoverUrl,
      genre: albumGenre,
      description: albumDesc,
    });

    if (res.success) {
      alert('Album created!');
      setShowAddAlbumModal(false);
      setAlbumTitle('');
      setAlbumDesc('');
      fetchStats();
    }
  };

  const handleDeleteSong = async (id: string) => {
    if (!window.confirm('Delete this song permanently?')) return;
    const res = await adminDeleteSongAction(id);
    if (res.success) fetchStats();
  };

  const handleDeleteArtist = async (id: string) => {
    if (!window.confirm('Delete this artist permanently?')) return;
    const res = await adminDeleteArtistAction(id);
    if (res.success) fetchStats();
  };

  const handleDeleteAlbum = async (id: string) => {
    if (!window.confirm('Delete this album permanently?')) return;
    const res = await adminDeleteAlbumAction(id);
    if (res.success) fetchStats();
  };

  if (loading && !data) {
    return (
      <div className="p-8 text-center text-zinc-400">
        <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-3 text-emerald-500" />
        <p>Loading Tolee Songs analytics & catalog...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 font-sans text-white">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <span>🎵</span> Tolee Songs Management
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
              Admin
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manage artists, albums, songs, audio waveform assets & Reel audio integration
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStats}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white"
            title="Refresh Catalog"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAddSongModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs flex items-center gap-1.5 shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Add Song</span>
          </button>
          <button
            onClick={() => setShowAddArtistModal(true)}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-semibold text-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Artist</span>
          </button>
          <button
            onClick={() => setShowAddAlbumModal(true)}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-semibold text-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Album</span>
          </button>
        </div>
      </div>

      {/* Analytics Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Total Plays</span>
          <h3 className="text-2xl font-black text-white">{data?.stats?.totalPlays?.toLocaleString() || 0}</h3>
          <p className="text-[10px] text-emerald-400">Stream sessions</p>
        </div>
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Total Songs</span>
          <h3 className="text-2xl font-black text-white">{data?.stats?.totalSongs || 0}</h3>
          <p className="text-[10px] text-zinc-500">In database</p>
        </div>
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Artists</span>
          <h3 className="text-2xl font-black text-white">{data?.stats?.totalArtists || 0}</h3>
          <p className="text-[10px] text-zinc-500">Verified creators</p>
        </div>
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Albums</span>
          <h3 className="text-2xl font-black text-white">{data?.stats?.totalAlbums || 0}</h3>
          <p className="text-[10px] text-zinc-500">Collections</p>
        </div>
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Reels Attached</span>
          <h3 className="text-2xl font-black text-white">{data?.stats?.reelAudioCount || 0}</h3>
          <p className="text-[10px] text-[#2dd4bf]">Viral usage</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('songs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'songs' ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Songs ({data?.songs?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('artists')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'artists' ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Artists ({data?.artists?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('albums')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'albums' ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Albums ({data?.albums?.length || 0})
        </button>
      </div>

      {/* Songs Table */}
      {activeTab === 'songs' && (
        <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-900/40">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
              <tr>
                <th className="p-3.5">Track</th>
                <th className="p-3.5">Artist & Album</th>
                <th className="p-3.5">Genre & Lang</th>
                <th className="p-3.5">Duration</th>
                <th className="p-3.5">Plays</th>
                <th className="p-3.5">Flags</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {data?.songs?.map((song: any) => (
                <tr key={song.id} className="hover:bg-zinc-900/60 transition-colors">
                  <td className="p-3.5 flex items-center gap-3">
                    <img
                      src={song.coverUrl || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=100'}
                      alt={song.title}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                    <div>
                      <h4 className="font-bold text-white">{song.title}</h4>
                      <p className="text-[10px] text-zinc-500 font-mono">{song.id}</p>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <p className="font-semibold text-zinc-200">{song.artist?.name || 'Unknown'}</p>
                    <p className="text-[11px] text-zinc-400">{song.album?.title || 'Single'}</p>
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-medium mr-1.5">
                      {song.genre}
                    </span>
                    <span className="text-zinc-500">{song.language}</span>
                  </td>
                  <td className="p-3.5 font-mono">{formatDuration(song.duration)}</td>
                  <td className="p-3.5 font-bold text-emerald-400 font-mono">
                    {song.playCount?.toLocaleString() || 0}
                  </td>
                  <td className="p-3.5 space-x-1">
                    {song.isTrending && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                        Trending
                      </span>
                    )}
                    {song.isFeatured && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                        Featured
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => handleDeleteSong(song.id)}
                      className="p-1.5 text-zinc-400 hover:text-rose-400 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Artists Table */}
      {activeTab === 'artists' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {data?.artists?.map((artist: any) => (
            <div
              key={artist.id}
              className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3 flex flex-col justify-between"
            >
              <div className="flex items-center gap-3">
                <img
                  src={artist.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200'}
                  alt={artist.name}
                  className="w-12 h-12 rounded-full object-cover border border-zinc-700"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm text-white truncate">{artist.name}</h4>
                  <p className="text-xs text-zinc-400">{artist.genre}</p>
                </div>
              </div>
              <div className="text-[11px] text-zinc-500 flex items-center justify-between">
                <span>{artist.songs?.length || 0} Songs</span>
                <span>{artist.albums?.length || 0} Albums</span>
              </div>
              <button
                onClick={() => handleDeleteArtist(artist.id)}
                className="w-full py-1.5 rounded-xl border border-zinc-800 text-rose-400 hover:bg-rose-500/10 text-xs font-semibold"
              >
                Delete Artist
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Albums Table */}
      {activeTab === 'albums' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {data?.albums?.map((album: any) => (
            <div
              key={album.id}
              className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3 flex flex-col justify-between"
            >
              <div className="flex items-center gap-3">
                <img
                  src={album.coverUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200'}
                  alt={album.title}
                  className="w-12 h-12 rounded-xl object-cover border border-zinc-700"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm text-white truncate">{album.title}</h4>
                  <p className="text-xs text-zinc-400">{album.artist?.name}</p>
                </div>
              </div>
              <div className="text-[11px] text-zinc-500 flex items-center justify-between">
                <span>{album.genre}</span>
                <span>{album.songs?.length || 0} Tracks</span>
              </div>
              <button
                onClick={() => handleDeleteAlbum(album.id)}
                className="w-full py-1.5 rounded-xl border border-zinc-800 text-rose-400 hover:bg-rose-500/10 text-xs font-semibold"
              >
                Delete Album
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Song Modal */}
      {showAddSongModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateSong}
            className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-white">Add New Song</h3>

            <div>
              <label className="text-xs text-zinc-400 font-semibold block mb-1">Song Title</label>
              <input
                type="text"
                required
                value={songTitle}
                onChange={(e) => setSongTitle(e.target.value)}
                placeholder="e.g. Sukoon Ki Barsaat"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 font-semibold block mb-1">Artist</label>
                <select
                  value={songArtistId}
                  onChange={(e) => setSongArtistId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {data?.artists?.map((a: any) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-semibold block mb-1">Album (Optional)</label>
                <select
                  value={songAlbumId}
                  onChange={(e) => setSongAlbumId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="">None (Single)</option>
                  {data?.albums?.map((al: any) => (
                    <option key={al.id} value={al.id}>
                      {al.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-400 font-semibold block mb-1">Audio Stream URL (.mp3 / CDN)</label>
              <input
                type="url"
                required
                value={songAudioUrl}
                onChange={(e) => setSongAudioUrl(e.target.value)}
                placeholder="https://.../song.mp3"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400 font-semibold block mb-1">Cover Artwork URL</label>
              <input
                type="url"
                value={songCoverUrl}
                onChange={(e) => setSongCoverUrl(e.target.value)}
                placeholder="https://.../cover.jpg"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-zinc-400 font-semibold block mb-1">Duration (sec)</label>
                <input
                  type="number"
                  value={songDuration}
                  onChange={(e) => setSongDuration(parseInt(e.target.value, 10))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 font-semibold block mb-1">Genre</label>
                <select
                  value={songGenre}
                  onChange={(e) => setSongGenre(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {['Bollywood', 'Punjabi', 'Lo-Fi', 'Devotional', 'Indie', 'Party', 'Workout', 'Marathi'].map(
                    (g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 font-semibold block mb-1">Language</label>
                <select
                  value={songLanguage}
                  onChange={(e) => setSongLanguage(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {['Hindi', 'Punjabi', 'Marathi', 'English', 'Instrumental'].map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={songIsTrending}
                  onChange={(e) => setSongIsTrending(e.target.checked)}
                />
                <span>Set as Trending on Reels</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={songIsFeatured}
                  onChange={(e) => setSongIsFeatured(e.target.checked)}
                />
                <span>Set as Featured</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowAddSongModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-500 text-black font-bold text-xs shadow-md"
              >
                Save Song
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Artist Modal */}
      {showAddArtistModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateArtist}
            className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4"
          >
            <h3 className="text-lg font-bold text-white">Add New Artist</h3>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Artist Name</label>
              <input
                type="text"
                required
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Bio</label>
              <textarea
                value={artistBio}
                onChange={(e) => setArtistBio(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                rows={3}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Image URL</label>
              <input
                type="url"
                value={artistImage}
                onChange={(e) => setArtistImage(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowAddArtistModal(false)}
                className="px-4 py-2 text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-500 text-black font-bold rounded-xl text-xs"
              >
                Save Artist
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Album Modal */}
      {showAddAlbumModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateAlbum}
            className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4"
          >
            <h3 className="text-lg font-bold text-white">Add New Album</h3>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Album Title</label>
              <input
                type="text"
                required
                value={albumTitle}
                onChange={(e) => setAlbumTitle(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Artist</label>
              <select
                value={albumArtistId}
                onChange={(e) => setAlbumArtistId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                {data?.artists?.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Cover URL</label>
              <input
                type="url"
                value={albumCoverUrl}
                onChange={(e) => setAlbumCoverUrl(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Description</label>
              <textarea
                value={albumDesc}
                onChange={(e) => setAlbumDesc(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                rows={2}
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowAddAlbumModal(false)}
                className="px-4 py-2 text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-500 text-black font-bold rounded-xl text-xs"
              >
                Save Album
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
