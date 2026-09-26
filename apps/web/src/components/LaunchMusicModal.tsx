'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Music,
  Disc,
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileAudio,
  Image as ImageIcon,
} from 'lucide-react';
import { userLaunchSongAction, userLaunchAlbumAction } from '@/actions/songs';

interface LaunchMusicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const GENRES = [
  'Bollywood',
  'Punjabi',
  'Indie',
  'Lo-Fi',
  'Devotional',
  'Party',
  'Workout',
  'Romantic',
  'Marathi',
  'Podcasts',
  'Classical',
  'Hip-Hop',
];

const LANGUAGES = ['Hindi', 'Punjabi', 'Marathi', 'English', 'Bhojpuri', 'Gujarati', 'Bengali', 'Tamil', 'Telugu', 'Instrumental'];

export function LaunchMusicModal({ isOpen, onClose, onSuccess }: LaunchMusicModalProps) {
  const [mode, setMode] = useState<'song' | 'album'>('song');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Single Song state
  const [songTitle, setSongTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [genre, setGenre] = useState('Indie');
  const [language, setLanguage] = useState('Hindi');
  const [duration, setDuration] = useState(180);
  const [isExplicit, setIsExplicit] = useState(false);
  const [albumNameForSong, setAlbumNameForSong] = useState('');

  // Album state
  const [albumTitle, setAlbumTitle] = useState('');
  const [albumDescription, setAlbumDescription] = useState('');
  const [albumTracks, setAlbumTracks] = useState<
    Array<{ id: string; title: string; audioUrl: string; duration: number; isExplicit: boolean }>
  >([
    { id: '1', title: '', audioUrl: '', duration: 180, isExplicit: false },
  ]);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const trackAudioInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  if (!isOpen) return null;

  const handleFileUpload = async (file: File, type: 'audio' | 'cover'): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload file');
      }
      return data.url;
    } catch (err: any) {
      setError(err.message || 'Upload error');
      return null;
    }
  };

  const onCoverSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    setError(null);
    const url = await handleFileUpload(file, 'cover');
    if (url) setCoverUrl(url);
    setUploadingCover(false);
  };

  const onAudioSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAudio(true);
    setError(null);
    const url = await handleFileUpload(file, 'audio');
    if (url) {
      setAudioUrl(url);
      if (!songTitle) {
        setSongTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
    setUploadingAudio(false);
  };

  const handleTrackAudioUpload = async (trackId: string, file: File) => {
    setError(null);
    const url = await handleFileUpload(file, 'audio');
    if (url) {
      setAlbumTracks((prev) =>
        prev.map((t) =>
          t.id === trackId
            ? { ...t, audioUrl: url, title: t.title || file.name.replace(/\.[^/.]+$/, '') }
            : t
        )
      );
    }
  };

  const addAlbumTrack = () => {
    setAlbumTracks((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        title: '',
        audioUrl: '',
        duration: 180,
        isExplicit: false,
      },
    ]);
  };

  const removeAlbumTrack = (id: string) => {
    if (albumTracks.length <= 1) return;
    setAlbumTracks((prev) => prev.filter((t) => t.id !== id));
  };

  const updateAlbumTrack = (id: string, field: string, value: any) => {
    setAlbumTracks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (mode === 'song') {
        if (!songTitle.trim()) throw new Error('Please provide a song title');
        if (!audioUrl.trim()) throw new Error('Please upload an audio file for your track');

        const res = await userLaunchSongAction({
          title: songTitle,
          artistName: artistName || undefined,
          audioUrl,
          coverUrl: coverUrl || undefined,
          genre,
          language,
          duration,
          isExplicit,
          newAlbumTitle: albumNameForSong.trim() || undefined,
        });

        if (!res.success) throw new Error(res.error || 'Failed to launch track');
        setSuccessMsg(`🎵 "${songTitle}" launched successfully on Tolee Songs!`);
      } else {
        if (!albumTitle.trim()) throw new Error('Please provide an album title');
        const validTracks = albumTracks.filter((t) => t.title.trim() && t.audioUrl.trim());
        if (validTracks.length === 0) {
          throw new Error('Please add at least one track with title and audio file');
        }

        const res = await userLaunchAlbumAction({
          title: albumTitle,
          artistName: artistName || undefined,
          coverUrl: coverUrl || undefined,
          genre,
          description: albumDescription || undefined,
          tracks: validTracks.map((t) => ({
            title: t.title,
            audioUrl: t.audioUrl,
            duration: t.duration,
            isExplicit: t.isExplicit,
            genre,
            language,
          })),
        });

        if (!res.success) throw new Error(res.error || 'Failed to launch album');
        setSuccessMsg(`💿 Album "${albumTitle}" with ${validTracks.length} tracks launched on Tolee Songs!`);
      }

      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1400);
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0a7c85] to-[#2dd4bf] flex items-center justify-center shadow-lg shadow-[#0a7c85]/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Launch Music on Tolee
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-[#0a7c85]/20 text-[#2dd4bf] border border-[#0a7c85]/30">
                  Creator
                </span>
              </h3>
              <p className="text-xs text-zinc-400">Release your original tracks or full albums for everyone</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/60 p-2 gap-2">
          <button
            type="button"
            onClick={() => setMode('song')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              mode === 'song'
                ? 'bg-[#0a7c85] text-white shadow-md shadow-[#0a7c85]/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Music className="w-4 h-4" />
            Launch Single Track
          </button>
          <button
            type="button"
            onClick={() => setMode('album')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              mode === 'album'
                ? 'bg-[#0a7c85] text-white shadow-md shadow-[#0a7c85]/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Disc className="w-4 h-4" />
            Launch Complete Album
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Cover Art & Basic Info */}
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="w-full sm:w-36 h-36 rounded-2xl border-2 border-dashed border-zinc-700 hover:border-[#2dd4bf] relative overflow-hidden flex flex-col items-center justify-center cursor-pointer bg-zinc-950/60 group shrink-0"
              onClick={() => coverInputRef.current?.click()}
            >
              {coverUrl ? (
                <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-3">
                  {uploadingCover ? (
                    <Loader2 className="w-6 h-6 text-[#2dd4bf] animate-spin mx-auto mb-1" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-zinc-500 group-hover:text-[#2dd4bf] mx-auto mb-1" />
                  )}
                  <span className="text-[11px] text-zinc-400 block font-semibold">
                    {uploadingCover ? 'Uploading...' : 'Cover Image'}
                  </span>
                  <span className="text-[9px] text-zinc-500 block">Square JPG/PNG</span>
                </div>
              )}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onCoverSelected}
              />
            </div>

            <div className="flex-1 w-full space-y-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                  {mode === 'song' ? 'Song Title *' : 'Album Title *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={mode === 'song' ? 'e.g. Tum Hi Ho (Acoustic)' : 'e.g. Midnight Chai Sessions'}
                  value={mode === 'song' ? songTitle : albumTitle}
                  onChange={(e) =>
                    mode === 'song' ? setSongTitle(e.target.value) : setAlbumTitle(e.target.value)
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#2dd4bf]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                  Artist / Band / Creator Name
                </label>
                <input
                  type="text"
                  placeholder="Leave blank to use your Tolee profile name"
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#2dd4bf]"
                />
              </div>
            </div>
          </div>

          {/* Genre & Language */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-zinc-300 block mb-1">Genre</label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#2dd4bf]"
              >
                {GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-zinc-300 block mb-1">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#2dd4bf]"
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* MODE: SINGLE SONG SPECIFIC */}
          {mode === 'song' && (
            <div className="space-y-4 pt-2 border-t border-zinc-800/80">
              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1.5">
                  Audio Track (MP3 / M4A / WAV) *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Upload audio file or paste direct URL"
                    value={audioUrl}
                    onChange={(e) => setAudioUrl(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#2dd4bf]"
                  />
                  <button
                    type="button"
                    onClick={() => audioInputRef.current?.click()}
                    disabled={uploadingAudio}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap"
                  >
                    {uploadingAudio ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#2dd4bf]" />
                    ) : (
                      <Upload className="w-4 h-4 text-[#2dd4bf]" />
                    )}
                    Upload File
                  </button>
                  <input
                    ref={audioInputRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={onAudioSelected}
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                  Album Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Single Release or Custom Album"
                  value={albumNameForSong}
                  onChange={(e) => setAlbumNameForSong(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#2dd4bf]"
                />
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={isExplicit}
                    onChange={(e) => setIsExplicit(e.target.checked)}
                    className="rounded bg-zinc-900 border-zinc-700 text-[#0a7c85] focus:ring-0"
                  />
                  <span>Explicit Content (18+)</span>
                </label>
              </div>
            </div>
          )}

          {/* MODE: ALBUM SPECIFIC */}
          {mode === 'album' && (
            <div className="space-y-4 pt-2 border-t border-zinc-800/80">
              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                  Album Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Tell listeners what this album is about..."
                  value={albumDescription}
                  onChange={(e) => setAlbumDescription(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#2dd4bf]"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-zinc-300">
                    Album Tracks ({albumTracks.length})
                  </label>
                  <button
                    type="button"
                    onClick={addAlbumTrack}
                    className="text-xs text-[#2dd4bf] hover:underline font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Track
                  </button>
                </div>

                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {albumTracks.map((track, idx) => (
                    <div
                      key={track.id}
                      className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800/80 flex flex-col gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-zinc-500 w-4">{idx + 1}.</span>
                        <input
                          type="text"
                          placeholder="Track Title"
                          value={track.title}
                          onChange={(e) => updateAlbumTrack(track.id, 'title', e.target.value)}
                          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#2dd4bf]"
                        />
                        {albumTracks.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeAlbumTrack(track.id)}
                            className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pl-6">
                        <input
                          type="text"
                          placeholder="Audio URL or upload track"
                          value={track.audioUrl}
                          onChange={(e) => updateAlbumTrack(track.id, 'audioUrl', e.target.value)}
                          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1 text-xs text-white focus:outline-none focus:border-[#2dd4bf]"
                        />
                        <button
                          type="button"
                          onClick={() => trackAudioInputRefs.current[track.id]?.click()}
                          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-xl flex items-center gap-1"
                        >
                          <Upload className="w-3 h-3 text-[#2dd4bf]" />
                          Audio
                        </button>
                        <input
                          ref={(el) => (trackAudioInputRefs.current[track.id] = el)}
                          type="file"
                          accept="audio/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleTrackAudioUpload(track.id, f);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer Submit Button */}
          <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 rounded-full text-xs font-bold text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || uploadingAudio || uploadingCover}
              className="px-6 py-2.5 rounded-full text-xs font-black text-white bg-gradient-to-r from-[#0a7c85] to-[#2dd4bf] hover:opacity-90 transition shadow-lg shadow-[#0a7c85]/20 flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {mode === 'song' ? 'Launch Audio Track' : 'Launch Album'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
