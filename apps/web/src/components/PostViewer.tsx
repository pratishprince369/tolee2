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

  const authorDisplayName = post.authorName || 'Tolee Creator';
  const authorUsername = post.author && !post.author.includes(' ') ? post.author : (post.authorId || 'creator');
  const authorAvatarUrl = post.authorAvatar || '/default-user-avatar.svg';

  const handleBack = () => {
    router.push('/feed');
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
    <div className="min-h-screen bg-[#070b13] text-white flex flex-col font-sans selection:bg-teal-500 selection:text-black">
      {/* Top Header Navigation (Instagram style with Tolee branding) */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-[#0a0f1d]/95 backdrop-blur-md border-b border-[#141e33]">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#141e33] hover:bg-[#1f2d4a] text-gray-200 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
            aria-label="Go to Feed"
            title="Back to Feed"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Center Tolee Wordmark */}
        <Link href="/feed" className="flex items-center gap-1 group">
          <span className="text-xl font-black tracking-tight text-white group-hover:text-teal-400 transition-colors">
            tolee
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 -mt-2"></span>
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
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#141e33] hover:bg-[#1f2d4a] text-gray-300 hover:text-white transition-colors cursor-pointer"
              title="Share Post"
            >
              <Share2 className="w-4.5 h-4.5" />
            </button>
          )}
        </div>
      </header>

      {/* Main Container - Single Column Social Post Feed Card */}
      <main className="flex-1 w-full max-w-[580px] mx-auto pb-24 sm:py-5 sm:px-3">
        <div className="bg-[#090e1a] sm:border border-[#141e33] sm:rounded-3xl overflow-hidden shadow-2xl">
          {/* Post Header: Creator Info */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#141e33]/70">
            <div className="flex items-center gap-3 min-w-0">
              <Link href={`/u/${authorUsername}`} className="shrink-0 relative group">
                <div className="p-0.5 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400">
                  <Avatar className="w-9 h-9 border-2 border-[#090e1a]">
                    <AvatarImage src={authorAvatarUrl} />
                    <AvatarFallback className="bg-zinc-800 text-white text-xs font-bold">
                      {authorDisplayName?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </Link>
              <div className="min-w-0">
                <Link
                  href={`/u/${authorUsername}`}
                  className="text-sm font-bold text-white hover:text-teal-400 transition-colors truncate block leading-tight"
                >
                  {authorUsername}
                </Link>
                {(post.location || post.subLocation || post.toleeName) && (
                  <div className="flex items-center gap-1 text-[11px] text-gray-400 truncate mt-0.5">
                    {post.toleeName ? (
                      <Link href={`/t/${post.toleeSlug || ''}`} className="text-teal-400 hover:underline flex items-center gap-1 truncate">
                        <Users className="w-3 h-3 shrink-0" />
                        <span className="truncate">{post.toleeName}</span>
                      </Link>
                    ) : (
                      <>
                        <MapPin className="w-3 h-3 text-teal-400 shrink-0" />
                        <span className="truncate">{[post.location, post.subLocation].filter(Boolean).join(', ')}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShareModalOpen(true)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-[#141e33] transition-colors cursor-pointer"
                title="Share Post"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Media Presentation Container */}
          <div className="relative bg-[#02050b] flex items-center justify-center w-full min-h-[300px] overflow-hidden">
            {hasMedia ? (
              isVideo ? (
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
              ) : (
                <div className="relative w-full flex items-center justify-center">
                  <div className="relative w-full flex items-center justify-center overflow-hidden bg-[#04070e]">
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
              // Text-only Post presentation
              <div className="w-full p-8 sm:p-12 bg-gradient-to-br from-[#0c1424] via-[#09101d] to-[#050a14] relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
                <p className="text-lg sm:text-xl font-medium text-gray-100 leading-relaxed whitespace-pre-wrap">
                  {renderFormattedCaption(post.caption) || 'Shared post on Tolee.'}
                </p>
              </div>
            )}
          </div>

          {/* Social Action Bar (Instagram style) */}
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-center justify-between">
              {/* Left Action Buttons */}
              <div className="flex items-center gap-4">
                {/* Like Button with Count */}
                <button
                  onClick={handleLike}
                  className="flex items-center gap-1.5 group cursor-pointer active:scale-90 transition-transform"
                  aria-label="Like"
                >
                  <Heart
                    className={`w-6 h-6 transition-transform ${
                      liked ? 'text-rose-500 fill-rose-500' : 'text-gray-200 group-hover:text-white'
                    }`}
                  />
                  {likesCount > 0 && (
                    <span className={`text-sm font-bold ${liked ? 'text-rose-400' : 'text-gray-200'}`}>
                      {likesCount}
                    </span>
                  )}
                </button>

                {/* Comment Button with Count */}
                <button
                  onClick={() => document.getElementById('post-comment-input')?.focus()}
                  className="flex items-center gap-1.5 group text-gray-200 hover:text-white cursor-pointer active:scale-90 transition-transform"
                  aria-label="Comment"
                >
                  <MessageCircle className="w-6 h-6" />
                  {commentsCount > 0 && (
                    <span className="text-sm font-bold text-gray-200">
                      {commentsCount}
                    </span>
                  )}
                </button>

                {/* Repost Button with Count */}
                <button
                  onClick={handleRepost}
                  className="flex items-center gap-1.5 group text-gray-200 hover:text-white cursor-pointer active:scale-90 transition-transform"
                  aria-label="Repost"
                >
                  <Repeat className={`w-6 h-6 ${reposted ? 'text-emerald-400' : ''}`} />
                  {repostsCount > 0 && (
                    <span className={`text-sm font-bold ${reposted ? 'text-emerald-400' : 'text-gray-200'}`}>
                      {repostsCount}
                    </span>
                  )}
                </button>

                {/* Share Button */}
                <button
                  onClick={() => setShareModalOpen(true)}
                  className="flex items-center gap-1.5 group text-gray-200 hover:text-white cursor-pointer active:scale-90 transition-transform"
                  aria-label="Share"
                >
                  <Send className="w-5.5 h-5.5 -rotate-45 mb-0.5" />
                </button>
              </div>

              {/* Right Action: Bookmark / Save */}
              <div className="flex items-center gap-3">
                {post.views > 0 && (
                  <div className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                    <Eye className="w-4 h-4" />
                    <span>{post.views}</span>
                  </div>
                )}
                <button
                  onClick={handleSave}
                  className="text-gray-200 hover:text-white transition-transform active:scale-90 cursor-pointer"
                  aria-label="Save"
                >
                  <Bookmark className={`w-6 h-6 ${saved ? 'text-teal-400 fill-teal-400' : ''}`} />
                </button>
              </div>
            </div>

            {/* Likes Count Line */}
            {likesCount > 0 && (
              <div className="mt-2 text-xs font-bold text-white">
                {likesCount} {likesCount === 1 ? 'like' : 'likes'}
              </div>
            )}

            {/* Caption & Description Section */}
            {post.caption && (
              <div className="mt-2 text-sm leading-relaxed text-gray-200">
                <Link href={`/u/${authorUsername}`} className="font-bold text-white mr-1.5 hover:underline">
                  {authorUsername}
                </Link>
                <span className="whitespace-pre-wrap">{renderFormattedCaption(post.caption)}</span>
              </div>
            )}

            {/* Timestamp */}
            {timeAgoString && (
              <div className="mt-1.5 text-[11px] text-gray-400 uppercase tracking-wide">
                {timeAgoString}
              </div>
            )}

            {/* Comments Stream */}
            <div className="mt-4 pt-3 border-t border-[#141e33]/70 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-wider">
                <span>Comments ({commentsCount})</span>
              </div>

              {comments.length === 0 ? (
                <p className="text-xs text-gray-400 py-2">
                  No comments yet. Be the first to comment!
                </p>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                  {comments.map((comment) => {
                    const commentAuthorName = comment.author?.name || comment.author?.username || 'User';
                    const commentAuthorUsername = comment.author?.username || 'user';
                    const commentAuthorAvatar = comment.author?.avatar || '/default-user-avatar.svg';

                    return (
                      <div key={comment.id} className="flex gap-2.5 text-xs group">
                        <Avatar className="w-7 h-7 shrink-0 mt-0.5 border border-[#1b2b48]">
                          <AvatarImage src={commentAuthorAvatar} />
                          <AvatarFallback className="bg-zinc-800 text-white text-[9px] font-bold">
                            {commentAuthorName?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="bg-[#0e1626] border border-[#16233a] px-3 py-2 rounded-2xl">
                            <span className="font-bold text-white mr-1.5">
                              {commentAuthorUsername}
                            </span>
                            <span className="text-gray-300 whitespace-pre-wrap">
                              {comment.content}
                            </span>
                          </div>
                          {comment.createdAt && mounted && (
                            <span className="text-[10px] text-gray-400 mt-1 inline-block ml-2">
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
          </div>

          {/* Quick Comment Input Form at Bottom */}
          <div className="border-t border-[#141e33] px-4 py-3 bg-[#070b13]">
            <form onSubmit={handleComment} className="flex items-center gap-2.5">
              <Avatar className="w-7 h-7 shrink-0 border border-[#1b2b48]">
                <AvatarImage src={session?.user?.image || '/default-user-avatar.svg'} />
                <AvatarFallback className="bg-zinc-800 text-white text-[10px] font-bold">
                  {session?.user?.name?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <input
                id="post-comment-input"
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder={session?.user ? "Add a comment..." : "Log in to comment..."}
                className="flex-1 bg-[#0e1626] border border-[#18263e] focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none transition-all"
              />
              <button
                type="submit"
                disabled={submittingComment || !commentInput.trim()}
                className="px-3 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-30 text-black font-extrabold text-xs transition-all cursor-pointer"
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
          <div className="bg-[#0b1220] border border-[#16233a] rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-teal-500/10 text-teal-400 flex items-center justify-center mx-auto text-xl font-bold">
              ✨
            </div>
            <h3 className="text-base font-bold text-white">Join the Conversation</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Log in or sign up on Tolee to like, comment, repost, and connect with creators.
            </p>
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setAuthPromptOpen(false)}
                className="flex-1 py-2 rounded-xl bg-[#141f33] hover:bg-[#1a2942] text-xs font-semibold text-gray-300 transition-colors"
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
