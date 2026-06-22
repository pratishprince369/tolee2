'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Heart, MessageCircle, Send, MoreHorizontal, Repeat, 
  Bookmark, ShieldCheck, MapPin, Users, Lock, Trophy, Store, Globe, 
  BookOpen, UtensilsCrossed, ShoppingBag, Eye, Loader2 
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { PostCarousel } from '@/components/PostCarousel';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ReShareModal } from '@/components/ReShareModal';
import { ShareModal } from '@/components/ShareModal';
import { QuickBoostModal } from '@/components/QuickBoostModal';
import { getOrCreatePersonalChat } from '@/actions/chat';
import { editPostCaption, deletePostPermanently, updatePostVisibility, archivePost } from '@/actions/post';
import { formatViewCount } from '@/lib/utils';
import { UserHovercard } from '@/components/UserHovercard';

// Types matching profile and post items
interface PostType {
  id: string;
  caption: string | null;
  mediaUrls: string | null;
  mediaTypes: string | null;
  postType: string;
  visibility: string;
  authorId: string;
  createdAt: any;
  shareCount: number;
  author: string;
  authorName: string;
  authorAvatar: string | null;
  isVerified: boolean;
  toleeName?: string | null;
  toleeSlug?: string | null;
  likes: { userId: string }[];
  _count: {
    likes: number;
    comments: number;
    views: number;
    reposts: number;
  };
  likedByMe: boolean;
  savedByMe: boolean;
  repostedByMe: boolean;
}

interface UserType {
  id: string;
  username: string | null;
  name: string;
  avatar: string | null;
  coverImage: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  createdAt: any;
  isVerified: boolean;
  level: number;
  trustScore: number;
  isPrivate: boolean;
  _count: {
    followers: number;
    following: number;
    posts: number;
    tolees: number;
    friends: number;
  };
}

interface ProfileFeedViewProps {
  user: UserType;
  posts: PostType[];
  isMe: boolean;
  currentUserId: string;
  initialIsFollowing: boolean;
  initialFollowStatus: string | null;
  toggleFollowAction: (targetId: string) => Promise<any>;
  toggleLikeAction: (postId: string) => Promise<any>;
  addCommentAction: (postId: string, content: string) => Promise<any>;
  getCommentsAction: (postId: string) => Promise<any>;
  getLikesAction: (postId: string) => Promise<any>;
}

const getValidAvatarUrl = (url: string | null | undefined): string => {
  if (!url || url === 'null' || url === 'undefined' || url.trim() === '') {
    return '/default-user-avatar.svg';
  }
  return url;
};

