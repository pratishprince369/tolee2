'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toggleLike, addComment, toggleSavePost } from '@/actions/post';

function formatDistanceToNow(date: Date, options?: { addSuffix?: boolean }) {
  const now = new Date().getTime();
  const past = date.getTime();
  const diffInSeconds = Math.max(0, Math.floor((now - past) / 1000));

  if (diffInSeconds < 60) return 'just now';
  let result = '';
  if (diffInSeconds < 3600) {
    const mins = Math.floor(diffInSeconds / 60);
    result = `${mins}m`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    result = `${hours}h`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    result = `${days}d`;
  } else if (diffInSeconds < 31536000) {
    const months = Math.floor(diffInSeconds / 2592000);
    result = `${months}mo`;
  } else {
    const years = Math.floor(diffInSeconds / 31536000);
    result = `${years}y`;
  }
  return options?.addSuffix ? `${result} ago` : result;
}
import { useSession } from 'next-auth/react';
import { ShareModal } from '@/components/ShareModal';

interface PostViewerProps {
  post: {
    id: string;
    authorId: string | null;
    author: string;
    authorName: string;
    authorAvatar: string;
    toleeName: string | null;
    toleeSlug: string | null;
    postType: string;
    caption: string;
    mediaUrls: string;
    mediaTypes: string;
    image: string | null;
    video: string | null;
    likes: number;
    comments: number;
    reposts: number;
    views: number;
    likedByMe: boolean;
    savedByMe: boolean;
    repostedByMe: boolean;
    commentsList: any[];
    location: string | null;
    subLocation: string | null;
    createdAt: string;
  };
}

