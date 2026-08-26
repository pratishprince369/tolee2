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
    <div className="min-h-screen bg-[#070b13] text-white flex flex-col font-sans selection:bg-teal-500 selection:text-black">
      {/* 1. Top Navigation Bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-[#0a0f1d]/95 backdrop-blur-md border-b border-[#141e33]">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#141e33] hover:bg-[#1f2d4a] text-gray-300 hover:text-white transition-all shadow-sm cursor-pointer"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-base font-bold text-white tracking-wide">Posts</span>
        </div>

        <div className="flex items-center gap-2">
          {!session?.user ? (
            <Link
              href={`/auth/signin?callbackUrl=/post/${post.id}`}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-black text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Log in</span>
            </Link>
          ) : (
            <button
              onClick={() => setShareModalOpen(true)}
              className="p-2 rounded-xl bg-[#141e33] hover:bg-[#1f2d4a] text-gray-300 hover:text-white transition-colors cursor-pointer"
              title="Share Post"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* 2. Instagram-Style Feed Post Container */}
      <main className="flex-1 flex justify-center py-0 sm:py-6 px-0 sm:px-4">
        <article className="w-full max-w-xl bg-[#090e1a] sm:rounded-3xl border-0 sm:border border-[#141e33] overflow-hidden flex flex-col shadow-2xl pb-24 sm:pb-6">
          
          {/* Post Creator Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#141e33]/60 bg-[#090e1a]">
            <div className="flex items-center gap-3 min-w-0">
              <Link href={`/u/${authorUsername}`} className="shrink-0">
                <Avatar className="w-10 h-10 border-2 border-teal-500/40">
                  <AvatarImage src={authorAvatarUrl} />
                  <AvatarFallback className="bg-zinc-800 text-white text-xs font-bold">
                    {authorDisplayName?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="min-w-0">
                <Link href={`/u/${authorUsername}`} className="text-sm font-bold text-white hover:underline truncate block">
                  {authorUsername}
                </Link>
                <div className="flex items-center gap-1 text-[11px] text-gray-400 truncate">
                  {post.toleeName ? (
                    <Link href={`/t/${post.toleeSlug || ''}`} className="text-teal-400 hover:underline truncate flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{post.toleeName}</span>
                    </Link>
                  ) : (post.location || post.subLocation) ? (
                    <span className="flex items-center gap-0.5 text-gray-400 truncate">
                      <MapPin className="w-3 h-3 text-teal-400" />
                      {[post.location, post.subLocation].filter(Boolean).join(', ')}
                    </span>
                  ) : (
                    <span>{authorDisplayName}</span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShareModalOpen(true)}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#141e33] transition-colors cursor-pointer"
              title="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {/* Media Presentation Container */}
          <div className="relative w-full bg-[#02050b] flex items-center justify-center min-h-[300px] overflow-hidden">
            {hasMedia ? (
              isVideo ? (
                <div className="relative w-full aspect-[9/16] sm:aspect-square max-h-[75vh] flex items-center justify-center group bg-black">
                  <HLSVideo
                    ref={videoRef}
                    src={currentMediaUrl}
                    isActive={true}
                    shouldLoad={true}
                    ignoreGlobalActive={true}
                    contentId={post.id}
                    contentType="post"
                    className="w-full h-full object-contain cursor-pointer"
                    loop
                    muted={muted}
                    playsInline
                    autoPlay
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onClick={togglePlayPause}
                  />

                  {!isPlaying && (
                    <button
                      onClick={togglePlayPause}
                      className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white shadow-2xl hover:scale-110 active:scale-95 transition-all z-20 cursor-pointer"
                    >
                      <Play className="w-8 h-8 fill-white ml-1" />
                    </button>
                  )}

                  <div className="absolute bottom-3 left-3 flex gap-2 z-20">
                    <button
                      onClick={togglePlayPause}
                      className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white cursor-pointer hover:bg-black/80 transition-all"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                    </button>
                    <button
                      onClick={() => {
                        const nextMuted = !muted;
                        setMuted(nextMuted);
                        if (videoRef.current) videoRef.current.muted = nextMuted;
                      }}
                      className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white cursor-pointer hover:bg-black/80 transition-all"
                    >
                      {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative w-full flex items-center justify-center bg-black">
                  <img
                    src={currentMediaUrl}
                    alt={post.caption || 'Post image'}
                    className="w-full h-auto max-h-[75vh] object-contain select-none"
                  />
                  {isMultiple && (
                    <>
                      {carouselIdx > 0 && (
                        <button
                          onClick={prevSlide}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/70 backdrop-blur-md flex items-center justify-center text-white shadow-lg cursor-pointer"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                      )}
                      {carouselIdx < allMediaUrls.length - 1 && (
                        <button
                          onClick={nextSlide}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/70 backdrop-blur-md flex items-center justify-center text-white shadow-lg cursor-pointer"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      )}
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full z-20">
                        {allMediaUrls.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setCarouselIdx(i)}
                            className={`h-1.5 rounded-full transition-all cursor-pointer ${
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
              // Text post display
              <div className="w-full p-8 bg-gradient-to-br from-[#0c1424] to-[#060b14] text-center">
                <p className="text-lg font-medium text-gray-100 leading-relaxed whitespace-pre-wrap">
                  {renderFormattedCaption(post.caption) || 'Shared post on Tolee.'}
                </p>
              </div>
            )}
          </div>

          {/* Social Action Bar Directly Below Media */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#090e1a]">
            <div className="flex items-center gap-4">
              {/* Like */}
              <button
                onClick={handleLike}
                className="flex items-center gap-1.5 cursor-pointer group"
                aria-label="Like"
              >
                <Heart
                  className={`w-6 h-6 transition-transform group-hover:scale-110 active:scale-125 ${
                    liked ? 'text-rose-500 fill-rose-500' : 'text-gray-200 hover:text-white'
                  }`}
                />
                <span className={`text-xs font-bold ${liked ? 'text-rose-400' : 'text-gray-300'}`}>
                  {likesCount}
                </span>
              </button>

              {/* Comment */}
              <button
                onClick={() => document.getElementById('post-comment-input')?.focus()}
                className="flex items-center gap-1.5 text-gray-200 hover:text-white cursor-pointer group"
                aria-label="Comment"
              >
                <MessageCircle className="w-6 h-6 transition-transform group-hover:scale-110" />
                <span className="text-xs font-bold text-gray-300">
                  {commentsCount}
                </span>
              </button>

              {/* Repost */}
              <button
                onClick={handleRepost}
                className="flex items-center gap-1.5 cursor-pointer group"
                aria-label="Repost"
              >
                <Repeat
                  className={`w-6 h-6 transition-transform group-hover:scale-110 ${
                    reposted ? 'text-emerald-400' : 'text-gray-200 hover:text-white'
                  }`}
                />
                {repostsCount > 0 && (
                  <span className={`text-xs font-bold ${reposted ? 'text-emerald-400' : 'text-gray-300'}`}>
                    {repostsCount}
                  </span>
                )}
              </button>

              {/* Share */}
              <button
                onClick={() => setShareModalOpen(true)}
                className="text-gray-200 hover:text-white cursor-pointer group"
                aria-label="Share"
              >
                <Share2 className="w-6 h-6 transition-transform group-hover:scale-110" />
              </button>
            </div>

            {/* Save / Bookmark */}
            <div className="flex items-center gap-3">
              {post.views > 0 && (
                <div className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                  <Eye className="w-4 h-4" />
                  <span>{post.views}</span>
                </div>
              )}
              <button
                onClick={handleSave}
                className="text-gray-200 hover:text-white cursor-pointer transition-colors"
                aria-label="Save"
              >
                <Bookmark className={`w-6 h-6 ${saved ? 'text-teal-400 fill-teal-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Caption & Metadata Section */}
          <div className="px-4 py-2 space-y-2 border-b border-[#141e33]/50">
            {post.caption && (
              <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                <Link href={`/u/${authorUsername}`} className="font-extrabold text-white mr-2 hover:underline">
                  {authorUsername}
                </Link>
                {renderFormattedCaption(post.caption)}
              </div>
            )}

            {timeAgoString && (
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                {timeAgoString}
              </p>
            )}
          </div>

          {/* Comments Stream */}
          <div className="px-4 py-3 space-y-3 flex-1">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block">
              Comments ({commentsCount})
            </span>

            {comments.length === 0 ? (
              <p className="text-xs text-gray-500 py-3">No comments yet. Start the conversation!</p>
            ) : (
              <div className="space-y-3 pt-1">
                {comments.map((comment) => {
                  const commentAuthorName = comment.author?.name || comment.author?.username || 'User';
                  const commentAuthorAvatar = comment.author?.avatar || '/default-user-avatar.svg';

                  return (
                    <div key={comment.id} className="flex gap-2.5 text-xs">
                      <Avatar className="w-7 h-7 shrink-0 mt-0.5 border border-[#1b2b48]">
                        <AvatarImage src={commentAuthorAvatar} />
                        <AvatarFallback className="bg-zinc-800 text-white text-[9px] font-bold">
                          {commentAuthorName?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 bg-[#0c1424] border border-[#16233a] p-2.5 rounded-2xl">
                        <span className="font-bold text-white mr-1.5">{commentAuthorName}</span>
                        <span className="text-gray-300 leading-relaxed">{comment.content}</span>
                        {comment.createdAt && mounted && (
                          <span className="text-[10px] text-gray-500 block mt-1">
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

          {/* Sticky Bottom Quick Comment Bar */}
          <div className="p-3 border-t border-[#141e33] bg-[#070b13]">
            <form onSubmit={handleComment} className="flex items-center gap-2">
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
                  placeholder={session?.user ? "Add a comment..." : "Log in to comment..."}
                  className="w-full bg-[#0e1626] border border-[#18263e] focus:border-teal-500 rounded-full px-4 py-2 text-xs text-white placeholder-gray-500 outline-none transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={submittingComment || !commentInput.trim()}
                className="px-4 py-2 rounded-full bg-teal-500 hover:bg-teal-400 disabled:opacity-30 text-black text-xs font-bold transition-all cursor-pointer"
              >
                Post
              </button>
            </form>
          </div>

        </article>
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

      {/* Guest Auth Prompt */}
      {authPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="max-w-sm w-full bg-[#0d1526] border border-[#1b2b48] p-6 rounded-3xl text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Join the Conversation</h3>
              <p className="text-xs text-gray-400 mt-1">
                Sign in to like, comment, save posts, and follow creators on Tolee.
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
