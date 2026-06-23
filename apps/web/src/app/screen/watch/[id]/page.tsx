'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, Calendar, Loader2, Play, Tv, Share2, ThumbsUp, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useSession } from 'next-auth/react';
import MuxPlayer from '@mux/mux-player-react';
import { getScreenVideoDetails } from '@/actions/screen';

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

interface PageProps {
  params: {
    id: string;
  };
}

export default function WatchVideoPage({ params }: PageProps) {
  const router = useRouter();
  const { data: session } = useSession();

  const [video, setVideo] = useState<any>(null);
  const [recommended, setRecommended] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    async function loadVideoDetails() {
      setLoading(true);
      const res = await getScreenVideoDetails(params.id);
      if (res.success && res.video) {
        setVideo(res.video);
        setRecommended(res.recommended || []);
      } else {
        alert(res.error || 'Video not found');
        router.push('/screen');
      }
      setLoading(false);
    }
    loadVideoDetails();
  }, [params.id]);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      alert('📋 Video link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white space-y-3">
        <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
        <p className="text-sm font-semibold text-zinc-400">Loading video player...</p>
      </div>
    );
  }

  if (!video) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 pb-12 pt-6 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Back Link Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link 
            href="/screen" 
            className="flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Tolee Screen
          </Link>
          
          <div className="flex items-center gap-1 text-red-600 font-black tracking-widest text-xs uppercase">
            <Tv className="w-4 h-4" />
            Tolee Screen Player
          </div>
        </div>

        {/* Two Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Player & Meta details */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Custom Mux Video Player */}
            <div className="relative aspect-video rounded-3xl overflow-hidden bg-black shadow-2xl border border-zinc-200 dark:border-zinc-900">
              {video.muxPlaybackId ? (
                <MuxPlayer
                  playbackId={video.muxPlaybackId}
                  metadataVideoTitle={video.title}
                  metadataViewerUserId={session?.user ? (session.user as any).id : undefined}
                  primaryColor="#ef4444"
                  secondaryColor="#09090b"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-8 h-8 text-zinc-600 animate-spin" />
                  <p className="text-sm font-medium text-zinc-500">Preparing stream...</p>
                </div>
              )}
            </div>

            {/* Video metadata */}
            <div className="space-y-4">
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-zinc-900 dark:text-white leading-tight">
                {video.title}
              </h1>

              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800/80 pb-4">
                
                {/* Views & Timestamp info */}
                <div className="flex items-center gap-2 text-xs text-zinc-500 font-semibold">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    {video.viewsCount} views
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatTimeAgo(video.createdAt)}
                  </span>
                </div>

                {/* Engagement Action buttons */}
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => setLiked(!liked)}
                    variant="outline"
                    className={`rounded-full px-5 py-4 text-xs font-bold flex items-center gap-1.5 border-zinc-200 dark:border-zinc-800 transition-all ${
                      liked 
                        ? 'bg-red-50 dark:bg-red-950/20 text-red-600 border-red-500/30' 
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                    }`}
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 ${liked ? 'fill-red-600' : ''}`} />
                    {liked ? 'Liked' : 'Like'}
                  </Button>

                  <Button
                    onClick={handleShare}
                    variant="outline"
                    className="rounded-full px-5 py-4 text-xs font-bold flex items-center gap-1.5 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-all"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Share
                  </Button>
                </div>
              </div>
            </div>

            {/* Creator details card */}
            <div className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 p-5 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3.5">
                <Avatar className="w-12 h-12 border border-zinc-200 dark:border-zinc-800">
                  <AvatarImage src={video.user.avatar} />
                  <AvatarFallback className="bg-zinc-200 dark:bg-zinc-800 text-sm font-bold text-red-600">
                    {video.user.name[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">
                    {video.user.name}
                  </h3>
                  <p className="text-xs text-zinc-500 font-semibold mt-0.5">
                    @{video.user.username || 'creator'}
                  </p>
                </div>
              </div>

              <Button className="bg-zinc-950 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-950 text-white font-bold rounded-xl text-xs py-4 px-6">
                Subscribe
              </Button>
            </div>

            {/* Expandable description box */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 p-5 rounded-2xl shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Description</h4>
              <p className={`text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium whitespace-pre-wrap ${
                !showFullDescription && video.description && video.description.length > 250 ? 'line-clamp-3' : ''
              }`}>
                {video.description || 'No description provided for this video.'}
              </p>
              
              {video.description && video.description.length > 250 && (
                <button
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="text-xs font-bold text-red-550 hover:text-red-650 transition-colors mt-3 block"
                >
                  {showFullDescription ? 'Show Less' : 'Read More'}
                </button>
              )}
            </div>

          </div>

          {/* Right Column: Recommended videos list */}
          <div className="lg:col-span-4 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2 px-1">
              Up Next
            </h3>

            {recommended.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-850 rounded-2xl text-zinc-500 text-xs p-4 leading-relaxed font-semibold">
                No recommended videos right now. Try uploading more videos!
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {recommended.map((item) => (
                  <Link 
                    href={`/screen/watch/${item.id}`} 
                    key={item.id} 
                    className="flex gap-3.5 group cursor-pointer"
                  >
                    {/* Left side: Thumbnail */}
                    <div className="relative w-36 aspect-video rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 flex-shrink-0 border border-zinc-200/40 dark:border-zinc-800/50">
                      {item.muxPlaybackId ? (
                        <img 
                          src={`https://image.mux.com/${item.muxPlaybackId}/thumbnail.png?width=320&height=180&fit_mode=smartcrop`}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Tv className="w-6 h-6 text-zinc-400" />
                        </div>
                      )}

                      {/* Duration Overlay */}
                      {item.duration && (
                        <span className="absolute bottom-1.5 right-1.5 bg-black/80 px-1.5 py-0.5 rounded text-[8px] font-bold text-white tracking-wide font-mono">
                          {formatDuration(item.duration)}
                        </span>
                      )}
                    </div>

                    {/* Right side: Meta details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug group-hover:text-red-550 transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-[10px] text-zinc-500 font-bold mt-1 truncate">
                        {item.user.name}
                      </p>
                      <div className="flex items-center gap-1 text-[9px] text-zinc-400 mt-0.5 font-semibold">
                        <span>{item.viewsCount} views</span>
                        <span>•</span>
                        <span>{formatTimeAgo(item.createdAt)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
