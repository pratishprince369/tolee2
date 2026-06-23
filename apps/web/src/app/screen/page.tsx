'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Upload, Play, Tv, Eye, Calendar, Loader2, PlusCircle, CheckCircle2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useSession } from 'next-auth/react';
import { getScreenVideos, createMuxDirectUpload, saveScreenVideo } from '@/actions/screen';

// Helpers
function formatDuration(seconds: number | null) {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

export default function ScreenPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';

  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Upload Form States
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'requesting' | 'uploading' | 'processing' | 'done' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load videos
  useEffect(() => {
    async function loadVideos() {
      setLoading(true);
      const res = await getScreenVideos(debouncedQuery);
      if (res.success && res.videos) {
        setVideos(res.videos);
      }
      setLoading(false);
    }
    loadVideos();
  }, [debouncedQuery]);

  // Handle Drag & Drop File
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !uploadTitle.trim()) return;

    try {
      setIsUploading(true);
      setErrorMessage('');
      setUploadStatus('requesting');

      // 1. Get Direct Upload URL from Mux Server Action
      const res = await createMuxDirectUpload();
      if (!res.success || !res.url || !res.uploadId) {
        throw new Error(res.error || 'Failed to initiate Mux upload URL');
      }

      setUploadStatus('uploading');

      // 2. Upload file directly to Mux with PUT request & progress tracking
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', res.url);
      xhr.setRequestHeader('Content-Type', selectedFile.type);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      };

      const uploadPromise = new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
      });

      xhr.send(selectedFile);
      await uploadPromise;

      // 3. Save details to database (polls Mux for asset creation)
      setUploadStatus('processing');
      const saveRes = await saveScreenVideo(uploadTitle, uploadDescription, res.uploadId);

      if (saveRes.success) {
        setUploadStatus('done');
        // Refresh videos list
        const refreshRes = await getScreenVideos(debouncedQuery);
        if (refreshRes.success && refreshRes.videos) {
          setVideos(refreshRes.videos);
        }
        // Reset state & close modal
        setTimeout(() => {
          setShowUploadModal(false);
          resetUploadState();
        }, 1500);
      } else {
        throw new Error(saveRes.error || 'Failed to save video details in database');
      }
    } catch (err: any) {
      console.error(err);
      setUploadStatus('error');
      setErrorMessage(err.message || 'An error occurred during video upload');
      setIsUploading(false);
    }
  };

  const resetUploadState = () => {
    setUploadTitle('');
    setUploadDescription('');
    setSelectedFile(null);
    setIsUploading(false);
    setUploadProgress(0);
    setUploadStatus('idle');
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 pb-12 pt-6 px-4 md:px-8">
      {/* Top Header bar */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6 mb-8">
        
        {/* Left: Branding */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-red-650 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/10">
            <Tv className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">Tolee Screen</h1>
            <p className="text-xs text-zinc-500 font-medium">YouTube-style dynamic video streaming</p>
          </div>
        </div>

        {/* Center: Search & Filter */}
        <div className="flex-1 max-w-lg relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search videos, creators, or topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-550/20 focus:border-red-550 transition-all shadow-sm"
          />
        </div>

        {/* Right: Upload Trigger */}
        {isAuthenticated ? (
          <Button
            onClick={() => setShowUploadModal(true)}
            className="bg-red-650 hover:bg-red-750 text-white font-bold rounded-2xl px-6 py-5 flex items-center gap-2 transform active:scale-95 transition-all shadow-lg shadow-red-600/10"
          >
            <Upload className="w-4 h-4" />
            Upload Video
          </Button>
        ) : (
          <Button
            onClick={() => router.push(`/auth/signin?callbackUrl=/screen`)}
            className="bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white font-bold rounded-2xl px-6 py-5"
          >
            Sign in to upload
          </Button>
        )}
      </div>

      {/* Main Grid Content */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-3">
            <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
            <p className="text-sm font-semibold text-zinc-400">Loading videos list...</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-24 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 rounded-3xl p-8 max-w-md mx-auto space-y-4 shadow-sm">
            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto text-3xl">
              📹
            </div>
            <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">No Videos Found</h3>
            <p className="text-zinc-400 text-xs leading-relaxed">
              {debouncedQuery 
                ? "We couldn't find any videos matching your search. Try another query!" 
                : "No videos have been uploaded yet. Be the first to share a video on Tolee Screen!"}
            </p>
            {isAuthenticated && !debouncedQuery && (
              <Button onClick={() => setShowUploadModal(true)} className="bg-red-650 hover:bg-red-750 text-white font-bold rounded-xl text-xs py-4 px-5">
                Upload Now
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {videos.map((video) => (
              <Link 
                href={`/screen/watch/${video.id}`} 
                key={video.id} 
                className="group flex flex-col gap-3 cursor-pointer"
              >
                {/* Thumbnail card */}
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-zinc-250 dark:bg-zinc-800 shadow-sm border border-zinc-200/50 dark:border-zinc-800/50">
                  {video.muxPlaybackId ? (
                    <img 
                      src={`https://image.mux.com/${video.muxPlaybackId}/thumbnail.png?width=640&height=360&fit_mode=smartcrop`}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Tv className="w-8 h-8 text-zinc-400" />
                    </div>
                  )}

                  {/* Play Hover Overlay */}
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                    <div className="w-12 h-12 bg-red-650 rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-200">
                      <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                    </div>
                  </div>

                  {/* Duration Badge */}
                  {video.duration && (
                    <span className="absolute bottom-2.5 right-2.5 bg-black/75 px-2 py-0.5 rounded text-[10px] font-bold text-white tracking-wide font-mono">
                      {formatDuration(video.duration)}
                    </span>
                  )}
                </div>

                {/* Video Info Details */}
                <div className="flex gap-3 px-1">
                  <Avatar className="w-9 h-9 border border-zinc-200 dark:border-zinc-800">
                    <AvatarImage src={video.user.avatar} />
                    <AvatarFallback className="bg-zinc-200 dark:bg-zinc-800 text-xs font-bold text-red-600">
                      {video.user.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug group-hover:text-red-550 transition-colors">
                      {video.title}
                    </h4>
                    <p className="text-xs text-zinc-500 font-semibold mt-1 truncate hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors">
                      {video.user.name}
                    </p>
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-0.5 font-medium">
                      <span className="flex items-center gap-0.5">
                        <Eye className="w-3 h-3" />
                        {video.viewsCount} views
                      </span>
                      <span>•</span>
                      <span>{formatTimeAgo(video.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Upload Video Modal Popup */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 max-w-lg w-full rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative">
            <h3 className="text-xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-red-600" />
              Upload video to Tolee Screen
            </h3>

            {uploadStatus === 'idle' && (
              <form onSubmit={handleUploadSubmit} className="space-y-4">
                {/* Title */}
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Video Title</label>
                  <input
                    type="text"
                    required
                    placeholder="Provide a catchy title..."
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    className="w-full p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-550/20 focus:border-red-550 transition-all"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Tell your viewers what the video is about..."
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    className="w-full p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-550/20 focus:border-red-550 transition-all resize-none"
                  />
                </div>

                {/* Video Dropzone */}
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Video File</label>
                  <div className="relative border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-red-500/50 rounded-2xl p-6 text-center cursor-pointer bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/10 transition-colors">
                    <input
                      type="file"
                      accept="video/*"
                      required
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Tv className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                    {selectedFile ? (
                      <p className="text-sm font-bold text-red-550 truncate max-w-xs mx-auto">
                        {selectedFile.name}
                      </p>
                    ) : (
                      <>
                        <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                          Select a video file to upload
                        </p>
                        <p className="text-[10px] text-zinc-400 mt-1">MP4, WEBM or MOV files supported</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-3">
                  <Button
                    type="submit"
                    disabled={!selectedFile || !uploadTitle.trim()}
                    className="flex-1 py-5 bg-red-650 hover:bg-red-750 text-white font-bold rounded-xl text-xs"
                  >
                    Start Upload
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setShowUploadModal(false);
                      resetUploadState();
                    }}
                    variant="outline"
                    className="flex-1 py-5 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold rounded-xl text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            {/* Uploading states */}
            {uploadStatus === 'requesting' && (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
                <p className="text-sm font-bold text-zinc-600 dark:text-zinc-300">Initiating secure Mux upload...</p>
              </div>
            )}

            {uploadStatus === 'uploading' && (
              <div className="py-12 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
                <div className="text-center w-full max-w-xs space-y-1.5">
                  <p className="text-sm font-bold text-zinc-600 dark:text-zinc-300">Uploading video files...</p>
                  <p className="text-xs text-zinc-400 font-medium">Please do not close this window</p>
                  <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden mt-3">
                    <div 
                      className="bg-red-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-[11px] font-bold text-red-550 mt-1">{uploadProgress}% uploaded</p>
                </div>
              </div>
            )}

            {uploadStatus === 'processing' && (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
                <p className="text-sm font-bold text-zinc-600 dark:text-zinc-300 text-center">
                  Mux is creating video streams...
                </p>
                <p className="text-xs text-zinc-400 text-center max-w-xs">
                  Almost done! Registering metadata and generating adaptive player tokens.
                </p>
              </div>
            )}

            {uploadStatus === 'done' && (
              <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
                <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center text-green-500">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <p className="text-base font-black text-zinc-850 dark:text-white">Video Published Successfully!</p>
                <p className="text-xs text-zinc-400">Your video is now live on Tolee Screen.</p>
              </div>
            )}

            {uploadStatus === 'error' && (
              <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
                <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-red-500 text-2xl">
                  ⚠️
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Upload Failed</p>
                  <p className="text-xs text-red-500 font-medium max-w-xs">{errorMessage}</p>
                </div>
                <Button 
                  onClick={resetUploadState}
                  className="bg-red-650 hover:bg-red-750 text-white font-bold rounded-xl text-xs py-4 px-6"
                >
                  Try Again
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
