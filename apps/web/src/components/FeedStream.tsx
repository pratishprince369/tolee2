'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageCircle, Send, MoreHorizontal, Image as ImageIcon, Video, Trophy, Compass, Repeat, Bookmark, ShieldCheck, Plus, X, MapPin, Store, Globe, BookOpen, UtensilsCrossed, ShoppingBag, Users, Rocket, Eye, Newspaper } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

import { CreatePostModal } from '@/components/CreatePostModal';
import { CreateRequirementModal } from '@/components/CreateRequirementModal';
import { OptimisticPostCard } from '@/components/OptimisticPostCard';
import { uploadFile } from '@/lib/upload';
import { createPost, toggleLike, addComment, getLikes, getComments, toggleSavePost, toggleRepost, getReposts, updatePostVisibility, deletePostPermanently, editPostCaption, archivePost, incrementStoryEngagement, getPostStoryAnalytics } from '@/actions/post';
import { toggleFollow } from '@/actions/user';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { ReShareModal } from '@/components/ReShareModal';
import { ViewTracker } from '@/components/ViewTracker';
import { QuickBoostModal } from '@/components/QuickBoostModal';
import { AdTracker } from '@/components/AdTracker';
import { fetchEligibleAds } from '@/actions/ads';
import { formatViewCount } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { getOrCreatePersonalChat } from '@/actions/chat';
import { ShareModal } from '@/components/ShareModal';
import { HLSVideo } from '@/components/HLSVideo';
import { AutoplayVideo } from '@/components/AutoplayVideo';
import { isVideoUrl, getMediaThumbnail, getPosterUrl } from '@/lib/media';
import { fetchFeedStories } from '@/actions/story';
import { createTestStory } from '@/actions/highlight';
import { StoryViewer } from '@/components/StoryViewer';
import { StoryEditor } from '@/components/StoryEditor';
import { PostCarousel } from '@/components/PostCarousel';
import { Camera, Sparkles } from 'lucide-react';
import { UserHovercard } from '@/components/UserHovercard';

