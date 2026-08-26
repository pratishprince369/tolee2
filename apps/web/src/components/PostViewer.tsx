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
  MoreHorizontal,
  ArrowLeft,
  MapPin,
  Eye,
  LogIn,
  Send,
  Sparkles,
  FileText
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toggleLike, addComment, toggleSavePost } from '@/actions/post';
import { ShareModal } from '@/components/ShareModal';
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
  const [saved, setSaved] = useState(post.savedByMe || false);
  const [comments, setComments] = useState<any[]>(post.commentsList || []);
  const [commentsCount, setCommentsCount] = useState(post.comments || 0);
  const [commentInput, setCommentInput] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
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
  const currentMediaType = allMediaTypes[carouselIdx] || (post.video ? 'video' : 'image');
  const isMultiple = allMediaUrls.length > 1;
  const isVideo = currentMediaType === 'video' || post.postType === 'reel';

  const authorDisplayName = post.authorName || 'Tolee Creator';
  const authorUsername = post.author && !post.author.includes(' ') ? post.author : (post.authorId || 'creator');
  const authorAvatarUrl = post.authorAvatar || '/default-user-avatar.svg';

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
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
    <div className="min-h-screen bg-[#070b13] text-white flex flex-col font-sans selection:bg-teal-500 selection:text-black">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-[#0a0f1d]/90 backdrop-blur-md border-b border-[#141e33]">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#141e33] hover:bg-[#1f2d4a] text-gray-300 hover:text-white transition-all shadow-sm"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Post</span>
              {post.toleeName && (
                <span className="text-xs font-normal text-teal-400 bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-800/40">
                  {post.toleeName}
                </span>
              )}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!session?.user ? (
            <Link
              href={`/auth/signin?callbackUrl=/post/${post.id}`}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-black text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Log in to interact</span>
            </Link>
          ) : (
            <button
              onClick={() => setShareModalOpen(true)}
              className="p-2 rounded-xl bg-[#141e33] hover:bg-[#1f2d4a] text-gray-300 hover:text-white transition-colors"
              title="Share Post"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="flex-1 flex flex-col lg:flex-row lg:max-h-[calc(100vh-57px)] overflow-hidden">
        {/* LEFT PANEL: Media or Prominent Post Card */}
        <div className="relative bg-[#02050b] flex items-center justify-center lg:flex-1 lg:max-h-full p-4 min-h-[340px]">
          {hasMedia ? (
            isVideo ? (
              <div className="relative w-full max-w-2xl mx-auto aspect-[9/16] lg:aspect-auto lg:h-full flex items-center justify-center">
                <video
                  ref={videoRef}
                  src={currentMediaUrl}
                  className="w-full h-full max-h-[calc(100vh-80px)] object-contain rounded-2xl"
                  loop
                  muted={muted}
                  playsInline
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onClick={togglePlayPause}
                />
                <div className="absolute bottom-4 left-4 flex gap-2">
                  <button
                    onClick={togglePlayPause}
                    className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center hover:bg-black/80 transition-all text-white shadow-lg"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                  </button>
                  <button
                    onClick={() => {
                      setMuted((m) => !m);
                      if (videoRef.current) videoRef.current.muted = !muted;
                    }}
                    className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center hover:bg-black/80 transition-all text-white shadow-lg"
                  >
                    {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative w-full max-w-2xl mx-auto flex items-center justify-center">
                <div className="relative aspect-square lg:aspect-auto lg:max-h-[calc(100vh-80px)] w-full flex items-center justify-center overflow-hidden rounded-2xl bg-[#060b16]">
                  <img
                    src={currentMediaUrl}
                    alt={post.caption || 'Post image'}
                    className="w-full h-full object-contain max-h-[calc(100vh-80px)]"
                  />
                </div>
                {isMultiple && (
                  <>
                    {carouselIdx > 0 && (
                      <button
                        onClick={prevSlide}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/70 backdrop-blur-md flex items-center justify-center hover:bg-black/90 transition-all text-white shadow-lg"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                    )}
                    {carouselIdx < allMediaUrls.length - 1 && (
                      <button
                        onClick={nextSlide}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/70 backdrop-blur-md flex items-center justify-center hover:bg-black/90 transition-all text-white shadow-lg"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    )}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
                      {allMediaUrls.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCarouselIdx(i)}
                          className={`h-1.5 rounded-full transition-all ${
                            i === carouselIdx ? 'bg-teal-400 w-4' : 'bg-white/40 w-1.5'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )
          ) : (
            // Text-only post presentation card
            <div className="w-full max-w-xl p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-[#0c1424] via-[#09101d] to-[#050a14] border border-[#17253f] shadow-2xl relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex items-center gap-3.5 mb-6">
                <Link href={`/u/${authorUsername}`} className="shrink-0">
                  <Avatar className="w-12 h-12 border-2 border-teal-500/40 shadow-inner">
                    <AvatarImage src={authorAvatarUrl} />
                    <AvatarFallback className="bg-zinc-800 text-white font-bold">
                      {authorDisplayName?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div>
                  <Link href={`/u/${authorUsername}`} className="text-base font-bold text-white hover:underline block">
                    {authorDisplayName}
                  </Link>
                  <p className="text-xs text-gray-400">@{authorUsername}</p>
                </div>
              </div>

              <div className="my-6">
                <p className="text-lg sm:text-xl font-medium text-gray-100 leading-relaxed whitespace-pre-wrap">
                  {post.caption || 'Shared post on Tolee.'}
                </p>
              </div>

              {(post.location || post.subLocation) && (
                <div className="flex items-center gap-1.5 text-xs text-teal-400 font-medium">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{[post.location, post.subLocation].filter(Boolean).join(', ')}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Author, Caption, Comments & Actions */}
        <div className="lg:w-[420px] lg:border-l border-[#141e33] flex flex-col bg-[#090e1a] lg:overflow-hidden">
          {/* Author Header */}
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#141e33]">
            <div className="flex items-center gap-3 min-w-0">
              <Link href={`/u/${authorUsername}`} className="shrink-0">
                <Avatar className="w-10 h-10 border border-[#1b2b48]">
                  <AvatarImage src={authorAvatarUrl} />
                  <AvatarFallback className="bg-zinc-800 text-white text-xs font-bold">
                    {authorDisplayName?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="min-w-0">
                <Link href={`/u/${authorUsername}`} className="text-sm font-bold text-white hover:underline truncate block">
                  {authorDisplayName}
                </Link>
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <span>@{authorUsername}</span>
                  {post.toleeName && (
                    <>
                      <span>•</span>
                      <Link href={`/t/${post.toleeSlug || ''}`} className="text-teal-400 hover:underline truncate">
                        {post.toleeName}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShareModalOpen(true)}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#141e33] transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {/* Caption & Comments List (Scrollable) */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
            {/* Caption in list if media exists */}
            {hasMedia && post.caption && (
              <div className="flex gap-3.5 pb-4 border-b border-[#141e33]">
                <Avatar className="w-8 h-8 shrink-0 mt-0.5 border border-[#1b2b48]">
                  <AvatarImage src={authorAvatarUrl} />
                  <AvatarFallback className="bg-zinc-800 text-white text-[10px] font-bold">
                    {authorDisplayName?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                    <Link href={`/u/${authorUsername}`} className="font-bold text-white mr-1.5 hover:underline">
                      {authorDisplayName}
                    </Link>
                    {post.caption}
                  </p>
                  {(post.location || post.subLocation) && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-teal-400">
                      <MapPin className="w-3 h-3" />
                      <span>{[post.location, post.subLocation].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  {timeAgoString && <p className="text-[10px] text-gray-500 mt-1.5">{timeAgoString}</p>}
                </div>
              </div>
            )}

            {/* Comments Header */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Comments ({commentsCount})
              </span>
            </div>

            {/* Comments */}
            {comments.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">No comments yet. Be the first to start the conversation!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => {
                  const commentAuthorName = comment.author?.name || comment.author?.username || 'User';
                  const commentAuthorAvatar = comment.author?.avatar || '/default-user-avatar.svg';

                  return (
                    <div key={comment.id} className="flex gap-3 text-xs group">
                      <Avatar className="w-7 h-7 shrink-0 mt-0.5 border border-[#1b2b48]">
                        <AvatarImage src={commentAuthorAvatar} />
                        <AvatarFallback className="bg-zinc-800 text-white text-[9px] font-bold">
                          {commentAuthorName?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="bg-[#0e1626] border border-[#16233a] p-3 rounded-2xl">
                          <p className="font-bold text-white mb-0.5">
                            {commentAuthorName}
                          </p>
                          <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                            {comment.content}
                          </p>
                        </div>
                        {comment.createdAt && mounted && (
                          <span className="text-[10px] text-gray-500 mt-1 inline-block ml-2">
                            {formatDistanceToNowSafe(comment.createdAt)}
                          </span>
                        )}

                        {/* Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="mt-2.5 ml-2 space-y-2 border-l border-[#1b2b48] pl-3">
                            {comment.replies.map((reply: any) => {
                              const replyAuthorName = reply.author?.name || reply.author?.username || 'User';
                              const replyAuthorAvatar = reply.author?.avatar || '/default-user-avatar.svg';

                              return (
                                <div key={reply.id} className="flex gap-2">
                                  <Avatar className="w-5 h-5 shrink-0 mt-0.5">
                                    <AvatarImage src={replyAuthorAvatar} />
                                    <AvatarFallback className="bg-zinc-800 text-white text-[8px]">
                                      {replyAuthorName?.[0]?.toUpperCase() || 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="bg-[#0b1220] border border-[#141f33] p-2.5 rounded-xl flex-1">
                                    <span className="font-bold text-white block mb-0.5 text-[11px]">
                                      {replyAuthorName}
                                    </span>
                                    <p className="text-gray-300 text-[11px]">
                                      {reply.content}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Bar & Comment Box */}
          <div className="border-t border-[#141e33] px-5 py-4 bg-[#070b13] space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleLike}
                  className="flex items-center gap-1.5 group"
                  aria-label="Like"
                >
                  <Heart
                    className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                      liked ? 'text-rose-500 fill-rose-500' : 'text-gray-400 group-hover:text-white'
                    }`}
                  />
                  <span className="text-xs font-semibold text-gray-400 group-hover:text-white">
                    {likesCount > 0 ? likesCount : 'Like'}
                  </span>
                </button>

                <button
                  onClick={() => document.getElementById('post-comment-input')?.focus()}
                  className="flex items-center gap-1.5 group text-gray-400 hover:text-white"
                  aria-label="Comment"
                >
                  <MessageCircle className="w-5 h-5 transition-transform group-hover:scale-110" />
                  <span className="text-xs font-semibold">
                    {commentsCount > 0 ? commentsCount : 'Comment'}
                  </span>
                </button>

                <button
                  onClick={() => setShareModalOpen(true)}
                  className="flex items-center gap-1.5 group text-gray-400 hover:text-white"
                  aria-label="Share"
                >
                  <Share2 className="w-5 h-5 transition-transform group-hover:scale-110" />
                  <span className="text-xs font-semibold">Share</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                {post.views > 0 && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                    <Eye className="w-4 h-4" />
                    <span>{post.views}</span>
                  </div>
                )}
                <button 
                  onClick={handleSave} 
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Save"
                >
                  <Bookmark className={`w-5 h-5 ${saved ? 'text-teal-400 fill-teal-400' : ''}`} />
                </button>
              </div>
            </div>

            {/* Comment Input */}
            <form onSubmit={handleComment} className="flex items-center gap-2 pt-1">
              <Avatar className="w-8 h-8 shrink-0 border border-[#1b2b48]">
                <AvatarImage src={session?.user?.image || '/default-user-avatar.svg'} />
                <AvatarFallback className="bg-zinc-800 text-white text-[10px] font-bold">
                  {session?.user?.name?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="relative flex-1">
                <input
                  id="post-comment-input"
                  type="text"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder={session?.user ? "Write a comment..." : "Log in to post a comment..."}
                  className="w-full bg-[#0e1626] border border-[#18263e] focus:border-teal-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 outline-none transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={submittingComment || !commentInput.trim()}
                className="p-2 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-30 text-black font-bold transition-all"
                title="Send Comment"
              >
                <Send className="w-3.5 h-3.5" />
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

      {/* Guest Auth Prompt Modal */}
      {authPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-sm w-full bg-[#0d1526] border border-[#1b2b48] p-6 rounded-3xl text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Join the Conversation</h3>
              <p className="text-xs text-gray-400 mt-1">
                Sign in to like, comment, save posts, and follow your favorite creators on Tolee.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setAuthPromptOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#141f33] hover:bg-[#1a2842] text-xs font-semibold text-gray-300 transition-colors"
              >
                Cancel
              </button>
              <Link
                href={`/auth/signin?callbackUrl=/post/${post.id}`}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-xs font-extrabold text-black transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
