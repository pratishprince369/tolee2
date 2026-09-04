'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ArrowLeft,
  MapPin,
  Eye,
  LogIn,
  Send,
  Repeat,
  Users,
  Sparkles
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toggleLike, addComment, toggleSavePost, toggleRepost } from '@/actions/post';
import { ShareModal } from '@/components/ShareModal';
import { HLSVideo } from '@/components/HLSVideo';
import { extractYouTubeVideoId, getYouTubeEmbedUrl, getYouTubeWatchUrl } from '@/lib/youtube';
import Link from 'next/link';

function formatDistanceToNowSafe(dateString: string | null | undefined): string {
  if (!dateString) return '';
  try {
    const past = new Date(dateString).getTime();
    if (isNaN(past)) return '';
    const now = Date.now();
    const diffInSeconds = Math.max(0, Math.floor((now - past) / 1000));

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
    return `${Math.floor(diffInSeconds / 31536000)}y ago`;
  } catch {
    return '';
  }
}

function renderFormattedCaption(text: string) {
  if (!text) return null;
  const parts = text.split(/(\s+)/);
  return parts.map((part, idx) => {
    if (part.startsWith('#') && part.length > 1) {
      return (
        <span key={idx} className="text-teal-400 font-semibold hover:underline">
          {part}
        </span>
      );
    }
    if (part.startsWith('@') && part.length > 1) {
      return (
        <span key={idx} className="text-emerald-400 font-semibold hover:underline">
          {part}
        </span>
      );
    }
    return part;
  });
}

interface PostViewerProps {
  post: {
    id: string;
    authorId: string | null;
    author: string;
    authorName: string;
    authorAvatar: string;
    authorIsPrivate?: boolean;
    toleeName: string | null;
    toleeSlug: string | null;
    postType: string;
    caption: string;
    mediaUrls: string;
    mediaTypes: string;
    image: string | null;
    video: string | null;
    visibility: string;
    likes: number;
    comments: number;
    reposts: number;
    views: number;
    likedByMe: boolean;
    savedByMe: boolean;
    repostedByMe: boolean;
    commentsList: any[];
    newsRelation?: any | null;
    location: string | null;
    subLocation: string | null;
    createdAt: string;
    isSimulation?: boolean;
  };
}