export default function PostViewer({ post }: PostViewerProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [liked, setLiked] = useState(post.likedByMe);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [saved, setSaved] = useState(post.savedByMe);
  const [comments, setComments] = useState<any[]>(post.commentsList || []);
  const [commentsCount, setCommentsCount] = useState(post.comments);
  const [commentInput, setCommentInput] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Carousel support
  const allMediaUrls = post.mediaUrls
    ? post.mediaUrls.split(/,(?=https?:\/\/)/).filter(Boolean)
    : [];
  const allMediaTypes = post.mediaTypes ? post.mediaTypes.split(',') : [];
  const [carouselIdx, setCarouselIdx] = useState(0);

  const currentMediaUrl = allMediaUrls[carouselIdx] || '';
  const currentMediaType = allMediaTypes[carouselIdx] || 'image';
  const isMultiple = allMediaUrls.length > 1;

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/chat');
    }
  };

  const handleLike = async () => {
    if (!session?.user) return;
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount((c) => (newLiked ? c + 1 : Math.max(0, c - 1)));
    await toggleLike(post.id);
  };

  const handleSave = async () => {
    if (!session?.user) return;
    setSaved((s) => !s);
    await toggleSavePost(post.id);
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !session?.user || submittingComment) return;
    setSubmittingComment(true);
    const text = commentInput;
    setCommentInput('');
    const tempId = `temp_${Date.now()}`;
    const tempComment = {
      id: tempId,
      content: text,
      createdAt: new Date().toISOString(),
      author: {
        id: (session.user as any)?.id,
        name: session.user.name || 'You',
        username: (session.user as any)?.username || 'you',
        avatar: session.user.image || '/default-user-avatar.svg',
      },
      replies: [],
      likes: [],
    };
    setComments((prev) => [tempComment, ...prev]);
    setCommentsCount((c) => c + 1);
    const result = await addComment(post.id, text);
    if (result.success && result.comment) {
      setComments((prev) =>
        prev.map((c) => (c.id === tempId ? result.comment : c))
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

  const nextSlide = () =>
    setCarouselIdx((i) => Math.min(i + 1, allMediaUrls.length - 1));
  const prevSlide = () => setCarouselIdx((i) => Math.max(i - 1, 0));

  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
    } catch {
      return '';
    }
  })();

  const isVideo =
    currentMediaType === 'video' || post.postType === 'reel';

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* ── Top bar ── */}
      <div className="sticky top-0 z-50 flex items-center gap-3 px-4 py-3 bg-black/80 backdrop-blur-md border-b border-white/5">
        <button
          onClick={handleBack}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-sm font-bold text-white flex-1">Post</h1>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col lg:flex-row lg:max-h-[calc(100vh-57px)] overflow-hidden">
        {/* ── LEFT: Media panel ── */}
        <div className="relative bg-black flex items-center justify-center lg:flex-1 lg:max-h-full">
          {isVideo ? (
            <div className="relative w-full max-w-2xl mx-auto aspect-[9/16] lg:aspect-auto lg:h-full flex items-center justify-center">
              <video
                ref={videoRef}
                src={currentMediaUrl}
                className="w-full h-full object-contain"
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
                  className="w-9 h-9 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm hover:bg-black/70 transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 text-white" />
                  ) : (
                    <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                  )}
                </button>
                <button
                  onClick={() => {
                    setMuted((m) => !m);
                    if (videoRef.current) videoRef.current.muted = !muted;
                  }}
                  className="w-9 h-9 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm hover:bg-black/70 transition-colors"
                >
                  {muted ? (
                    <VolumeX className="w-4 h-4 text-white" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-white" />
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="relative w-full max-w-2xl mx-auto">
              <div className="relative aspect-square lg:aspect-auto lg:max-h-[calc(100vh-57px)] flex items-center justify-center overflow-hidden">
                <img
                  src={currentMediaUrl}
                  alt={post.caption || 'Post image'}
                  className="w-full h-full object-contain"
                />
              </div>
              {isMultiple && (
                <>
                  {carouselIdx > 0 && (
                    <button
                      onClick={prevSlide}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5 text-white" />
                    </button>
                  )}
                  {carouselIdx < allMediaUrls.length - 1 && (
                    <button
                      onClick={nextSlide}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors"
                    >
                      <ChevronRight className="w-5 h-5 text-white" />
                    </button>
                  )}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {allMediaUrls.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCarouselIdx(i)}
                        className={`h-1.5 rounded-full transition-all ${
                          i === carouselIdx
                            ? 'bg-white w-4'
                            : 'bg-white/40 w-1.5'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT: Info & Comments panel ── */}
        <div className="lg:w-[380px] lg:border-l border-white/10 flex flex-col bg-[#0a0a0a] lg:overflow-hidden">
          {/* Author header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
            <button
              onClick={() =>
                post.authorId && router.push(`/u/${post.author}`)
              }
              className="shrink-0"
            >
              <Avatar className="w-9 h-9 border border-white/10">
                <AvatarImage src={post.authorAvatar} />
                <AvatarFallback className="bg-zinc-800 text-white text-xs font-bold">
                  {post.authorName?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>
            <div className="flex-1 min-w-0">
              <button
                onClick={() =>
                  post.authorId && router.push(`/u/${post.author}`)
                }
                className="text-sm font-bold text-white hover:underline truncate block text-left"
              >
                {post.author}
              </button>
              {post.toleeName && (
                <p className="text-xs text-zinc-500 truncate">
                  {post.toleeName}
                </p>
              )}
            </div>
            <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors">
              <MoreHorizontal className="w-4 h-4 text-zinc-400" />
            </button>
          </div>

          {/* Caption & comments — scrollable */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
            {/* Caption */}
            {post.caption && (
              <div className="flex gap-3">
                <Avatar className="w-8 h-8 shrink-0 mt-0.5 border border-white/10">
                  <AvatarImage src={post.authorAvatar} />
                  <AvatarFallback className="bg-zinc-800 text-white text-[10px] font-bold">
                    {post.authorName?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm text-white leading-relaxed">
                    <span className="font-bold mr-1.5">{post.author}</span>
                    {post.caption}
                  </p>
                  {(post.location || post.subLocation) && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-zinc-500">
                      <MapPin className="w-3 h-3" />
                      <span>
                        {[post.location, post.subLocation]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    </div>
                  )}
                  <p className="text-[10px] text-zinc-600 mt-1">{timeAgo}</p>
                </div>
              </div>
            )}

            {/* Comment list */}
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="w-7 h-7 shrink-0 mt-0.5 border border-white/5">
                  <AvatarImage src={comment.author?.avatar} />
                  <AvatarFallback className="bg-zinc-800 text-white text-[9px] font-bold">
                    {comment.author?.name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm text-white leading-snug">
                    <span className="font-bold mr-1.5 text-[13px]">
                      {comment.author?.username || comment.author?.name}
                    </span>
                    {comment.content}
                  </p>
                  {comment.replies?.length > 0 && (
                    <div className="mt-2 ml-2 space-y-2 border-l border-white/5 pl-3">
                      {comment.replies.map((reply: any) => (
                        <div key={reply.id} className="flex gap-2">
                          <Avatar className="w-5 h-5 shrink-0">
                            <AvatarImage src={reply.author?.avatar} />
                            <AvatarFallback className="bg-zinc-800 text-white text-[8px]">
                              {reply.author?.name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <p className="text-xs text-zinc-200 leading-snug">
                            <span className="font-bold mr-1">
                              {reply.author?.username || reply.author?.name}
                            </span>
                            {reply.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Action bar */}
          <div className="border-t border-white/5 px-4 py-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleLike}
                  className="group flex items-center gap-1.5"
                  aria-label="Like"
                >
                  <Heart
                    className={`w-6 h-6 transition-transform group-hover:scale-110 ${
                      liked ? 'text-red-500 fill-red-500' : 'text-white'
                    }`}
                  />
                  <span className="text-xs text-zinc-400 font-medium">
                    {likesCount > 0 ? likesCount.toLocaleString() : ''}
                  </span>
                </button>
                <button
                  onClick={() =>
                    document.getElementById('post-comment-input')?.focus()
                  }
                  className="group flex items-center gap-1.5"
                  aria-label="Comment"
                >
                  <MessageCircle className="w-6 h-6 text-white transition-transform group-hover:scale-110" />
                  <span className="text-xs text-zinc-400 font-medium">
                    {commentsCount > 0 ? commentsCount.toLocaleString() : ''}
                  </span>
                </button>
                <button
                  onClick={() => setShareModalOpen(true)}
                  className="group flex items-center gap-1.5"
                  aria-label="Share"
                >
                  <Share2 className="w-6 h-6 text-white transition-transform group-hover:scale-110" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                {post.views > 0 && (
                  <div className="flex items-center gap-1 text-xs text-zinc-500">
                    <Eye className="w-4 h-4" />
                    <span>{post.views.toLocaleString()}</span>
                  </div>
                )}
                <button onClick={handleSave} className="group" aria-label="Save">
                  <Bookmark
                    className={`w-6 h-6 transition-transform group-hover:scale-110 ${
                      saved ? 'text-white fill-white' : 'text-white'
                    }`}
                  />
                </button>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500">{timeAgo}</p>

            {/* Comment input */}
            <form onSubmit={handleComment} className="flex items-center gap-2">
              <Avatar className="w-7 h-7 shrink-0 border border-white/10">
                <AvatarImage
                  src={session?.user?.image || '/default-user-avatar.svg'}
                />
                <AvatarFallback className="bg-zinc-800 text-white text-[9px] font-bold">
                  {session?.user?.name?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <input
                id="post-comment-input"
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Add a comment…"
                className="flex-1 bg-transparent text-sm text-white placeholder-zinc-600 outline-none border-none"
                disabled={!session?.user || submittingComment}
              />
              {commentInput.trim() && (
                <button
                  type="submit"
                  disabled={submittingComment}
                  className="text-[#0a7c85] text-sm font-bold hover:text-[#0a9ca7] transition-colors disabled:opacity-50"
                >
                  Post
                </button>
              )}
            </form>
          </div>
        </div>
      </div>

      {shareModalOpen && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          postId={post.id}
          shareUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/post/${post.id}`}
          previewText={post.caption || 'Check out this post on Tolee!'}
          postMediaUrl={post.mediaUrls}
          postMediaType={post.mediaTypes}
          postAuthor={post.author}
          postAuthorAvatar={post.authorAvatar}
          postCaption={post.caption}
        />
      )}
    </div>
  );
}