export function FeedStream({ initialPosts }: { initialPosts: any[] }) {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Stories state
  const [storyGroups, setStoryGroups] = useState<any[]>([]);
  const [activeStoryGroupIndex, setActiveStoryGroupIndex] = useState<number | null>(null);
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false);
  const [isStoryCreatorOpen, setIsStoryCreatorOpen] = useState(false);
  const [isStoryEditorOpen, setIsStoryEditorOpen] = useState(false);
  const [isUploadingStory, setIsUploadingStory] = useState(false);
  const [storyMediaUrl, setStoryMediaUrl] = useState('');
  const [storyMediaType, setStoryMediaType] = useState<'image' | 'video'>('image');
  const [storyThumbnailUrl, setStoryThumbnailUrl] = useState<string | undefined>(undefined);

  // Fetch stories on mount
  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      const res = await fetchFeedStories();
      if (res.success && res.groups) {
        setStoryGroups(res.groups);
      }
    } catch (err) {
      console.error('Failed to load stories:', err);
    }
  };

  const handleStoryUpload = async (file: File) => {
    setIsUploadingStory(true);
    try {
      const isVideo = file.type.startsWith('video/');
      const uploadResult = await uploadFile(file);
      
      let optimizedUrl = uploadResult.secure_url;
      let thumbnailUrl: string | undefined = undefined;

      if (isVideo) {
        // Generate a Cloudinary thumbnail URL: take first frame at 0s, convert to JPG
        // Works regardless of eager transformation status
        const rawVideoUrl: string = uploadResult.original_url;
        if (rawVideoUrl.includes('res.cloudinary.com') && rawVideoUrl.includes('/video/upload/')) {
          thumbnailUrl = rawVideoUrl
            .replace('/video/upload/', '/video/upload/c_fill,w_400,h_400,g_auto,so_0,q_auto,f_jpg/')
            .replace(/\.([a-zA-Z0-9]+)$/, '.jpg');
        }
      } else {
        thumbnailUrl = optimizedUrl;
      }

      setStoryMediaUrl(optimizedUrl);
      setStoryMediaType(isVideo ? 'video' : 'image');
      setStoryThumbnailUrl(thumbnailUrl);
      
      // Auto-launch Story Editor pre-publish
      setIsStoryCreatorOpen(false);
      setIsStoryEditorOpen(true);
    } catch (err: any) {
      console.error(err);
      alert('Error uploading file: ' + (err.message || 'Network error.'));
    } finally {
      setIsUploadingStory(false);
    }
  };

  const handleCreateStorySubmit = async () => {
    if (!storyMediaUrl) {
      alert("Please upload a story or paste a URL.");
      return;
    }
    try {
      const res = await createTestStory(storyMediaUrl, storyMediaType, storyThumbnailUrl);
      if (res.success) {
        alert("Story uploaded successfully!");
        setIsStoryCreatorOpen(false);
        setStoryMediaUrl('');
        setStoryThumbnailUrl(undefined);
        loadStories(); // reload
      } else {
        alert(res.error || "Failed to create story.");
      }
    } catch (err) {
      console.error(err);
      alert("Error creating story.");
    }
  };

  const handleStoryViewed = (storyId: string, userId: string) => {
    setStoryGroups(prevGroups => {
      return prevGroups.map(group => {
        if (group.user.id === userId) {
          const updatedStories = group.stories.map((s: any) => {
            if (s.id === storyId) {
              return { ...s, viewed: true };
            }
            return s;
          });
          const hasUnviewed = updatedStories.some((s: any) => !s.viewed);
          return { ...group, stories: updatedStories, hasUnviewed };
        }
        return group;
      });
    });
  };

  const handleStoryDeleted = (storyId: string, userId: string) => {
    setStoryGroups(prevGroups => {
      return prevGroups
        .map(group => {
          if (group.user.id === userId) {
            const updatedStories = group.stories.filter((s: any) => s.id !== storyId);
            const hasUnviewed = updatedStories.some((s: any) => !s.viewed);
            return { ...group, stories: updatedStories, hasUnviewed };
          }
          return group;
        })
        .filter(group => group.stories.length > 0 || group.user.id === (session?.user as any)?.id);
    });
  };

  const handleAdClick = async (e: React.MouseEvent, ad: any) => {
    e.preventDefault();
    e.stopPropagation();
    const advertiserId = ad.adSet?.campaign?.user?.id;
    if (!advertiserId) {
      if (ad.destinationUrl) window.open(ad.destinationUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (session?.user && (session.user as any).id === advertiserId) {
      router.push('/ads-manager');
      return;
    }

    try {
      const res = await getOrCreatePersonalChat(advertiserId);
      if (res.success && res.chatId) {
        router.push(`/chat?id=${res.chatId}&tab=personal`);
      } else {
        if (ad.destinationUrl) window.open(ad.destinationUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      console.error('Chat redirection error:', err);
      if (ad.destinationUrl) window.open(ad.destinationUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const hasJoinedTolees = true;
  const [feedPosts, setFeedPosts] = useState(initialPosts);
  const [isPosting, setIsPosting] = useState(false);

  // Follow/Following status state keyed by authorId
  const [followStates, setFollowStates] = useState<Record<string, { isFollowing: boolean; status: 'approved' | 'pending' | null; isPrivate: boolean }>>(() => {
    const initialStates: Record<string, { isFollowing: boolean; status: 'approved' | 'pending' | null; isPrivate: boolean }> = {};
    (initialPosts || []).forEach(post => {
      if (post.authorId && !initialStates[post.authorId]) {
        initialStates[post.authorId] = {
          isFollowing: post.isFollowing || false,
          status: post.followStatus || null,
          isPrivate: post.authorIsPrivate || false,
        };
      }
    });
    return initialStates;
  });

  const handleFollowAuthor = async (authorId: string) => {
    if (!session?.user) {
      router.push('/');
      return;
    }
    
    const currentState = followStates[authorId];
    if (!currentState) return;

    const isCurrentlyFollowing = currentState.isFollowing;
    const isCurrentlyPending = currentState.status === 'pending';
    
    let nextIsFollowing = false;
    let nextStatus: 'approved' | 'pending' | null = null;

    if (isCurrentlyFollowing || isCurrentlyPending) {
      nextIsFollowing = false;
      nextStatus = null;
    } else {
      if (currentState.isPrivate) {
        nextIsFollowing = false;
        nextStatus = 'pending';
      } else {
        nextIsFollowing = true;
        nextStatus = 'approved';
      }
    }

    // Update state optimistically
    setFollowStates(prev => ({
      ...prev,
      [authorId]: {
        ...prev[authorId],
        isFollowing: nextIsFollowing,
        status: nextStatus
      }
    }));

    try {
      const res = await toggleFollow(authorId);
      if (!res.success) {
        // Rollback state if failed
        setFollowStates(prev => ({
          ...prev,
          [authorId]: currentState
        }));
        console.error("Failed to toggle follow:", res.error);
      } else {
        setFollowStates(prev => ({
          ...prev,
          [authorId]: {
            ...prev[authorId],
            isFollowing: res.isFollowing || false,
            status: res.status as 'approved' | 'pending' | null
          }
        }));
      }
    } catch (err) {
      setFollowStates(prev => ({
        ...prev,
        [authorId]: currentState
      }));
      console.error("Error toggling follow:", err);
    }
  };
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);

  // Ads and Boost State
  const [sponsoredAds, setSponsoredAds] = useState<any[]>([]);
  const [isQuickBoostOpen, setIsQuickBoostOpen] = useState(false);
  const [quickBoostType, setQuickBoostType] = useState<'post' | 'reel' | 'listing'>('post');
  const [quickBoostTargetId, setQuickBoostTargetId] = useState('');

  // Fetch sponsored ads on mount
  useEffect(() => {
    fetchEligibleAds({ limit: 10 }).then((res) => {
      if (Array.isArray(res)) {
        setSponsoredAds(res);
      }
    }).catch((err) => console.error('Failed to load sponsored ads:', err));
  }, []);

  const [activeCommentPost, setActiveCommentPost] = useState<string | null>(null);
  const [activeLikePost, setActiveLikePost] = useState<string | null>(null);
  const [activeRepostPost, setActiveRepostPost] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [isRepostModalLoading, setIsRepostModalLoading] = useState(false);
  const [modalLikes, setModalLikes] = useState<any[]>([]);
  const [modalComments, setModalComments] = useState<any[]>([]);
  const [modalReposts, setModalReposts] = useState<any[]>([]);

  // Mobile Bottom Sheet States & Handlers
  const [isMobile, setIsMobile] = useState(false);
  const [sortOrder, setSortOrder] = useState<'relevant' | 'newest' | 'oldest'>('relevant');
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; authorName: string } | null>(null);
  const [likedComments, setLikedComments] = useState<Record<string, boolean>>({});
  const [visibleCommentsCount, setVisibleCommentsCount] = useState(10);
  const [expandedCommentReplies, setExpandedCommentReplies] = useState<Record<string, boolean>>({});
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null);
  
  // Drag gestures state
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);

  const composerInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('tolee_liked_comments');
      if (saved) {
        setLikedComments(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load liked comments', e);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const targetPostId = searchParams?.get('postId');
    const commentId = searchParams?.get('commentId');
    if (targetPostId) {
      setTimeout(() => {
        const el = document.getElementById(`post-${targetPostId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-[#0a7c85]', 'ring-offset-2');
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-[#0a7c85]', 'ring-offset-2');
          }, 3000);
        }
      }, 600);

      if (commentId) {
        openCommentsModal(targetPostId);
      }
    }
  }, [mounted, searchParams]);

  useEffect(() => {
    if (!mounted || modalComments.length === 0) return;
    const commentId = searchParams?.get('commentId');
    const replyId = searchParams?.get('replyId');
    if (commentId) {
      const targetId = replyId || commentId;
      const targetExists = modalComments.some(c => 
        c.id === targetId || (modalComments.some(child => child.parentId === c.id && child.id === targetId))
      );

      if (targetExists) {
        if (replyId) {
          setExpandedCommentReplies(prev => ({ ...prev, [commentId]: true }));
        }

        setTimeout(() => {
          const el = document.getElementById(`comment-${targetId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightedCommentId(targetId);
            
            const targetComment = modalComments.find(c => c.id === targetId) || 
                                  modalComments.find(c => c.parentId === commentId && c.id === targetId);
            const authorName = targetComment?.author?.username || targetComment?.author?.name || 'User';

            setReplyingTo({
              commentId: commentId,
              authorName
            });
            setTimeout(() => {
              composerInputRef.current?.focus();
            }, 300);

            setTimeout(() => {
              setHighlightedCommentId(null);
            }, 3000);
          }
        }, 500);
      } else {
        alert("This comment is no longer available.");
      }
    }
  }, [modalComments, searchParams, mounted]);

  const [animateShow, setAnimateShow] = useState(false);

  useEffect(() => {
    if (activeCommentPost) {
      setVisibleCommentsCount(10);
      setReplyingTo(null);
      setTranslateY(0);
      setIsDragging(false);
      setExpandedCommentReplies({});
      
      if (isMobile) {
        const timer = setTimeout(() => setAnimateShow(true), 20);
        return () => clearTimeout(timer);
      }
    } else {
      setAnimateShow(false);
    }
  }, [activeCommentPost, isMobile]);

  // Simulated real-time comments updates
  useEffect(() => {
    if (!activeCommentPost || !isMobile) return;

    const mockAuthors = [
      { id: 'usr-1', name: 'Rohit Sharma', username: 'rohit_sharma', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
      { id: 'usr-2', name: 'Sarah Connor', username: 'sarah_c', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
      { id: 'usr-3', name: 'David Beckham', username: 'beckham_d', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
      { id: 'usr-4', name: 'Ashirwad Mhatre', username: 'ashirwad_m', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150' },
      { id: 'usr-5', name: 'Pooja Patil', username: 'pooja_p', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150' }
    ];

    const mockTexts = [
      "This is absolutely spot on! 🙌",
      "Wow, love this so much! ❤️",
      "Agree with this 100%.",
      "Outstanding! Keep it up.",
      "Incredible content, shared it! 🚀",
      "Fascinating perspective! Thanks for sharing.",
      "Haha, this made my day! 😂"
    ];

    const interval = setInterval(() => {
      const randomAuthor = mockAuthors[Math.floor(Math.random() * mockAuthors.length)];
      const randomText = mockTexts[Math.floor(Math.random() * mockTexts.length)];
      const newComment = {
        id: 'sim-' + Date.now(),
        content: randomText,
        postId: activeCommentPost,
        parentId: null,
        createdAt: new Date().toISOString(),
        author: randomAuthor
      };

      setModalComments(prev => [newComment, ...prev]);

      setFeedPosts(posts =>
        posts.map(post =>
          post.id === activeCommentPost
            ? { ...post, comments: post.comments + 1 }
            : post
        )
      );
    }, 35000);

    return () => clearInterval(interval);
  }, [activeCommentPost, isMobile]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setStartY(touch.clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const deltaY = touch.clientY - startY;
    if (deltaY > 0) {
      setTranslateY(deltaY);
    }
  };

  const handleCloseMobileSheet = () => {
    setAnimateShow(false);
    setTimeout(() => {
      setActiveCommentPost(null);
      setModalComments([]);
    }, 250);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (translateY > 120) {
      handleCloseMobileSheet();
    } else {
      setTranslateY(0);
    }
  };

  const handleLikeComment = (commentId: string) => {
    setLikedComments(prev => {
      const updated = { ...prev, [commentId]: !prev[commentId] };
      try {
        localStorage.setItem('tolee_liked_comments', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const getCommentLikeCount = (comment: any) => {
    let baseLikes = 0;
    if (comment.id && !comment.id.startsWith('temp-') && !comment.id.startsWith('sim-')) {
      const charSum = comment.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
      baseLikes = charSum % 12;
    }
    return likedComments[comment.id] ? baseLikes + 1 : baseLikes;
  };

  const getRepliesForComment = (commentId: string) => {
    return modalComments.filter((c: any) => c.parentId === commentId);
  };

  const getSortedComments = () => {
    const sorted = [...modalComments];
    if (sortOrder === 'newest') {
      return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortOrder === 'oldest') {
      return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else {
      const post = feedPosts.find(p => p.id === activeCommentPost);
      return sorted.sort((a, b) => {
        const aIsAuthor = post && a.author?.name === post.author;
        const bIsAuthor = post && b.author?.name === post.author;
        if (aIsAuthor && !bIsAuthor) return -1;
        if (!aIsAuthor && bIsAuthor) return 1;

        const aRepliesCount = modalComments.filter(c => c.parentId === a.id).length;
        const bRepliesCount = modalComments.filter(c => c.parentId === b.id).length;
        if (aRepliesCount > bRepliesCount) return -1;
        if (aRepliesCount < bRepliesCount) return 1;

        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }
  };

  const toggleReplies = (commentId: string) => {
    setExpandedCommentReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  const renderComment = (comment: any, isReply: boolean = false, onReplyClick?: () => void) => {
    const isLiked = likedComments[comment.id];
    const likeCount = getCommentLikeCount(comment);
    
    // Time formatting helper
    const getFormattedTime = (dateStr: string) => {
      try {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h`;
        const days = Math.floor(hrs / 24);
        return `${days}d`;
      } catch (e) {
        return '1d';
      }
    };
    
    return (
      <div 
        key={comment.id} 
        id={`comment-${comment.id}`}
        className={`flex gap-2.5 ${isReply ? 'ml-8 mt-2.5 border-l border-gray-100 dark:border-gray-800 pl-3' : 'mt-4'} transition-all duration-500 rounded-xl p-2 ${
          highlightedCommentId === comment.id 
            ? 'bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200/50 dark:border-yellow-900/30 scale-102 shadow-sm animate-pulse' 
            : ''
        }`}
      >
        <Avatar className={`${isReply ? 'w-7 h-7' : 'w-9 h-9'} shrink-0 border border-gray-100 dark:border-gray-800`}>
          <AvatarImage src={comment.author?.avatar || '/default-user-avatar.svg'} />
          <AvatarFallback>{comment.author?.name?.[0] || 'U'}</AvatarFallback>
        </Avatar>
        <div className="flex-1 flex flex-col">
          {/* Bubble wrapper */}
          <div className="relative group max-w-[95%]">
            <div className="bg-gray-100 dark:bg-[#242526] rounded-2xl rounded-tl-none px-3.5 py-2 text-xs shadow-sm border border-transparent dark:border-white/5 flex flex-col">
              <span className="font-bold text-gray-900 dark:text-gray-100 text-[11px] mb-0.5 hover:underline cursor-pointer">
                {comment.author?.username || comment.author?.name || 'User'}
              </span>
              <p className="text-gray-800 dark:text-gray-200 leading-relaxed break-words font-normal">
                {comment.content}
              </p>
            </div>
            
            {/* Likes badge overlays bubble bottom-right if likeCount > 0 */}
            {likeCount > 0 && (
              <div className="absolute -bottom-2 right-2.5 bg-white dark:bg-[#242526] hover:bg-gray-100 dark:hover:bg-gray-700 shadow-md border border-gray-100 dark:border-gray-800 rounded-full px-1.5 py-0.5 flex items-center gap-1 cursor-pointer select-none">
                <span className="text-[10px]">👍</span>
                <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400">{likeCount}</span>
              </div>
            )}
          </div>
          
          {/* Actions line */}
          <div className="flex items-center gap-4 text-[10px] text-gray-500 dark:text-gray-400 font-bold ml-2.5 mt-1">
            <span className="text-gray-400 dark:text-gray-500 font-normal">
              {getFormattedTime(comment.createdAt)}
            </span>
            <button 
              onClick={() => handleLikeComment(comment.id)} 
              className={`hover:underline transition-colors ${isLiked ? 'text-[#1877f2] font-extrabold' : ''}`}
            >
              Like
            </button>
            <button 
              onClick={onReplyClick || (() => {
                setReplyingTo({ commentId: comment.id, authorName: comment.author?.username || comment.author?.name || 'User' });
                composerInputRef.current?.focus();
              })} 
              className="hover:underline"
            >
              Reply
            </button>
          </div>
          
          {/* Nested Replies Toggles and List (only for root comments) */}
          {!isReply && (() => {
            const replies = getRepliesForComment(comment.id);
            if (replies.length === 0) return null;
            
            const isExpanded = expandedCommentReplies[comment.id];
            
            return (
              <div className="flex flex-col mt-1.5">
                <button 
                  onClick={() => toggleReplies(comment.id)}
                  className="flex items-center gap-1 text-[11px] font-bold text-gray-500 dark:text-gray-400 hover:text-primary pl-2.5 py-1 text-left"
                >
                  <span>{isExpanded ? 'Hide' : `View ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}</span>
                  <span className="text-[9px]">{isExpanded ? '▲' : '▼'}</span>
                </button>
                
                {isExpanded && replies.map((reply: any) => (
                  <React.Fragment key={reply.id}>
                    {renderComment(reply, true, () => {
                      // Clicking reply on a nested reply replies to the same parent comment
                      setReplyingTo({ commentId: comment.id, authorName: reply.author?.username || reply.author?.name || 'User' });
                      composerInputRef.current?.focus();
                    })}
                  </React.Fragment>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
    );
  };

  const handleBottomSheetScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 80) {
      const rootComments = getSortedComments().filter((c: any) => !c.parentId);
      setVisibleCommentsCount(prev => Math.min(prev + 10, rootComments.length));
    }
  };

  // Exclusions and Options Dialog States
  const [hiddenPostIds, setHiddenPostIds] = useState<string[]>([]);
  const [hiddenUsernames, setHiddenUsernames] = useState<string[]>([]);
  const [hiddenToleeNames, setHiddenToleeNames] = useState<string[]>([]);
  const [activeOptionsPost, setActiveOptionsPost] = useState<any | null>(null);
  const [postAnalytics, setPostAnalytics] = useState<any | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState<boolean>(false);

  useEffect(() => {
    if (activeOptionsPost && session?.user) {
      const isOwner = (session.user as any).id === activeOptionsPost.authorId || 
                      (session.user as any).username === activeOptionsPost.author;
      if (isOwner) {
        setLoadingAnalytics(true);
        getPostStoryAnalytics(activeOptionsPost.id).then(res => {
          if (res.success) {
            setPostAnalytics(res.analytics);
          } else {
            setPostAnalytics(null);
          }
          setLoadingAnalytics(false);
        }).catch(err => {
          console.error("Error fetching analytics:", err);
          setPostAnalytics(null);
          setLoadingAnalytics(false);
        });
      } else {
        setPostAnalytics(null);
      }
    } else {
      setPostAnalytics(null);
    }
  }, [activeOptionsPost, session?.user]);

  const [reshareModalOpen, setReshareModalOpen] = useState(false);
  const [selectedPostIdForReshare, setSelectedPostIdForReshare] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedPostForShare, setSelectedPostForShare] = useState<any | null>(null);

  const handleReshareSuccess = (id: string) => {
    setFeedPosts(posts => 
      posts.map(post => 
        post.id === id 
          ? { 
              ...post, 
              reposts: (post.reposts || 0) + 1,
              repostedByMe: true
            } 
          : post
      )
    );
  };

  const handleSave = async (id: string) => {
    setFeedPosts(posts => 
      posts.map(post => 
        post.id === id 
          ? { 
              ...post, 
              savedByMe: !post.savedByMe
            } 
          : post
      )
    );
    await toggleSavePost(id);
  };

  const handleRepost = async (id: string) => {
    setFeedPosts(posts => 
      posts.map(post => 
        post.id === id 
          ? { 
              ...post, 
              reposts: post.repostedByMe ? Math.max(0, (post.reposts || 1) - 1) : (post.reposts || 0) + 1,
              repostedByMe: !post.repostedByMe
            } 
          : post
      )
    );
    await toggleRepost(id);
  };

  const handleLike = async (id: string) => {
    // Optimistic update
    setFeedPosts(posts => 
      posts.map(post => 
        post.id === id 
          ? { 
              ...post, 
              likes: post.likedByMe ? post.likes - 1 : post.likes + 1,
              likedByMe: !post.likedByMe
            } 
          : post
      )
    );
    // Server action
    const res = await toggleLike(id);
    if (res && res.success) {
      if (searchParams.get('fromStory') === 'true') {
        incrementStoryEngagement(id);
      }
    }
  };

  const handleCommentSubmit = async (postId: string, parentId?: string) => {
    if (!commentText.trim()) return;
    
    const text = commentText;
    setCommentText('');
    setReplyingTo(null);

    // Optimistic Update
    const tempId = 'temp-' + Date.now();
    const optimisticComment = {
      id: tempId,
      content: text,
      postId,
      parentId: parentId || null,
      author: {
        name: session?.user?.name || 'You',
        username: (session?.user as any)?.username || 'me',
        avatar: session?.user?.image
      },
      createdAt: new Date().toISOString()
    };

    setFeedPosts(posts =>
      posts.map(post =>
        post.id === postId
          ? {
              ...post,
              comments: post.comments + 1,
              commentsList: [...(post.commentsList || []), optimisticComment]
            }
          : post
      )
    );

    // If modal is open, optimistically update modal comments list too
    if (activeCommentPost === postId) {
      setModalComments(prev => [optimisticComment, ...prev]);
    }
    
    const res = await addComment(postId, text, parentId);
    if (res && res.success) {
      if (searchParams.get('fromStory') === 'true') {
        incrementStoryEngagement(postId);
      }
      // Update modal list with the real comment from database
      if (activeCommentPost === postId) {
        setModalComments(prev => prev.map((c: any) => c.id === tempId ? res.comment : c));
      }
    } else {
      // Revert on failure
      setFeedPosts(posts =>
        posts.map(post =>
          post.id === postId
            ? {
                ...post,
                comments: post.comments - 1,
                commentsList: (post.commentsList || []).filter((c: any) => c.id !== tempId)
              }
            : post
        )
      );
      if (activeCommentPost === postId) {
        setModalComments(prev => prev.filter((c: any) => c.id !== tempId));
      }
      alert("Failed to add comment. Please try again.");
    }
  };

  const openLikesModal = async (postId: string) => {
    setActiveLikePost(postId);
    setIsModalLoading(true);
    const res = await getLikes(postId);
    if (res.success) {
      setModalLikes(res.likes);
    }
    setIsModalLoading(false);
  };

  const openCommentsModal = async (postId: string) => {
    setActiveCommentPost(postId);
    setIsModalLoading(true);
    const res = await getComments(postId);
    if (res.success) {
      setModalComments(res.comments);
    }
    setIsModalLoading(false);
  };

  const openRepostsModal = async (postId: string) => {
    setActiveRepostPost(postId);
    setIsRepostModalLoading(true);
    const res = await getReposts(postId);
    if (res.success) {
      setModalReposts(res.reposts || []);
    }
    setIsRepostModalLoading(false);
  };

  const handleNewPost = (post: any, postData?: any) => {
    try {
      console.log("handleNewPost called with:", post, postData);
      const isAnon = !!post.isAnonymous;
      const newLocalPost = {
        id: post.id,
        author: isAnon ? 'Anonymous' : (post.author?.username || post.author?.name || 'Anonymous'),
        authorAvatar: isAnon ? '/default-user-avatar.svg' : (post.author?.avatar || post.author?.image || '/default-user-avatar.svg'),
        authorId: isAnon ? null : post.author?.id,
        isAnonymous: isAnon,
        toleeName: postData?.toleeName || 'Tolee',
        toleeSlug: postData?.toleeSlug || 'group',
        role: 'Member',
        time: 'Just now',
        content: post.caption || '',
        image: (post.mediaTypes && post.mediaUrls) ? (post.mediaTypes.split(',')[0] === 'image' ? post.mediaUrls.split(/,(?=https?:\/\/)/)[0] : null) : null,
        video: (post.mediaTypes && post.mediaUrls) ? (post.mediaTypes.split(',')[0] === 'video' ? post.mediaUrls.split(/,(?=https?:\/\/)/)[0] : null) : null,
        mediaUrls: post.mediaUrls || null,
        mediaTypes: post.mediaTypes || null,
        likes: 0,
        comments: 0,
        isWin: post.postType === 'win',
        postType: post.postType || 'regular',
        location: post.location || null,
        subLocation: post.subLocation || null,
        likedByMe: false,
        savedByMe: false,
        repostedByMe: false,
        commentsList: [],
        resharedByUser: null
      };
      console.log("Constructed newLocalPost:", newLocalPost);
      setFeedPosts(prev => [newLocalPost, ...prev]);
    } catch (err) {
      console.error("Error inside handleNewPost:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] font-sans text-gray-900 dark:text-gray-100">
      {/* Sibling triggers for programmatic click placed at top of container to prevent scroll focus bugs */}
      <div className="hidden">
        <CreateRequirementModal onPost={handleNewPost}>
          <button id="trigger-requirement">Trigger Requirement</button>
        </CreateRequirementModal>
        <CreatePostModal onPost={handleNewPost}>
          <button id="trigger-normal-post">Trigger Normal Post</button>
        </CreatePostModal>
        <CreatePostModal onPost={handleNewPost} videoOnly={true}>
          <button id="trigger-reel-post">Trigger Reel Post</button>
        </CreatePostModal>
        <CreatePostModal onPost={handleNewPost} defaultTab="news">
          <button id="trigger-news-post">Trigger News Post</button>
        </CreatePostModal>
      </div>
      
      {/* Mobile Header (Sidebar is hidden on mobile) */}
      <header className="lg:hidden sticky top-0 z-50 w-full bg-white/95 dark:bg-[#0a0a0c]/95 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-900 shadow-[0_2px_15px_rgba(0,0,0,0.02)] h-16 flex items-center justify-between px-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-primary dark:text-white">Your Feed</h1>
        <button 
          onClick={() => setIsQuickActionOpen(true)}
          className="w-10 h-10 bg-primary dark:bg-white text-white dark:text-primary rounded-[12px] flex items-center justify-center transition-all duration-200 active:scale-95 shadow-[0_4px_14px_rgba(10,124,133,0.22)] dark:shadow-white/10 hover:opacity-90 border border-primary/10 dark:border-white/10"
        >
          <Plus className="w-5.5 h-5.5 stroke-[2.5]" />
        </button>
      </header>

      <main className="container mx-auto px-4 lg:px-8 pt-8 pb-24 max-w-3xl">
        
        {!hasJoinedTolees ? (
          /* Empty State - If user hasn't joined any Tolees */
          <div className="flex flex-col items-center justify-center text-center py-20 bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm px-6">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <Compass className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Your Feed is Empty</h2>
            <p className="text-gray-500 mb-8 max-w-md">
              Posts from the Tolees you join will appear here. Discover Tolees that match your interests to start building your feed.
            </p>
            <Link href="/">
              <Button className="px-8 py-6 text-base font-bold rounded-full shadow-md">
                Discover Tolees
              </Button>
            </Link>
          </div>
        ) : (
          /* Active Feed State */
          <div className="space-y-6">
            
            {/* Instagram-Style Story Section */}
            <div className="flex gap-4 overflow-x-auto pb-4 pt-2 shrink-0 border border-gray-100 dark:border-zinc-900 bg-white dark:bg-[#121212] p-4 rounded-3xl shadow-sm select-none scrollbar-none scroll-smooth">
              {/* Render Own Story Bubble First */}
              {(() => {
                const myGroup = mounted ? storyGroups.find(g => g.user.id === (session?.user as any)?.id) : undefined;
                const hasMyStories = myGroup && myGroup.stories.length > 0;
                
                return (
                  <div className="flex flex-col items-center flex-shrink-0 relative group">
                    <div 
                      onClick={() => {
                        if (!mounted) return;
                        if (hasMyStories) {
                          const idx = storyGroups.findIndex(g => g.user.id === (session?.user as any)?.id);
                          if (idx !== -1) {
                            setActiveStoryGroupIndex(idx);
                            setIsStoryViewerOpen(true);
                          }
                        } else {
                          setIsStoryCreatorOpen(true);
                        }
                      }}
                      className="relative cursor-pointer transition-transform duration-200 active:scale-95"
                    >
                      {/* Ring */}
                      <div className={`w-[66px] h-[66px] rounded-full flex items-center justify-center p-[2.5px] transition-all ${
                        hasMyStories 
                          ? myGroup.hasUnviewed
                            ? 'bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600'
                            : 'border-2 border-gray-300 dark:border-zinc-700'
                          : 'border border-gray-200 dark:border-zinc-800'
                      }`}>
                        <div className="w-full h-full rounded-full bg-white dark:bg-black p-[2.5px]">
                          <Avatar className="w-full h-full">
                            <AvatarImage src={mounted && session?.user ? (session.user.image || (session.user as any).avatar) : undefined} />
                            <AvatarFallback className="bg-zinc-200 dark:bg-zinc-800 text-sm font-bold">
                              {mounted && session?.user?.name ? session.user.name.charAt(0) : 'U'}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      </div>

                      {/* "+" Add icon overlay if no active story */}
                      {!hasMyStories && (
                        <div className="absolute bottom-0 right-0 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full p-[3px] ring-2 ring-white dark:ring-black">
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-semibold text-gray-500 dark:text-zinc-400 mt-1.5 max-w-[70px] truncate">
                      Your story
                    </span>
                  </div>
                );
              })()}

              {/* Render Other Followed Users' Stories */}
              {storyGroups
                .filter(group => !mounted || !session?.user || group.user.id !== (session.user as any).id)
                .map((group) => {
                  const globalIdx = storyGroups.findIndex(g => g.user.id === group.user.id);
                  return (
                    <div key={group.user.id} className="flex flex-col items-center flex-shrink-0">
                      <div
                        onClick={() => {
                          setActiveStoryGroupIndex(globalIdx);
                          setIsStoryViewerOpen(true);
                        }}
                        className="relative cursor-pointer transition-transform duration-200 active:scale-95"
                      >
                        <div className={`w-[66px] h-[66px] rounded-full flex items-center justify-center p-[2.5px] ${
                          group.hasUnviewed
                            ? 'bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600'
                            : 'border-2 border-gray-300 dark:border-zinc-700'
                        }`}>
                          <div className="w-full h-full rounded-full bg-white dark:bg-[#121212] p-[2.5px]">
                            <Avatar className="w-full h-full">
                              <AvatarImage src={group.user.avatar} />
                              <AvatarFallback className="bg-zinc-200 dark:bg-zinc-800 text-sm font-bold">
                                {group.user.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-gray-600 dark:text-zinc-300 mt-1.5 max-w-[70px] truncate font-medium">
                        {group.user.username || group.user.name}
                      </span>
                    </div>
                  );
                })}
            </div>
            
            {/* Premium Desktop Action Grid (Horizontal Cards) */}
            <div className="hidden sm:grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {/* Box 1: Post Your Requirement */}
              <div 
                onClick={() => document.getElementById('trigger-requirement')?.click()}
                className="group relative flex flex-col items-center text-center p-5 rounded-2xl border border-rose-100 dark:border-rose-950/20 bg-rose-50/10 dark:bg-rose-950/5 hover:bg-rose-50/40 dark:hover:bg-rose-950/15 hover:border-rose-300 dark:hover:border-rose-800/80 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 active:scale-[0.98]"
              >
                <div className="w-11 h-11 rounded-2xl bg-rose-500 flex items-center justify-center text-white shadow-md shadow-rose-500/20 group-hover:scale-105 transition-transform duration-300">
                  <MapPin className="w-5.5 h-5.5 stroke-[2.25]" />
                </div>
                <h4 className="font-extrabold text-[14.5px] text-rose-600 dark:text-rose-400 mt-4 group-hover:text-rose-700 dark:group-hover:text-rose-300 transition-colors">
                  Post Your Requirement
                </h4>
                <p className="text-[11.5px] text-gray-500 dark:text-zinc-400 leading-snug mt-1.5 max-w-[200px]">
                  Need flats, flatmates, local doctor or services? Notify nearby users instantly.
                </p>
              </div>

              {/* Box 2: Create Normal Post */}
              <div 
                onClick={() => document.getElementById('trigger-normal-post')?.click()}
                className="group relative flex flex-col items-center text-center p-5 rounded-2xl border border-teal-100 dark:border-teal-950/20 bg-teal-50/10 dark:bg-teal-950/5 hover:bg-teal-50/40 dark:hover:bg-teal-950/15 hover:border-teal-300 dark:hover:border-teal-800/80 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 active:scale-[0.98]"
              >
                <div className="w-11 h-11 rounded-2xl bg-primary dark:bg-zinc-800 flex items-center justify-center text-white shadow-md shadow-primary/10 dark:shadow-black/20 group-hover:scale-105 transition-transform duration-300">
                  <ImageIcon className="w-5.5 h-5.5 stroke-[2.25] text-white" />
                </div>
                <h4 className="font-extrabold text-[14.5px] text-primary dark:text-[#c9e4db] mt-4 group-hover:text-primary dark:group-hover:text-white transition-colors">
                  Create Normal Post
                </h4>
                <p className="text-[11.5px] text-gray-500 dark:text-zinc-400 leading-snug mt-1.5 max-w-[200px]">
                  Share text updates, upload images, or celebrate Tolee wins.
                </p>
              </div>

              {/* Box 3: Post Reel */}
              <div 
                onClick={() => document.getElementById('trigger-reel-post')?.click()}
                className="group relative flex flex-col items-center text-center p-5 rounded-2xl border border-amber-100 dark:border-amber-950/20 bg-amber-50/10 dark:bg-amber-950/5 hover:bg-amber-50/40 dark:hover:bg-amber-950/15 hover:border-amber-300 dark:hover:border-amber-800/80 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 active:scale-[0.98]"
              >
                <div className="w-11 h-11 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform duration-300">
                  <Video className="w-5.5 h-5.5 stroke-[2.25]" />
                </div>
                <h4 className="font-extrabold text-[14.5px] text-amber-600 dark:text-amber-400 mt-4 group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
                  Post Reel
                </h4>
                <p className="text-[11.5px] text-gray-500 dark:text-zinc-400 leading-snug mt-1.5 max-w-[200px]">
                  Upload vertical videos with description to showcase your skills.
                </p>
              </div>

              {/* Box 4: Post News */}
              <div 
                onClick={() => document.getElementById('trigger-news-post')?.click()}
                className="group relative flex flex-col items-center text-center p-5 rounded-2xl border border-indigo-100 dark:border-indigo-950/20 bg-indigo-50/10 dark:bg-indigo-950/5 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/15 hover:border-indigo-300 dark:hover:border-indigo-800/80 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 active:scale-[0.98]"
              >
                <div className="w-11 h-11 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
                  <Newspaper className="w-5.5 h-5.5 stroke-[2.25]" />
                </div>
                <h4 className="font-extrabold text-[14.5px] text-indigo-600 dark:text-indigo-400 mt-4 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                  Post News
                </h4>
                <p className="text-[11.5px] text-gray-500 dark:text-zinc-400 leading-snug mt-1.5 max-w-[200px]">
                  Publish simplified news updates, community articles or press releases.
                </p>
              </div>
            </div>

            {/* Global Feed Stream */}
            <OptimisticPostCard />
            {(() => {
              const visiblePosts = feedPosts.filter(post => 
                !hiddenPostIds.includes(post.id) &&
                !hiddenUsernames.includes(post.author) &&
                !hiddenToleeNames.includes(post.toleeName)
              );
              const itemsToRender: any[] = [];
              let adIndex = 0;
              visiblePosts.forEach((post, index) => {
                itemsToRender.push({ type: 'post', data: post });
                if ((index + 1) % 4 === 0 && sponsoredAds.length > 0) {
                  itemsToRender.push({ type: 'ad', data: sponsoredAds[adIndex % sponsoredAds.length] });
                  adIndex++;
                }
              });

              return itemsToRender.map((item, idx) => {
                if (item.type === 'ad') {
                  const ad = item.data;
                  const advertiserName = ad.adSet?.campaign?.user?.name || 'Tolee Sponsor';
                  const advertiserAvatar = ad.adSet?.campaign?.user?.avatar || ad.adSet?.campaign?.user?.image || '';
                  const mediaList = ad.mediaUrls ? ad.mediaUrls.split(',').map((u: string) => u.trim()).filter(Boolean) : [];
                  const displayMedia = mediaList[0] || null;

                  // Find preceding post details in itemsToRender to attribute revenue correctly
                  let precedingPostId: string | undefined = undefined;
                  let precedingToleeId: string | undefined = undefined;
                  for (let i = idx - 1; i >= 0; i--) {
                    if (itemsToRender[i].type === 'post') {
                      precedingPostId = itemsToRender[i].data.id;
                      precedingToleeId = itemsToRender[i].data.toleeId || itemsToRender[i].data.tolee?.id;
                      break;
                    }
                  }
                  
                  return (
                    <Card key={`ad-${ad.id}-${idx}`} className="border-indigo-100 dark:border-indigo-950/30 shadow-[0_4px_24px_rgba(0,0,0,0.03)] bg-gradient-to-b from-white to-zinc-50/50 dark:from-[#0d0d0f] dark:to-[#0a0a0c] rounded-[24px] overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-indigo-200 dark:hover:border-indigo-900 mb-6 relative">
                      
                      {/* Sponsored Header Banner */}
                      <div className="px-5 py-2.5 border-b border-indigo-100/10 flex items-center justify-between bg-gradient-to-r from-blue-500/10 to-indigo-500/10 dark:from-blue-950/20 dark:to-indigo-950/20">
                        <div className="flex items-center gap-1.5">
                           <Rocket className="w-4 h-4 text-indigo-500 dark:text-indigo-400 animate-pulse" />
                          <span className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                            Sponsored Ad
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[9px] text-emerald-500 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5">
                           Verified Brand
                        </Badge>
                      </div>
 
                      {/* Tracker for Impression */}
                      <AdTracker 
                        adId={ad.id} 
                        type="impression" 
                        contentId={precedingPostId}
                        toleeId={precedingToleeId}
                        placementType="normal_feed"
                      />
 
                      {/* Brand Info Header */}
                      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10 border border-zinc-100 dark:border-zinc-800 shadow-sm">
                            {advertiserAvatar ? (
                              <AvatarImage src={advertiserAvatar} alt={advertiserName} />
                            ) : null}
                            <AvatarFallback className="bg-indigo-600 text-white font-extrabold text-xs">
                              {advertiserName[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-bold text-[14.5px] text-zinc-900 dark:text-zinc-50 leading-none">
                              {advertiserName}
                            </span>
                            <span className="text-[11px] text-indigo-500 dark:text-indigo-400 font-bold mt-1 tracking-wider uppercase">
                              Sponsored
                            </span>
                          </div>
                        </div>
                      </CardHeader>
 
                      {/* Ad Body Content */}
                      <CardContent className="px-5 py-2">
                        {ad.primaryText && (
                          <p className="text-[14px] leading-relaxed text-zinc-800 dark:text-zinc-200 mb-3 px-1">
                            {ad.primaryText}
                          </p>
                        )}
 
                        {displayMedia && (
                          <AdTracker 
                            adId={ad.id} 
                            type="click" 
                            contentId={precedingPostId}
                            toleeId={precedingToleeId}
                            placementType="normal_feed"
                            className="cursor-pointer"
                          >
                            <div onClick={(e) => handleAdClick(e, ad)}>
                              <div className="relative overflow-hidden rounded-2xl border border-zinc-100 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-900 shadow-sm mx-0.5 group/ad-media">
                                {isVideoUrl(displayMedia) ? (
                                  <HLSVideo
                                    src={displayMedia}
                                    className="w-full h-auto max-h-[450px] object-cover mx-auto rounded-2xl"
                                    poster={getPosterUrl(displayMedia)}
                                    isActive={true}
                                    shouldLoad={true}
                                    ignoreGlobalActive={true}
                                    loop
                                    muted
                                    playsInline
                                  />
                                ) : (
                                  <img
                                    src={displayMedia}
                                    alt={ad.headline || 'Sponsored Ad'}
                                    className="w-full h-auto max-h-[450px] object-cover mx-auto rounded-2xl transition-transform duration-500 group-hover/ad-media:scale-[1.02]"
                                  />
                                )}
                              </div>
                            </div>
                          </AdTracker>
                        )}
                      </CardContent>
 
                      {/* Ad CTA Bar */}
                      <CardFooter className="px-5 pb-5 pt-2 flex flex-col gap-3">
                        <div className="flex items-center justify-between w-full pt-3 border-t border-zinc-100 dark:border-zinc-900/60">
                          <div className="flex flex-col max-w-[70%]">
                            {ad.headline && (
                              <h4 className="text-[14.5px] font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight leading-snug line-clamp-1">
                                {ad.headline}
                              </h4>
                            )}
                            {ad.description && (
                              <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1 font-medium">
                                {ad.description}
                              </p>
                            )}
                          </div>
                          
                          <AdTracker 
                            adId={ad.id} 
                            type="lead"
                            contentId={precedingPostId}
                            toleeId={precedingToleeId}
                            placementType="normal_feed"
                          >
                            <div onClick={(e) => handleAdClick(e, ad)} className="cursor-pointer">
                              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all animate-pulse duration-1000">
                                {ad.ctaButton === 'send_message' ? 'Send Message' : ad.ctaButton === 'shop_now' ? 'Shop Now' : ad.ctaButton === 'sign_up' ? 'Sign Up' : 'Learn More'}
                              </Button>
                            </div>
                          </AdTracker>
                        </div>
                      </CardFooter>
 
                    </Card>
                  );
                }

                const post = item.data;
                const postFollowState = post.authorId ? followStates[post.authorId] : null;
                const isPostAuthorMe = mounted && !!(
                  session?.user &&
                  (
                    ((session.user as any).id && post.authorId && (session.user as any).id === post.authorId) ||
                    ((session.user as any).username && post.author && (session.user as any).username === post.author)
                  )
                );

                if (post.postType === 'world_project') {
                  const wp = post.worldProject;
                  if (!wp) return null;

                  let pagePrefix = '';
                  let actionText = '';
                  let TypeIcon = Globe;
                  let gradientClass = '';

                  if (wp.type === 'WEBSITE') {
                    pagePrefix = 'micro-website';
                    actionText = 'Visit Website';
                    TypeIcon = Globe;
                    gradientClass = 'from-blue-600 to-cyan-500';
                  } else if (wp.type === 'BLOG') {
                    pagePrefix = 'blog';
                    actionText = 'Read Blog';
                    TypeIcon = BookOpen;
                    gradientClass = 'from-purple-600 to-indigo-500';
                  } else if (wp.type === 'RESTAURANT') {
                    pagePrefix = 'restaurant';
                    actionText = 'Order Menu';
                    TypeIcon = UtensilsCrossed;
                    gradientClass = 'from-orange-500 to-red-500';
                  } else if (wp.type === 'STORE') {
                    pagePrefix = 'store';
                    actionText = 'Shop Products';
                    TypeIcon = ShoppingBag;
                    gradientClass = 'from-emerald-600 to-teal-500';
                  }

                  const projectUrl = `/${pagePrefix}/${wp.slug}`;
                  const bannerImg = wp.bannerImage || null;

                  return (
                    <Card key={post.id} id={`post-${post.id}`} className="border-indigo-100 dark:border-indigo-950/30 shadow-md bg-white dark:bg-[#121212] overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-500">
                      
                      {/* Shared group/Tolee context banner */}
                      <div className="px-4 py-2.5 border-b border-indigo-50/50 dark:border-indigo-950/20 flex items-center justify-between bg-indigo-50/20 dark:bg-indigo-950/5">
                        <div className="flex items-center gap-2">
                          <TypeIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                            Tolee World {wp.type.toLowerCase()}
                          </span>
                        </div>
                        {post.toleeName && (
                          <Link href={`/t/${post.toleeSlug}`}>
                            <span className="text-[11px] font-bold text-primary hover:underline cursor-pointer uppercase tracking-wider">
                              Shared in {post.toleeName}
                            </span>
                          </Link>
                        )}
                      </div>

                      {/* Creator Info Header */}
                      <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2">
                          <UserHovercard username={post.author}>
                            <Link href={`/u/${post.author}`}>
                              <Avatar className="w-9 h-9 cursor-pointer border border-gray-100 dark:border-gray-800">
                                <AvatarImage src={post.authorAvatar} alt={post.author} />
                                <AvatarFallback>{post.author?.[0] || 'U'}</AvatarFallback>
                              </Avatar>
                            </Link>
                          </UserHovercard>
                          <div className="flex flex-col -space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <UserHovercard username={post.author}>
                                <Link href={`/u/${post.author}`}>
                                  <span className="font-bold text-[14px] cursor-pointer hover:underline">{post.author}</span>
                                </Link>
                              </UserHovercard>
                              <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 text-[9px] h-4 px-1 flex items-center gap-0.5">
                                Creator
                              </Badge>
                            </div>
                            <span className="text-[11px] text-gray-500">{post.time}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Follow/Following Button */}
                          {post.authorId && !isPostAuthorMe && postFollowState && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFollowAuthor(post.authorId);
                              }}
                              className={`h-7 px-3 rounded-lg text-xs font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                                postFollowState.isFollowing
                                  ? 'bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60 shadow-xs'
                                  : postFollowState.status === 'pending'
                                    ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs'
                              }`}
                            >
                              {postFollowState.isFollowing
                                ? 'Following'
                                : postFollowState.status === 'pending'
                                  ? 'Requested'
                                  : 'Follow'}
                            </button>
                          )}

                          {/* Three-Dot Options Menu Trigger */}
                          <button 
                            onClick={(e) => { e.stopPropagation(); setActiveOptionsPost(post); }}
                            className="h-8 w-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/80 active:bg-gray-200 dark:active:bg-gray-700 transition-colors focus:outline-none"
                          >
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                        </div>
                      </CardHeader>

                      {/* Project Content Block */}
                      <CardContent className="px-3 py-2">
                        <Link href={projectUrl} className="block group/preview cursor-pointer">
                          <div className="relative rounded-xl overflow-hidden bg-gray-50 dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-800 transition-all duration-300 group-hover/preview:border-indigo-300 dark:group-hover/preview:border-indigo-800">
                            
                            {/* Project Banner */}
                            <div className="relative aspect-[16/9] w-full bg-zinc-100 dark:bg-zinc-900 overflow-hidden flex items-center justify-center">
                              {bannerImg ? (
                                <img 
                                  src={bannerImg} 
                                  alt={wp.name || 'Project'} 
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover/preview:scale-105"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=600&auto=format&fit=crop';
                                  }}
                                />
                              ) : (
                                <div className={`w-full h-full bg-gradient-to-tr ${gradientClass} opacity-80 flex flex-col items-center justify-center text-white p-4`}>
                                  <TypeIcon className="w-12 h-12 stroke-[1.5]" />
                                  <span className="text-[12px] font-bold mt-2 uppercase tracking-widest">{wp.type}</span>
                                </div>
                              )}
                              
                              {/* Overlay Indicator */}
                              <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg font-bold text-[12px] shadow-md flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
                                <span>LIVE</span>
                              </div>
                            </div>

                            {/* Project Details */}
                            <div className="p-4 flex flex-col gap-1.5">
                              <h3 className="font-extrabold text-[16px] text-gray-900 dark:text-zinc-50 tracking-tight leading-tight group-hover/preview:text-indigo-600 dark:group-hover/preview:text-indigo-400 transition-colors">
                                {wp.name}
                              </h3>

                              {wp.description && (
                                <p className="text-[13px] text-gray-600 dark:text-zinc-400 line-clamp-2 leading-relaxed mt-1">
                                  {wp.description}
                                </p>
                              )}

                              {post.location && (
                                <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-zinc-500 mt-1">
                                  <MapPin className="w-3.5 h-3.5" />
                                  <span>{post.location}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </Link>
                      </CardContent>

                      {/* Footer Actions */}
                      <CardFooter className="px-4 pb-4 pt-2 flex flex-col gap-2.5 border-t border-gray-100 dark:border-gray-800/50 mt-2">
                        <div className="flex items-center justify-between w-full pt-1">
                          <div className="flex items-center gap-4">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleLike(post.id); }} 
                              className="transition-transform duration-200 active:scale-125 focus:outline-none text-gray-700 dark:text-gray-300 hover:text-red-500"
                            >
                              <Heart className={`w-5 h-5 transition-colors ${post.likedByMe ? 'fill-red-500 text-red-500' : 'fill-transparent'}`} />
                            </button>

                            <button 
                              onClick={(e) => { e.stopPropagation(); openCommentsModal(post.id); }} 
                              className="transition-transform duration-200 active:scale-110 focus:outline-none text-gray-700 dark:text-gray-300 hover:text-blue-500"
                            >
                              <MessageCircle className="w-5 h-5 fill-transparent transition-colors" />
                            </button>

                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setSelectedPostIdForReshare(post.id);
                                setReshareModalOpen(true);
                              }} 
                              className="transition-transform duration-300 hover:rotate-180 active:scale-125 focus:outline-none text-gray-700 dark:text-gray-300 hover:text-green-500"
                            >
                              <Repeat className={`w-5 h-5 transition-colors ${post.repostedByMe ? 'text-green-500 font-bold' : ''}`} />
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setSelectedPostForShare({
                                  ...post,
                                  caption: wp.description || `Check out this creator project: ${wp.name}`,
                                  mediaUrls: bannerImg,
                                  mediaTypes: 'image',
                                  toleeSlug: post.toleeSlug
                                });
                                setShareModalOpen(true);
                              }} 
                              className="h-8 px-3 rounded-lg flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800/50 hover:text-indigo-600 transition-colors focus:outline-none"
                            >
                              <Send className="w-4 h-4" />
                              <span>Share</span>
                            </button>

                            <Link href={projectUrl}>
                              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 rounded-lg flex items-center gap-1">
                                {actionText}
                              </Button>
                            </Link>
                          </div>
                        </div>

                        {/* Interactive Stats display */}
                        <div className="flex flex-col gap-0.5 w-full text-[12px] font-semibold text-gray-600 dark:text-zinc-400 px-0.5">
                          <div className="flex items-center gap-3">
                            <span 
                              onClick={(e) => { e.stopPropagation(); openLikesModal(post.id); }} 
                              className="cursor-pointer hover:underline"
                            >
                              {post.likes} {post.likes === 1 ? 'like' : 'likes'}
                            </span>
                            <span>
                              {formatViewCount(post.views || 0)} views
                            </span>
                            {post.reposts > 0 && (
                              <span 
                                onClick={(e) => { e.stopPropagation(); openRepostsModal(post.id); }}
                                className="cursor-pointer hover:underline"
                              >
                                {post.reposts} {post.reposts === 1 ? 'repost' : 'reposts'}
                              </span>
                            )}
                          </div>
                          {post.comments > 0 ? (
                            <div 
                              className="text-[12px] text-gray-400 hover:underline cursor-pointer mt-0.5" 
                              onClick={(e) => { e.stopPropagation(); openCommentsModal(post.id); }}
                            >
                              View all {post.comments} comments
                            </div>
                          ) : (
                            <div 
                              className="text-[12px] text-gray-400 hover:underline cursor-pointer mt-0.5"
                              onClick={(e) => { e.stopPropagation(); openCommentsModal(post.id); }}
                            >
                              Add a comment...
                            </div>
                          )}
                        </div>
                      </CardFooter>
                    </Card>
                  );
                }

                if (post.postType === 'news') {
                  const news = post.newsRelation;
                  const newsSlug = news?.slug || post.id;
                  const newsHeadline = news?.headline || post.caption || 'Premium Article';
                  const newsSummary = news?.summary || '';
                  const newsCategory = news?.category || 'General';
                  const newsReadingTime = news?.readingTime || 1;
                  const newsViewsCount = post.views || news?.viewsCount || 0;

                  return (
                    <Card key={post.id} id={`post-${post.id}`} className="border-indigo-100 dark:border-indigo-950/20 shadow-[0_4px_24px_rgba(0,0,0,0.02)] bg-white dark:bg-[#121212] overflow-hidden transition-all duration-300 hover:shadow-lg rounded-[24px] mb-6 transition-all duration-500">
                      {/* Shared group context banner */}
                      {post.toleeName && (
                        <div className="px-4 py-2 border-b border-indigo-50/50 dark:border-zinc-900 bg-indigo-50/20 dark:bg-zinc-900/10 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Newspaper className="w-3.5 h-3.5 text-indigo-500" />
                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Tolee News Channel</span>
                          </div>
                          <Link href={`/t/${post.toleeSlug}`}>
                            <span className="text-[10px] font-bold text-gray-400 hover:underline uppercase tracking-wider">In {post.toleeName}</span>
                          </Link>
                        </div>
                      )}

                      {/* Header */}
                      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <UserHovercard username={post.author}>
                            <Link href={`/u/${post.author}`}>
                              <Avatar className="w-9 h-9 cursor-pointer border border-gray-100 dark:border-zinc-800">
                                <AvatarImage src={post.authorAvatar} alt={post.author} />
                                <AvatarFallback>{post.author?.[0]}</AvatarFallback>
                              </Avatar>
                            </Link>
                          </UserHovercard>
                          <div className="flex flex-col -space-y-0.5">
                            <div className="flex items-center gap-1">
                              <UserHovercard username={post.author}>
                                <Link href={`/u/${post.author}`}>
                                  <span className="font-extrabold text-[13.5px] cursor-pointer hover:underline">{post.author}</span>
                                </Link>
                              </UserHovercard>
                              <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 font-extrabold text-[8.5px] px-1.5 py-0.5 border-none rounded">Verified Author</Badge>
                            </div>
                            <span className="text-[10.5px] text-gray-400">{post.time}</span>
                          </div>
                        </div>
                        
                        {/* Right side follow button */}
                        {post.authorId && !isPostAuthorMe && postFollowState && (
                          <Button 
                            size="xs" 
                            variant="ghost" 
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                            onClick={() => handleFollowAuthor(post.authorId)}
                          >
                            {postFollowState.isFollowing ? 'Following' : 'Follow'}
                          </Button>
                        )}
                      </CardHeader>

                      {/* News Card body */}
                      <CardContent className="p-0">
                        {/* Cover Image */}
                        {post.mediaUrls ? (
                          <Link href={`/news/${newsSlug}`}>
                            <div className="aspect-video w-full overflow-hidden bg-black relative cursor-pointer">
                              <img src={post.mediaUrls.split(/,(?=https?:\/\/)/)[0]} alt={newsHeadline} className="w-full h-full object-cover hover:scale-[1.01] transition-transform duration-300" />
                              <Badge className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-[9px] font-bold text-white uppercase px-2 py-0.5 rounded border-none">
                                {newsCategory}
                              </Badge>
                            </div>
                          </Link>
                        ) : (
                          <Link href={`/news/${newsSlug}`}>
                            <div className="aspect-video w-full bg-indigo-50/50 dark:bg-indigo-950/10 flex items-center justify-center relative cursor-pointer">
                              <Newspaper className="w-10 h-10 text-indigo-300 dark:text-indigo-900/60" />
                              <Badge className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-[9px] font-bold text-white uppercase px-2 py-0.5 rounded border-none">
                                {newsCategory}
                              </Badge>
                            </div>
                          </Link>
                        )}

                        <div className="p-4 space-y-2">
                          <Link href={`/news/${newsSlug}`}>
                            <h3 className="font-extrabold text-[18px] text-gray-900 dark:text-white leading-snug hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors line-clamp-2">
                              {newsHeadline}
                            </h3>
                          </Link>
                          {newsSummary && (
                            <p className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                              {newsSummary}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-[11px] text-gray-400 pt-1">
                            <span className="font-bold bg-gray-150 dark:bg-zinc-900 px-2 py-0.5 rounded text-indigo-600 dark:text-indigo-400">{newsCategory}</span>
                            <span>•</span>
                            <span>{newsReadingTime} Min Read</span>
                            <span>•</span>
                            <span>{newsViewsCount} Views</span>
                          </div>
                        </div>
                      </CardContent>

                      {/* Footer Actions */}
                      <CardFooter className="px-4 pb-4 pt-2 flex flex-col gap-3">
                        <div className="flex items-center justify-between w-full pt-3 border-t border-zinc-150 dark:border-zinc-900/60">
                          <div className="flex items-center gap-5">
                            {/* Like */}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleLike(post.id); }}
                              className={`flex items-center gap-1.5 transition-all duration-200 active:scale-110 focus:outline-none ${post.likedByMe ? 'text-red-500' : 'text-zinc-600 dark:text-zinc-400 hover:text-red-500'}`}
                            >
                              <Heart strokeWidth={1.5} className={`w-[20px] h-[20px] transition-colors ${post.likedByMe ? 'fill-red-500 stroke-red-500' : 'fill-transparent'}`} />
                              <span className="text-xs font-semibold">{post.likes}</span>
                            </button>

                            {/* Comment */}
                            <button
                              onClick={(e) => { e.stopPropagation(); openCommentsModal(post.id); }}
                              className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 hover:text-indigo-500 focus:outline-none transition-colors"
                            >
                              <MessageCircle strokeWidth={1.5} className="w-[20px] h-[20px]" />
                              <span className="text-xs font-semibold">{post.comments}</span>
                            </button>

                            {/* Share */}
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedPostForShare(post); setShareModalOpen(true); }}
                              className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 hover:text-emerald-500 focus:outline-none transition-colors"
                            >
                              <Send strokeWidth={1.5} className="w-[19px] h-[19px]" />
                              <span className="text-xs font-semibold">{post.shareCount}</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Bookmark */}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleSave(post.id); }}
                              className={`text-zinc-600 dark:text-zinc-400 transition-all duration-250 ${post.savedByMe ? 'text-indigo-600' : 'hover:text-indigo-600'}`}
                            >
                              <Bookmark strokeWidth={1.5} className={`w-[20px] h-[20px] ${post.savedByMe ? 'fill-indigo-600 stroke-indigo-600' : 'fill-transparent'}`} />
                            </button>

                            <Link href={`/news/${newsSlug}`}>
                              <Button size="xs" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold px-3">
                                Read Article
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardFooter>
                    </Card>
                  );
                }

                if (post.postType === 'listing') {
                  const listingUrl = `/marketplace/listing/${post.id}`;
                  const displayImage = post.image || null;
                  const currencySymbol = post.currency === 'INR' || post.currency === '₹' ? '₹' : post.currency || '₹';

                  return (
                    <Card key={post.id} id={`post-${post.id}`} className="border-emerald-100 dark:border-emerald-950/30 shadow-md bg-white dark:bg-[#121212] overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-emerald-200 dark:hover:border-emerald-800 transition-all duration-500">
                      
                      {/* Shared group/Tolee context banner */}
                      <div className="px-4 py-2.5 border-b border-emerald-50/50 dark:border-emerald-950/20 flex items-center justify-between bg-emerald-50/20 dark:bg-emerald-950/5">
                        <div className="flex items-center gap-2">
                          <Store className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                            Marketplace Listing
                          </span>
                        </div>
                        {post.toleeName && (
                          <Link href={`/t/${post.toleeSlug}`}>
                            <span className="text-[11px] font-bold text-primary hover:underline cursor-pointer uppercase tracking-wider">
                              Shared in {post.toleeName}
                            </span>
                          </Link>
                        )}
                      </div>

                      {/* Seller Info Header */}
                      <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2">
                          <UserHovercard username={post.author}>
                            <Link href={`/u/${post.author}`}>
                              <Avatar className="w-9 h-9 cursor-pointer border border-gray-100 dark:border-gray-800">
                                <AvatarImage src={post.authorAvatar} alt={post.author} />
                                <AvatarFallback>{post.author?.[0] || 'U'}</AvatarFallback>
                              </Avatar>
                            </Link>
                          </UserHovercard>
                          <div className="flex flex-col -space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <UserHovercard username={post.author}>
                                <Link href={`/u/${post.author}`}>
                                  <span className="font-bold text-[14px] cursor-pointer hover:underline">{post.author}</span>
                                </Link>
                              </UserHovercard>
                              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 text-[9px] h-4 px-1 flex items-center gap-0.5">
                                <ShieldCheck className="w-2.5 h-2.5" /> Seller
                              </Badge>
                            </div>
                            <span className="text-[11px] text-gray-500">{post.time}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Follow/Following Button */}
                          {post.authorId && !isPostAuthorMe && postFollowState && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFollowAuthor(post.authorId);
                              }}
                              className={`h-7 px-3 rounded-lg text-xs font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                                postFollowState.isFollowing
                                  ? 'bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60 shadow-xs'
                                  : postFollowState.status === 'pending'
                                    ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs'
                              }`}
                            >
                              {postFollowState.isFollowing
                                ? 'Following'
                                : postFollowState.status === 'pending'
                                  ? 'Requested'
                                  : 'Follow'}
                            </button>
                          )}

                          {/* Three-Dot Options Menu Trigger */}
                          <button 
                            onClick={(e) => { e.stopPropagation(); setActiveOptionsPost(post); }}
                            className="h-8 w-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/80 active:bg-gray-200 dark:active:bg-gray-700 transition-colors focus:outline-none"
                          >
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                        </div>
                      </CardHeader>

                      {/* Product Content Block */}
                      <CardContent className="px-3 py-2">
                        <Link href={listingUrl} className="block group/preview cursor-pointer">
                          {/* Premium Listing Card Body */}
                          <div className="relative rounded-xl overflow-hidden bg-gray-50 dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-800 transition-all duration-300 group-hover/preview:border-emerald-300 dark:group-hover/preview:border-emerald-800">
                            {/* Product Image */}
                            <div className="relative aspect-[16/9] w-full bg-zinc-100 dark:bg-zinc-900 overflow-hidden flex items-center justify-center">
                              {displayImage ? (
                                <img 
                                  src={displayImage} 
                                  alt={post.title || 'Product'} 
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover/preview:scale-105"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=600&auto=format&fit=crop';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-100 dark:bg-zinc-800">
                                  <Store className="w-12 h-12 stroke-[1.5]" />
                                  <span className="text-[11px] font-medium mt-1">No Image Available</span>
                                </div>
                              )}
                              
                              {/* Overlay Price Badge */}
                              <div className="absolute bottom-3 left-3 bg-emerald-600/95 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg font-extrabold text-[15px] shadow-md shadow-black/25 flex items-center gap-0.5">
                                <span className="text-[12px] font-medium">{currencySymbol}</span>
                                <span>{post.price?.toLocaleString() || 'Contact'}</span>
                              </div>

                              {/* Condition Badge (Top Right) */}
                              {post.condition && (
                                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-xs text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                                  {post.condition.replace('_', ' ')}
                                </div>
                              )}
                            </div>

                            {/* Product Details info */}
                            <div className="p-4 flex flex-col gap-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <h3 className="font-extrabold text-[16px] text-gray-900 dark:text-zinc-50 tracking-tight leading-tight group-hover/preview:text-emerald-600 dark:group-hover/preview:text-emerald-400 transition-colors">
                                  {post.title}
                                </h3>
                                {post.category && (
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                                    {post.category}
                                  </span>
                                )}
                              </div>

                              {post.content && (
                                <p className="text-[13px] text-gray-600 dark:text-zinc-400 line-clamp-2 leading-relaxed mt-1">
                                  {post.content}
                                </p>
                              )}

                              {/* Location Info */}
                              {post.locationText && (
                                <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-zinc-500 mt-1">
                                  <MapPin className="w-3.5 h-3.5" />
                                  <span>{post.locationText}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </Link>
                      </CardContent>

                      {/* Footer Actions */}
                      <CardFooter className="px-4 pb-4 pt-2 flex flex-col gap-2.5 border-t border-gray-100 dark:border-gray-800/50 mt-2">
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[11px] text-gray-500 flex items-center gap-1">
                            <Store className="w-3.5 h-3.5" />
                            <span>Available in Marketplace</span>
                          </span>

                          <div className="flex items-center gap-2">
                            {(() => {
                              const isOwner = mounted && session?.user && (
                                (session.user as any).id === post.authorId || 
                                (session.user as any).username === post.author
                              );
                              if (!isOwner) return null;
                              return (
                                <button 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setQuickBoostType('listing');
                                    setQuickBoostTargetId(post.id);
                                    setIsQuickBoostOpen(true);
                                  }} 
                                  className="h-8 px-3 rounded-lg flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 active:scale-95 transition-all shadow-sm"
                                >
                                  <Rocket className="w-3.5 h-3.5 animate-pulse" />
                                  <span>Boost</span>
                                </button>
                              );
                            })()}
                            {/* Share button */}
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setSelectedPostForShare({
                                  ...post,
                                  caption: post.content || `Check out this listing: ${post.title}`,
                                  mediaUrls: displayImage,
                                  mediaTypes: 'image',
                                  toleeSlug: post.toleeSlug || 'marketplace'
                                });
                                setShareModalOpen(true);
                              }} 
                              className="h-8 px-3 rounded-lg flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800/50 hover:text-emerald-600 transition-colors focus:outline-none"
                            >
                              <Send className="w-4 h-4" />
                              <span>Share Link</span>
                            </button>

                            {/* View Listing Main CTA */}
                            <Link href={listingUrl}>
                              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 rounded-lg flex items-center gap-1">
                                View Details
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardFooter>
                    </Card>
                  );
                }

                return (
                  <Card key={post.id} id={`post-${post.id}`} className="border-gray-200/60 dark:border-zinc-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] bg-white dark:bg-[#000000] rounded-none sm:rounded-3xl overflow-hidden transition-all duration-300 mb-6 border-x-0 sm:border-x transition-all duration-500">
                    
                    {/* Tolee/Group Header */}
                    <div className="px-4 py-2.5 border-b border-gray-100 dark:border-zinc-900 flex items-center gap-2.5 bg-gray-50/50 dark:bg-zinc-900/10">
                      <div className="w-7 h-7 bg-primary dark:bg-zinc-800 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm">
                        <Users strokeWidth={2} className="w-4 h-4 text-white" />
                      </div>
                      <Link href={`/t/${post.toleeSlug}`} className="flex-grow">
                        <span className="text-[12px] font-extrabold text-primary dark:text-zinc-200 hover:underline cursor-pointer uppercase tracking-wider">
                          {post.toleeName}
                        </span>
                      </Link>
                    </div>

                    <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                      <div className="flex items-center gap-3">
                        {post.isAnonymous ? (
                          <Avatar className="w-10 h-10 border border-zinc-100 dark:border-zinc-800 shadow-sm">
                            <AvatarImage src="/default-user-avatar.svg" alt="Anonymous" />
                            <AvatarFallback>A</AvatarFallback>
                          </Avatar>
                        ) : (
                          <UserHovercard username={post.author}>
                            <Link href={`/u/${post.author}`}>
                              <Avatar className="w-10 h-10 cursor-pointer border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                <AvatarImage src={post.authorAvatar} alt={post.author} />
                                <AvatarFallback>{post.author?.[0] || 'U'}</AvatarFallback>
                              </Avatar>
                            </Link>
                          </UserHovercard>
                        )}
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            {post.isAnonymous ? (
                              <span className="font-bold text-[14.5px] text-zinc-900 dark:text-zinc-50 leading-none">Anonymous</span>
                            ) : (
                              <UserHovercard username={post.author}>
                                <Link href={`/u/${post.author}`}>
                                  <span className="font-bold text-[14.5px] text-zinc-900 dark:text-zinc-50 cursor-pointer hover:underline leading-none">{post.author}</span>
                                </Link>
                              </UserHovercard>
                            )}
                            {post.role === 'Admin' && (
                              <span className="bg-rose-50 text-rose-500 border border-rose-100/50 dark:bg-rose-950/20 dark:text-rose-400 font-extrabold text-[9px] tracking-wide px-1.5 py-0.5 rounded-[4px] select-none leading-none">
                                ADMIN
                              </span>
                            )}
                            {post.role === 'Moderator' && (
                              <span className="bg-zinc-50 text-zinc-500 border border-zinc-100 dark:bg-zinc-900 dark:text-zinc-400 font-extrabold text-[9px] tracking-wide px-1.5 py-0.5 rounded-[4px] select-none leading-none">
                                MOD
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1 mt-0.5">
                            <span>{post.time}</span>
                            {post.visibility === 'hidden_from_others' && <span className="text-[10px] text-yellow-500 bg-yellow-500/10 px-1 rounded font-medium">Only visible to you (hidden from others)</span>}
                            {post.visibility === 'hidden_from_public' && <span className="text-[10px] text-blue-500 bg-blue-500/10 px-1 rounded font-medium">Hidden from Public</span>}
                            {post.visibility === 'only_me' && <span className="text-[10px] text-purple-500 bg-purple-500/10 px-1 rounded font-medium">Only Me</span>}
                          </span>
                          {(() => {
                            const count = post.reposts || 0;
                            if (count === 0) return null;

                            if (count === 1) {
                              let displayName = "";
                              let avatarUrl = "";
                              let profileUsername = "";

                              if (mounted && post.repostedByMe && session?.user) {
                                displayName = session.user.name || (session.user as any).username || "You";
                                avatarUrl = session.user.image || "";
                                profileUsername = (session.user as any).username || "";
                              } else if (post.resharedByUser) {
                                displayName = post.resharedByUser.name || post.resharedByUser.username || "Someone";
                                avatarUrl = post.resharedByUser.avatar || "";
                                profileUsername = post.resharedByUser.username || "";
                              } else {
                                displayName = "1 person";
                              }

                              if (!avatarUrl && profileUsername) {
                                avatarUrl = '/default-user-avatar.svg';
                              }

                              return (
                                <div 
                                  onClick={(e) => { e.stopPropagation(); openRepostsModal(post.id); }}
                                  className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400 pl-0.5 animate-in fade-in duration-300 cursor-pointer hover:text-green-500 transition-colors w-fit animate-in fade-in duration-300"
                                >
                                  <Repeat className="w-3.5 h-3.5 text-green-500" />
                                  <span>ReShared by</span>
                                  {avatarUrl && (
                                    <Avatar className="w-4.5 h-4.5 border border-gray-200 dark:border-zinc-800 scale-90">
                                      <AvatarImage src={avatarUrl} />
                                      <AvatarFallback className="text-[7px]">{displayName[0]}</AvatarFallback>
                                    </Avatar>
                                  )}
                                  {profileUsername ? (
                                    <Link href={`/u/${profileUsername}`} onClick={(e) => e.stopPropagation()}>
                                      <span className="font-bold hover:underline text-gray-700 dark:text-gray-300 cursor-pointer">
                                        {displayName}
                                      </span>
                                    </Link>
                                  ) : (
                                    <span className="font-bold text-gray-700 dark:text-gray-300">{displayName}</span>
                                  )}
                                </div>
                              );
                            }

                            // Count > 1
                            return (
                              <div 
                                onClick={(e) => { e.stopPropagation(); openRepostsModal(post.id); }}
                                className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400 pl-0.5 animate-in fade-in duration-300 cursor-pointer hover:text-green-500 transition-colors w-fit"
                              >
                                <Repeat className="w-3.5 h-3.5 text-green-500" />
                                <span>{count} people re-shared this</span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Follow/Following Button */}
                        {post.authorId && !isPostAuthorMe && postFollowState && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFollowAuthor(post.authorId);
                            }}
                            className={`h-7 px-3 rounded-lg text-xs font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                              postFollowState.isFollowing
                                ? 'bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60 shadow-xs'
                                : postFollowState.status === 'pending'
                                  ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs'
                            }`}
                          >
                            {postFollowState.isFollowing
                              ? 'Following'
                              : postFollowState.status === 'pending'
                                ? 'Requested'
                                : 'Follow'}
                          </button>
                        )}

                        {/* Three-Dot Options Menu Trigger */}
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActiveOptionsPost(post); }}
                          className="h-8 w-8 rounded-full flex items-center justify-center text-zinc-400 dark:text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 active:scale-95 transition-all focus:outline-none"
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="px-0 py-2">
                      {post.postType === 'requirement' && (
                        <div className="mb-2.5 px-5 inline-flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-500 dark:bg-rose-500/20 dark:text-rose-400 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider">
                            📌 Local Requirement
                          </span>
                          {(post.location || post.subLocation) && (
                            <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
                              📍 {post.subLocation ? `${post.subLocation}, ` : ''}{post.location}
                            </span>
                          )}
                        </div>
                      )}
                      {post.isWin && (
                        <div className="mb-2.5 px-5 inline-flex items-center gap-1 bg-yellow-500/10 text-yellow-600 py-0.5 rounded text-[10px] font-bold uppercase">
                          <Trophy className="w-3 h-3" /> Tolee Win
                        </div>
                      )}
                      {post.postType === 'poll' && (
                        <div className="mb-2.5 px-5 inline-flex items-center gap-1.5 bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                          📊 Community Poll
                        </div>
                      )}
                      {post.postType === 'event' && (
                        <div className="mb-2.5 px-5 inline-flex items-center gap-1.5 bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                          📅 Event
                        </div>
                      )}
                      {post.postType === 'announcement' && (
                        <div className="mb-2.5 px-5 inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                          📢 Announcement
                        </div>
                      )}
                      {post.postType === 'question' && (
                        <div className="mb-2.5 px-5 inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                          ❓ Question
                        </div>
                      )}
                      <p className="text-[14.5px] leading-snug text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap mb-3 px-5">{post.content}</p>
                      
                      {(post.mediaUrls || post.image || post.video) && (
                        <div className="w-full">
                          <PostCarousel 
                            mediaUrls={post.mediaUrls || post.image || post.video || ''} 
                            mediaTypes={post.mediaTypes || (post.image ? 'image' : 'video')} 
                            postId={post.id} 
                          />
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="px-5 pb-5 pt-0 flex flex-col gap-3">
                      {(!post.mediaTypes?.includes('video') && !post.video) && (
                        <ViewTracker contentId={post.id} contentType="post" />
                      )}

                      {/* Single Action Row: Icon + Count side-by-side, exactly like screenshot */}
                      <div className="flex items-center justify-between w-full pt-3 border-t border-zinc-100 dark:border-zinc-900/60">
                        <div className="flex items-center gap-5">

                          {/* 1. Like Icon + Count */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleLike(post.id); }}
                            className={`flex items-center gap-1.5 transition-all duration-200 active:scale-110 focus:outline-none ${post.likedByMe ? 'text-red-500' : 'text-zinc-600 dark:text-zinc-400 hover:text-red-500'}`}
                          >
                            <Heart strokeWidth={1.5} className={`w-[22px] h-[22px] transition-colors ${post.likedByMe ? 'fill-red-500 stroke-red-500' : 'fill-transparent'}`} />
                            <span className="text-[13px] font-semibold">{post.likes > 0 ? formatViewCount(post.likes) : '0'}</span>
                          </button>

                          {/* 2. Comment Icon + Count */}
                          <button
                            onClick={(e) => { e.stopPropagation(); openCommentsModal(post.id); }}
                            className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 hover:text-blue-500 transition-all duration-200 active:scale-110 focus:outline-none"
                          >
                            <MessageCircle strokeWidth={1.5} className="w-[22px] h-[22px] fill-transparent" />
                            <span className="text-[13px] font-semibold">{post.comments > 0 ? formatViewCount(post.comments) : '0'}</span>
                          </button>

                          {/* 3. Reshare Icon + Count */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPostIdForReshare(post.id);
                              setReshareModalOpen(true);
                            }}
                            className={`flex items-center gap-1.5 transition-all duration-200 active:scale-110 focus:outline-none ${post.repostedByMe ? 'text-green-500' : 'text-zinc-600 dark:text-zinc-400 hover:text-green-500'}`}
                          >
                            <Repeat strokeWidth={1.5} className={`w-[22px] h-[22px] transition-colors ${post.repostedByMe ? 'text-green-500' : ''}`} />
                            <span className="text-[13px] font-semibold">{post.reposts > 0 ? formatViewCount(post.reposts) : '0'}</span>
                          </button>

                          {/* 4. Share Icon + Count */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPostForShare(post);
                              setShareModalOpen(true);
                            }}
                            className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 hover:text-primary dark:hover:text-white transition-all duration-200 active:scale-110 focus:outline-none"
                          >
                            <Send strokeWidth={1.5} className="w-[22px] h-[22px] fill-transparent" />
                            <span className="text-[13px] font-semibold">{(post.shareCount || 0) > 0 ? formatViewCount(post.shareCount) : '0'}</span>
                          </button>

                        </div>

                        {/* Right side: Views + Bookmark */}
                        <div className="flex items-center gap-3">
                          {/* Views */}
                          <span className="flex items-center gap-1 text-[13px] font-semibold text-zinc-400 dark:text-zinc-500">
                            <Eye strokeWidth={1.5} className="w-[18px] h-[18px]" />
                            <span>{formatViewCount(post.views || 0)}</span>
                          </span>

                          {/* Boost button (owner only) */}
                          {(() => {
                            const isOwner = session?.user && (
                              (session.user as any).id === post.authorId ||
                              (session.user as any).username === post.author
                            );
                            if (!isOwner) return null;
                            return (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setQuickBoostType(post.postType === 'listing' ? 'listing' : post.postType === 'reel' ? 'reel' : 'post');
                                  setQuickBoostTargetId(post.id);
                                  setIsQuickBoostOpen(true);
                                }}
                                className="flex items-center gap-1 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-[10px] font-extrabold text-white px-2.5 py-1.5 rounded-lg shadow-sm active:scale-95 transition-all"
                              >
                                <Rocket className="w-3.5 h-3.5 animate-pulse" />
                                <span>Boost</span>
                              </button>
                            );
                          })()}

                          {/* Bookmark */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSave(post.id); }}
                            className="flex items-center gap-1 transition-all duration-200 active:scale-125 focus:outline-none text-zinc-600 dark:text-zinc-400 hover:text-yellow-500"
                          >
                            <Bookmark strokeWidth={1.5} className={`w-[22px] h-[22px] transition-colors ${post.savedByMe ? 'fill-primary dark:fill-white text-primary dark:text-white' : 'fill-transparent'}`} />
                            {(post.savesCount || 0) > 0 && (
                              <span className="text-[13px] font-semibold">{formatViewCount(post.savesCount)}</span>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* View all comments link */}
                      <div
                        className="text-[12px] text-zinc-400 dark:text-zinc-500 font-medium hover:underline cursor-pointer px-0.5 -mt-1"
                        onClick={(e) => { e.stopPropagation(); openCommentsModal(post.id); }}
                      >
                        {post.comments > 0 ? `View all ${post.comments.toLocaleString()} comments` : 'Add a comment...'}
                      </div>
                    </CardFooter>
                  </Card>
                );
              });
            })()}
          </div>
        )}
      </main>

      {/* Facebook Style Comments Modal */}
      {isMobile ? (
        activeCommentPost && (() => {
          const post = feedPosts.find(p => p.id === activeCommentPost);
          if (!post) return null;
          
          const rootComments = getSortedComments().filter((c: any) => !c.parentId);
          const displayedRootComments = rootComments.slice(0, visibleCommentsCount);
          
          return (
            <div className="fixed inset-0 z-[100] flex flex-col justify-end">
              {/* Backdrop overlay */}
              <div 
                className={`absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 ${animateShow ? 'opacity-100' : 'opacity-0'}`} 
                onClick={handleCloseMobileSheet}
              />
              
              {/* Bottom Sheet Panel */}
              <div 
                className="relative w-full h-[85vh] bg-white dark:bg-[#18191a] rounded-t-3xl shadow-2xl flex flex-col overflow-hidden select-none pb-[env(safe-area-inset-bottom)]"
                style={{
                  transform: animateShow ? `translateY(${translateY}px)` : 'translateY(100%)',
                  transition: isDragging ? 'none' : 'transform 280ms cubic-bezier(0.1, 0.76, 0.55, 0.94)'
                }}
              >
                {/* Drag Handle & Gesture Zone */}
                <div 
                  className="w-full py-3 shrink-0 flex flex-col items-center cursor-grab active:cursor-grabbing"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full" />
                </div>
                
                {/* Header */}
                <div className="px-4 pb-3 border-b border-gray-100 dark:border-gray-800 shrink-0 flex flex-col gap-3.5 bg-white dark:bg-[#18191a]">
                  <div className="flex items-center justify-between pt-1">
                    {/* Title */}
                    <span className="font-bold text-sm text-gray-800 dark:text-gray-200">Comments</span>
                    
                    {/* Close button */}
                    <button 
                      onClick={handleCloseMobileSheet}
                      className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:opacity-80 transition-opacity"
                    >
                      <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    </button>
                  </div>

                  {/* Interactive Stats Row matching Post Footer */}
                  <div className="flex items-center justify-between w-full pt-1.5 pb-0.5 px-0.5 border-t border-gray-150/40 dark:border-zinc-900/40">
                    <div className="flex items-center gap-4.5">
                      {/* 1. Like */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleLike(post.id); }}
                        className={`flex items-center gap-1.5 transition-all duration-200 active:scale-110 focus:outline-none ${post.likedByMe ? 'text-red-500' : 'text-zinc-500 dark:text-zinc-400'}`}
                      >
                        <Heart strokeWidth={1.5} className={`w-5 h-5 ${post.likedByMe ? 'fill-red-500 stroke-red-500' : 'fill-transparent'}`} />
                        <span className="text-[12px] font-bold">{post.likes || 0}</span>
                      </button>

                      {/* 2. Comment */}
                      <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                        <MessageCircle strokeWidth={1.5} className="w-5 h-5 fill-transparent" />
                        <span className="text-[12px] font-bold">{post.comments || 0}</span>
                      </div>

                      {/* 3. Reshare */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPostIdForReshare(post.id);
                          setReshareModalOpen(true);
                        }}
                        className={`flex items-center gap-1.5 transition-all duration-200 active:scale-110 focus:outline-none ${post.repostedByMe ? 'text-green-500' : 'text-zinc-500 dark:text-zinc-400'}`}
                      >
                        <Repeat strokeWidth={1.5} className="w-5 h-5" />
                        <span className="text-[12px] font-bold">{post.reposts || 0}</span>
                      </button>

                      {/* 4. Share */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPostForShare(post);
                          setShareModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 hover:text-primary transition-all duration-200 active:scale-110 focus:outline-none"
                      >
                        <Send strokeWidth={1.5} className="w-5 h-5 fill-transparent" />
                        <span className="text-[12px] font-bold">{post.shareCount || 0}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Views */}
                      <span className="flex items-center gap-1 text-[12px] font-bold text-zinc-400 dark:text-zinc-500">
                        <Eye strokeWidth={1.5} className="w-4.5 h-4.5" />
                        <span>{formatViewCount(post.views || 0)}</span>
                      </span>

                      {/* Bookmark */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSave(post.id); }}
                        className="transition-all duration-200 active:scale-125 focus:outline-none text-zinc-500 dark:text-zinc-400"
                      >
                        <Bookmark strokeWidth={1.5} className={`w-5 h-5 ${post.savedByMe ? 'fill-primary dark:fill-white text-primary dark:text-white' : 'fill-transparent'}`} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Sorting Filter Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-400 font-medium">Sort by:</span>
                    <div className="relative">
                      <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value as any)}
                        className="bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg border-none focus:outline-none appearance-none pr-8 cursor-pointer shadow-sm"
                      >
                        <option value="relevant">Most Relevant</option>
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                      </select>
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400 text-[9px]">
                        ▼
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Scrollable Comments List */}
                <div 
                  className="flex-grow overflow-y-auto px-4 py-1 custom-scrollbar space-y-4 bg-white dark:bg-[#18191a]"
                  onScroll={handleBottomSheetScroll}
                >
                  {isModalLoading ? (
                    <div className="space-y-4 py-4">
                      {[1, 2, 3].map((n) => (
                        <div key={n} className="flex gap-3">
                          <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                          <div className="flex-grow space-y-1.5 max-w-[85%]">
                            <Skeleton className="h-3 w-1/4 rounded" />
                            <Skeleton className="h-9 w-full rounded-xl" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : rootComments.length > 0 ? (
                    displayedRootComments.map((comment: any) => renderComment(comment))
                  ) : (
                    <div className="text-center py-20 flex flex-col items-center gap-3 bg-white dark:bg-[#18191a]">
                      <div className="w-12 h-12 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center">
                        <MessageCircle className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-700 dark:text-gray-300">No comments yet</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">Be the first to share your thoughts!</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Sticky Composer */}
                <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#18191a] shrink-0 flex flex-col gap-2 shadow-inner">
                  {/* Replying Status Banner */}
                  {replyingTo && (
                    <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 rounded-lg text-xs">
                      <span className="text-gray-500 dark:text-gray-400">
                        Replying to <span className="font-bold text-primary">{replyingTo.authorName}</span>
                      </span>
                      <button 
                        onClick={() => setReplyingTo(null)}
                        className="p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      >
                        <X className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    </div>
                  )}
                  
                  {/* Emoji Shortcut Row */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 px-1 custom-scrollbar shrink-0 select-none">
                    {['😊', '❤️', '😂', '😮', '😢', '😡', '👍', '🔥'].map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => {
                          setCommentText(prev => prev + emoji);
                          composerInputRef.current?.focus();
                        }}
                        className="text-lg hover:scale-125 transition-transform duration-100 p-1 rounded-md"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  
                  {/* Input Controls */}
                  <div className="flex gap-2.5 items-center">
                    <Avatar className="w-8 h-8 border border-gray-200 dark:border-gray-700">
                      <AvatarImage src={session?.user?.image || ''} />
                      <AvatarFallback>{session?.user?.name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 flex gap-2 items-center bg-gray-100 dark:bg-gray-800 rounded-full px-3.5 py-1 focus-within:ring-1 focus-within:ring-primary/40 transition-shadow">
                      <input 
                        ref={composerInputRef}
                        placeholder={replyingTo ? `Reply to ${replyingTo.authorName}...` : "Add a comment..."} 
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="flex-1 bg-transparent border-none outline-none shadow-none text-xs h-9 text-gray-950 dark:text-gray-50 placeholder-gray-400 dark:placeholder-gray-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCommentSubmit(post.id, replyingTo?.commentId);
                          }
                        }}
                      />
                      <button 
                        onClick={() => handleCommentSubmit(post.id, replyingTo?.commentId)} 
                        disabled={!commentText.trim()}
                        className={`p-1.5 rounded-full text-primary hover:bg-gray-200 dark:hover:bg-gray-700 transition-all ${!commentText.trim() ? 'opacity-40 cursor-not-allowed' : 'opacity-100 hover:scale-110'}`}
                      >
                        <Send className="w-4 h-4 fill-current" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()
      ) : (
        <Dialog open={!!activeCommentPost} onOpenChange={async (open) => {
          if (!open) {
            setActiveCommentPost(null);
            setModalComments([]);
          } else {
            // This case shouldn't happen here as open is triggered by clicking counts
          }
        }}>
          <DialogContent className="sm:max-w-[500px] bg-white/90 dark:bg-[#121212]/90 backdrop-blur-xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden border-gray-200/50 dark:border-gray-800/50 shadow-2xl rounded-3xl">
            <DialogHeader className="p-4 border-b border-gray-100/50 dark:border-gray-800/50 shrink-0 bg-white/50 dark:bg-black/50">
              <DialogTitle className="text-center font-bold text-lg tracking-tight">Post Comments</DialogTitle>
            </DialogHeader>
            
            {(() => {
              const post = feedPosts.find(p => p.id === activeCommentPost);
              if (!post) return null;
              return (
                <>
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {/* Post summary/content at the top */}
                    <div className="p-4 border-b border-gray-100/30 dark:border-gray-800/30 bg-gray-50/30 dark:bg-white/5">
                      <div className="flex items-center gap-2 mb-3">
                        <Avatar className="w-10 h-10 border-2 border-primary/20">
                          <AvatarImage src={post.authorAvatar} />
                          <AvatarFallback>{post.author?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-bold text-[15px] flex items-center gap-1.5">
                            {post.author}
                            {post.role === 'Admin' && <Badge className="bg-red-500/10 text-red-500 text-[9px] h-4">ADMIN</Badge>}
                          </div>
                          <div className="text-[11px] text-gray-500">{post.time}</div>
                        </div>
                      </div>
                      <p className="text-[14px] leading-snug whitespace-pre-wrap text-gray-800 dark:text-gray-200">{post.content}</p>
                      {post.image && <img src={post.image} alt="Post" className="mt-3 w-full rounded-2xl max-h-[250px] object-cover shadow-sm" />}
                      {post.video && (
                        <div className="mt-3 w-full rounded-2xl overflow-hidden bg-black max-h-[250px] shadow-sm flex items-center justify-center">
                          <video src={post.video} className="w-full max-h-[250px] object-contain" controls />
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center text-[11px] text-gray-500 mt-4 px-1">
                        <div className="flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors" onClick={() => { setActiveCommentPost(null); openLikesModal(post.id); }}>
                          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                            <Heart className="w-3 h-3 text-primary fill-primary" />
                          </div>
                          <span className="font-bold">{post.likes} Reactions</span>
                        </div>
                        <span className="font-medium">{post.comments} comments</span>
                      </div>
                    </div>

                    {/* Comments List */}
                    <div className="p-4 space-y-5">
                      {isModalLoading ? (
                        <div className="space-y-4 py-2">
                          {[1, 2, 3].map((n) => (
                            <div key={n} className="flex gap-3">
                              <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                              <div className="flex-grow space-y-1.5 max-w-[85%]">
                                <div className="bg-gray-100/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl rounded-tl-none px-4 py-2.5 space-y-2 border border-white/10">
                                  <Skeleton className="h-3 w-20 rounded-md" />
                                  <Skeleton className="h-4 w-11/12 rounded-md" />
                                </div>
                                <div className="flex gap-4 ml-2">
                                  <Skeleton className="h-3 w-8 rounded-md" />
                                  <Skeleton className="h-3 w-8 rounded-md" />
                                  <Skeleton className="h-3 w-12 rounded-md" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : modalComments.length > 0 ? (
                        modalComments.map((comment: any, idx: number) => (
                          <div key={idx} className="flex gap-3 group">
                            <Avatar className="w-9 h-9 shrink-0 border border-gray-100 dark:border-gray-800">
                              <AvatarImage src={comment.author?.avatar || '/default-user-avatar.svg'} />
                              <AvatarFallback>{comment.author?.name?.[0] || 'U'}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col max-w-[85%]">
                              <div className="bg-gray-100/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl rounded-tl-none px-4 py-2.5 text-sm shadow-sm border border-white/10">
                                <span className="font-bold mb-0.5 block text-[13px] text-primary/90">{comment.author?.username || comment.author?.name || 'User'}</span>
                                <span className="text-gray-800 dark:text-gray-200 leading-relaxed">{comment.content}</span>
                              </div>
                              <div className="flex gap-4 text-[11px] text-gray-500 font-bold ml-2 mt-1.5 uppercase tracking-tight opacity-70">
                                <span className="cursor-pointer hover:text-primary transition-colors">Like</span>
                                <span className="cursor-pointer hover:text-primary transition-colors">Reply</span>
                                <span className="font-normal text-[10px] lowercase">Just now</span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-20 flex flex-col items-center gap-4">
                          <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center">
                            <MessageCircle className="w-8 h-8 text-gray-300" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white">No comments yet</p>
                            <p className="text-xs text-gray-500 mt-1">Be the first one to share your thoughts!</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Comment Input Footer */}
                  <div className="p-4 border-t border-gray-100/50 dark:border-gray-800/50 shrink-0 bg-white/80 dark:bg-black/80 backdrop-blur-md">
                    <div className="flex gap-3 items-center">
                      <Avatar className="w-8 h-8 hidden sm:flex">
                        <AvatarImage src={session?.user?.image || ''} />
                        <AvatarFallback>U</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 flex gap-2 items-center bg-gray-100 dark:bg-white/5 rounded-2xl px-4 py-1 border border-transparent focus-within:border-primary/30 transition-all">
                        <Input 
                          placeholder="Write a public comment..." 
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          className="flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 px-0 text-sm h-10"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCommentSubmit(post.id);
                          }}
                        />
                        <Button variant="ghost" size="sm" onClick={() => handleCommentSubmit(post.id)} className="text-primary hover:bg-transparent p-1">
                          <Send className="w-5 h-5 fill-current" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>
      )}

      {/* Facebook Style Likes Modal */}
      <Dialog open={!!activeLikePost} onOpenChange={(open) => {
        if (!open) {
          setActiveLikePost(null);
          setModalLikes([]);
        }
      }}>
        <DialogContent className="sm:max-w-[420px] bg-white/90 dark:bg-[#121212]/90 backdrop-blur-xl p-0 gap-0 overflow-hidden border-gray-200/50 dark:border-gray-800/50 shadow-2xl rounded-3xl">
          <DialogHeader className="p-4 border-b border-gray-100/50 dark:border-gray-800/50 bg-white/50 dark:bg-black/50">
            <DialogTitle className="text-center font-bold text-lg flex items-center justify-center gap-2">
               People who reacted
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto p-4 space-y-5 custom-scrollbar">
            {isModalLoading ? (
              <div className="space-y-4 py-2">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-11 h-11 rounded-full shrink-0" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-28 rounded-lg" />
                        <Skeleton className="h-3 w-16 rounded-lg" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-24 rounded-full" />
                  </div>
                ))}
              </div>
            ) : modalLikes.length > 0 ? (
              modalLikes.map((user: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-11 h-11 border border-gray-100 dark:border-gray-800 shadow-sm transition-transform group-hover:scale-105">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>{user.name?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-900 rounded-full p-[2px] shadow-sm">
                        <div className="bg-primary rounded-full p-0.5">
                          <Heart className="w-2.5 h-2.5 text-white fill-current" />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-[15px] group-hover:text-primary transition-colors">{user.username || user.name}</span>
                      <span className="text-[11px] text-gray-500 font-medium uppercase tracking-tighter opacity-70">Member</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 rounded-full border-primary/20 hover:bg-primary/5 hover:text-primary font-bold text-xs px-4">View Profile</Button>
                </div>
              ))
            ) : (
              <div className="text-center py-16 flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center">
                  <Heart className="w-8 h-8 text-gray-300" />
                </div>
                <p className="font-bold text-gray-500">No reactions yet</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Instagram Style Post Options Modal / Bottom Sheet */}
      <Dialog open={!!activeOptionsPost} onOpenChange={(open) => {
        if (!open) {
          setActiveOptionsPost(null);
        }
      }}>
        <DialogContent className="sm:max-w-[400px] w-full bg-[#1c1c1e] text-white p-0 gap-0 overflow-hidden border border-gray-800 shadow-2xl rounded-3xl">
          <div className="flex flex-col text-center divide-y divide-gray-800/80">
            {mounted && session?.user && activeOptionsPost && (
              ((session.user as any).id === activeOptionsPost.authorId || 
               (session.user as any).username === activeOptionsPost.author)
            ) ? (
              <>
                <div className="px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider bg-white/[0.02]">
                  Post Controls (Owner)
                </div>

                {/* Glassmorphic Post Insights Panel */}
                <div className="px-4 py-4 bg-gradient-to-br from-[#2a2a2e]/60 to-[#1c1c1e]/90 backdrop-blur-md border-b border-gray-800/80">
                  <div className="flex items-center gap-2 mb-3 text-indigo-400 font-bold text-[14px]">
                    <span className="p-1.5 rounded-lg bg-indigo-500/10">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                      </svg>
                    </span>
                    Post Story Insights
                  </div>
                  {loadingAnalytics ? (
                    <div className="grid grid-cols-2 gap-2.5 py-2 animate-pulse">
                      <div className="p-3 bg-white/[0.03] border border-white/[0.05] rounded-2xl h-16" />
                      <div className="p-3 bg-white/[0.03] border border-white/[0.05] rounded-2xl h-16" />
                      <div className="p-3 bg-white/[0.03] border border-white/[0.05] rounded-2xl h-16" />
                      <div className="p-3 bg-white/[0.03] border border-white/[0.05] rounded-2xl h-16" />
                    </div>
                  ) : postAnalytics ? (
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-3 bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.05] rounded-2xl text-left transition-all">
                        <div className="flex items-center justify-between text-gray-400 text-xs font-medium mb-1">
                          <span>Story Shares</span>
                          <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 10.742L19.88 5.144l-1.06-2.12-11.196 5.6a1.5 1.5 0 101.06 2.118zM19.88 18.856L8.684 13.258a1.5 1.5 0 10-1.06 2.118l11.196 5.6 1.06-2.12z" />
                          </svg>
                        </div>
                        <div className="text-xl font-bold tracking-tight text-white">{postAnalytics.storyShares || 0}</div>
                      </div>

                      <div className="p-3 bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.05] rounded-2xl text-left transition-all">
                        <div className="flex items-center justify-between text-gray-400 text-xs font-medium mb-1">
                          <span>Story Views</span>
                          <Eye className="w-3.5 h-3.5 text-purple-400" />
                        </div>
                        <div className="text-xl font-bold tracking-tight text-white">{postAnalytics.storyViews || 0}</div>
                      </div>

                      <div className="p-3 bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.05] rounded-2xl text-left transition-all">
                        <div className="flex items-center justify-between text-gray-400 text-xs font-medium mb-1">
                          <span>Click-throughs</span>
                          <svg className="w-3.5 h-3.5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                          </svg>
                        </div>
                        <div className="text-xl font-bold tracking-tight text-white">{postAnalytics.viewPostClicks || 0}</div>
                      </div>

                      <div className="p-3 bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.05] rounded-2xl text-left transition-all">
                        <div className="flex items-center justify-between text-gray-400 text-xs font-medium mb-1">
                          <span>Engagement</span>
                          <svg className="w-3.5 h-3.5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </div>
                        <div className="text-xl font-bold tracking-tight text-white">{postAnalytics.engagementCount || 0}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm py-4">No insights available yet for this post.</div>
                  )}
                </div>
                <button 
                  onClick={async () => {
                    const newCaption = window.prompt("Edit your post caption:", activeOptionsPost.content);
                    if (newCaption !== null) {
                      const res = await editPostCaption(activeOptionsPost.id, newCaption);
                      if (res.success) {
                        setFeedPosts(posts => 
                          posts.map(p => p.id === activeOptionsPost.id ? { ...p, content: newCaption } : p)
                        );
                        alert('Post caption updated successfully.');
                      } else {
                        alert(res.error || 'Failed to edit post.');
                      }
                    }
                    setActiveOptionsPost(null);
                  }}
                  className="py-4 text-white font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px]"
                >
                  Edit Post
                </button>
                <button 
                  onClick={async () => {
                    const res = await updatePostVisibility(activeOptionsPost.id, 'hidden_from_others');
                    if (res.success) {
                      setFeedPosts(posts => 
                        posts.map(p => p.id === activeOptionsPost.id ? { ...p, visibility: 'hidden_from_others' } : p)
                      );
                      alert('Post visibility updated to: Hide from Others');
                    } else {
                      alert(res.error || 'Failed to update visibility.');
                    }
                    setActiveOptionsPost(null);
                  }}
                  className={`py-4 font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px] ${activeOptionsPost.visibility === 'hidden_from_others' ? 'text-green-500 font-bold' : 'text-white'}`}
                >
                  Hide from Others {activeOptionsPost.visibility === 'hidden_from_others' ? '✓' : ''}
                </button>
                <button 
                  onClick={async () => {
                    const res = await updatePostVisibility(activeOptionsPost.id, 'hidden_from_public');
                    if (res.success) {
                      setFeedPosts(posts => 
                        posts.map(p => p.id === activeOptionsPost.id ? { ...p, visibility: 'hidden_from_public' } : p)
                      );
                      alert('Post visibility updated to: Hide from Public');
                    } else {
                      alert(res.error || 'Failed to update visibility.');
                    }
                    setActiveOptionsPost(null);
                  }}
                  className={`py-4 font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px] ${activeOptionsPost.visibility === 'hidden_from_public' ? 'text-green-500 font-bold' : 'text-white'}`}
                >
                  Hide from Public {activeOptionsPost.visibility === 'hidden_from_public' ? '✓' : ''}
                </button>
                <button 
                  onClick={async () => {
                    const res = await updatePostVisibility(activeOptionsPost.id, 'only_me');
                    if (res.success) {
                      setFeedPosts(posts => 
                        posts.map(p => p.id === activeOptionsPost.id ? { ...p, visibility: 'only_me' } : p)
                      );
                      alert('Post visibility updated to: Only Me');
                    } else {
                      alert(res.error || 'Failed to update visibility.');
                    }
                    setActiveOptionsPost(null);
                  }}
                  className={`py-4 font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px] ${activeOptionsPost.visibility === 'only_me' ? 'text-green-500 font-bold' : 'text-white'}`}
                >
                  Only Me {activeOptionsPost.visibility === 'only_me' ? '✓' : ''}
                </button>
                {activeOptionsPost.visibility !== 'public' && (
                  <button 
                    onClick={async () => {
                      const res = await updatePostVisibility(activeOptionsPost.id, 'public');
                      if (res.success) {
                        setFeedPosts(posts => 
                          posts.map(p => p.id === activeOptionsPost.id ? { ...p, visibility: 'public' } : p)
                        );
                        alert('Post visibility updated to: Public');
                      } else {
                        alert(res.error || 'Failed to update visibility.');
                      }
                      setActiveOptionsPost(null);
                    }}
                    className="py-4 text-white font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px]"
                  >
                    Make Public
                  </button>
                )}
                <button 
                  onClick={async () => {
                    const res = await archivePost(activeOptionsPost.id);
                    if (res.success) {
                      setFeedPosts(posts => posts.filter(p => p.id !== activeOptionsPost.id));
                      alert('Post archived successfully.');
                    } else {
                      alert(res.error || 'Failed to archive post.');
                    }
                    setActiveOptionsPost(null);
                  }}
                  className="py-4 text-amber-500 font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px]"
                >
                  Archive Post
                </button>
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
                  className="py-4 text-red-500 font-bold hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px]"
                >
                  Delete Permanently
                </button>
                <button 
                  onClick={async () => {
                    const shareUrl = `${window.location.origin}/t/${activeOptionsPost.toleeSlug}`;
                    try {
                      await navigator.clipboard.writeText(shareUrl);
                      alert('Post link copied to clipboard!');
                    } catch (err) {
                      console.error('Failed to copy link:', err);
                    }
                    setActiveOptionsPost(null);
                  }}
                  className="py-4 text-white font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px]"
                >
                  Copy Link
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => {
                    if (activeOptionsPost) {
                      alert('Thank you for reporting. We will review this post.');
                      setHiddenPostIds(prev => [...prev, activeOptionsPost.id]);
                    }
                    setActiveOptionsPost(null);
                  }}
                  className="py-4 text-red-500 font-bold hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px]"
                >
                  Report as Spam
                </button>
                <button 
                  onClick={() => {
                    if (activeOptionsPost) {
                      setHiddenUsernames(prev => [...prev, activeOptionsPost.author]);
                      alert(`Hiding future posts from @${activeOptionsPost.author}.`);
                    }
                    setActiveOptionsPost(null);
                  }}
                  className="py-4 text-white font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px]"
                >
                  Hide Posts from This User
                </button>
                <button 
                  onClick={() => {
                    if (activeOptionsPost && activeOptionsPost.toleeName) {
                      setHiddenToleeNames(prev => [...prev, activeOptionsPost.toleeName]);
                      alert(`Hiding future posts from Tolee: ${activeOptionsPost.toleeName}.`);
                    }
                    setActiveOptionsPost(null);
                  }}
                  className="py-4 text-white font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px]"
                >
                  Hide Posts from This Group
                </button>
                <button 
                  onClick={async () => {
                    if (activeOptionsPost) {
                      const shareUrl = `${window.location.origin}/t/${activeOptionsPost.toleeSlug}`;
                      try {
                        await navigator.clipboard.writeText(shareUrl);
                        alert('Post link copied to clipboard!');
                      } catch (err) {
                        console.error('Failed to copy link:', err);
                      }
                    }
                    setActiveOptionsPost(null);
                  }}
                  className="py-4 text-white font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px]"
                >
                  Copy Link
                </button>
                <button 
                  onClick={() => {
                    if (activeOptionsPost) {
                      setHiddenPostIds(prev => [...prev, activeOptionsPost.id]);
                    }
                    setActiveOptionsPost(null);
                  }}
                  className="py-4 text-white font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px]"
                >
                  Not Interested
                </button>
              </>
            )}
            <button 
              onClick={() => setActiveOptionsPost(null)}
              className="py-4 text-gray-400 hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px]"
            >
              Cancel
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ReShares List Modal */}
      <Dialog open={!!activeRepostPost} onOpenChange={(open) => {
        if (!open) {
          setActiveRepostPost(null);
          setModalReposts([]);
        }
      }}>
        <DialogContent className="sm:max-w-[420px] bg-white/90 dark:bg-[#121212]/90 backdrop-blur-xl p-0 gap-0 overflow-hidden border-gray-200/50 dark:border-gray-800/50 shadow-2xl rounded-3xl">
          <DialogHeader className="p-4 border-b border-gray-100/50 dark:border-gray-800/50 bg-white/50 dark:bg-black/50">
            <DialogTitle className="text-center font-bold text-lg flex items-center justify-center gap-2">
              <Repeat className="w-5 h-5 text-green-500" /> People who re-shared
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto p-4 space-y-5 custom-scrollbar">
            {isRepostModalLoading ? (
              <div className="space-y-4 py-2">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-11 h-11 rounded-full shrink-0" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-28 rounded-lg" />
                        <Skeleton className="h-3 w-16 rounded-lg" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-24 rounded-full" />
                  </div>
                ))}
              </div>
            ) : modalReposts.length > 0 ? (
              modalReposts.map((user: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-11 h-11 border border-gray-100 dark:border-gray-800 shadow-sm transition-transform group-hover:scale-105">
                        <AvatarImage src={user.avatar || '/default-user-avatar.svg'} />
                        <AvatarFallback>{user.name?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-900 rounded-full p-[2px] shadow-sm">
                        <div className="bg-green-500 rounded-full p-0.5">
                          <Repeat className="w-2.5 h-2.5 text-white stroke-[2.5]" />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-[15px] group-hover:text-primary transition-colors text-black dark:text-white">
                        {user.name || user.username}
                      </span>
                      {user.username && (
                        <span className="text-xs text-gray-500">@{user.username}</span>
                      )}
                      <span className="text-[10px] text-gray-400 font-medium">
                        {user.repostedAt ? new Date(user.repostedAt).toLocaleDateString() : 'ReShared'}
                      </span>
                    </div>
                  </div>
                  {user.username ? (
                    <Link href={`/u/${user.username}`} onClick={() => setActiveRepostPost(null)}>
                      <Button variant="outline" size="sm" className="h-8 rounded-full border-primary/20 hover:bg-primary/5 hover:text-primary font-bold text-xs px-4">
                        View Profile
                      </Button>
                    </Link>
                  ) : (
                    <Button variant="outline" size="sm" disabled className="h-8 rounded-full border-gray-200 text-gray-400 font-bold text-xs px-4">
                      Anonymous
                    </Button>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-16 flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center">
                  <Repeat className="w-8 h-8 text-gray-300" />
                </div>
                <p className="font-bold text-gray-500">No reshares yet</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ReShareModal 
        isOpen={reshareModalOpen}
        onClose={() => setReshareModalOpen(false)}
        postId={selectedPostIdForReshare || ''}
        onSuccess={handleReshareSuccess}
      />

      {selectedPostForShare && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => {
            setShareModalOpen(false);
            setSelectedPostForShare(null);
          }}
          postId={selectedPostForShare.id}
          shareUrl={`${window.location.origin}/t/${selectedPostForShare.toleeSlug}`}
          previewText={selectedPostForShare.content || 'Check out this post on Tolee!'}
          postMediaUrl={selectedPostForShare.mediaUrls}
          postMediaType={selectedPostForShare.mediaTypes}
          postAuthor={selectedPostForShare.author}
          postAuthorAvatar={selectedPostForShare.authorAvatar}
          postCaption={selectedPostForShare.content || selectedPostForShare.caption}
          onShareSuccess={(newShareCount) => {
            setFeedPosts(currentPosts => 
              currentPosts.map(post => 
                post.id === selectedPostForShare.id 
                  ? { ...post, shareCount: newShareCount }
                  : post
              )
            );
          }}
        />
      )}



      {/* Quick Action Popup / Bottom Sheet Dialog */}
      <Dialog open={isQuickActionOpen} onOpenChange={setIsQuickActionOpen}>
        <DialogContent 
          showCloseButton={false}
          className="fixed top-auto bottom-0 left-1/2 -translate-x-1/2 translate-y-0 w-full max-w-full sm:max-w-[450px] p-0 bg-white dark:bg-[#121212] overflow-hidden rounded-t-[2.5rem] sm:rounded-[2.5rem] border-none shadow-2xl sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2 transition-all duration-300 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:pb-0 gap-0"
        >
          <DialogHeader className="p-5 sm:p-6 pb-2 border-b border-gray-100 dark:border-gray-800/60 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-extrabold text-primary dark:text-white tracking-tight">
                Quick Actions
              </DialogTitle>
              <p className="text-xs text-gray-500 mt-1">What would you like to create today?</p>
            </div>
            <button 
              onClick={() => setIsQuickActionOpen(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" />
            </button>
          </DialogHeader>

          <div className="p-4 sm:p-5 space-y-3 sm:space-y-4 max-h-[75vh] sm:max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {/* Box 1: Post Your Requirement */}
            <div 
              onClick={() => {
                setIsQuickActionOpen(false);
                setTimeout(() => {
                  document.getElementById('trigger-requirement')?.click();
                }, 150);
              }}
              className="group flex items-start gap-3.5 p-3.5 sm:p-4 rounded-2xl border border-rose-100 dark:border-rose-950/30 bg-rose-50/20 dark:bg-rose-950/10 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 hover:border-rose-200 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-rose-500 flex items-center justify-center text-white shadow-md shadow-rose-500/20 group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
                <MapPin className="w-5.5 h-5.5 sm:w-6 sm:h-6 stroke-[2.25]" />
              </div>
              <div className="flex-grow">
                <h4 className="font-bold text-[15px] sm:text-[16px] text-rose-600 dark:text-rose-400 group-hover:text-rose-700 dark:group-hover:text-rose-300 transition-colors">
                  Post Your Requirement
                </h4>
                <p className="text-[12.5px] sm:text-[13px] text-gray-500 dark:text-zinc-400 leading-snug mt-0.5">
                  Need a flat, doctor, flatmate, or local service? Notify nearby users instantly.
                </p>
              </div>
            </div>

            {/* Box 2: Create Normal Post */}
            <div 
              onClick={() => {
                setIsQuickActionOpen(false);
                setTimeout(() => {
                  document.getElementById('trigger-normal-post')?.click();
                }, 150);
              }}
              className="group flex items-start gap-3.5 p-3.5 sm:p-4 rounded-2xl border border-primary/10 dark:border-zinc-800 bg-primary/5 dark:bg-zinc-900/40 hover:bg-primary/10 dark:hover:bg-zinc-900/70 hover:border-primary/20 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-primary dark:bg-zinc-800 flex items-center justify-center text-white shadow-md shadow-primary/10 group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
                <ImageIcon className="w-5.5 h-5.5 sm:w-6 sm:h-6 stroke-[2.25] text-white" />
              </div>
              <div className="flex-grow">
                <h4 className="font-bold text-[15px] sm:text-[16px] text-primary dark:text-[#c9e4db] group-hover:text-primary dark:group-hover:text-white transition-colors">
                  Create Normal Post
                </h4>
                <p className="text-[12.5px] sm:text-[13px] text-gray-500 dark:text-zinc-400 leading-snug mt-0.5">
                  Share text updates, photos, links, or wins directly to your Tolees.
                </p>
              </div>
            </div>

            {/* Box 3: Post Reel */}
            <div 
              onClick={() => {
                setIsQuickActionOpen(false);
                setTimeout(() => {
                  document.getElementById('trigger-reel-post')?.click();
                }, 150);
              }}
              className="group flex items-start gap-3.5 p-3.5 sm:p-4 rounded-2xl border border-amber-100 dark:border-amber-950/30 bg-amber-50/20 dark:bg-amber-950/10 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 hover:border-amber-200 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
                <Video className="w-5.5 h-5.5 sm:w-6 sm:h-6 stroke-[2.25]" />
              </div>
              <div className="flex-grow">
                <h4 className="font-bold text-[15px] sm:text-[16px] text-amber-600 dark:text-amber-400 group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
                  Post Reel
                </h4>
                <p className="text-[12.5px] sm:text-[13px] text-gray-500 dark:text-zinc-400 leading-snug mt-0.5">
                  Upload short vertical videos with captions, hashtags, and Tolee sharing.
                </p>
              </div>
            </div>

            {/* Box 4: Tolee News */}
            <div 
              onClick={() => {
                setIsQuickActionOpen(false);
                setTimeout(() => {
                  document.getElementById('trigger-news-post')?.click();
                }, 150);
              }}
              className="group flex items-start gap-3.5 p-3.5 sm:p-4 rounded-2xl border border-indigo-100 dark:border-indigo-950/30 bg-indigo-50/20 dark:bg-indigo-950/10 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 hover:border-indigo-200 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
                <Newspaper className="w-5.5 h-5.5 sm:w-6 sm:h-6 stroke-[2.25]" />
              </div>
              <div className="flex-grow">
                <h4 className="font-bold text-[15px] sm:text-[16px] text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors flex items-center gap-1.5">
                  Tolee News <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/50 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">New</span>
                </h4>
                <p className="text-[12.5px] sm:text-[13px] text-gray-500 dark:text-zinc-400 leading-snug mt-0.5">
                  Publish premium news articles, blogs, technology reviews, and travel guides.
                </p>
              </div>
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-zinc-900/50 text-center text-[11px] text-gray-400 border-t border-gray-100 dark:border-gray-800/60 rounded-b-[2.5rem] sm:rounded-none">
            Choose an option to share with the Tolee community.
          </div>
        </DialogContent>
      </Dialog>


      {/* Quick Boost Modal */}
      <QuickBoostModal 
        isOpen={isQuickBoostOpen} 
        onClose={() => setIsQuickBoostOpen(false)} 
        type={quickBoostType} 
        targetId={quickBoostTargetId} 
      />

      {/* Story Viewer Dialog */}
      <StoryViewer
        isOpen={isStoryViewerOpen}
        onClose={() => setIsStoryViewerOpen(false)}
        storyGroups={storyGroups}
        initialGroupIndex={activeStoryGroupIndex || 0}
        currentUserId={mounted ? (session?.user as any)?.id : undefined}
        onStoryViewed={handleStoryViewed}
        onStoryDeleted={handleStoryDeleted}
      />

      {/* Story Editor Dialog */}
      <StoryEditor
        isOpen={isStoryEditorOpen}
        onClose={() => setIsStoryEditorOpen(false)}
        mediaUrl={storyMediaUrl}
        mediaType={storyMediaType}
        userAvatar={mounted ? (session?.user?.image || undefined) : undefined}
        userName={mounted ? (session?.user?.name || undefined) : undefined}
        onStoryPublished={() => {
          setStoryMediaUrl('');
          setStoryThumbnailUrl(undefined);
          loadStories();
        }}
      />

      {/* Story Creator Dialog */}
      <Dialog open={isStoryCreatorOpen} onOpenChange={setIsStoryCreatorOpen}>
        <DialogContent className="max-w-sm w-[90vw] bg-white dark:bg-[#121212] p-0 flex flex-col overflow-hidden rounded-3xl shadow-2xl border border-gray-100 dark:border-zinc-800 gap-0">
          <DialogHeader className="p-4 border-b border-gray-100 dark:border-zinc-800/80 flex flex-row items-center justify-between shrink-0 bg-gray-50/50 dark:bg-zinc-900/20">
            <div>
              <DialogTitle className="text-lg font-black text-slate-800 dark:text-zinc-100 tracking-tight flex items-center gap-1.5">
                <Camera className="w-5 h-5 text-indigo-500" />
                <span>Add Story/Status</span>
              </DialogTitle>
              <p className="text-[11px] text-gray-400 mt-0.5">Share a photo or video for 24 hours</p>
            </div>
            <button onClick={() => setIsStoryCreatorOpen(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors mr-6 md:mr-0">
              <X className="w-4 h-4 text-gray-400 dark:text-zinc-500" />
            </button>
          </DialogHeader>

          <div className="p-6">
            {/* Story upload field */}
            <div className="relative group border-2 border-dashed border-slate-200 dark:border-zinc-800 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 bg-slate-50/50 dark:bg-zinc-900/30 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/5 min-h-[220px]">
              <input
                type="file"
                accept="image/*,video/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleStoryUpload(file);
                }}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />
              {isUploadingStory ? (
                <div className="flex flex-col items-center gap-3 animate-pulse">
                  <div className="p-4 bg-indigo-500/10 rounded-full">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-800 dark:text-zinc-100">Uploading Media...</span>
                    <p className="text-[11px] text-slate-400 mt-1">Applying smart compression & optimization</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full group-hover:scale-110 transition-transform duration-300">
                    <Camera className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <span className="text-sm font-black text-slate-800 dark:text-zinc-100 tracking-tight block">Drag & Drop OR Click to Upload</span>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-[220px] mx-auto font-medium">Select any photo or video. Media type will be auto-detected.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