export function ProfileFeedView({
  user,
  posts: initialPosts,
  isMe,
  currentUserId,
  initialIsFollowing,
  initialFollowStatus,
  toggleFollowAction,
  toggleLikeAction,
  addCommentAction,
  getCommentsAction,
  getLikesAction,
}: ProfileFeedViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetPostId = searchParams.get('postId');

  const { data: session } = useSession();
  const [feedPosts, setFeedPosts] = useState<PostType[]>(initialPosts);

  // Follow states
  const [followStatus, setFollowStatus] = useState<string | null>(initialFollowStatus);
  const [followersCount, setFollowersCount] = useState(user._count.followers);

  // Modals/Dialogs states
  const [activeCommentPost, setActiveCommentPost] = useState<string | null>(null);
  const [activeLikePost, setActiveLikePost] = useState<string | null>(null);
  const [activeRepostPost, setActiveRepostPost] = useState<string | null>(null);
  const [activeOptionsPost, setActiveOptionsPost] = useState<PostType | null>(null);
  const [modalComments, setModalComments] = useState<any[]>([]);
  const [modalLikes, setModalLikes] = useState<any[]>([]);
  const [modalReposts, setModalReposts] = useState<any[]>([]);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [isRepostModalLoading, setIsRepostModalLoading] = useState(false);
  const [commentText, setCommentText] = useState('');

  // Share and Re-share
  const [reshareModalOpen, setReshareModalOpen] = useState(false);
  const [selectedPostIdForReshare, setSelectedPostIdForReshare] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedPostForShare, setSelectedPostForShare] = useState<any | null>(null);

  // Quick Boost
  const [isQuickBoostOpen, setIsQuickBoostOpen] = useState(false);
  const [quickBoostType, setQuickBoostType] = useState<'post' | 'reel' | 'listing'>('post');
  const [quickBoostTargetId, setQuickBoostTargetId] = useState('');

  // Scroll target post into view on load
  useEffect(() => {
    if (targetPostId) {
      // Small timeout to allow Next.js client rendering to complete
      const timer = setTimeout(() => {
        const el = document.getElementById(`post-${targetPostId}`);
        if (el) {
          el.scrollIntoView({ block: 'start', behavior: 'auto' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [targetPostId]);

  // Handle back button click
  const handleBack = () => {
    router.back();
  };

  // Follow trigger
  const handleFollowClick = async () => {
    const currentStatus = followStatus;
    const nextStatus = currentStatus ? null : (user.isPrivate ? 'pending' : 'approved');
    
    setFollowStatus(nextStatus);
    if (nextStatus === 'approved') {
      setFollowersCount(prev => prev + 1);
    } else if (currentStatus === 'approved') {
      setFollowersCount(prev => Math.max(0, prev - 1));
    }

    const result = await toggleFollowAction(user.id);
    if (!result.success) {
      setFollowStatus(currentStatus);
      setFollowersCount(user._count.followers);
      alert(result.error || "Failed to toggle follow status");
    } else {
      setFollowStatus(result.status !== undefined ? result.status : (result.isFollowing ? 'approved' : null));
    }
  };

  // Chat/Message trigger
  const handleMessageClick = async () => {
    try {
      const res = await getOrCreatePersonalChat(user.id);
      if (res.success && res.chatId) {
        router.push(`/chat?id=${res.chatId}&tab=personal`);
      } else {
        alert(res.error || "Failed to start conversation.");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong starting personal chat.");
    }
  };

  // Liking handler
  const handleLike = async (postId: string) => {
    setFeedPosts(currPosts => 
      currPosts.map(post => {
        if (post.id === postId) {
          const wasLiked = post.likedByMe;
          return {
            ...post,
            likedByMe: !wasLiked,
            _count: {
              ...post._count,
              likes: wasLiked ? Math.max(0, post._count.likes - 1) : post._count.likes + 1
            }
          };
        }
        return post;
      })
    );

    const res = await toggleLikeAction(postId);
    if (!res.success) {
      // Revert if database save fails
      setFeedPosts(currPosts => 
        currPosts.map(post => {
          if (post.id === postId) {
            const wasLiked = post.likedByMe;
            return {
              ...post,
              likedByMe: !wasLiked,
              _count: {
                ...post._count,
                likes: wasLiked ? Math.max(0, post._count.likes - 1) : post._count.likes + 1
              }
            };
          }
          return post;
        })
      );
    }
  };

  // Comments submit
  const handleCommentSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentText.trim() || !activeCommentPost) return;
    const text = commentText;
    setCommentText('');

    // Optimistically update post list counter
    setFeedPosts(currPosts => 
      currPosts.map(post => {
        if (post.id === activeCommentPost) {
          return {
            ...post,
            _count: {
              ...post._count,
              comments: post._count.comments + 1
            }
          };
        }
        return post;
      })
    );

    const tempId = 'temp-' + Date.now();
    setModalComments(prev => [
      {
        id: tempId,
        content: text,
        author: {
          name: session?.user?.name || 'You',
          username: (session?.user as any)?.username || 'me',
          avatar: session?.user?.image
        },
        createdAt: new Date().toISOString()
      },
      ...prev
    ]);

    const res = await addCommentAction(activeCommentPost, text);
    if (!res.success) {
      // Revert comment count
      setFeedPosts(currPosts => 
        currPosts.map(post => {
          if (post.id === activeCommentPost) {
            return {
              ...post,
              _count: {
                ...post._count,
                comments: Math.max(0, post._count.comments - 1)
              }
            };
          }
          return post;
        })
      );
      setModalComments(prev => prev.filter(c => c.id !== tempId));
      alert("Failed to add comment.");
    } else {
      setModalComments(prev => prev.map(c => c.id === tempId ? res.comment : c));
    }
  };

  const openCommentsModal = async (postId: string) => {
    setActiveCommentPost(postId);
    setIsModalLoading(true);
    const res = await getCommentsAction(postId);
    if (res.success) {
      setModalComments(res.comments || []);
    }
    setIsModalLoading(false);
  };

  const openLikesModal = async (postId: string) => {
    setActiveLikePost(postId);
    setIsModalLoading(true);
    const res = await getLikesAction(postId);
    if (res.success) {
      setModalLikes(res.likes || []);
    }
    setIsModalLoading(false);
  };

  return (
    <div className="flex-grow flex flex-col min-h-screen bg-gray-50/50 dark:bg-black/20 pb-20 select-none">
      {/* Sticky Fixed Header */}
      <div className="sticky top-0 z-30 w-full bg-white/95 dark:bg-[#121212]/95 backdrop-blur-md border-b border-gray-100 dark:border-zinc-800/80 shadow-sm flex items-center justify-between px-4 py-3 max-w-[640px] mx-auto">
        <div className="flex items-center gap-3.5">
          <button 
            onClick={handleBack}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800/80 rounded-full transition-colors active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-800 dark:text-zinc-200" />
          </button>
          
          <Link href={`/u/${user.username}`} className="flex items-center gap-2 cursor-pointer group">
            <Avatar className="w-8 h-8 border border-zinc-100 dark:border-zinc-800 shadow-xs">
              <AvatarImage src={getValidAvatarUrl(user.avatar)} alt={user.name} />
              <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold text-xs">{user.name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <div className="flex items-center gap-0.5">
                <span className="font-extrabold text-[13.5px] text-gray-900 dark:text-zinc-100 group-hover:underline leading-none">{user.username}</span>
                {user.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-blue-500 fill-white dark:fill-zinc-950" />}
              </div>
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider leading-none mt-0.5">Posts Feed</span>
            </div>
          </Link>
        </div>

        {/* Follow / Message action buttons for other users */}
        {!isMe && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleFollowClick}
              className={`px-3 py-1.5 font-bold text-[11px] rounded-lg transition-all active:scale-95 shadow-xs ${
                followStatus === 'approved'
                  ? 'bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200'
                  : followStatus === 'pending'
                    ? 'bg-amber-50 border border-amber-200 text-amber-700'
                    : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm'
              }`}
            >
              {followStatus === 'approved' ? 'Following' : followStatus === 'pending' ? 'Requested' : 'Follow'}
            </button>
            <button
              onClick={handleMessageClick}
              className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 font-bold text-[11px] rounded-lg transition-all active:scale-95 shadow-xs"
            >
              Message
            </button>
          </div>
        )}
      </div>

      {/* Main Continuous Feed Container */}
      <div className="max-w-[500px] w-full mx-auto px-4 mt-4 space-y-4">
        {feedPosts.length > 0 ? (
          feedPosts.map((post) => {
            const hasVideo = post.mediaTypes && post.mediaTypes.split(',')[0] === 'video';
            const isSelected = post.id === targetPostId;

            return (
              <div 
                key={post.id} 
                id={`post-${post.id}`}
                className={`scroll-mt-16 transition-all duration-500 rounded-none sm:rounded-3xl overflow-hidden ${
                  isSelected 
                    ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-black scale-[1.01]' 
                    : ''
                }`}
              >
                {/* Visual wrapper matching FeedStream style */}
                <Card className="border-gray-200/60 dark:border-zinc-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] bg-white dark:bg-[#000000] border-x-0 sm:border-x">
                  
                  {/* Tolee/Group Context Header if shared in group */}
                  {post.toleeName && post.toleeSlug && (
                    <div className="px-4 py-2.5 border-b border-gray-100 dark:border-zinc-900 flex items-center gap-2.5 bg-gray-50/50 dark:bg-zinc-900/10">
                      <div className="w-7 h-7 bg-[#042c42] dark:bg-zinc-800 rounded-full flex items-center justify-center text-white shrink-0 shadow-xs">
                        <Users strokeWidth={2} className="w-4 h-4 text-white" />
                      </div>
                      <Link href={`/t/${post.toleeSlug}`} className="flex-grow">
                        <span className="text-[12px] font-extrabold text-[#042c42] dark:text-zinc-200 hover:underline cursor-pointer uppercase tracking-wider">
                          {post.toleeName}
                        </span>
                      </Link>
                    </div>
                  )}

                  {/* Creator details */}
                  <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                      <UserHovercard username={post.author}>
                        <Link href={`/u/${post.author}`}>
                          <Avatar className="w-10 h-10 cursor-pointer border border-zinc-100 dark:border-zinc-800 shadow-xs">
                            <AvatarImage src={getValidAvatarUrl(post.authorAvatar)} alt={post.author} />
                            <AvatarFallback>{post.author?.[0] || 'U'}</AvatarFallback>
                          </Avatar>
                        </Link>
                      </UserHovercard>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <UserHovercard username={post.author}>
                            <Link href={`/u/${post.author}`}>
                              <span className="font-bold text-[14.5px] text-zinc-900 dark:text-zinc-50 cursor-pointer hover:underline leading-none">{post.author}</span>
                            </Link>
                          </UserHovercard>
                          {post.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-blue-500 fill-white dark:fill-zinc-950" />}
                        </div>
                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 leading-none">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Options toggle trigger */}
                    <button 
                      onClick={() => setActiveOptionsPost(post)}
                      className="h-8 w-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-850 transition-colors focus:outline-none"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </CardHeader>

                  {/* Content block */}
                  <CardContent className="p-0 mt-1">
                    {post.caption && (
                      <p className="text-[14.5px] leading-snug text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap mb-3 px-5">{post.caption}</p>
                    )}
                    
                    {/* Media representation (images/videos) */}
                    {(post.mediaUrls) && (
                      <div className="w-full relative overflow-hidden bg-zinc-50 dark:bg-zinc-950">
                        <PostCarousel 
                          mediaUrls={post.mediaUrls} 
                          mediaTypes={post.mediaTypes || 'image'} 
                          postId={post.id} 
                        />
                      </div>
                    )}
                  </CardContent>

                  {/* Footer icon interactions */}
                  <CardFooter className="px-5 pb-5 pt-0 flex flex-col gap-3">
                    <div className="flex items-center justify-between w-full pt-3 border-t border-zinc-100 dark:border-zinc-900/60 mt-3">
                      <div className="flex items-center gap-4">
                        {/* 1. Like button */}
                        <button 
                          onClick={() => handleLike(post.id)}
                          className="transition-all duration-200 active:scale-125 focus:outline-none text-zinc-700 dark:text-zinc-300 hover:text-red-500"
                        >
                          <Heart strokeWidth={1.5} className={`w-[22px] h-[22px] transition-colors ${post.likedByMe ? 'fill-red-500 text-red-500 stroke-red-500' : 'fill-transparent'}`} />
                        </button>

                        {/* 2. Comments dialog trigger */}
                        <button 
                          onClick={() => openCommentsModal(post.id)}
                          className="transition-all duration-200 active:scale-115 focus:outline-none text-zinc-700 dark:text-zinc-300 hover:text-blue-500"
                        >
                          <MessageCircle strokeWidth={1.5} className="w-[22px] h-[22px]" />
                        </button>

                        {/* 3. Re-share trigger */}
                        <button 
                          onClick={() => {
                            setSelectedPostIdForReshare(post.id);
                            setReshareModalOpen(true);
                          }}
                          className="transition-all duration-300 hover:rotate-180 focus:outline-none text-zinc-700 dark:text-zinc-300 hover:text-green-500"
                        >
                          <Repeat strokeWidth={1.5} className={`w-[22px] h-[22px] ${post.repostedByMe ? 'text-green-500 stroke-[2]' : ''}`} />
                        </button>
                      </div>

                      {/* 4. Share button link */}
                      <button 
                        onClick={() => {
                          setSelectedPostForShare({
                            ...post,
                            previewText: post.caption || `Check out this post from ${post.author}`
                          });
                          setShareModalOpen(true);
                        }}
                        className="h-8 px-3 rounded-lg flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800/40 hover:text-indigo-600 dark:text-zinc-400 transition-colors focus:outline-none"
                      >
                        <Send className="w-4 h-4" />
                        <span>Share</span>
                      </button>
                    </div>

                    {/* Stats displays */}
                    <div className="flex flex-col gap-0.5 w-full text-[12px] font-bold text-gray-500 dark:text-zinc-400 px-0.5">
                      <div className="flex items-center gap-3">
                        <span 
                          onClick={() => openLikesModal(post.id)}
                          className="cursor-pointer hover:underline"
                        >
                          {post._count.likes} {post._count.likes === 1 ? 'like' : 'likes'}
                        </span>
                        <span>
                          {formatViewCount(post._count.views || 0)} views
                        </span>
                      </div>
                      
                      {post._count.comments > 0 ? (
                        <div 
                          onClick={() => openCommentsModal(post.id)}
                          className="text-[12px] text-gray-400 hover:underline cursor-pointer mt-0.5 font-semibold"
                        >
                          View all {post._count.comments} comments
                        </div>
                      ) : (
                        <div 
                          onClick={() => openCommentsModal(post.id)}
                          className="text-[12px] text-gray-400 hover:underline cursor-pointer mt-0.5 font-semibold"
                        >
                          Add a comment...
                        </div>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center px-6">
            <div className="w-16 h-16 rounded-full border-2 border-gray-100 flex items-center justify-center mb-4 bg-gray-50">
              <Eye className="w-7 h-7 text-gray-200 stroke-[1.5]" />
            </div>
            <h3 className="text-[16px] font-bold text-gray-900 mb-1">No Posts Yet</h3>
            <p className="text-[12.5px] text-gray-400 max-w-[220px] leading-relaxed">This profile hasn't posted any content.</p>
          </div>
        )}
      </div>

      {/* ===== COMMENTS DRAWER / DIALOG ===== */}
      <Dialog open={!!activeCommentPost} onOpenChange={async (open) => { if (!open) { setActiveCommentPost(null); setModalComments([]); } }}>
        <DialogContent className="sm:max-w-[500px] bg-white/95 dark:bg-[#121212]/95 backdrop-blur-xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden border-gray-200/50 dark:border-gray-800/50 shadow-2xl rounded-3xl">
          <DialogHeader className="p-4 border-b border-gray-100/50 dark:border-gray-800/50 shrink-0">
            <DialogTitle className="text-center font-bold text-lg tracking-tight">Post Comments</DialogTitle>
          </DialogHeader>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isModalLoading ? (
              <div className="space-y-4 py-2">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="flex items-center gap-3">
                    <Skeleton className="w-9 h-9 rounded-full bg-gray-100 dark:bg-zinc-800" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-28 rounded bg-gray-100 dark:bg-zinc-800" />
                      <Skeleton className="h-3 w-40 rounded bg-gray-100 dark:bg-zinc-800" />
                    </div>
                  </div>
                ))}
              </div>
            ) : modalComments.length > 0 ? (
              modalComments.map((comment: any) => (
                <div key={comment.id} className="flex items-start gap-3">
                  <Link href={`/u/${comment.author?.username || ''}`} onClick={() => setActiveCommentPost(null)}>
                    <Avatar className="w-9 h-9 border border-gray-100 dark:border-zinc-800 shadow-xs">
                      <AvatarImage src={getValidAvatarUrl(comment.author?.avatar)} alt={comment.author?.name} />
                      <AvatarFallback>{comment.author?.name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex flex-col bg-gray-50 dark:bg-zinc-900/60 px-3 py-2 rounded-2xl max-w-[80%]">
                    <span className="font-bold text-xs text-zinc-900 dark:text-zinc-50">{comment.author?.name || comment.author?.username}</span>
                    <p className="text-[13px] text-zinc-700 dark:text-zinc-200 mt-0.5 leading-normal">{comment.content}</p>
                    <span className="text-[9px] text-zinc-400 mt-1 font-semibold">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-20 flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-gray-50 dark:bg-zinc-900/60 rounded-full flex items-center justify-center"><MessageCircle className="w-6 h-6 text-gray-300" /></div>
                <p className="font-bold text-gray-400 text-xs">No comments yet</p>
                <p className="text-[11px] text-gray-400/80 max-w-[150px]">Be the first to share your thoughts!</p>
              </div>
            )}
          </div>

          {/* Comment Form Input */}
          <div className="p-4 border-t border-gray-100/50 dark:border-gray-800/50 bg-gray-50/50 dark:bg-black/50 shrink-0">
            <form onSubmit={handleCommentSubmit} className="flex items-center gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-full py-2 px-4 text-[13px] font-medium placeholder-gray-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition-all text-gray-900 dark:text-zinc-100"
              />
              <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-500 font-bold text-xs rounded-full px-4 shrink-0 shadow-xs">
                Post
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== LIKES DRAWER / DIALOG ===== */}
      <Dialog open={!!activeLikePost} onOpenChange={(open) => { if (!open) { setActiveLikePost(null); setModalLikes([]); } }}>
        <DialogContent className="sm:max-w-[420px] bg-white/95 dark:bg-[#121212]/95 backdrop-blur-xl p-0 gap-0 overflow-hidden border-gray-200/50 dark:border-gray-800/50 shadow-2xl rounded-3xl">
          <DialogHeader className="p-4 border-b border-gray-100/50 dark:border-gray-800/50 bg-white/50 dark:bg-black/50">
            <DialogTitle className="text-center font-bold text-lg">People who liked</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
            {isModalLoading ? (
              <div className="space-y-4 py-2">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-800" />
                      <Skeleton className="h-4 w-28 rounded bg-gray-100 dark:bg-zinc-800" />
                    </div>
                    <Skeleton className="h-8 w-20 rounded-full bg-gray-100 dark:bg-zinc-800" />
                  </div>
                ))}
              </div>
            ) : modalLikes.length > 0 ? (
              modalLikes.map((like: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border border-gray-100 dark:border-zinc-800 shadow-xs">
                      <AvatarImage src={getValidAvatarUrl(like.user.avatar)} />
                      <AvatarFallback>{like.user.name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-bold text-[14px] text-gray-900 dark:text-white leading-none">{like.user.name || like.user.username}</span>
                      {like.user.username && <span className="text-[11px] text-gray-400 leading-none mt-1">@{like.user.username}</span>}
                    </div>
                  </div>
                  {like.user.username && (
                    <Link href={`/u/${like.user.username}`} onClick={() => setActiveLikePost(null)}>
                      <Button variant="outline" size="sm" className="h-8 rounded-full border-gray-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-bold text-xs px-4 bg-transparent text-gray-600 dark:text-gray-300">View Profile</Button>
                    </Link>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-16 flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-gray-50 dark:bg-zinc-900/60 rounded-full flex items-center justify-center"><Heart className="w-6 h-6 text-gray-300" /></div>
                <p className="font-bold text-gray-400 text-xs">No likes yet</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== POST OPTIONS DIALOG ===== */}
      <Dialog open={!!activeOptionsPost} onOpenChange={(open) => { if (!open) setActiveOptionsPost(null); }}>
        <DialogContent className="sm:max-w-[400px] w-full bg-[#1c1c1e] text-white p-0 gap-0 overflow-hidden border border-gray-800 shadow-2xl rounded-3xl">
          <div className="flex flex-col items-center text-center">
            {activeOptionsPost && (() => {
              const isOwner = isMe || 
                activeOptionsPost.authorId === currentUserId || 
                activeOptionsPost.author === session?.user?.name || 
                activeOptionsPost.author === (session?.user as any)?.username;

              if (isOwner) {
                return (
                  <>
                    {/* Boost option (if own listing or post) */}
                    <button 
                      onClick={() => {
                        setQuickBoostType(activeOptionsPost.postType === 'listing' ? 'listing' : 'post');
                        setQuickBoostTargetId(activeOptionsPost.id);
                        setActiveOptionsPost(null);
                        setIsQuickBoostOpen(true);
                      }} 
                      className="py-4 font-extrabold text-[15px] hover:bg-white/5 active:bg-white/10 transition-colors w-full border-b border-gray-800/60 text-indigo-400 flex items-center justify-center gap-1.5"
                    >
                      <Trophy className="w-4 h-4 animate-bounce" /> Boost Post
                    </button>

                    {/* Delete */}
                    <button 
                      onClick={async () => {
                        const confirmDelete = window.confirm("Are you sure you want to permanently delete this post? This action cannot be undone.");
                        if (confirmDelete) {
                          const res = await deletePostPermanently(activeOptionsPost.id);
                          if (res.success) {
                            setFeedPosts(posts => posts.filter(p => p.id !== activeOptionsPost.id));
                            alert('Post permanently deleted.');
                          } else {
                            alert(res.error || 'Failed to delete post.');
                          }
                        }
                        setActiveOptionsPost(null);
                      }}
                      className="py-4 text-red-500 font-bold hover:bg-white/5 active:bg-white/10 transition-colors w-full border-b border-gray-800/60 outline-hidden text-[15px]"
                    >
                      Delete
                    </button>

                    {/* Edit */}
                    <button 
                      onClick={async () => {
                        const newCaption = window.prompt("Edit your post caption:", activeOptionsPost.caption || '');
                        if (newCaption !== null) {
                          const res = await editPostCaption(activeOptionsPost.id, newCaption);
                          if (res.success) {
                            setFeedPosts(posts => posts.map(p => p.id === activeOptionsPost.id ? { ...p, caption: newCaption } : p));
                            alert('Caption updated successfully.');
                          } else {
                            alert(res.error || 'Failed to update caption.');
                          }
                        }
                        setActiveOptionsPost(null);
                      }}
                      className="py-4 text-white font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full border-b border-gray-800/60 outline-hidden text-[15px]"
                    >
                      Edit
                    </button>

                    {/* Hide like count to others */}
                    <button 
                      onClick={() => {
                        alert("Like count visibility updated.");
                        setActiveOptionsPost(null);
                      }}
                      className="py-4 text-white font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full border-b border-gray-800/60 outline-hidden text-[15px]"
                    >
                      Hide like count to others
                    </button>

                    {/* Turn off commenting */}
                    <button 
                      onClick={() => {
                        alert("Commenting has been turned off for this post.");
                        setActiveOptionsPost(null);
                      }}
                      className="py-4 text-white font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full border-b border-gray-800/60 outline-hidden text-[15px]"
                    >
                      Turn off commenting
                    </button>

                    {/* Go to post */}
                    <button 
                      onClick={() => {
                        router.push(`/post/${activeOptionsPost.id}`);
                        setActiveOptionsPost(null);
                      }}
                      className="py-4 text-white font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full border-b border-gray-800/60 outline-hidden text-[15px]"
                    >
                      Go to post
                    </button>

                    {/* Share to... */}
                    <button 
                      onClick={() => {
                        setSelectedPostForShare(activeOptionsPost);
                        setShareModalOpen(true);
                        setActiveOptionsPost(null);
                      }}
                      className="py-4 text-white font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full border-b border-gray-800/60 outline-hidden text-[15px]"
                    >
                      Share to...
                    </button>

                    {/* Copy Link */}
                    <button 
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(`${window.location.origin}/post/${activeOptionsPost.id}`);
                          alert("Link copied to clipboard!");
                        } catch (err) {
                          console.error(err);
                        }
                        setActiveOptionsPost(null);
                      }}
                      className="py-4 text-white font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full border-b border-gray-800/60 outline-hidden text-[15px]"
                    >
                      Copy link
                    </button>

                    {/* Embed */}
                    <button 
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(`<iframe src="${window.location.origin}/post/${activeOptionsPost.id}" width="100%" height="500" style="border:none;"></iframe>`);
                          alert("Embed code copied to clipboard!");
                        } catch (err) {
                          console.error(err);
                        }
                        setActiveOptionsPost(null);
                      }}
                      className="py-4 text-white font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full border-b border-gray-800/60 outline-hidden text-[15px]"
                    >
                      Embed
                    </button>

                    {/* About this account */}
                    <button 
                      onClick={() => {
                        router.push(`/u/${activeOptionsPost.author || user.username}`);
                        setActiveOptionsPost(null);
                      }}
                      className="py-4 text-white font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full border-b border-gray-800/60 outline-hidden text-[15px]"
                    >
                      About this account
                    </button>
                  </>
                );
              } else {
                return (
                  <>
                    {/* Go to post */}
                    <button 
                      onClick={() => {
                        router.push(`/post/${activeOptionsPost.id}`);
                        setActiveOptionsPost(null);
                      }}
                      className="py-4 text-white font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full border-b border-gray-800/60 outline-hidden text-[15px]"
                    >
                      Go to post
                    </button>

                    {/* Share to... */}
                    <button 
                      onClick={() => {
                        setSelectedPostForShare(activeOptionsPost);
                        setShareModalOpen(true);
                        setActiveOptionsPost(null);
                      }}
                      className="py-4 text-white font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full border-b border-gray-800/60 outline-hidden text-[15px]"
                    >
                      Share to...
                    </button>

                    {/* Copy Link */}
                    <button 
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(`${window.location.origin}/post/${activeOptionsPost.id}`);
                          alert("Link copied to clipboard!");
                        } catch (err) {
                          console.error(err);
                        }
                        setActiveOptionsPost(null);
                      }}
                      className="py-4 text-white font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full border-b border-gray-800/60 outline-hidden text-[15px]"
                    >
                      Copy link
                    </button>

                    {/* Embed */}
                    <button 
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(`<iframe src="${window.location.origin}/post/${activeOptionsPost.id}" width="100%" height="500" style="border:none;"></iframe>`);
                          alert("Embed code copied to clipboard!");
                        } catch (err) {
                          console.error(err);
                        }
                        setActiveOptionsPost(null);
                      }}
                      className="py-4 text-white font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full border-b border-gray-800/60 outline-hidden text-[15px]"
                    >
                      Embed
                    </button>

                    {/* About this account */}
                    <button 
                      onClick={() => {
                        router.push(`/u/${activeOptionsPost.author || user.username}`);
                        setActiveOptionsPost(null);
                      }}
                      className="py-4 text-white font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full border-b border-gray-800/60 outline-hidden text-[15px]"
                    >
                      About this account
                    </button>
                  </>
                );
              }
            })()}

            <button 
              onClick={() => setActiveOptionsPost(null)}
              className="py-4 text-white/50 font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-hidden text-[15px]"
            >
              Cancel
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== SHARE MODAL ===== */}
      {selectedPostForShare && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => { setShareModalOpen(false); setSelectedPostForShare(null); }}
          postId={selectedPostForShare.id}
          shareUrl={selectedPostForShare.toleeSlug ? `${window.location.origin}/t/${selectedPostForShare.toleeSlug}` : `${window.location.origin}/u/${user.username}`}
          previewText={selectedPostForShare.previewText || 'Check out this post on Tolee!'}
          onShareSuccess={(newShareCount) => {
            setFeedPosts(currPosts => 
              currPosts.map(post => post.id === selectedPostForShare.id ? { ...post, shareCount: newShareCount } : post)
            );
          }}
        />
      )}

      {/* ===== RE-SHARE MODAL ===== */}
      <ReShareModal
        isOpen={reshareModalOpen}
        onClose={() => setReshareModalOpen(false)}
        postId={selectedPostIdForReshare || ''}
        onSuccess={(id) => {
          setFeedPosts(currPosts => 
            currPosts.map(post => post.id === id ? { ...post, repostedByMe: true } : post)
          );
        }}
      />

      {/* ===== QUICK BOOST MODAL ===== */}
      {isQuickBoostOpen && (
        <QuickBoostModal
          isOpen={isQuickBoostOpen}
          onClose={() => setIsQuickBoostOpen(false)}
          type={quickBoostType}
          targetId={quickBoostTargetId}
        />
      )}
    </div>
  );
}
