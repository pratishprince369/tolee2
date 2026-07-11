'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, MessageCircle, Send, Repeat, Bookmark, Eye, CornerDownRight, X, ArrowUpRight } from 'lucide-react';
import { toggleLike, addComment, getComments, toggleSavePost, toggleRepost } from '@/actions/post';
import { formatViewCount } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface NewsEngagementProps {
  postId: string;
  initialLikes: number;
  initialComments: number;
  initialReposts: number;
  initialViews: number;
  initialLikedByMe: boolean;
  initialSavedByMe: boolean;
  initialRepostedByMe: boolean;
  shareCount?: number;
  slug?: string;
  headline?: string;
}

export function NewsEngagement({
  postId,
  initialLikes,
  initialComments,
  initialReposts,
  initialViews,
  initialLikedByMe,
  initialSavedByMe,
  initialRepostedByMe,
  shareCount = 0,
  slug,
  headline,
}: NewsEngagementProps) {
  const { data: session } = useSession();
  const [likesCount, setLikesCount] = useState(initialLikes);
  const [commentsCount, setCommentsCount] = useState(initialComments);
  const [repostsCount, setRepostsCount] = useState(initialReposts);
  const [sharesCount, setSharesCount] = useState(shareCount);
  const [likedByMe, setLikedByMe] = useState(initialLikedByMe);
  const [savedByMe, setSavedByMe] = useState(initialSavedByMe);
  const [repostedByMe, setRepostedByMe] = useState(initialRepostedByMe);

  const [commentText, setCommentText] = useState('');
  const [activeCommentPost, setActiveCommentPost] = useState<string | null>(null);
  const [modalComments, setModalComments] = useState<any[]>([]);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; authorName: string } | null>(null);
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null);

  const composerInputRef = useRef<HTMLInputElement>(null);
  const modalComposerRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const commentId = searchParams?.get('commentId');
    if (commentId) {
      openCommentsModal();
    }
  }, [searchParams]);

  useEffect(() => {
    if (modalComments.length === 0) return;
    const commentId = searchParams?.get('commentId');
    if (commentId) {
      const targetExists = modalComments.some((c: any) => c.id === commentId);
      if (targetExists) {
        setTimeout(() => {
          const el = document.getElementById(`comment-${commentId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightedCommentId(commentId);
            setTimeout(() => {
              modalComposerRef.current?.focus();
            }, 300);
            setTimeout(() => {
              setHighlightedCommentId(null);
            }, 3000);
          }
        }, 500);
      } else {
        alert('This comment is no longer available.');
      }
    }
  }, [modalComments, searchParams]);

  const handleLike = async () => {
    // Optimistic update
    setLikesCount((prev) => (likedByMe ? prev - 1 : prev + 1));
    setLikedByMe((prev) => !prev);
    await toggleLike(postId);
  };

  const handleSave = async () => {
    setSavedByMe((prev) => !prev);
    await toggleSavePost(postId);
  };

  const handleRepost = async () => {
    setRepostsCount((prev) => (repostedByMe ? prev - 1 : prev + 1));
    setRepostedByMe((prev) => !prev);
    await toggleRepost(postId);
  };

  const handleShareClick = async () => {
    setSharesCount((prev) => prev + 1);
    const shareUrl = `${window.location.origin}/news/${slug}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: headline || 'Tolee News',
          text: 'Check out this news article on Tolee!',
          url: shareUrl,
        });
      } catch (err) {
        console.log('Share canceled or failed', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert('Article link copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy link', err);
      }
    }
  };

  const handleQuickCommentSubmit = async () => {
    if (!commentText.trim()) return;
    const text = commentText;
    setCommentText('');

    // Optimistic count update
    setCommentsCount((prev) => prev + 1);

    const res = await addComment(postId, text);
    if (res && res.success) {
      if (activeCommentPost) {
        setModalComments((prev) => [res.comment, ...prev]);
      }
    } else {
      // Revert on failure
      setCommentsCount((prev) => prev - 1);
      alert(res.error || 'Failed to add comment');
    }
  };

  const openCommentsModal = async () => {
    setActiveCommentPost(postId);
    setIsModalLoading(true);
    try {
      const res = await getComments(postId);
      if (res && res.success) {
        setModalComments(res.comments || []);
      }
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setIsModalLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Interaction Icons Row */}
      <div className="flex items-center justify-between w-full pt-3 border-t border-zinc-100 dark:border-zinc-900/60">
        <div className="flex items-center gap-5">
          {/* Like */}
          <button
            onClick={(e) => { e.stopPropagation(); handleLike(); }}
            className={`flex items-center gap-1.5 transition-all duration-200 active:scale-110 focus:outline-none ${likedByMe ? 'text-red-500' : 'text-zinc-600 dark:text-zinc-400 hover:text-red-500'}`}
          >
            <Heart strokeWidth={1.5} className={`w-[22px] h-[22px] transition-colors ${likedByMe ? 'fill-red-500 stroke-red-500' : 'fill-transparent'}`} />
            <span className="text-[13px] font-semibold">{likesCount > 0 ? formatViewCount(likesCount) : '0'}</span>
          </button>

          {/* Comment */}
          <button
            onClick={(e) => { e.stopPropagation(); openCommentsModal(); }}
            className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 hover:text-blue-500 transition-all duration-200 active:scale-110 focus:outline-none"
          >
            <MessageCircle strokeWidth={1.5} className="w-[22px] h-[22px] fill-transparent" />
            <span className="text-[13px] font-semibold">{commentsCount > 0 ? formatViewCount(commentsCount) : '0'}</span>
          </button>

          {/* Repost */}
          <button
            onClick={(e) => { e.stopPropagation(); handleRepost(); }}
            className={`flex items-center gap-1.5 transition-all duration-200 active:scale-110 focus:outline-none ${repostedByMe ? 'text-green-500' : 'text-zinc-600 dark:text-zinc-400 hover:text-green-500'}`}
          >
            <Repeat strokeWidth={1.5} className={`w-[22px] h-[22px] transition-colors ${repostedByMe ? 'text-green-500' : ''}`} />
            <span className="text-[13px] font-semibold">{repostsCount > 0 ? formatViewCount(repostsCount) : '0'}</span>
          </button>

          {/* Share */}
          <button
            onClick={(e) => { e.stopPropagation(); handleShareClick(); }}
            className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 hover:text-primary transition-all duration-200 active:scale-110 focus:outline-none"
          >
            <Send strokeWidth={1.5} className="w-[22px] h-[22px] fill-transparent" />
            <span className="text-[13px] font-semibold">{sharesCount > 0 ? formatViewCount(sharesCount) : '0'}</span>
          </button>
        </div>

        {/* Right side: Views + Save */}
        <div className="flex items-center gap-3">
          {/* Views */}
          <span className="flex items-center gap-1 text-[13px] font-semibold text-zinc-400 dark:text-zinc-500">
            <Eye strokeWidth={1.5} className="w-[18px] h-[18px]" />
            <span>{formatViewCount(initialViews || 0)}</span>
          </span>

          {/* Bookmark */}
          <button
            onClick={(e) => { e.stopPropagation(); handleSave(); }}
            className="flex items-center gap-1 transition-all duration-200 active:scale-125 focus:outline-none text-zinc-600 dark:text-zinc-400 hover:text-yellow-500"
          >
            <Bookmark strokeWidth={1.5} className={`w-[22px] h-[22px] transition-colors ${savedByMe ? 'fill-primary dark:fill-white text-primary dark:text-white' : 'fill-transparent'}`} />
          </button>
        </div>
      </div>

      {/* Quick Comment box */}
      <div className="flex gap-2.5 items-center mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-900/60">
        <Avatar className="w-8 h-8 border border-gray-200 dark:border-gray-800">
          <AvatarImage src={session?.user?.image || ''} />
          <AvatarFallback>{session?.user?.name?.[0] || 'U'}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 flex gap-2 items-center bg-gray-100 dark:bg-zinc-900 rounded-full px-3.5 py-1 focus-within:ring-1 focus-within:ring-primary/40 transition-shadow">
          <input 
            placeholder="Add a comment..." 
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none shadow-none text-xs h-9 text-gray-950 dark:text-gray-50 placeholder-gray-400 dark:placeholder-gray-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleQuickCommentSubmit();
            }}
          />
          <button 
            onClick={handleQuickCommentSubmit} 
            disabled={!commentText.trim()}
            className={`p-1.5 rounded-full text-indigo-600 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all ${!commentText.trim() ? 'opacity-40 cursor-not-allowed' : 'opacity-100 hover:scale-110'}`}
          >
            <Send className="w-4 h-4 fill-current" />
          </button>
        </div>
      </div>

      {/* Dialog for comments list */}
      <Dialog open={!!activeCommentPost} onOpenChange={(open) => {
        if (!open) {
          setActiveCommentPost(null);
          setModalComments([]);
        }
      }}>
        <DialogContent className="sm:max-w-[500px] bg-white dark:bg-[#121212] h-[80vh] flex flex-col p-0 gap-0 overflow-hidden border-gray-200 dark:border-zinc-800 shadow-2xl rounded-3xl">
          <DialogHeader className="p-4 border-b border-gray-100 dark:border-zinc-900 shrink-0">
            <DialogTitle className="text-center font-bold text-lg tracking-tight">Article Comments</DialogTitle>
          </DialogHeader>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {isModalLoading ? (
              <div className="space-y-4 py-2">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="flex gap-3">
                    <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                    <div className="flex-grow space-y-1.5">
                      <Skeleton className="h-10 w-full rounded-2xl" />
                    </div>
                  </div>
                ))}
              </div>
            ) : modalComments.length > 0 ? (
              modalComments.map((comment: any, idx: number) => (
                <div 
                  key={idx} 
                  id={`comment-${comment.id}`}
                  className={`flex gap-3 transition-all duration-500 rounded-xl p-2 ${
                    highlightedCommentId === comment.id 
                      ? 'bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200/50 dark:border-yellow-900/30 scale-102 shadow-sm animate-pulse' 
                      : ''
                  }`}
                >
                  <Avatar className="w-9 h-9 shrink-0 border border-gray-100 dark:border-zinc-800">
                    <AvatarImage src={comment.author?.image || comment.author?.avatar || '/default-user-avatar.svg'} />
                    <AvatarFallback>{comment.author?.name?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col max-w-[85%]">
                    <div className="bg-gray-100 dark:bg-zinc-900 rounded-2xl rounded-tl-none px-4 py-2.5 text-sm border border-zinc-100 dark:border-zinc-800/80">
                      <span className="font-bold mb-0.5 block text-[13px] text-indigo-600">{comment.author?.username || comment.author?.name || 'User'}</span>
                      <span className="text-gray-800 dark:text-gray-200 leading-relaxed">{comment.content}</span>
                    </div>
                    <div className="flex gap-4 text-[11px] text-gray-500 font-bold ml-2 mt-1.5 uppercase tracking-tight opacity-70">
                      <span className="font-normal text-[10px] lowercase">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-20 flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-gray-50 dark:bg-zinc-900 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-8 h-8 text-gray-300" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">No comments yet</p>
                  <p className="text-xs text-gray-500 mt-1">Be the first to share your thoughts!</p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom composer inside dialog */}
          <div className="border-t border-gray-100 dark:border-zinc-800 p-3 shrink-0 flex gap-2 items-center">
            <Avatar className="w-8 h-8 shrink-0">
              <AvatarImage src={(session?.user as any)?.image || '/default-user-avatar.svg'} />
              <AvatarFallback>{session?.user?.name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 flex gap-2 items-center bg-gray-100 dark:bg-zinc-900 rounded-full px-3 py-1">
              <input
                ref={modalComposerRef}
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none shadow-none text-xs h-8 text-gray-950 dark:text-gray-50 placeholder-gray-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleQuickCommentSubmit();
                }}
              />
              <button
                onClick={handleQuickCommentSubmit}
                disabled={!commentText.trim()}
                className={`p-1.5 rounded-full text-indigo-600 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all ${!commentText.trim() ? 'opacity-40 cursor-not-allowed' : 'opacity-100 hover:scale-110'}`}
              >
                <Send className="w-4 h-4 fill-current" />
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