export default function PostViewer({ post }: PostViewerProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [mounted, setMounted] = useState(false);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [liked, setLiked] = useState(post.likedByMe || false);
  const [likesCount, setLikesCount] = useState(post.likes || 0);
  const [reposted, setReposted] = useState(post.repostedByMe || false);
  const [repostsCount, setRepostsCount] = useState(post.reposts || 0);
  const [saved, setSaved] = useState(post.savedByMe || false);
  const [comments, setComments] = useState<any[]>(post.commentsList || []);
  const [commentsCount, setCommentsCount] = useState(post.comments || 0);
  const [commentInput, setCommentInput] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Compute media list safely without hook overhead
  let allMediaUrls: string[] = [];
  if (post.mediaUrls && post.mediaUrls.trim() !== '') {
    const splitUrls = post.mediaUrls.split(/,(?=https?:\/\/)/).filter(Boolean);
    if (splitUrls.length > 0) allMediaUrls = splitUrls;
  }
  if (allMediaUrls.length === 0 && post.image) {
    allMediaUrls = [post.image];
  } else if (allMediaUrls.length === 0 && post.video) {
    allMediaUrls = [post.video];
  }

  let allMediaTypes: string[] = [];
  if (post.mediaTypes && post.mediaTypes.trim() !== '') {
    allMediaTypes = post.mediaTypes.split(',');
  } else if (post.video || post.postType === 'reel') {
    allMediaTypes = ['video'];
  } else if (post.image) {
    allMediaTypes = ['image'];
  }

  const hasMedia = allMediaUrls.length > 0;
  const currentMediaUrl = allMediaUrls[carouselIdx] || '';
  const currentMediaType = allMediaTypes[carouselIdx] || (post.video ? 'video' : (currentMediaUrl.includes('.m3u8') || currentMediaUrl.includes('.mp4') ? 'video' : 'image'));
  const isMultiple = allMediaUrls.length > 1;
  const isVideo = currentMediaType === 'video' || post.postType === 'reel' || currentMediaUrl.includes('.m3u8') || currentMediaUrl.includes('.mp4');

  const authorDisplayName = post.authorName || post.author || 'Tolee Creator';
  const authorUsername = post.author && !post.author.startsWith('cmt') && !post.author.includes(' ')
    ? post.author
    : (post.authorName ? post.authorName.toLowerCase().replace(/\s+/g, '_') : 'creator');
  const authorAvatarUrl = post.authorAvatar || '/default-user-avatar.svg';

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/feed');
    }
  };

  const handleLike = async () => {
    if (!session?.user) {
      setAuthPromptOpen(true);
      return;
    }
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount((c) => (newLiked ? c + 1 : Math.max(0, c - 1)));
    await toggleLike(post.id);
  };

  const handleRepost = async () => {
    if (!session?.user) {
      setAuthPromptOpen(true);
      return;
    }
    const newReposted = !reposted;
    setReposted(newReposted);
    setRepostsCount((c) => (newReposted ? c + 1 : Math.max(0, c - 1)));
    await toggleRepost(post.id);
  };

  const handleSave = async () => {
    if (!session?.user) {
      setAuthPromptOpen(true);
      return;
    }
    setSaved((s) => !s);
    await toggleSavePost(post.id);
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || submittingComment) return;
    if (!session?.user) {
      setAuthPromptOpen(true);
      return;
    }

    setSubmittingComment(true);
    const text = commentInput;
    setCommentInput('');
    const tempId = `temp_${Date.now()}`;
    const tempComment = {
      id: tempId,
      content: text,
      createdAt: new Date().toISOString(),
      likesCount: 0,
      likedByMe: false,
      author: {
        id: (session.user as any)?.id || 'me',
        name: session.user.name || 'You',
        username: (session.user as any)?.username || 'you',
        avatar: session.user.image || '/default-user-avatar.svg',
      },
      replies: [],
    };
    setComments((prev) => [tempComment, ...prev]);
    setCommentsCount((c) => c + 1);

    const result = await addComment(post.id, text);
    if (result.success && result.comment) {
      setComments((prev) =>
        prev.map((c) => (c.id === tempId ? { ...result.comment, createdAt: new Date().toISOString() } : c))
      );
    } else {
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      setCommentsCount((c) => Math.max(0, c - 1));
    }
    setSubmittingComment(false);
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const nextSlide = () => setCarouselIdx((i) => Math.min(i + 1, allMediaUrls.length - 1));
  const prevSlide = () => setCarouselIdx((i) => Math.max(i - 1, 0));

  const timeAgoString = mounted ? formatDistanceToNowSafe(post.createdAt) : '';

  return (
    <div className="min-h-screen bg-zinc-100/70 dark:bg-[#070b13] text-zinc-900 dark:text-zinc-50 flex flex-col font-sans selection:bg-teal-500 selection:text-black">
      {/* Top Header Navigation matching Tolee Branding */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-[#0a0f1d]/95 backdrop-blur-md border-b border-zinc-200/80 dark:border-[#141e33] shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-[#141e33] hover:bg-zinc-200 dark:hover:bg-[#1f2d4a] text-zinc-700 dark:text-gray-200 transition-all cursor-pointer shadow-xs active:scale-95"
            aria-label="Go to Feed"
            title="Back to Feed"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Center Tolee Wordmark */}
        <Link href="/feed" className="flex items-center gap-1 group">
          <span className="text-xl font-black tracking-tight text-zinc-900 dark:text-white group-hover:text-teal-500 transition-colors">
            tolee
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 -mt-2"></span>
        </Link>

        {/* Top Right Actions */}
        <div className="flex items-center gap-2">
          {!session?.user ? (
            <Link
              href={`/auth/signin?callbackUrl=/post/${post.id}`}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-black text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Log in</span>
            </Link>
          ) : (
            <button
              onClick={() => setShareModalOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-[#141e33] hover:bg-zinc-200 dark:hover:bg-[#1f2d4a] text-zinc-700 dark:text-gray-300 transition-colors cursor-pointer"
              title="Share Post"
            >
              <Share2 className="w-4.5 h-4.5" />
            </button>
          )}
        </div>
      </header>

      {/* Main Container - Centered Feed Post Card */}
      <main className="flex-1 w-full max-w-[620px] mx-auto py-3 sm:py-6 px-0 sm:px-4">
        <div className="bg-white dark:bg-[#000000] border border-gray-200/80 dark:border-zinc-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)] rounded-none sm:rounded-3xl overflow-hidden transition-all duration-300">
          
          {/* Tolee/Group Header if post belongs to a community */}
          {post.toleeName && (
            <div className="px-4 py-2.5 border-b border-gray-100 dark:border-zinc-900 flex items-center gap-2.5 bg-gray-50/70 dark:bg-zinc-900/30">
              <div className="w-7 h-7 bg-teal-500 dark:bg-zinc-800 rounded-full flex items-center justify-center text-white shrink-0 shadow-xs">
                <Users strokeWidth={2} className="w-4 h-4 text-white" />
              </div>
              <Link href={`/t/${post.toleeSlug || ''}`} className="flex-grow">
                <span className="text-[12px] font-extrabold text-teal-600 dark:text-zinc-200 hover:underline cursor-pointer uppercase tracking-wider">
                  {post.toleeName}
                </span>
              </Link>
            </div>
          )}

          {/* Creator Profile Header */}
          <div className="p-4 pb-2 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href={`/u/${authorUsername}`} className="shrink-0">
                <Avatar className="w-10 h-10 border border-zinc-100 dark:border-zinc-800 shadow-xs cursor-pointer">
                  <AvatarImage src={authorAvatarUrl} alt={authorDisplayName} />
                  <AvatarFallback className="bg-zinc-800 text-white font-bold">
                    {authorDisplayName?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex flex-col">
                <Link href={`/u/${authorUsername}`}>
                  <span className="font-bold text-[14.5px] text-zinc-900 dark:text-zinc-50 hover:underline cursor-pointer leading-none">
                    {authorDisplayName}
                  </span>
                </Link>
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 font-medium mt-1">
                  <span>@{authorUsername}</span>
                  {timeAgoString && (
                    <>
                      <span>•</span>
                      <span>{timeAgoString}</span>
                    </>
                  )}
                  {(post.location || post.subLocation) && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-0.5 text-teal-600 dark:text-teal-400">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span>{[post.location, post.subLocation].filter(Boolean).join(', ')}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShareModalOpen(true)}
                className="h-8 w-8 rounded-full flex items-center justify-center text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900/60 active:scale-95 transition-all cursor-pointer"
                title="Share Post"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Caption Content */}
          {post.caption && (
            <div className="px-5 py-2">
              <p className="text-[14.5px] leading-snug text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
                {renderFormattedCaption(post.caption)}
              </p>
            </div>
          )}

          {/* Media Presentation Container */}
          <div className="relative w-full overflow-hidden bg-black">
            {hasMedia ? (
              (() => {
                const ytVideoId = extractYouTubeVideoId(currentMediaUrl) || extractYouTubeVideoId(post.sourceUrl) || extractYouTubeVideoId(post.mediaUrls);
                if (ytVideoId) {
                  const embedSrc = getYouTubeEmbedUrl(ytVideoId, { autoplay: true, muted: muted, controls: true });
                  const watchUrl = getYouTubeWatchUrl(ytVideoId);
                  return (
                    <div className="relative w-full aspect-video sm:max-h-[640px] flex items-center justify-center bg-black overflow-hidden group">
                      <iframe
                        src={embedSrc}
                        title={post.caption || 'YouTube Video'}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="w-full h-full aspect-video border-0"
                      />
                      <a
                        href={watchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute top-3 right-3 px-3 py-1 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md text-white text-[11px] font-bold border border-white/20 transition-all opacity-0 group-hover:opacity-100 z-10"
                      >
                        Watch on YouTube
                      </a>
                    </div>
                  );
                }

                if (isVideo) {
                  return (
                    <div className="relative w-full aspect-square sm:aspect-auto sm:max-h-[640px] flex items-center justify-center group overflow-hidden">
                      <HLSVideo
                        ref={videoRef}
                        src={currentMediaUrl}
                        isActive={true}
                        shouldLoad={true}
                        ignoreGlobalActive={true}
                        contentId={post.id}
                        contentType="post"
                        className="w-full h-full max-h-[640px] object-contain cursor-pointer"
                        loop
                        muted={muted}
                        playsInline
                        autoPlay
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onClick={togglePlayPause}
                      />

                      {/* Center Play Overlay when Paused */}
                      {!isPlaying && (
                        <button
                          onClick={togglePlayPause}
                          className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white shadow-2xl hover:scale-110 active:scale-95 transition-all z-20 cursor-pointer"
                          aria-label="Play video"
                        >
                          <Play className="w-8 h-8 fill-white ml-1" />
                        </button>
                      )}

                      {/* Bottom Video Controls */}
                      <div className="absolute bottom-3 right-3 flex gap-2 z-20">
                        <button
                          onClick={() => {
                            const nextMuted = !muted;
                            setMuted(nextMuted);
                            if (videoRef.current) videoRef.current.muted = nextMuted;
                          }}
                          className="w-8 h-8 rounded-full bg-black/70 backdrop-blur-md flex items-center justify-center hover:bg-black/90 transition-all text-white shadow-lg cursor-pointer"
                          aria-label={muted ? "Unmute video" : "Mute video"}
                        >
                          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  );
                }

                return null;
              })() || (
                <div className="relative w-full flex items-center justify-center">
                  <div className="relative w-full flex items-center justify-center overflow-hidden bg-black">
                    <img
                      src={currentMediaUrl}
                      alt={post.caption || 'Post image'}
                      className="w-full h-auto max-h-[640px] object-contain select-none"
                    />
                  </div>

                  {isMultiple && (
                    <>
                      {carouselIdx > 0 && (
                        <button
                          onClick={prevSlide}
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/70 backdrop-blur-md flex items-center justify-center hover:bg-black/90 transition-all text-white shadow-lg cursor-pointer z-20"
                          aria-label="Previous slide"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                      )}
                      {carouselIdx < allMediaUrls.length - 1 && (
                        <button
                          onClick={nextSlide}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/70 backdrop-blur-md flex items-center justify-center hover:bg-black/90 transition-all text-white shadow-lg cursor-pointer z-20"
                          aria-label="Next slide"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      )}
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full z-20">
                        {allMediaUrls.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setCarouselIdx(i)}
                            className={`h-1.5 rounded-full transition-all cursor-pointer ${
                              i === carouselIdx ? 'bg-teal-400 w-3.5' : 'bg-white/40 w-1.5'
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )
            ) : (
              // Text-only Post Presentation
              <div className="w-full p-8 sm:p-12 bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-200 dark:from-[#0c1424] dark:via-[#09101d] dark:to-[#050a14] relative overflow-hidden flex flex-col justify-between">
                <p className="text-lg sm:text-xl font-medium text-zinc-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap">
                  {renderFormattedCaption(post.caption) || 'Shared post on Tolee.'}
                </p>
              </div>
            )}
          </div>

          {/* Social Action Bar (Tolee Feed Style) */}
          <div className="px-5 pb-4 pt-3 flex flex-col gap-3">
            <div className="flex items-center justify-between w-full pt-1 border-t border-zinc-100 dark:border-zinc-900/60">
              {/* Left Action Buttons */}
              <div className="flex items-center gap-5">
                {/* 1. Like Icon + Count */}
                <button
                  onClick={handleLike}
                  className={`flex items-center gap-1.5 transition-all duration-200 active:scale-110 focus:outline-none cursor-pointer ${
                    liked ? 'text-red-500' : 'text-zinc-600 dark:text-zinc-400 hover:text-red-500'
                  }`}
                  aria-label="Like"
                >
                  <Heart
                    strokeWidth={1.5}
                    className={`w-[22px] h-[22px] transition-colors ${
                      liked ? 'fill-red-500 stroke-red-500' : 'fill-transparent'
                    }`}
                  />
                  <span className="text-[13px] font-semibold">{likesCount}</span>
                </button>

                {/* 2. Comment Icon + Count */}
                <button
                  onClick={() => document.getElementById('post-comment-input')?.focus()}
                  className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 hover:text-blue-500 transition-all duration-200 active:scale-110 focus:outline-none cursor-pointer"
                  aria-label="Comment"
                >
                  <MessageCircle strokeWidth={1.5} className="w-[22px] h-[22px] fill-transparent" />
                  <span className="text-[13px] font-semibold">{commentsCount}</span>
                </button>

                {/* 3. Repost Icon + Count */}
                <button
                  onClick={handleRepost}
                  className={`flex items-center gap-1.5 transition-all duration-200 active:scale-110 focus:outline-none cursor-pointer ${
                    reposted ? 'text-green-500' : 'text-zinc-600 dark:text-zinc-400 hover:text-green-500'
                  }`}
                  aria-label="Repost"
                >
                  <Repeat strokeWidth={1.5} className={`w-[22px] h-[22px] transition-colors ${reposted ? 'text-green-500' : ''}`} />
                  {repostsCount > 0 && (
                    <span className="text-[13px] font-semibold">{repostsCount}</span>
                  )}
                </button>

                {/* 4. Share Icon */}
                <button
                  onClick={() => setShareModalOpen(true)}
                  className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 hover:text-teal-500 transition-all duration-200 active:scale-110 focus:outline-none cursor-pointer"
                  aria-label="Share"
                >
                  <Send strokeWidth={1.5} className="w-[22px] h-[22px] fill-transparent" />
                </button>
              </div>

              {/* Right Action: Views & Bookmark */}
              <div className="flex items-center gap-3">
                {post.views > 0 && (
                  <span className="flex items-center gap-1 text-[13px] font-semibold text-zinc-400 dark:text-zinc-500">
                    <Eye strokeWidth={1.5} className="w-[18px] h-[18px]" />
                    <span>{post.views}</span>
                  </span>
                )}
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1 transition-all duration-200 active:scale-125 focus:outline-none text-zinc-600 dark:text-zinc-400 hover:text-yellow-500 cursor-pointer"
                  aria-label="Save"
                >
                  <Bookmark
                    strokeWidth={1.5}
                    className={`w-[22px] h-[22px] transition-colors ${
                      saved ? 'fill-teal-500 text-teal-500 dark:fill-white dark:text-white' : 'fill-transparent'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Likes Summary Line */}
            {likesCount > 0 && (
              <div className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100">
                {likesCount} {likesCount === 1 ? 'like' : 'likes'}
              </div>
            )}

            {/* Comments Stream */}
            <div className="mt-2 pt-3 border-t border-zinc-100 dark:border-zinc-900/60 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                <span>Comments ({commentsCount})</span>
              </div>

              {comments.length === 0 ? (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 py-1">
                  No comments yet. Be the first to comment!
                </p>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-300 dark:scrollbar-thumb-white/10">
                  {comments.map((comment) => {
                    const commentAuthorName = comment.author?.name || comment.author?.username || 'User';
                    const commentAuthorUsername = comment.author?.username || 'user';
                    const commentAuthorAvatar = comment.author?.avatar || '/default-user-avatar.svg';

                    return (
                      <div key={comment.id} className="flex gap-2.5 text-xs group">
                        <Avatar className="w-7 h-7 shrink-0 mt-0.5 border border-zinc-200 dark:border-[#1b2b48]">
                          <AvatarImage src={commentAuthorAvatar} />
                          <AvatarFallback className="bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-white text-[9px] font-bold">
                            {commentAuthorName?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="bg-zinc-100 dark:bg-[#0e1626] border border-zinc-200/80 dark:border-[#16233a] px-3 py-2 rounded-2xl">
                            <span className="font-bold text-zinc-900 dark:text-white mr-1.5">
                              {commentAuthorUsername}
                            </span>
                            <span className="text-zinc-700 dark:text-gray-300 whitespace-pre-wrap">
                              {comment.content}
                            </span>
                          </div>
                          {comment.createdAt && mounted && (
                            <span className="text-[10px] text-zinc-400 dark:text-gray-500 mt-1 inline-block ml-2">
                              {formatDistanceToNowSafe(comment.createdAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Comment Input Form at Bottom */}
            <form onSubmit={handleComment} className="flex items-center gap-2.5 pt-2">
              <Avatar className="w-8 h-8 shrink-0 border border-zinc-200 dark:border-[#1b2b48]">
                <AvatarImage src={session?.user?.image || '/default-user-avatar.svg'} />
                <AvatarFallback className="bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-white text-[10px] font-bold">
                  {session?.user?.name?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <input
                id="post-comment-input"
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder={session?.user ? "Add a comment..." : "Log in to comment..."}
                className="flex-1 bg-zinc-50 dark:bg-[#0e1626] border border-zinc-200 dark:border-[#18263e] focus:border-teal-500 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-gray-500 outline-none transition-all"
              />
              <button
                type="submit"
                disabled={submittingComment || !commentInput.trim()}
                className="px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-30 text-black font-extrabold text-xs transition-all cursor-pointer shadow-xs"
              >
                Post
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Share Modal */}
      {shareModalOpen && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          postId={post.id}
          shareUrl={`https://tolee.in/post/${post.id}`}
          previewText={post.caption || 'Check out this post on Tolee!'}
          postMediaUrl={post.mediaUrls}
          postMediaType={post.mediaTypes}
          postAuthor={authorDisplayName}
          postAuthorAvatar={authorAvatarUrl}
          postCaption={post.caption}
        />
      )}

      {/* Auth Prompt Modal */}
      {authPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#0b1220] border border-zinc-200 dark:border-[#16233a] rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-teal-500/10 text-teal-500 flex items-center justify-center mx-auto text-xl font-bold">
              ✨
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">Join the Conversation</h3>
            <p className="text-xs text-zinc-500 dark:text-gray-400 leading-relaxed">
              Log in or sign up on Tolee to like, comment, repost, and connect with creators.
            </p>
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setAuthPromptOpen(false)}
                className="flex-1 py-2 rounded-xl bg-zinc-100 dark:bg-[#141f33] hover:bg-zinc-200 dark:hover:bg-[#1a2942] text-xs font-semibold text-zinc-700 dark:text-gray-300 transition-colors"
              >
                Cancel
              </button>
              <Link
                href={`/auth/signin?callbackUrl=/post/${post.id}`}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-xs font-bold text-black transition-all shadow-md flex items-center justify-center"
              >
                Log In
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
