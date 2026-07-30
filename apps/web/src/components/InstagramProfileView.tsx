'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

import { getContentPermanentUrl, copyContentUrl } from '@/lib/shareService';
import { 
  Grid, 
  Film, 
  Bookmark, 
  Users, 
  ChevronDown, 
  Plus, 
  MapPin, 
  Link as LinkIcon, 
  Heart, 
  MessageCircle, 
  MoreHorizontal, 
  ChevronLeft,
  ChevronRight,
  X,
  Share2,
  Lock,
  Compass,
  MessageSquare,
  Sparkles,
  Repeat,
  Eye,
  Camera,
  Loader2,
  Trash2,
  Newspaper,
  UserPlus,
  Play,
  Layers
} from 'lucide-react';
import { formatViewCount } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProfileReferralsPanel } from '@/components/ProfileReferralsPanel';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EditProfileModal } from '@/components/EditProfileModal';
import { ImageCropModal } from '@/components/ImageCropModal';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getOrCreatePersonalChat } from '@/actions/chat';
import { updatePostVisibility, deletePostPermanently, editPostCaption, archivePost } from '@/actions/post';
import { getFriendsList, getFollowersList, getFollowingList } from '@/actions/user';
import { ShareModal } from '@/components/ShareModal';
import { ArchiveModal } from '@/components/ArchiveModal';
import { getHighlights, getStoriesArchive, createHighlight, editHighlight, deleteHighlight, createTestStory, removeStoryFromHighlight } from '@/actions/highlight';
import { fetchUserActiveStories } from '@/actions/story';
import { StoryViewer } from '@/components/StoryViewer';
import { StoryEditor } from '@/components/StoryEditor';
import { SubscribeButton } from '@/components/SubscribeButton';
import { PostCarousel } from '@/components/PostCarousel';
import { uploadFile } from '@/lib/upload';

const getValidAvatarUrl = (url: string | null | undefined): string => {
  if (!url || url === 'null' || url === 'undefined' || url.trim() === '') {
    return '/default-user-avatar.svg';
  }
  return url;
};

const getValidCoverUrl = (url: string | null | undefined): string => {
  if (!url || url === 'null' || url === 'undefined' || url.trim() === '') {
    return '/default-user-cover.svg';
  }
  return url;
};

const getFirstMediaUrl = (mediaUrls: string | null | undefined): string => {
  if (!mediaUrls) return '';
  const urls = mediaUrls.split(/,(?=https?:\/\/)/).map(url => url.trim()).filter(Boolean);
  return urls[0] || '';
};

const getMediaUrlsCount = (mediaUrls: string | null | undefined): number => {
  if (!mediaUrls) return 0;
  return mediaUrls.split(/,(?=https?:\/\/)/).map(url => url.trim()).filter(Boolean).length;
};

const getVideoPoster = (mediaUrl: string | null, ratio: 'square' | 'portrait' = 'square') => {
  if (!mediaUrl) return undefined;

  const cleanUrl = mediaUrl.trim();
  if (cleanUrl.includes('res.cloudinary.com')) {
    // Cloudinary URL structure:
    // https://res.cloudinary.com/<cloud_name>/video/<delivery_type>/[transformations]/[version]/<public_id>.<ext>
    const parts = cleanUrl.split('/video/');
    if (parts.length === 2) {
      const cloudName = parts[0].split('/').pop();
      const segments = parts[1].split('/');
      if (segments.length >= 2 && cloudName) {
        const deliveryType = segments[0]; // e.g. upload, private, authenticated
        let startIndex = 1;
        while (startIndex < segments.length) {
          const segment = segments[startIndex];
          if (/^v\d+$/.test(segment)) {
            break;
          }
          if (
            segment.includes(',') ||
            segment.includes('=') ||
            segment.includes(':') ||
            /^(?:c|g|w|h|q|f|e|dpr|fl|sp|pg|bo|co|bg|cs|cm|br|ac|vs|b|a|o|x|y|l|u|p|r)_[a-z0-9_:]+$/i.test(segment)
          ) {
            startIndex++;
          } else {
            break;
          }
        }
        const cleanPath = segments.slice(startIndex).join('/');
        const pathWithoutExt = cleanPath.replace(/\.[^/.]+$/, "");
        const dimensions = ratio === 'portrait' ? 'w_480,h_640' : 'w_480,h_480';
        return `https://res.cloudinary.com/${cloudName}/video/${deliveryType}/c_fill,${dimensions},g_auto,so_0,q_auto,f_jpg/${pathWithoutExt}.jpg`;
      }
    }
  }

  return cleanUrl + '#t=0.1';
};

const renderMediaThumbnail = (post: PostType, ratio: 'square' | 'portrait' = 'square') => {
  const mediaUrl = getFirstMediaUrl(post.mediaUrls);
  const hasVideo = post.mediaTypes && post.mediaTypes.split(',')[0] === 'video';

  if (hasVideo) {
    const videoSrc = mediaUrl.includes('#') ? mediaUrl : `${mediaUrl}#t=0.1`;
    return (
      <video
        src={videoSrc}
        poster={getVideoPoster(mediaUrl, ratio)}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        muted
        playsInline
        preload="metadata"
        onMouseEnter={(e) => {
          const video = e.currentTarget;
          video.play().catch(() => {});
        }}
        onMouseLeave={(e) => {
          const video = e.currentTarget;
          video.pause();
          try { video.currentTime = 0; } catch (_) {}
        }}
      />
    );
  }

  return (
    <img
      src={mediaUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400'}
      alt={post.caption || 'Post'}
      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      loading="lazy"
    />
  );
};


interface PostType {
  id: string;
  caption: string | null;
  mediaUrls: string | null;
  mediaTypes: string | null;
  postType: string;
  createdAt: any;
  _count: {
    likes: number;
    comments: number;
    views?: number;
    reposts?: number;
  };
  likes?: { userId: string }[];
  authorId?: string;
  author?: string;
  visibility?: string;
  resharedByUser?: any;
  authorAvatar?: string | null;
  authorName?: string | null;
  shareCount?: number;
  toleeSlug?: string | null;
  isVerified?: boolean;
  reposts?: number;
  repostedByMe?: boolean;
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
  isPrivate?: boolean;
  level?: number;
  trustScore?: number;
  _count: {
    followers: number;
    following: number;
    posts: number;
    tolees: number;
    friends: number;
  };
}

interface HighlightType {
  id: string;
  title: string;
  coverUrl: string;
  slides: string[];
}

export function InstagramProfileView({
  user,
  posts,
  savedPosts,
  resharedPosts = [],
  tolees,
  newsArticles = [],
  isMe,
  isSuperAdmin = false,
  currentUserId,
  initialIsFollowing,
  initialFollowStatus,
  toggleFollowAction,
  toggleLikeAction,
  addCommentAction,
  getCommentsAction,
  getLikesAction,
  initialSubscriberCount = 0,
  initialSubscribed = false,
  initialBellPreference = null
}: {
  user: UserType;
  posts: PostType[];
  savedPosts: any[];
  resharedPosts?: any[];
  tolees: any[];
  newsArticles?: any[];
  isMe: boolean;
  isSuperAdmin?: boolean;
  currentUserId: string | undefined;
  initialIsFollowing: boolean;
  initialFollowStatus?: 'approved' | 'pending' | null;
  toggleFollowAction: (userId: string) => Promise<any>;
  toggleLikeAction: (postId: string) => Promise<any>;
  addCommentAction: (postId: string, text: string) => Promise<any>;
  getCommentsAction: (postId: string) => Promise<any>;
  getLikesAction: (postId: string) => Promise<any>;
  initialSubscriberCount?: number;
  initialSubscribed?: boolean;
  initialBellPreference?: string | null;
}) {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [activeTab, setActiveTab] = useState('posts');



  /**
   * Returns a proper image URL for highlight covers.
   * If the coverUrl is a Cloudinary video URL (legacy highlights before thumbnailUrl existed),
   * auto-generates a Cloudinary JPG thumbnail from the first frame.
   */
  const getHighlightThumbnail = (coverUrl: string | null | undefined): string => {
    if (!coverUrl) return 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=300';
    
    // Already a proper image or external URL — use as-is
    const lowerUrl = coverUrl.toLowerCase();
    const isVideoUrl = /\.(mp4|webm|mov|avi|mkv|m3u8)(\?.*)?$/i.test(lowerUrl);
    
    if (!isVideoUrl) return coverUrl;
    
    // It's a video URL — generate Cloudinary thumbnail
    if (coverUrl.includes('res.cloudinary.com') && coverUrl.includes('/video/upload/')) {
      return coverUrl
        .replace('/video/upload/', '/video/upload/c_fill,w_400,h_400,g_auto,so_0,q_auto,f_jpg/')
        .replace(/\.([a-zA-Z0-9]+)(\?.*)?$/, '.jpg');
    }
    
    // Fallback gradient placeholder
    return 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=300';
  };

  const [followStatus, setFollowStatus] = useState<'approved' | 'pending' | null>(
    initialFollowStatus !== undefined
      ? initialFollowStatus
      : (initialIsFollowing ? 'approved' : null)
  );
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  
  useEffect(() => {
    setIsFollowing(followStatus === 'approved');
  }, [followStatus]);

  const [followersCount, setFollowersCount] = useState(user._count.followers);
  const [followingCount, setFollowingCount] = useState(user._count.following);
  const [subscriberCount, setSubscriberCount] = useState(initialSubscriberCount);
  
  // Local reactive states for profile feeds to support instant updates (visibility & deletion)
  const [profilePosts, setProfilePosts] = useState<PostType[]>(posts);
  const [profileSavedPosts, setProfileSavedPosts] = useState<any[]>(savedPosts);
  const [profileResharedPosts, setProfileResharedPosts] = useState<any[]>(resharedPosts);
  const [activeOptionsPost, setActiveOptionsPost] = useState<PostType | null>(null);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

  const isAccountPrivate = user.isPrivate && !isMe && followStatus !== 'approved';

  // Followers Modal States
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [followersList, setFollowersList] = useState<any[]>([]);
  const [isFollowersLoading, setIsFollowersLoading] = useState(false);
  const [followersSearchQuery, setFollowersSearchQuery] = useState('');

  // Following Modal States
  const [isFollowingModalOpen, setIsFollowingModalOpen] = useState(false);
  const [followingList, setFollowingList] = useState<any[]>([]);
  const [isFollowingLoading, setIsFollowingLoading] = useState(false);
  const [followingSearchQuery, setFollowingSearchQuery] = useState('');

  // Friends System States
  const [friendsCount, setFriendsCount] = useState(user._count.friends || 0);
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [isFriendsLoading, setIsFriendsLoading] = useState(false);
  const [friendsSearchQuery, setFriendsSearchQuery] = useState('');

  const fetchFollowers = async () => {
    setIsFollowersLoading(true);
    try {
      const res = await getFollowersList(user.id);
      if (res.success && res.followers) {
        setFollowersList(res.followers);
        setFollowersCount(res.followers.length);
      }
    } catch (err) {
      console.error("Error loading followers:", err);
    } finally {
      setIsFollowersLoading(false);
    }
  };

  const fetchFollowing = async () => {
    setIsFollowingLoading(true);
    try {
      const res = await getFollowingList(user.id);
      if (res.success && res.following) {
        setFollowingList(res.following);
        setFollowingCount(res.following.length);
      }
    } catch (err) {
      console.error("Error loading following:", err);
    } finally {
      setIsFollowingLoading(false);
    }
  };

  useEffect(() => {
    if (isFollowersModalOpen) {
      fetchFollowers();
    }
  }, [isFollowersModalOpen]);

  useEffect(() => {
    if (isFollowingModalOpen) {
      fetchFollowing();
    }
  }, [isFollowingModalOpen]);

  const handleModalFollowToggle = async (targetId: string, listType: 'followers' | 'following') => {
    const list = listType === 'followers' ? followersList : followingList;
    const target = list.find(u => u.id === targetId);
    if (target?.isFollowing) {
      const confirmUnfollow = window.confirm(`Unfollow ${target.name || target.username}?`);
      if (!confirmUnfollow) return;
    }

    const updater = (prev: any[]) => prev.map(u => {
      if (u.id === targetId) return { ...u, isFollowing: !u.isFollowing };
      return u;
    });

    if (listType === 'followers') {
      setFollowersList(updater);
    } else {
      setFollowingList(updater);
    }

    const result = await toggleFollowAction(targetId);
    if (!result.success) {
      if (listType === 'followers') {
        setFollowersList(updater);
      } else {
        setFollowingList(updater);
      }
      alert(result.error || "Failed to toggle follow status");
    } else {
      if (isMe) {
        setFollowingCount(prev => result.isFollowing ? prev + 1 : Math.max(0, prev - 1));
      }
    }
  };

  const fetchFriends = async () => {
    setIsFriendsLoading(true);
    try {
      const res = await getFriendsList(user.id);
      if (res.success && res.friends) {
        setFriendsList(res.friends);
        setFriendsCount(res.friends.length);
      }
    } catch (err) {
      console.error("Error loading friends:", err);
    } finally {
      setIsFriendsLoading(false);
    }
  };

  useEffect(() => {
    if (isFriendsModalOpen) {
      fetchFriends();
    }
  }, [isFriendsModalOpen]);

  const handleFriendFollowToggle = async (friendId: string) => {
    setFriendsList(prev => prev.map(f => {
      if (f.id === friendId) return { ...f, isFollowing: !f.isFollowing };
      return f;
    }));

    const result = await toggleFollowAction(friendId);
    if (!result.success) {
      setFriendsList(prev => prev.map(f => {
        if (f.id === friendId) return { ...f, isFollowing: !f.isFollowing };
        return f;
      }));
      alert(result.error || "Failed to toggle follow status");
    } else {
      if (isMe && !result.isFollowing) {
        setFriendsList(prev => prev.filter(f => f.id !== friendId));
        setFriendsCount(prev => Math.max(0, prev - 1));
      }
    }
  };
  
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
  
  // Post Details Modal States
  const [selectedPost, setSelectedPost] = useState<PostType | null>(null);
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [reactionsList, setReactionsList] = useState<any[]>([]);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [isReactionsLoading, setIsReactionsLoading] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [isPostLiked, setIsPostLiked] = useState(false);
  const [postLikesCount, setPostLikesCount] = useState(0);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Story Highlight States
  const [activeHighlight, setActiveHighlight] = useState<any | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const highlightProgressTimer = useRef<any>(null);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [isRemovingFromHighlight, setIsRemovingFromHighlight] = useState(false);

  // Database Highlights and Creation/Edition States
  const [highlights, setHighlights] = useState<any[]>([]);
  const [isCreatingHighlight, setIsCreatingHighlight] = useState(false);
  const [isEditingHighlight, setIsEditingHighlight] = useState<any | null>(null);
  const [storiesArchive, setStoriesArchive] = useState<any[]>([]);
  const [selectedArchiveStoryIds, setSelectedArchiveStoryIds] = useState<string[]>([]);
  const [highlightNameInput, setHighlightNameInput] = useState('');
  const [highlightCoverUrl, setHighlightCoverUrl] = useState('');
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);
  const [isSavingHighlight, setIsSavingHighlight] = useState(false);

  // Profile picture actions and story creation states
  const [isDpMenuOpen, setIsDpMenuOpen] = useState(false);
  const [isStoryCreatorOpen, setIsStoryCreatorOpen] = useState(false);
  const [storyMediaUrl, setStoryMediaUrl] = useState('');
  const [storyMediaType, setStoryMediaType] = useState<'image' | 'video'>('image');
  const [isUploadingStory, setIsUploadingStory] = useState(false);
  const [userActiveStories, setUserActiveStories] = useState<any[]>([]);
  const [hasUnviewedUserStory, setHasUnviewedUserStory] = useState(false);
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false);
  const [isStoryEditorOpen, setIsStoryEditorOpen] = useState(false);

  // Profile edit quick states
  const [isUploading, setIsUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Cropping states
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropType, setCropType] = useState<'avatar' | 'coverImage'>('avatar');

  // Filter reels based on reactive profile posts
  const reelsPosts = profilePosts.filter(post => post.mediaTypes === 'video');

  // Follow Action
  const handleFollowClick = async () => {
    const currentStatus = followStatus;
    
    // Optional unfollow/cancel confirmation
    if (currentStatus === 'approved' || currentStatus === 'pending') {
      const confirmUnfollow = window.confirm(
        currentStatus === 'approved' 
          ? `Unfollow ${user.name || user.username}?` 
          : `Cancel follow request to ${user.name || user.username}?`
      );
      if (!confirmUnfollow) return;
    }

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
      if (currentStatus === 'approved') {
        setFollowersCount(user._count.followers);
      } else if (nextStatus === 'approved') {
        setFollowersCount(user._count.followers);
      }
      alert(result.error || "Failed to toggle follow status");
    } else {
      setFollowStatus(result.status !== undefined ? result.status : (result.isFollowing ? 'approved' : null));
      
      if (result.isFriend !== undefined) {
        if (result.isFriend) {
          setFriendsCount(prev => prev + 1);
        } else {
          if (!result.isFollowing) {
            setFriendsCount(prev => Math.max(0, prev - 1));
          }
        }
      }
    }
  };

  const fetchHighlights = useCallback(async () => {
    try {
      const res = await getHighlights(user.id);
      if (res.success && res.highlights) {
        setHighlights(res.highlights);
      }
    } catch (error) {
      console.error("Error fetching highlights:", error);
    }
  }, [user.id]);

  const fetchUserStories = useCallback(async () => {
    try {
      const res = await fetchUserActiveStories(user.id);
      if (res.success && res.stories) {
        setUserActiveStories(res.stories);
        setHasUnviewedUserStory(res.hasUnviewed);
      }
    } catch (error) {
      console.error("Error fetching user stories:", error);
    }
  }, [user.id]);

  useEffect(() => {
    fetchHighlights();
    fetchUserStories();
  }, [fetchHighlights, fetchUserStories]);

  const loadStoriesArchive = async () => {
    setIsLoadingArchive(true);
    try {
      const res = await getStoriesArchive();
      if (res.success && res.stories) {
        setStoriesArchive(res.stories);
      }
    } catch (error) {
      console.error("Error fetching stories archive:", error);
    } finally {
      setIsLoadingArchive(false);
    }
  };

  const handleSaveHighlight = async () => {
    if (!highlightNameInput.trim()) {
      alert("Please enter a name for the highlight.");
      return;
    }
    if (selectedArchiveStoryIds.length === 0) {
      alert("Please select at least one story.");
      return;
    }
    setIsSavingHighlight(true);
    try {
      let res;
      if (isEditingHighlight) {
        res = await editHighlight(isEditingHighlight.id, highlightNameInput, selectedArchiveStoryIds, highlightCoverUrl);
      } else {
        res = await createHighlight(highlightNameInput, selectedArchiveStoryIds, highlightCoverUrl);
      }

      if (res.success) {
        setIsCreatingHighlight(false);
        setIsEditingHighlight(null);
        setHighlightNameInput('');
        setHighlightCoverUrl('');
        setSelectedArchiveStoryIds([]);
        fetchHighlights();
      } else {
        alert(res.error || "Failed to save highlight");
      }
    } catch (error) {
      console.error("Error saving highlight:", error);
      alert("An error occurred while saving.");
    } finally {
      setIsSavingHighlight(false);
    }
  };

  const handleDeleteHighlight = async (highlightId: string) => {
    if (!confirm("Are you sure you want to delete this highlight?")) return;
    try {
      const res = await deleteHighlight(highlightId);
      if (res.success) {
        fetchHighlights();
        if (activeHighlight?.id === highlightId) {
          closeHighlight();
        }
      } else {
        alert(res.error || "Failed to delete highlight");
      }
    } catch (error) {
      console.error("Error deleting highlight:", error);
    }
  };

  const handleStoryUpload = async (file: File) => {
    setIsUploadingStory(true);
    try {
      const isVideo = file.type.startsWith('video/');
      const uploadResult = await uploadFile(file);

      setStoryMediaUrl(uploadResult.secure_url);
      setStoryMediaType(isVideo ? 'video' : 'image');
      
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
      const res = await createTestStory(storyMediaUrl, storyMediaType);
      if (res.success) {
        alert("Story uploaded successfully!");
        setIsStoryCreatorOpen(false);
        setStoryMediaUrl('');
        fetchUserStories(); // Reload visited user's active stories!
        if (isCreatingHighlight || isEditingHighlight) {
          loadStoriesArchive();
        }
      } else {
        alert(res.error || "Failed to create story.");
      }
    } catch (err) {
      console.error(err);
      alert("Error creating story.");
    }
  };

  const handleStoryViewed = (storyId: string) => {
    setUserActiveStories(prev => {
      const next = prev.map(s => s.id === storyId ? { ...s, viewed: true } : s);
      setHasUnviewedUserStory(next.some(s => !s.viewed));
      return next;
    });
  };

  const handleStoryDeleted = (storyId: string) => {
    setUserActiveStories(prev => {
      const next = prev.filter(s => s.id !== storyId);
      setHasUnviewedUserStory(next.some(s => !s.viewed));
      return next;
    });
    loadStoriesArchive();
    fetchHighlights();
  };

  // Handle file change selection and open crop modal
  // Uses FileReader.readAsDataURL instead of URL.createObjectURL so that
  // react-easy-crop can always load the image (blob: URLs can fail due to
  // internal crossOrigin/anonymous header handling inside the library).
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'coverImage') => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset the input immediately so the same file can be re-selected later
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setCropImageSrc(dataUrl);
        setCropType(type);
        setCropModalOpen(true);
      }
    };
    reader.readAsDataURL(file);
  };

  // Upload cropped image to Cloudinary and update profile
  const handleUpload = async (file: File, type: 'avatar' | 'coverImage') => {
    setCropModalOpen(false);
    setIsUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      
      const res = await fetch('/api/upload', { method: 'POST', body: uploadData });
      const data = await res.json();
      
      if (data.success) {
        const cacheBustedUrl = `${data.url}?v=${Date.now()}`;
        const payload = {
          name: user.name,
          bio: user.bio || '',
          location: user.location || '',
          website: user.website || '',
          avatar: type === 'avatar' ? cacheBustedUrl : (user.avatar || ''),
          coverImage: type === 'coverImage' ? cacheBustedUrl : (user.coverImage || ''),
        };

        const updateRes = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (updateRes.ok) {
          if (type === 'avatar') {
            await update({ image: cacheBustedUrl });
          }
          alert(`${type === 'avatar' ? 'Profile picture' : 'Cover photo'} updated successfully!`);
          window.location.reload();
        } else {
          alert(`Failed to update ${type === 'avatar' ? 'profile picture' : 'cover photo'} in database.`);
        }
      } else {
        alert(`Upload failed: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  // Open Post Details Modal
  const handlePostClick = async (post: PostType) => {
    setSelectedPost(post);
    setPostLikesCount(post._count.likes);
    setIsPostLiked(post.likes?.some(l => l.userId === currentUserId) || false);
    
    setIsCommentsLoading(true);
    const commResult = await getCommentsAction(post.id);
    if (commResult.success) {
      setCommentsList(commResult.comments);
    }
    setIsCommentsLoading(false);

    setIsReactionsLoading(true);
    const likeResult = await getLikesAction(post.id);
    if (likeResult.success) {
      setReactionsList(likeResult.likes);
    }
    setIsReactionsLoading(false);
  };

  // Handle Like Toggle in Modal
  const handleModalLike = async () => {
    if (!selectedPost) return;
    const previousLikeState = isPostLiked;
    const nextLikeState = !isPostLiked;
    setIsPostLiked(nextLikeState);
    setPostLikesCount(prev => nextLikeState ? prev + 1 : Math.max(0, prev - 1));

    const result = await toggleLikeAction(selectedPost.id);
    if (!result.success) {
      setIsPostLiked(previousLikeState);
      setPostLikesCount(selectedPost._count.likes);
    }
  };

  // Handle Comment Submission in Modal
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost || !newCommentText.trim()) return;

    const text = newCommentText;
    setNewCommentText('');

    const tempComment = {
      id: 'temp-' + Date.now(),
      content: text,
      author: {
        username: session?.user?.name || 'You',
        name: session?.user?.name || 'You',
        avatar: session?.user?.image || user.avatar
      },
      createdAt: new Date().toISOString()
    };
    setCommentsList(prev => [tempComment, ...prev]);

    const result = await addCommentAction(selectedPost.id, text);
    if (result.success && result.comment) {
      setCommentsList(prev => prev.map(c => c.id === tempComment.id ? result.comment : c));
    } else {
      setCommentsList(prev => prev.filter(c => c.id !== tempComment.id));
      alert("Failed to submit comment.");
    }
  };

  // Active Story Highlight Auto-advancing Timer
  useEffect(() => {
    if (!activeHighlight || showHighlightMenu) return;

    const currentSlide = activeHighlight.stories?.[currentSlideIndex];
    const isVideo = currentSlide?.mediaType?.startsWith('video');

    if (isVideo) {
      if (highlightProgressTimer.current) {
        clearInterval(highlightProgressTimer.current);
      }
      return;
    }

    setProgress(0);
    const intervalTime = 40;
    const totalTime = 5000; // 5 seconds for images
    const increment = (intervalTime / totalTime) * 100;

    highlightProgressTimer.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (currentSlideIndex < activeHighlight.slides.length - 1) {
            setCurrentSlideIndex(prevIdx => prevIdx + 1);
            return 0;
          } else {
            closeHighlight();
            return 100;
          }
        }
        return prev + increment;
      });
    }, intervalTime);

    return () => {
      if (highlightProgressTimer.current) {
        clearInterval(highlightProgressTimer.current);
      }
    };
  }, [activeHighlight, currentSlideIndex, showHighlightMenu]);

  const closeHighlight = () => {
    setActiveHighlight(null);
    setCurrentSlideIndex(0);
    setProgress(0);
    if (highlightProgressTimer.current) {
      clearInterval(highlightProgressTimer.current);
    }
  };

  const handleNextSlide = () => {
    if (!activeHighlight) return;
    if (currentSlideIndex < activeHighlight.slides.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
      setProgress(0);
    } else {
      closeHighlight();
    }
  };

  const handlePrevSlide = () => {
    if (!activeHighlight) return;
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
      setProgress(0);
    }
  };

  const handleVideoTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (video.duration) {
      setProgress((video.currentTime / video.duration) * 100);
    }
  };

  // Touch Swipe Navigation for story highlights
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchStartX.current - touchEndX;
    const swipeThreshold = 50; // pixels

    if (diffX > swipeThreshold) {
      handleNextSlide();
    } else if (diffX < -swipeThreshold) {
      handlePrevSlide();
    }
    touchStartX.current = null;
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-gray-900 font-sans antialiased select-none pt-4 sm:pt-6">

      {/* ===== PAGE CONTENT ===== */}
      <div className="max-w-[935px] w-full mx-auto pb-32 px-0 sm:px-4">

        {/* ===== COVER IMAGE ===== */}
        <div className="relative w-full h-[185px] sm:h-[260px] md:h-[300px] sm:rounded-2xl overflow-hidden shadow-sm sm:mt-4 group z-10">
          <img src={getValidCoverUrl(user.coverImage)} alt="Cover" className="w-full h-full object-cover" />
          {/* Gradient fade bottom — pointer-events-none so it never blocks button clicks */}
          <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-[#f5f5f5] to-transparent pointer-events-none" />
          {/* Share top right */}
          <button
            onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/u/${user.username || user.id}`); alert('Profile link copied!'); }}
            className="absolute top-3 right-3 w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/50 transition-colors z-20"
          >
            <Share2 className="w-4 h-4" />
          </button>
          {/* Username pill */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1 z-20">
            <span className="text-white text-[13px] font-semibold truncate max-w-[160px]">{user.username || 'user'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-white/80 flex-shrink-0" />
          </div>
          {/* Edit Cover — label directly triggers input (works on all mobile/WebView) */}
          {isMe && (
            <>
              {/* File input: opacity-0 but sized/positioned to sit exactly under the label */}
              <input
                id="cover-file-input"
                type="file"
                accept="image/*"
                ref={coverInputRef}
                onChange={(e) => handleFileChange(e, 'coverImage')}
                disabled={isUploading}
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  width: '120px',
                  height: '36px',
                  opacity: 0,
                  zIndex: 50,
                  cursor: 'pointer',
                }}
              />
              {/* Visual button — purely decorative, sits behind the transparent input */}
              <label
                htmlFor="cover-file-input"
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  zIndex: 45,
                  pointerEvents: 'none',
                }}
                className="bg-black/50 text-white backdrop-blur-sm px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg border border-white/20 cursor-pointer select-none"
              >
                <Camera className="w-3.5 h-3.5" />
                {isUploading ? 'Uploading...' : 'Edit Cover'}
              </label>
            </>
          )}
        </div>

        {/* Centered Profile Header Content Block (max-w-[640px] for elegant layout on desktop) */}
        <div className="max-w-[640px] mx-auto w-full px-4 sm:px-0">

          {/* ===== PROFILE DP (overlapping cover bottom) ===== */}
          <div className="flex justify-center -mt-[50px] mb-3 z-10 relative">
            <div className="relative group">
              <div 
                onClick={() => {
                  if (userActiveStories.length > 0) {
                    setIsStoryViewerOpen(true);
                  } else if (isMe) {
                    setIsDpMenuOpen(true);
                  }
                }}
                className={`w-[98px] h-[98px] rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 active:scale-95 select-none ${
                  userActiveStories.length > 0
                    ? hasUnviewedUserStory
                      ? 'bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 p-[3px] shadow-lg'
                      : 'border-2 border-gray-300 dark:border-zinc-700 p-[2px]'
                    : 'p-[3px] bg-white dark:bg-[#121212] border border-gray-100 dark:border-zinc-800 shadow-xl'
                }`}
              >
                <div className="w-full h-full rounded-full bg-white dark:bg-[#121212] p-[2.5px] overflow-hidden">
                  <img
                    src={getValidAvatarUrl(user.avatar)}
                    alt={user.name}
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
              </div>
              {isMe && (
                <>
                  <input
                    id="avatar-file-input"
                    type="file"
                    accept="image/*"
                    ref={avatarInputRef}
                    onChange={(e) => handleFileChange(e, 'avatar')}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => setIsDpMenuOpen(true)}
                    className="absolute bottom-0 right-0 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center border-2 border-[#f5f5f5] dark:border-zinc-950 shadow-md z-30 cursor-pointer select-none hover:scale-105 active:scale-95 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ===== PROFILE INFO ===== */}
          <div className="px-5 flex flex-col items-center text-center mb-4">
            {/* Username + Verified + Level */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <h1 className="font-bold text-[20px] text-gray-900 leading-tight">
                {user.username || user.name || 'user'}
              </h1>
              {user.isVerified && (
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0" title="Verified">
                  <svg viewBox="0 0 24 24" className="w-3 h-3 fill-white stroke-white stroke-[3]"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                </div>
              )}
              <span className="inline-flex items-center bg-primary text-primary-foreground text-[10px] font-black px-2 py-0.5 rounded-full tracking-wider uppercase flex-shrink-0">
                Lvl {user.level || 1}
              </span>
            </div>

            {/* Category Tag */}
            <div className="flex items-center gap-1.5 mt-1.5 mb-1">
              <span className="text-gray-400 text-[12px] font-medium">Artist</span>
              <span className="text-gray-200">•</span>
              <span className="text-gray-400 text-[12px] font-medium">Community Member</span>
            </div>

            {/* Full Name (if different from username) */}
            {user.name && user.name !== user.username && (
              <p className="text-gray-500 text-[13.5px] font-medium mt-0.5">{user.name}</p>
            )}

            {/* Bio */}
            {user.bio && (
              <p className="text-gray-700 text-[13.5px] leading-relaxed mt-2 max-w-[320px]">{user.bio}</p>
            )}

            {/* Location & Website */}
            <div className="flex flex-col items-center gap-1 mt-2">
              {user.location && (
                <div className="flex items-center gap-1 text-gray-400 dark:text-zinc-500 text-[12.5px] font-medium">
                  <MapPin className="w-3.5 h-3.5 text-primary/75 dark:text-teal-400" />
                  <span>{user.location}</span>
                </div>
              )}
              {user.website && (
                <a
                  href={user.website.startsWith('http') ? user.website : `https://${user.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary dark:text-teal-400 text-[12.5px] font-semibold flex items-center gap-1 hover:underline"
                >
                  <LinkIcon className="w-3 h-3 stroke-[2.5]" />
                  <span>{user.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                </a>
              )}
            </div>
          </div>

          {/* ===== STATS ROW ===== */}
          <div className="px-4 mb-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-150 dark:border-zinc-800/80 overflow-hidden">
              <div className="grid grid-cols-5 divide-x divide-zinc-100 dark:divide-zinc-800/80">
                <div className="flex flex-col items-center justify-center py-3.5 px-2">
                  <span className="font-bold text-[17px] text-zinc-900 dark:text-zinc-100 leading-none">{posts.length}</span>
                  <span className="text-[10.5px] text-zinc-500 dark:text-zinc-400 font-medium mt-1 text-center">posts</span>
                </div>
                <button
                  onClick={() => setIsFollowersModalOpen(true)}
                  className="flex flex-col items-center justify-center py-3.5 px-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                >
                  <span className="font-bold text-[17px] text-zinc-900 dark:text-zinc-100 leading-none">{followersCount}</span>
                  <span className="text-[10.5px] text-zinc-500 dark:text-zinc-400 font-medium mt-1 text-center">followers</span>
                </button>
                <button
                  onClick={() => setIsFollowingModalOpen(true)}
                  className="flex flex-col items-center justify-center py-3.5 px-1 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                >
                  <span className="font-bold text-[17px] text-zinc-900 dark:text-zinc-100 leading-none">{followingCount}</span>
                  <span className="text-[10.5px] text-zinc-500 dark:text-zinc-400 font-medium mt-1 text-center leading-tight">following</span>
                </button>
                <button
                  onClick={() => setIsFriendsModalOpen(true)}
                  className="flex flex-col items-center justify-center py-3.5 px-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                >
                  <span className="font-bold text-[17px] text-zinc-900 dark:text-zinc-100 leading-none">{friendsCount}</span>
                  <span className="text-[10.5px] text-zinc-500 dark:text-zinc-400 font-medium mt-1 text-center">friends</span>
                </button>
                <div className="flex flex-col items-center justify-center py-3.5 px-2">
                  <span className="font-bold text-[17px] text-zinc-900 dark:text-zinc-100 leading-none">{subscriberCount}</span>
                  <span className="text-[10.5px] text-zinc-500 dark:text-zinc-400 font-medium mt-1 text-center leading-tight">subscribers</span>
                </div>
              </div>
            </div>
          </div>

          {/* ===== ACTION BUTTONS ===== */}
          <div className="px-4 mb-5">
            {isMe ? (
              <div className="grid grid-cols-2 gap-2.5">
                <EditProfileModal user={user}>
                  <button className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-[14px] py-2.5 rounded-full transition-all active:scale-95 shadow-sm">
                    Edit Profile
                  </button>
                </EditProfileModal>
                <button 
                  onClick={() => setIsArchiveModalOpen(true)}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold text-[14px] py-2.5 rounded-full transition-all active:scale-95 shadow-sm"
                >
                  View Archive
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {/* Follow */}
                <button
                  onClick={handleFollowClick}
                  className={`w-full font-semibold text-[13px] py-2.5 rounded-full transition-all active:scale-95 shadow-sm ${
                    followStatus === 'approved'
                      ? 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      : followStatus === 'pending'
                        ? 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/30'
                        : 'bg-primary text-primary-foreground hover:bg-primary/95'
                  }`}
                >
                  {followStatus === 'approved' ? 'Following' : followStatus === 'pending' ? 'Requested' : 'Follow'}
                </button>
                {/* Message */}
                <button
                  onClick={handleMessageClick}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold text-[13px] py-2.5 rounded-full transition-all active:scale-95 shadow-sm"
                >
                  Message
                </button>
                {/* Subscribe */}
                <SubscribeButton
                  creatorId={user.id}
                  initialSubscribed={initialSubscribed}
                  initialBellPreference={initialBellPreference}
                  initialCount={subscriberCount}
                  showCount={false}
                  onSubscribeChange={(subscribed) => {
                    setSubscriberCount(prev => subscribed ? prev + 1 : Math.max(0, prev - 1));
                  }}
                  className="w-full"
                />
              </div>
            )}
          </div>

          {/* ===== STORY HIGHLIGHTS ===== */}
          {!isAccountPrivate && (
            <div className="px-4 mb-5">
              <div className="flex items-start gap-4 overflow-x-auto no-scrollbar scroll-smooth pb-1">
                {isMe && (
                  <div 
                    onClick={() => {
                      setIsCreatingHighlight(true);
                      loadStoriesArchive();
                    }} 
                    className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
                  >
                    <div className="w-[54px] h-[54px] rounded-full border-2 border-dashed border-zinc-300 dark:border-zinc-800 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 group-hover:scale-105 group-hover:border-primary active:scale-95 transition-all">
                      <Plus className="w-4 h-4 text-zinc-400 dark:text-zinc-500 stroke-[1.8]" />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 text-center w-[60px] truncate">New</span>
                  </div>
                )}
                {highlights.map((highlight) => (
                  <div
                    key={highlight.id}
                    onClick={() => { setActiveHighlight(highlight); setCurrentSlideIndex(0); }}
                    className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
                  >
                    <div className="w-[54px] h-[54px] rounded-full p-[2px] bg-gradient-to-tr from-primary via-teal-400 to-emerald-500 group-hover:scale-105 active:scale-95 transition-all shadow-sm">
                      <div className="w-full h-full rounded-full overflow-hidden border-2 border-white dark:border-zinc-950">
                        <img 
                          src={getHighlightThumbnail(highlight.coverUrl)} 
                          alt={highlight.title} 
                          className="w-full h-full object-cover" 
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=200';
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-650 dark:text-zinc-300 text-center w-[60px] truncate">{highlight.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ===== CONTENT AREA (Tabs + Grid) ===== */}
        {isAccountPrivate ? (
          <div className="max-w-[640px] mx-auto w-full px-4 sm:px-0">
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm py-16 px-6 flex flex-col items-center text-center">
              <div className="w-[72px] h-[72px] rounded-full bg-gray-100 flex items-center justify-center mb-5 shadow-inner">
                <Lock className="w-8 h-8 text-gray-400 stroke-[1.5]" />
              </div>
              <h3 className="text-[17px] font-bold text-gray-900 mb-2">This account is private</h3>
              <p className="text-[13px] text-gray-500 max-w-[260px] leading-relaxed">
                Follow this user to see their posts, reels, community memberships, and activity.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-transparent sm:bg-white border-t border-gray-100 sm:border sm:rounded-2xl overflow-hidden sm:shadow-sm mt-2 sm:mt-4 animate-in fade-in duration-300">
            {/* Tab Bar */}
            <div className="flex border-b border-gray-100 bg-white">
              {[
                { key: 'posts', icon: <Grid className="w-[21px] h-[21px] stroke-[1.8]" /> },
                { key: 'reels', icon: <Film className="w-[21px] h-[21px] stroke-[1.8]" /> },
                { key: 'reshares', icon: <Repeat className="w-[21px] h-[21px] stroke-[1.8]" /> },
                { key: 'tolees', icon: <Users className="w-[21px] h-[21px] stroke-[1.8]" /> },
                ...(newsArticles.length > 0 || isMe ? [{ key: 'news', icon: <Newspaper className="w-[21px] h-[21px] stroke-[1.8]" /> }] : []),
                ...(isMe ? [{ key: 'saved', icon: <Bookmark className="w-[21px] h-[21px] stroke-[1.8]" /> }] : []),
                ...(isMe ? [{ key: 'referrals', icon: <UserPlus className="w-[21px] h-[21px] stroke-[1.8]" /> }] : [])
              ].map(({ key, icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex-1 flex items-center justify-center py-3.5 relative transition-colors ${
                    activeTab === key ? 'text-gray-900' : 'text-gray-300 hover:text-gray-500'
                  }`}
                >
                  {icon}
                  {activeTab === key && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-[2.5px] bg-primary rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* Posts Panel */}
            {activeTab === 'posts' && (
              <div className="animate-in fade-in duration-200">
                {profilePosts.length > 0 ? (
                  <div className="grid grid-cols-3 gap-[1px] md:gap-[2px] bg-white">
                    {profilePosts.map((post) => {
                      const hasVideo = post.mediaTypes && post.mediaTypes.split(',')[0] === 'video';
                      const isCarousel = getMediaUrlsCount(post.mediaUrls) > 1;
                      return (
                        <div 
                          key={post.id} 
                          onClick={() => router.push(`/u/${user.username}/posts?postId=${post.id}`)}
                          onMouseEnter={() => router.prefetch(`/u/${user.username}/posts?postId=${post.id}`)}
                          className="aspect-square bg-slate-100 dark:bg-zinc-800 relative group cursor-pointer overflow-hidden"
                        >
                          {isMe && post.visibility && post.visibility !== 'public' && (
                            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white z-10 flex items-center gap-0.5">
                              <Lock className="w-2.5 h-2.5 text-red-400" />
                              <span className="capitalize">{post.visibility.replace(/_/g, ' ')}</span>
                            </div>
                          )}
                          {renderMediaThumbnail(post, 'square')}
                          {hasVideo && (
                            <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-[2px] p-1.5 rounded-lg z-10 flex items-center justify-center">
                              <Play className="w-3.5 h-3.5 text-white fill-white stroke-[1.5]" />
                            </div>
                          )}
                          {isCarousel && !hasVideo && (
                            <div className="absolute top-2 right-2 bg-black/45 backdrop-blur-[2px] p-1.5 rounded-lg z-10 flex items-center justify-center shadow-sm">
                              <Layers className="w-3.5 h-3.5 text-white stroke-[2]" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-6 z-20">
                            <div className="flex items-center gap-1.5 text-white font-bold text-[14px] transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 delay-75">
                              <Heart className="w-4 h-4 fill-white stroke-white" />
                              <span>{post._count.likes}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-white font-bold text-[14px] transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 delay-100">
                              <MessageCircle className="w-4 h-4 fill-white stroke-white" />
                              <span>{post._count.comments}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                    <div className="w-16 h-16 rounded-full border-2 border-gray-100 flex items-center justify-center mb-4 bg-gray-50">
                      <Grid className="w-7 h-7 text-gray-200 stroke-[1.5]" />
                    </div>
                    <h3 className="text-[16px] font-bold text-gray-900 mb-1">No Posts Yet</h3>
                    <p className="text-[12.5px] text-gray-400 max-w-[220px] leading-relaxed">Posts will show up here in a grid.</p>
                  </div>
                )}
              </div>
            )}

            {/* Reels Panel */}
            {activeTab === 'reels' && (
              <div className="animate-in fade-in duration-200">
                {reelsPosts.length > 0 ? (
                  <div className="grid grid-cols-3 gap-[1px] sm:gap-[2px] bg-white">
                    {reelsPosts.map((post) => (
                      <div 
                        key={post.id} 
                        onClick={() => router.push(`/u/${user.username}/reels?reelId=${post.id}`)} 
                        onMouseEnter={() => router.prefetch(`/u/${user.username}/reels?reelId=${post.id}`)}
                        className="aspect-[3/4] bg-slate-100 dark:bg-zinc-800 relative group cursor-pointer overflow-hidden"
                      >
                        {renderMediaThumbnail(post, 'portrait')}
                        <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-[2px] p-1.5 rounded-lg z-10 flex items-center justify-center">
                          <Play className="w-3.5 h-3.5 text-white fill-white stroke-[1.5]" />
                        </div>
                        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/20 px-1.5 py-0.5 rounded-md text-white text-[11px] font-bold drop-shadow z-10">
                          <Eye className="w-3.5 h-3.5" />
                          <span>{formatViewCount(post._count?.views || 0)}</span>
                        </div>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-6 z-20">
                          <div className="flex items-center gap-1.5 text-white font-bold text-[14px] transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 delay-75"><Heart className="w-4 h-4 fill-white stroke-white" /><span>{post._count.likes}</span></div>
                          <div className="flex items-center gap-1.5 text-white font-bold text-[14px] transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 delay-100"><MessageCircle className="w-4 h-4 fill-white stroke-white" /><span>{post._count.comments}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                    <div className="w-16 h-16 rounded-full border-2 border-gray-100 flex items-center justify-center mb-4 bg-gray-50"><Film className="w-7 h-7 text-gray-200 stroke-[1.5]" /></div>
                    <h3 className="text-[16px] font-bold text-gray-900 mb-1">No Reels Yet</h3>
                    <p className="text-[12.5px] text-gray-400 max-w-[220px] leading-relaxed">Videos shared here appear in a portrait grid.</p>
                  </div>
                )}
              </div>
            )}

            {/* Reshares Panel */}
            {activeTab === 'reshares' && (
              <div className="animate-in fade-in duration-200">
                {profileResharedPosts.length > 0 ? (
                  <div className="grid grid-cols-3 gap-[1px] sm:gap-[2px] bg-white">
                    {profileResharedPosts.map((post: any) => {
                      const hasVideo = post.mediaTypes && post.mediaTypes.split(',')[0] === 'video';
                      const isCarousel = getMediaUrlsCount(post.mediaUrls) > 1;
                      return (
                        <div 
                          key={post.id} 
                          onClick={() => router.push(`/u/${user.username}/posts?postId=${post.id}`)} 
                          onMouseEnter={() => router.prefetch(`/u/${user.username}/posts?postId=${post.id}`)}
                          className="aspect-square bg-slate-100 dark:bg-zinc-800 relative group cursor-pointer overflow-hidden"
                        >
                          {renderMediaThumbnail(post, 'square')}
                          <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded-full text-white text-[9px] font-semibold z-10 max-w-[80%] truncate">
                            <Avatar className="w-3 h-3 border border-white/20"><AvatarImage src={getValidAvatarUrl(post.authorAvatar)} /><AvatarFallback className="text-[6px]">{post.author?.[0]}</AvatarFallback></Avatar>
                            <span className="truncate">@{post.author}</span>
                          </div>
                          {hasVideo && (
                            <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-[2px] p-1.5 rounded-lg z-10 flex items-center justify-center">
                              <Play className="w-3.5 h-3.5 text-white fill-white stroke-[1.5]" />
                            </div>
                          )}
                          {isCarousel && !hasVideo && (
                            <div className="absolute top-2 right-2 bg-black/45 backdrop-blur-[2px] p-1.5 rounded-lg z-10 flex items-center justify-center shadow-sm">
                              <Layers className="w-3.5 h-3.5 text-white stroke-[2]" />
                            </div>
                          )}
                          <div className="absolute bottom-2 right-2 bg-green-500/90 p-1.5 rounded-lg z-10 shadow-sm flex items-center justify-center"><Repeat className="w-3.5 h-3.5 text-white stroke-[2.5]" /></div>
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-6 z-20">
                            <div className="flex items-center gap-1.5 text-white font-bold text-[14px] transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 delay-75"><Heart className="w-4 h-4 fill-white stroke-white" /><span>{post._count?.likes || 0}</span></div>
                            <div className="flex items-center gap-1.5 text-white font-bold text-[14px] transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 delay-100"><MessageCircle className="w-4 h-4 fill-white stroke-white" /><span>{post._count?.comments || 0}</span></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                    <div className="w-16 h-16 rounded-full border-2 border-gray-100 flex items-center justify-center mb-4 bg-gray-50"><Repeat className="w-7 h-7 text-gray-200 stroke-[1.5]" /></div>
                    <h3 className="text-[16px] font-bold text-gray-900 mb-1">No Reshares Yet</h3>
                    <p className="text-[12.5px] text-gray-400 max-w-[220px] leading-relaxed">Re-shared posts will appear here.</p>
                  </div>
                )}
              </div>
            )}

            {/* Highlights Panel (Grid of Collections) */}
            {activeTab === 'highlights' && (
              <div className="animate-in fade-in duration-200">
                {highlights.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 md:gap-3 p-3">
                    {highlights.map((highlight) => {
                      const count = highlight.stories?.length || 0;
                      return (
                        <div
                          key={highlight.id}
                          className="group relative aspect-square w-full rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shadow-sm border border-gray-100/50 dark:border-zinc-800/50 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
                        >
                          <img
                            src={getHighlightThumbnail(highlight.coverUrl)}
                            alt={highlight.title}
                            onClick={() => {
                              setActiveHighlight(highlight);
                              setCurrentSlideIndex(0);
                            }}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=400';
                            }}
                          />
                          
                          {/* Top Cover Actions */}
                          <div className="absolute top-2 right-2 flex gap-1 z-20">
                            {isMe && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setHighlightNameInput(highlight.title);
                                  setHighlightCoverUrl(highlight.coverUrl);
                                  setSelectedArchiveStoryIds(highlight.stories.map((s: any) => s.id));
                                  setIsEditingHighlight(highlight);
                                  loadStoriesArchive();
                                }}
                                className="bg-black/50 hover:bg-black/70 text-white rounded-lg p-1.5 backdrop-blur-sm transition-all"
                              >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Info Overlay */}
                          <div
                            onClick={() => {
                              setActiveHighlight(highlight);
                              setCurrentSlideIndex(0);
                            }}
                            className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3 z-10"
                          >
                            <span className="text-white font-black text-xs md:text-sm tracking-tight truncate">{highlight.title}</span>
                            <span className="text-white/70 text-[9px] md:text-[10px] font-bold uppercase tracking-wider">{count} {count === 1 ? 'Story' : 'Stories'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                    <div className="w-16 h-16 rounded-full border-2 border-gray-100 flex items-center justify-center mb-4 bg-gray-50">
                      <Sparkles className="w-7 h-7 text-gray-200 stroke-[1.5]" />
                    </div>
                    <h3 className="text-[16px] font-bold text-gray-900 mb-1">Highlights</h3>
                    <p className="text-[12.5px] text-gray-400 max-w-[220px] leading-relaxed">
                      Group your stories into visual collections on your profile page.
                    </p>
                    {isMe && (
                      <button
                        onClick={() => {
                          setIsCreatingHighlight(true);
                          loadStoriesArchive();
                        }}
                        className="mt-4 px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs rounded-full shadow-sm transition-all hover:scale-105"
                      >
                        Create Your First Highlight
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Saved Panel (self only) */}
            {activeTab === 'saved' && isMe && (
              <div className="animate-in fade-in duration-200">
                {profileSavedPosts.length > 0 ? (
                  <div className="grid grid-cols-3 gap-[1px] sm:gap-[2px] bg-white">
                    {profileSavedPosts.map((saved: any) => {
                      const post = saved.post;
                      const hasVideo = post.mediaTypes && post.mediaTypes.split(',')[0] === 'video';
                      const isCarousel = getMediaUrlsCount(post.mediaUrls) > 1;
                      return (
                        <div 
                          key={post.id} 
                          onClick={() => router.push(`/u/${user.username}/posts?postId=${post.id}`)} 
                          onMouseEnter={() => router.prefetch(`/u/${user.username}/posts?postId=${post.id}`)}
                          className="aspect-square bg-slate-100 dark:bg-zinc-800 relative group cursor-pointer overflow-hidden"
                        >
                          {renderMediaThumbnail(post, 'square')}
                          {hasVideo && (
                            <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-[2px] p-1.5 rounded-lg z-10 flex items-center justify-center">
                              <Play className="w-3.5 h-3.5 text-white fill-white stroke-[1.5]" />
                            </div>
                          )}
                          {isCarousel && !hasVideo && (
                            <div className="absolute top-2 right-2 bg-black/45 backdrop-blur-[2px] p-1.5 rounded-lg z-10 flex items-center justify-center shadow-sm">
                              <Layers className="w-3.5 h-3.5 text-white stroke-[2]" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-6 z-20">
                            <div className="flex items-center gap-1.5 text-white font-bold text-[14px] transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 delay-75"><Heart className="w-4 h-4 fill-white stroke-white" /><span>{post._count.likes}</span></div>
                            <div className="flex items-center gap-1.5 text-white font-bold text-[14px] transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 delay-100"><MessageCircle className="w-4 h-4 fill-white stroke-white" /><span>{post._count.comments}</span></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                    <div className="w-16 h-16 rounded-full border-2 border-gray-100 flex items-center justify-center mb-4 bg-gray-50"><Bookmark className="w-7 h-7 text-gray-200 stroke-[1.5]" /></div>
                    <h3 className="text-[16px] font-bold text-gray-900 mb-1">Save Posts</h3>
                    <p className="text-[12.5px] text-gray-400 max-w-[220px] leading-relaxed">Save photos and videos that you want to see again.</p>
                  </div>
                )}
              </div>
            )}

            {/* News Panel */}
            {activeTab === 'news' && (
              <div className="animate-in fade-in duration-200 p-3">
                {newsArticles.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {newsArticles.map((newsItem: any) => {
                      const post = newsItem.post;
                      const coverImg = post?.mediaUrls ? post.mediaUrls.split(/,(?=https?:\/\/)/)[0] : null;
                      const canEditThis = isMe || isSuperAdmin;
                      
                      return (
                        <div key={newsItem.id} className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 rounded-2xl overflow-hidden hover:shadow-sm transition-all">
                          <div className="flex gap-3 p-3">
                            {/* Thumbnail */}
                            <div 
                              onClick={() => router.push(`/news/${newsItem.slug}`)}
                              className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-xl overflow-hidden bg-indigo-50 dark:bg-indigo-950/20 cursor-pointer"
                            >
                              {coverImg ? (
                                <img src={coverImg} alt={newsItem.headline} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Newspaper className="w-6 h-6 text-indigo-300" />
                                </div>
                              )}
                            </div>
                            
                            {/* Text Info */}
                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[9px] font-black uppercase tracking-wider text-indigo-500 dark:text-indigo-400">{newsItem.category}</span>
                                  {post?.status === 'draft' && (
                                    <span className="text-[9px] font-black uppercase tracking-wider text-orange-500 bg-orange-50 dark:bg-orange-950/20 px-1.5 py-0.5 rounded">Draft</span>
                                  )}
                                </div>
                                <h4 
                                  onClick={() => router.push(`/news/${newsItem.slug}`)}
                                  className="font-bold text-[13px] sm:text-[14px] text-gray-900 dark:text-white leading-snug line-clamp-2 cursor-pointer hover:text-indigo-600 transition-colors"
                                >
                                  {newsItem.headline}
                                </h4>
                              </div>
                              
                              <div className="flex items-center gap-3 mt-1.5">
                                <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                  <Eye className="w-3 h-3" /> {newsItem.viewsCount || 0}
                                </span>
                                <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                  <Heart className="w-3 h-3" /> {post?._count?.likes || 0}
                                </span>
                                <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                  <MessageCircle className="w-3 h-3" /> {post?._count?.comments || 0}
                                </span>
                                {canEditThis && (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); router.push(`/news/edit/${post?.id}`); }}
                                    className="ml-auto text-[10px] font-bold text-teal-600 hover:text-teal-700 hover:underline"
                                  >
                                    Edit
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                    <div className="w-16 h-16 rounded-full border-2 border-gray-100 flex items-center justify-center mb-4 bg-gray-50">
                      <Newspaper className="w-7 h-7 text-gray-200 stroke-[1.5]" />
                    </div>
                    <h3 className="text-[16px] font-bold text-gray-900 mb-1">No News Articles</h3>
                    <p className="text-[12.5px] text-gray-400 max-w-[220px] leading-relaxed">News articles published by this user will appear here.</p>
                    {isMe && (
                      <button 
                        onClick={() => router.push('/news/create')}
                        className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-full transition-colors"
                      >
                        Create First Article
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tolees Panel */}
            {activeTab === 'tolees' && (
              <div className="animate-in fade-in duration-200 p-3">
                {tolees.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {tolees.map((t) => (
                      <div key={t.id} onClick={() => router.push(`/t/${t.slug}`)} className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 rounded-2xl p-3.5 flex items-center gap-3 cursor-pointer hover:shadow-sm hover:border-zinc-200 dark:hover:border-zinc-800 transition-all active:scale-[0.99]">
                        <Avatar className="w-11 h-11 rounded-xl border border-zinc-100 dark:border-zinc-800 flex-shrink-0">
                          <AvatarImage src={t.avatar || '/default-tolee-avatar.svg'} />
                          <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-bold text-sm">{t.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-[14px] text-zinc-900 dark:text-zinc-100 truncate">{t.name}</h4>
                          <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mt-0.5">{t.role || 'Member'}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                    <div className="w-16 h-16 rounded-full border-2 border-gray-100 flex items-center justify-center mb-4 bg-gray-50"><Users className="w-7 h-7 text-gray-200 stroke-[1.5]" /></div>
                    <h3 className="text-[16px] font-bold text-gray-900 mb-1">No Joined Tolees</h3>
                    <p className="text-[12.5px] text-gray-400 max-w-[220px] leading-relaxed">Groups this user joins will be highlighted here.</p>
                  </div>
                )}
              </div>
            )}

            {/* Referrals Panel */}
            {activeTab === 'referrals' && isMe && (
              <ProfileReferralsPanel userId={user.id} username={user.username} />
            )}
          </div>
        )}
      </div>

      {/* ===== STORY HIGHLIGHT VIEWER ===== */}
      {activeHighlight && (() => {
        const currentSlide = activeHighlight.stories?.[currentSlideIndex] || {
          mediaUrl: activeHighlight.slides[currentSlideIndex],
          mediaType: 'image'
        };
        const isVideo = currentSlide.mediaType?.startsWith('video');

        return (
          <div 
            className="fixed inset-0 z-50 bg-black flex flex-col justify-center items-center select-none touch-none"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="relative w-full max-w-[480px] h-full sm:h-[85vh] sm:rounded-xl overflow-hidden bg-zinc-950 flex flex-col justify-between">
              <div className="absolute top-0 inset-x-0 z-20 p-3 bg-gradient-to-b from-black/80 to-transparent flex flex-col gap-2">
                <div className="flex gap-1.5 w-full">
                  {activeHighlight.slides.map((_: any, idx: number) => (
                    <div key={idx} className="h-1 bg-white/30 rounded-full flex-grow overflow-hidden">
                      <div 
                        className="h-full bg-white transition-all duration-75 ease-linear" 
                        style={{ 
                          width: idx < currentSlideIndex 
                            ? '100%' 
                            : idx === currentSlideIndex 
                              ? `${progress}%` 
                              : '0%' 
                        }} 
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between w-full mt-2">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="w-8 h-8 border border-white/20">
                      <AvatarImage src={getValidAvatarUrl(user.avatar)} />
                      <AvatarFallback>{user.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-white leading-tight">{user.username}</span>
                      <span className="text-[10px] text-white/70 font-semibold uppercase tracking-widest mt-0.5">{activeHighlight.title}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {isMe && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowHighlightMenu(true);
                        }} 
                        className="text-white hover:text-white/80 p-1.5 hover:bg-white/10 rounded-full transition-colors"
                      >
                        <MoreHorizontal className="w-5.5 h-5.5" />
                      </button>
                    )}
                    <button onClick={closeHighlight} className="text-white hover:text-white/80 p-1.5 hover:bg-white/10 rounded-full transition-colors">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="relative flex-grow flex items-center justify-center h-full w-full">
                {isVideo ? (
                  <video 
                    src={currentSlide.mediaUrl} 
                    className="w-full h-full object-cover sm:rounded-lg" 
                    autoPlay={!showHighlightMenu}
                    playsInline 
                    muted 
                    onTimeUpdate={handleVideoTimeUpdate}
                    onEnded={handleNextSlide}
                    ref={(el) => {
                      if (el) {
                        if (showHighlightMenu) {
                          el.pause();
                        } else {
                          el.play().catch(() => {});
                        }
                      }
                    }}
                  />
                ) : (
                  <img src={currentSlide.mediaUrl} alt="Story" className="w-full h-full object-cover sm:rounded-lg" />
                )}
                <div className="absolute inset-y-0 left-0 w-1/3 z-10 cursor-w-resize" onClick={handlePrevSlide} />
                <div className="absolute inset-y-0 right-0 w-1/3 z-10 cursor-e-resize" onClick={handleNextSlide} />
                <button onClick={handlePrevSlide} className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white items-center justify-center transition-all" disabled={currentSlideIndex === 0}><ChevronLeft className="w-5 h-5" /></button>
                <button onClick={handleNextSlide} className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white items-center justify-center transition-all"><ChevronRight className="w-5 h-5" /></button>
              </div>
              <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/70 to-transparent text-center z-10">
                <span className="text-[13.5px] font-semibold text-white/90 italic">{activeHighlight.title} Memory 💫</span>
              </div>

              {/* ── OWNER HIGHLIGHT MENU BOTTOM SHEET ── */}
              {showHighlightMenu && (
                <div
                  className="absolute inset-0 z-30 flex flex-col justify-end"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Scrim */}
                  <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={() => setShowHighlightMenu(false)}
                  />
                  {/* Sheet */}
                  <div className="relative z-10 bg-zinc-900 rounded-t-3xl border-t border-zinc-700/50 p-2 pb-8 animate-in slide-in-from-bottom duration-200">
                    {/* Handle */}
                    <div className="w-10 h-1 rounded-full bg-zinc-600 mx-auto mb-4 mt-2" />

                    {/* Edit / Rename Highlight */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowHighlightMenu(false);
                        // Trigger the existing edit highlight dialog
                        setHighlightNameInput(activeHighlight.title);
                        setHighlightCoverUrl(activeHighlight.coverUrl);
                        setSelectedArchiveStoryIds(activeHighlight.stories.map((s: any) => s.id));
                        setIsEditingHighlight(activeHighlight);
                        loadStoriesArchive();
                        closeHighlight(); // Close viewer so they edit dialog is visible
                      }}
                      className="w-full flex items-center gap-3.5 px-5 py-3.5 rounded-2xl hover:bg-white/5 active:bg-white/10 transition-colors text-white group"
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/15 group-hover:bg-primary/25 flex items-center justify-center transition-colors">
                        <Sparkles className="w-4.5 h-4.5 text-primary" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold">Edit / Rename Highlight</div>
                        <div className="text-[11px] text-zinc-400">Rename, change cover, or add stories</div>
                      </div>
                    </button>

                    {/* Remove Current Story from Highlight */}
                    {activeHighlight.stories?.length > 0 && (
                      <button
                        disabled={isRemovingFromHighlight}
                        onClick={async (e) => {
                          e.stopPropagation();
                          setIsRemovingFromHighlight(true);
                          try {
                            const currentStory = activeHighlight.stories[currentSlideIndex];
                            const res = await removeStoryFromHighlight(activeHighlight.id, currentStory.id);
                            if (res.success) {
                              setShowHighlightMenu(false);
                              if (res.highlightDeleted) {
                                closeHighlight();
                                fetchHighlights();
                              } else {
                                const updatedStories = activeHighlight.stories.filter((s: any) => s.id !== currentStory.id);
                                const updatedSlides = activeHighlight.slides.filter((_: any, idx: number) => idx !== currentSlideIndex);
                                
                                if (updatedStories.length === 0) {
                                  closeHighlight();
                                } else {
                                  setActiveHighlight({
                                    ...activeHighlight,
                                    stories: updatedStories,
                                    slides: updatedSlides
                                  });
                                  setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1));
                                  setProgress(0);
                                }
                                fetchHighlights();
                              }
                            } else {
                              alert(res.error || "Failed to remove story from highlight.");
                            }
                          } catch (err) {
                            console.error(err);
                            alert("An error occurred.");
                          } finally {
                            setIsRemovingFromHighlight(false);
                          }
                        }}
                        className="w-full flex items-center gap-3.5 px-5 py-3.5 rounded-2xl hover:bg-white/5 active:bg-white/10 transition-colors text-white group"
                      >
                        <div className="w-9 h-9 rounded-full bg-yellow-500/15 group-hover:bg-yellow-500/25 flex items-center justify-center transition-colors">
                          <X className="w-4.5 h-4.5 text-yellow-400" />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-bold">
                            {isRemovingFromHighlight ? "Removing..." : "Remove from Highlight"}
                          </div>
                          <div className="text-[11px] text-zinc-400">Remove this story from this collection</div>
                        </div>
                      </button>
                    )}

                    {/* Delete Highlight */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowHighlightMenu(false);
                        handleDeleteHighlight(activeHighlight.id);
                      }}
                      className="w-full flex items-center gap-3.5 px-5 py-3.5 rounded-2xl hover:bg-red-500/10 active:bg-red-500/20 transition-colors text-red-400 group"
                    >
                      <div className="w-9 h-9 rounded-full bg-red-500/15 group-hover:bg-red-500/25 flex items-center justify-center transition-colors">
                        <Trash2 className="w-4.5 h-4.5" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold">Delete Highlight</div>
                        <div className="text-[11px] text-red-400/70">Delete this entire collection</div>
                      </div>
                    </button>

                    <button
                      onClick={() => setShowHighlightMenu(false)}
                      className="w-full mt-2 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-750 text-zinc-400 text-sm font-bold transition-colors active:scale-[0.98]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ===== POST DETAIL MODAL ===== */}
      <Dialog open={!!selectedPost} onOpenChange={(open) => { if (!open) { setSelectedPost(null); setCommentsList([]); setReactionsList([]); } }}>
        <DialogContent className="max-w-[90vw] md:max-w-[850px] lg:max-w-[935px] h-[90vh] md:h-[80vh] bg-white dark:bg-[#000000] border-gray-200 dark:border-[#262626] p-0 overflow-hidden shadow-2xl flex flex-col md:flex-row gap-0 rounded-2xl md:rounded-none">
          <div className="w-full md:w-[55%] h-[40%] md:h-full bg-black relative shrink-0 border-b md:border-b-0 md:border-r border-gray-200 dark:border-[#262626]">
            {selectedPost && (
              <PostCarousel 
                mediaUrls={selectedPost.mediaUrls || ''} 
                mediaTypes={selectedPost.mediaTypes} 
                postId={selectedPost.id} 
              />
            )}
          </div>
          <div className="flex-1 flex flex-col h-[60%] md:h-full justify-between overflow-hidden">
            <div className="px-4 py-3.5 border-b border-gray-100 dark:border-[#262626] flex items-center justify-between shrink-0 bg-white dark:bg-[#000000]">
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8 border border-gray-200 dark:border-zinc-800">
                  <AvatarImage src={selectedPost?.authorAvatar || user.avatar || ''} />
                  <AvatarFallback>{(selectedPost?.authorName || user.name)[0]}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-[14px] text-gray-900 dark:text-white">{selectedPost?.author || user.username || 'user'}</span>
                    {(selectedPost?.isVerified || user.isVerified) && (
                      <div className="w-3.5 h-3.5 bg-[#0095f6] rounded-full flex items-center justify-center text-white scale-90"><svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-current stroke-[3]"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 font-semibold tracking-wide">Original Poster</span>
                  {(() => {
                    const count = selectedPost?.reposts || selectedPost?._count?.reposts || 0;
                    if (count === 0) return null;
                    if (count === 1) {
                      let displayName = '';
                      let avatarUrl = '';
                      let profileUsername = '';
                      if (selectedPost?.repostedByMe && session?.user) {
                        displayName = session.user.name || (session.user as any).username || 'You';
                        avatarUrl = session.user.image || '';
                        profileUsername = (session.user as any).username || '';
                      } else if (selectedPost?.resharedByUser) {
                        displayName = selectedPost.resharedByUser.name || selectedPost.resharedByUser.username || 'Someone';
                        avatarUrl = getValidAvatarUrl(selectedPost.resharedByUser.avatar);
                        profileUsername = selectedPost.resharedByUser.username || '';
                      } else {
                        displayName = '1 person';
                        avatarUrl = '/default-user-avatar.svg';
                      }
                      return (
                        <div className="flex items-center gap-1 mt-1 text-[11px] text-gray-500 dark:text-gray-400 pl-0.5">
                          <Repeat className="w-3 h-3 text-green-500" />
                          <span>ReShared by</span>
                          {avatarUrl && (<Avatar className="w-4 h-4 border border-gray-100 dark:border-gray-800 scale-90"><AvatarImage src={avatarUrl} /><AvatarFallback className="text-[7px]">{displayName[0]}</AvatarFallback></Avatar>)}
                          {profileUsername ? (
                            <span onClick={() => { setSelectedPost(null); router.push(`/u/${profileUsername}`); }} className="font-semibold hover:underline text-gray-700 dark:text-gray-300 cursor-pointer">{displayName}</span>
                          ) : (
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{displayName}</span>
                          )}
                        </div>
                      );
                    }
                    return (
                      <div className="flex items-center gap-1 mt-1 text-[11px] text-gray-500 pl-0.5">
                        <Repeat className="w-3 h-3 text-green-500" />
                        <span>{count} people re-shared this</span>
                      </div>
                    );
                  })()}
                </div>
              </div>
              <button onClick={() => setActiveOptionsPost(selectedPost)} className="text-gray-400 hover:text-black dark:hover:text-white">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar bg-white dark:bg-[#000000]">
              {selectedPost?.caption && (
                <div className="flex gap-3 text-[14px] leading-snug">
                  <Avatar className="w-8 h-8 border border-gray-200 dark:border-zinc-800 shrink-0">
                    <AvatarImage src={selectedPost?.authorAvatar || user.avatar || ''} />
                    <AvatarFallback>{(selectedPost?.authorName || user.name)[0]}</AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <p className="text-gray-800 dark:text-gray-100">
                      <span className="font-bold text-gray-900 dark:text-white mr-1.5 hover:underline cursor-pointer">{selectedPost?.author || user.username}</span>
                      {selectedPost.caption}
                    </p>
                    <span className="text-[10px] text-gray-400 font-medium">Just now</span>
                  </div>
                </div>
              )}
              {isCommentsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-[#0095f6] rounded-full animate-spin" />
                </div>
              ) : commentsList.length > 0 ? (
                commentsList.map((comm: any) => (
                  <div key={comm.id} className="flex gap-3 text-[13.5px] leading-snug">
                    <Avatar className="w-8 h-8 border border-gray-100 dark:border-zinc-900 shrink-0">
                      <AvatarImage src={getValidAvatarUrl(comm.author?.avatar)} />
                      <AvatarFallback>{comm.author?.name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-0.5">
                      <p className="text-gray-800 dark:text-gray-100">
                        <span className="font-bold text-gray-900 dark:text-white mr-1.5 hover:underline cursor-pointer">{comm.author?.username || comm.author?.name}</span>
                        {comm.content}
                      </p>
                      <span className="text-[10px] text-gray-400 font-medium">1d ago</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center flex flex-col items-center justify-center text-gray-400">
                  <MessageSquare className="w-8 h-8 mb-2 stroke-[1.2]" />
                  <p className="text-sm font-bold text-gray-900 dark:text-white">No comments yet</p>
                  <p className="text-xs mt-0.5">Start the conversation.</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-[#262626] shrink-0 space-y-3 bg-white dark:bg-[#000000]">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-4">
                  <Heart onClick={handleModalLike} className={`w-[26px] h-[26px] stroke-[1.8] cursor-pointer hover:scale-105 active:scale-95 transition-all ${isPostLiked ? 'fill-[#ff3040] text-[#ff3040] scale-110' : 'text-black dark:text-white hover:text-gray-500'}`} />
                  <MessageCircle className="w-[26px] h-[26px] stroke-[1.8] text-black dark:text-white cursor-pointer hover:text-gray-500" />
                  <Share2 onClick={() => setShareModalOpen(true)} className="w-[26px] h-[26px] stroke-[1.8] text-black dark:text-white cursor-pointer hover:text-gray-500" />
                </div>
                <Bookmark className="w-[26px] h-[26px] stroke-[1.8] text-black dark:text-white cursor-pointer hover:text-gray-500" />
              </div>
              <div className="flex gap-4 text-[14px] font-bold text-gray-900 dark:text-white leading-tight">
                <span>{postLikesCount} {postLikesCount === 1 ? 'like' : 'likes'}</span>
                <span className="text-gray-500 font-medium">{selectedPost?.shareCount || 0} {selectedPost?.shareCount === 1 ? 'share' : 'shares'}</span>
              </div>
            </div>
            <form onSubmit={handleCommentSubmit} className="border-t border-gray-100 dark:border-[#262626] px-4 py-3 shrink-0 flex items-center gap-3 bg-white dark:bg-[#000000]">
              <Input placeholder="Add a comment..." value={newCommentText} onChange={(e) => setNewCommentText(e.target.value)} className="flex-1 border-none bg-transparent shadow-none focus-visible:ring-0 px-0 text-[13.5px] h-9" />
              <button type="submit" disabled={!newCommentText.trim()} className="text-[#0095f6] hover:text-[#00376b] font-bold text-[13.5px] disabled:opacity-40 transition-opacity">Post</button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== POST OPTIONS MODAL ===== */}
      <Dialog open={!!activeOptionsPost} onOpenChange={(open) => { if (!open) setActiveOptionsPost(null); }}>
        <DialogContent className="sm:max-w-[400px] w-full bg-[#1c1c1e] text-white p-0 gap-0 overflow-hidden border border-gray-800 shadow-2xl rounded-3xl">
          <div className="flex flex-col text-center divide-y divide-gray-800/80">
            {session?.user && activeOptionsPost && (
              ((session.user as any).id === (activeOptionsPost.authorId || user.id) ||
               (session.user as any).username === (activeOptionsPost.author || user.username))
            ) ? (
              <>
                <div className="px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider bg-white/[0.02]">Post Controls (Owner)</div>
                <button onClick={async () => { const newCaption = window.prompt("Edit your post caption:", activeOptionsPost.caption || ''); if (newCaption !== null) { const res = await editPostCaption(activeOptionsPost.id, newCaption); if (res.success) { setProfilePosts((posts: any[]) => posts.map((p: any) => p.id === activeOptionsPost.id ? { ...p, caption: newCaption } : p)); setProfileSavedPosts((saved: any[]) => saved.map((s: any) => s.post.id === activeOptionsPost.id ? { ...s, post: { ...s.post, caption: newCaption } } : s)); setProfileResharedPosts((reshared: any[]) => reshared.map((r: any) => r.id === activeOptionsPost.id ? { ...r, caption: newCaption } : r)); if (selectedPost && selectedPost.id === activeOptionsPost.id) setSelectedPost((prev: any) => prev ? { ...prev, caption: newCaption } : null); alert('Caption updated.'); } else alert(res.error || 'Failed.'); } setActiveOptionsPost(null); }} className="py-4 text-white font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px]">Edit Post</button>
                <button onClick={async () => { const res = await updatePostVisibility(activeOptionsPost.id, 'hidden_from_others'); if (res.success) { setProfilePosts((posts: any[]) => posts.map((p: any) => p.id === activeOptionsPost.id ? { ...p, visibility: 'hidden_from_others' } : p)); alert('Post hidden from others.'); } else alert(res.error || 'Failed.'); setActiveOptionsPost(null); }} className={`py-4 font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px] ${activeOptionsPost.visibility === 'hidden_from_others' ? 'text-green-500 font-bold' : 'text-white'}`}>Hide from Others {activeOptionsPost.visibility === 'hidden_from_others' ? '✓' : ''}</button>
                <button onClick={async () => { const res = await updatePostVisibility(activeOptionsPost.id, 'only_me'); if (res.success) { setProfilePosts((posts: any[]) => posts.map((p: any) => p.id === activeOptionsPost.id ? { ...p, visibility: 'only_me' } : p)); alert('Post set to Only Me.'); } else alert(res.error || 'Failed.'); setActiveOptionsPost(null); }} className={`py-4 font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px] ${activeOptionsPost.visibility === 'only_me' ? 'text-green-500 font-bold' : 'text-white'}`}>Only Me {activeOptionsPost.visibility === 'only_me' ? '✓' : ''}</button>
                {activeOptionsPost.visibility !== 'public' && (<button onClick={async () => { const res = await updatePostVisibility(activeOptionsPost.id, 'public'); if (res.success) { setProfilePosts((posts: any[]) => posts.map((p: any) => p.id === activeOptionsPost.id ? { ...p, visibility: 'public' } : p)); alert('Post made public.'); } else alert(res.error || 'Failed.'); setActiveOptionsPost(null); }} className="py-4 text-white font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px]">Make Public</button>)}
                <button onClick={async () => {
                  const res = await archivePost(activeOptionsPost.id);
                  if (res.success) {
                    setProfilePosts((posts: any[]) => posts.filter((p: any) => p.id !== activeOptionsPost.id));
                    setProfileSavedPosts((saved: any[]) => saved.filter((s: any) => s.post.id !== activeOptionsPost.id));
                    setProfileResharedPosts((reshared: any[]) => reshared.filter((r: any) => r.id !== activeOptionsPost.id));
                    if (selectedPost && selectedPost.id === activeOptionsPost.id) setSelectedPost(null);
                    alert('Post archived successfully.');
                  } else {
                    alert(res.error || 'Failed to archive post.');
                  }
                  setActiveOptionsPost(null);
                }} className="py-4 text-amber-500 font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px]">Archive Post</button>
                <button onClick={async () => { if (window.confirm("Permanently delete this post?")) { const res = await deletePostPermanently(activeOptionsPost.id); if (res.success) { setProfilePosts((posts: any[]) => posts.filter((p: any) => p.id !== activeOptionsPost.id)); setProfileSavedPosts((saved: any[]) => saved.filter((s: any) => s.post.id !== activeOptionsPost.id)); setProfileResharedPosts((reshared: any[]) => reshared.filter((r: any) => r.id !== activeOptionsPost.id)); if (selectedPost && selectedPost.id === activeOptionsPost.id) setSelectedPost(null); alert('Post deleted.'); } else alert(res.error || 'Failed.'); } setActiveOptionsPost(null); }} className="py-4 text-red-500 font-bold hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px]">Delete Permanently</button>
                <button onClick={async () => { try { await copyContentUrl(activeOptionsPost); alert('Link copied!'); } catch (err) { console.error(err); } setActiveOptionsPost(null); }} className="py-4 text-white font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px]">Copy Link</button>
              </>
            ) : (
              <>
                <button onClick={() => { alert('Thank you for reporting.'); setActiveOptionsPost(null); }} className="py-4 text-red-500 font-bold hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px]">Report as Spam</button>
                <button onClick={() => { alert('Posts hidden from feed.'); setActiveOptionsPost(null); }} className="py-4 text-white font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px]">Hide Posts from This User</button>
                <button onClick={async () => { if (activeOptionsPost) { try { await copyContentUrl(activeOptionsPost); alert('Link copied!'); } catch (err) { console.error(err); } } setActiveOptionsPost(null); }} className="py-4 text-white font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px]">Copy Link</button>
                <button onClick={() => { alert('We will show you fewer posts like this.'); setActiveOptionsPost(null); }} className="py-4 text-white font-semibold hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px]">Not Interested</button>
              </>
            )}
            <button onClick={() => setActiveOptionsPost(null)} className="py-4 text-gray-400 hover:bg-white/5 active:bg-white/10 transition-colors w-full outline-none text-[15px]">Cancel</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== FRIENDS LIST MODAL ===== */}
      <Dialog open={isFriendsModalOpen} onOpenChange={setIsFriendsModalOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-[450px] h-[500px] bg-white dark:bg-[#121212] border-gray-200 dark:border-zinc-800 p-0 overflow-hidden shadow-2xl flex flex-col rounded-2xl">
          <DialogHeader className="p-4 border-b border-gray-100 dark:border-zinc-900 flex items-center justify-between">
            <DialogTitle className="text-[16px] font-bold text-gray-900 dark:text-white mx-auto">Friends</DialogTitle>
          </DialogHeader>
          <div className="px-4 py-2 border-b border-gray-50 dark:border-zinc-900 bg-gray-50/50 dark:bg-zinc-900/20">
            <div className="relative">
              <input type="text" placeholder="Search friends..." value={friendsSearchQuery} onChange={(e) => setFriendsSearchQuery(e.target.value)} className="w-full text-[14px] bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 pl-4 pr-10 py-1.5 rounded-lg border-none focus:ring-1 focus:ring-zinc-400 outline-none" />
              {friendsSearchQuery && (<button onClick={() => setFriendsSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"><X className="w-4 h-4" /></button>)}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
            {isFriendsLoading ? (
              <div className="h-full flex flex-col items-center justify-center space-y-2">
                <div className="w-8 h-8 rounded-full border-[3px] border-zinc-200 border-t-zinc-600 dark:border-zinc-800 dark:border-t-zinc-400 animate-spin" />
                <span className="text-xs text-gray-400">Loading friends...</span>
              </div>
            ) : friendsList.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <Users className="w-10 h-10 text-gray-300 dark:text-zinc-700 mb-2 stroke-[1.5]" />
                <span className="text-sm font-semibold text-gray-700 dark:text-zinc-300">No friends yet</span>
                <p className="text-xs text-gray-400 mt-1 max-w-[250px]">{isMe ? 'Friends appear when you follow each other!' : `${user.name || 'This user'} has no mutual friends yet.`}</p>
              </div>
            ) : (() => {
              const filteredFriends = friendsList.filter((f: any) => (f.username?.toLowerCase().includes(friendsSearchQuery.toLowerCase()) || '') || f.name.toLowerCase().includes(friendsSearchQuery.toLowerCase()));
              if (filteredFriends.length === 0) return (<div className="text-center py-8 text-xs text-gray-400">No matching friends found.</div>);
              return filteredFriends.map((friend: any) => (
                <div key={friend.id} className="flex items-center justify-between gap-3 group">
                  <div onClick={() => { setIsFriendsModalOpen(false); router.push(`/u/${friend.username || 'me'}`); }} className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                    <Avatar className="w-11 h-11 border border-gray-100 dark:border-zinc-800 transition-transform group-hover:scale-[1.02]">
                      <AvatarImage src={getValidAvatarUrl(friend.avatar)} alt={friend.name} />
                      <AvatarFallback className="bg-gradient-to-tr from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-900 text-xs font-semibold uppercase">{friend.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[13.5px] font-bold text-gray-900 dark:text-white truncate">{friend.username || friend.name}</span>
                        {friend.isVerified && (<Sparkles className="w-3.5 h-3.5 text-blue-500 fill-blue-500 flex-shrink-0" />)}
                      </div>
                      <span className="text-[12px] text-gray-400 truncate">{friend.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={async () => { setIsFriendsModalOpen(false); try { const res = await getOrCreatePersonalChat(friend.id); if (res.success && res.chatId) router.push(`/chat?id=${res.chatId}&tab=personal`); else alert(res.error || 'Failed.'); } catch (err) { console.error(err); alert('Something went wrong.'); } }} className="bg-[#efefef] dark:bg-zinc-800 hover:bg-[#dbdbdb] dark:hover:bg-zinc-700 text-black dark:text-white font-semibold text-[11.5px] px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" /><span>Chat</span>
                    </button>
                    {currentUserId !== friend.id && (
                      <button onClick={() => handleFriendFollowToggle(friend.id)} className={`font-semibold text-[11.5px] px-3 py-1.5 rounded-lg transition-all ${friend.isFollowing ? 'bg-[#efefef] dark:bg-zinc-800 text-black dark:text-white hover:bg-[#dbdbdb] dark:hover:bg-zinc-700' : 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm'}`}>
                        {friend.isFollowing ? 'Following' : 'Follow'}
                      </button>
                    )}
                  </div>
                </div>
              ));
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== FOLLOWERS LIST MODAL ===== */}
      <Dialog open={isFollowersModalOpen} onOpenChange={setIsFollowersModalOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-[450px] h-[500px] bg-white dark:bg-[#121212] border-gray-200 dark:border-zinc-800 p-0 overflow-hidden shadow-2xl flex flex-col rounded-2xl">
          <DialogHeader className="p-4 border-b border-gray-100 dark:border-zinc-900 flex items-center justify-between">
            <DialogTitle className="text-[16px] font-bold text-gray-900 dark:text-white mx-auto">Followers</DialogTitle>
          </DialogHeader>
          <div className="px-4 py-2 border-b border-gray-50 dark:border-zinc-900 bg-gray-50/50 dark:bg-zinc-900/20">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search followers..." 
                value={followersSearchQuery} 
                onChange={(e) => setFollowersSearchQuery(e.target.value)} 
                className="w-full text-[14px] bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 pl-4 pr-10 py-1.5 rounded-lg border-none focus:ring-1 focus:ring-zinc-400 outline-none" 
              />
              {followersSearchQuery && (
                <button 
                  onClick={() => setFollowersSearchQuery('')} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
            {isFollowersLoading ? (
              <div className="h-full flex flex-col items-center justify-center space-y-2">
                <div className="w-8 h-8 rounded-full border-[3px] border-zinc-200 border-t-zinc-600 dark:border-zinc-800 dark:border-t-zinc-400 animate-spin" />
                <span className="text-xs text-gray-400">Loading followers...</span>
              </div>
            ) : followersList.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <Users className="w-10 h-10 text-gray-300 dark:text-zinc-700 mb-2 stroke-[1.5]" />
                <span className="text-sm font-semibold text-gray-700 dark:text-zinc-300">No followers yet</span>
                <p className="text-xs text-gray-400 mt-1 max-w-[250px]">
                  {isMe ? 'Followers will appear here.' : `${user.name || 'This user'} has no followers yet.`}
                </p>
              </div>
            ) : (() => {
              const filtered = followersList.filter((f: any) => 
                (f.username?.toLowerCase().includes(followersSearchQuery.toLowerCase()) || '') || 
                f.name?.toLowerCase().includes(followersSearchQuery.toLowerCase())
              );
              if (filtered.length === 0) return (<div className="text-center py-8 text-xs text-gray-400">No matching followers found.</div>);
              return filtered.map((follower: any) => (
                <div key={follower.id} className="flex items-center justify-between gap-3 group">
                  <div 
                    onClick={() => { 
                      setIsFollowersModalOpen(false); 
                      router.push(`/u/${follower.username || 'me'}`); 
                    }} 
                    className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                  >
                    <Avatar className="w-11 h-11 border border-gray-100 dark:border-zinc-800 transition-transform group-hover:scale-[1.02]">
                      <AvatarImage src={getValidAvatarUrl(follower.avatar)} alt={follower.name} />
                      <AvatarFallback className="bg-gradient-to-tr from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-900 text-xs font-semibold uppercase">
                        {follower.name ? follower.name.slice(0, 2) : 'TL'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[13.5px] font-bold text-gray-900 dark:text-white truncate">{follower.username || follower.name}</span>
                        {follower.isVerified && (<Sparkles className="w-3.5 h-3.5 text-blue-500 fill-blue-500 flex-shrink-0" />)}
                      </div>
                      <span className="text-[12px] text-gray-400 truncate">{follower.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {currentUserId !== follower.id && (
                      <button 
                        onClick={() => handleModalFollowToggle(follower.id, 'followers')} 
                        className={`font-semibold text-[11.5px] px-3 py-1.5 rounded-lg transition-all ${
                          follower.isFollowing 
                            ? 'bg-[#efefef] dark:bg-zinc-800 text-black dark:text-white hover:bg-[#dbdbdb] dark:hover:bg-zinc-700' 
                            : 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm'
                        }`}
                      >
                        {follower.isFollowing ? 'Following' : 'Follow'}
                      </button>
                    )}
                  </div>
                </div>
              ));
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== FOLLOWING LIST MODAL ===== */}
      <Dialog open={isFollowingModalOpen} onOpenChange={setIsFollowingModalOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-[450px] h-[500px] bg-white dark:bg-[#121212] border-gray-200 dark:border-zinc-800 p-0 overflow-hidden shadow-2xl flex flex-col rounded-2xl">
          <DialogHeader className="p-4 border-b border-gray-100 dark:border-zinc-900 flex items-center justify-between">
            <DialogTitle className="text-[16px] font-bold text-gray-900 dark:text-white mx-auto">Following</DialogTitle>
          </DialogHeader>
          <div className="px-4 py-2 border-b border-gray-50 dark:border-zinc-900 bg-gray-50/50 dark:bg-zinc-900/20">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search following..." 
                value={followingSearchQuery} 
                onChange={(e) => setFollowingSearchQuery(e.target.value)} 
                className="w-full text-[14px] bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 pl-4 pr-10 py-1.5 rounded-lg border-none focus:ring-1 focus:ring-zinc-400 outline-none" 
              />
              {followingSearchQuery && (
                <button 
                  onClick={() => setFollowingSearchQuery('')} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
            {isFollowingLoading ? (
              <div className="h-full flex flex-col items-center justify-center space-y-2">
                <div className="w-8 h-8 rounded-full border-[3px] border-zinc-200 border-t-zinc-600 dark:border-zinc-800 dark:border-t-zinc-400 animate-spin" />
                <span className="text-xs text-gray-400">Loading following...</span>
              </div>
            ) : followingList.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <Users className="w-10 h-10 text-gray-300 dark:text-zinc-700 mb-2 stroke-[1.5]" />
                <span className="text-sm font-semibold text-gray-700 dark:text-zinc-300">Not following anyone</span>
                <p className="text-xs text-gray-400 mt-1 max-w-[250px]">
                  {isMe ? 'People you follow will appear here.' : `${user.name || 'This user'} is not following anyone yet.`}
                </p>
              </div>
            ) : (() => {
              const filtered = followingList.filter((f: any) => 
                (f.username?.toLowerCase().includes(followingSearchQuery.toLowerCase()) || '') || 
                f.name?.toLowerCase().includes(followingSearchQuery.toLowerCase())
              );
              if (filtered.length === 0) return (<div className="text-center py-8 text-xs text-gray-400">No matching users found.</div>);
              return filtered.map((fol: any) => (
                <div key={fol.id} className="flex items-center justify-between gap-3 group">
                  <div 
                    onClick={() => { 
                      setIsFollowingModalOpen(false); 
                      router.push(`/u/${fol.username || 'me'}`); 
                    }} 
                    className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                  >
                    <Avatar className="w-11 h-11 border border-gray-100 dark:border-zinc-800 transition-transform group-hover:scale-[1.02]">
                      <AvatarImage src={getValidAvatarUrl(fol.avatar)} alt={fol.name} />
                      <AvatarFallback className="bg-gradient-to-tr from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-900 text-xs font-semibold uppercase">
                        {fol.name ? fol.name.slice(0, 2) : 'TL'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[13.5px] font-bold text-gray-900 dark:text-white truncate">{fol.username || fol.name}</span>
                        {fol.isVerified && (<Sparkles className="w-3.5 h-3.5 text-blue-500 fill-blue-500 flex-shrink-0" />)}
                      </div>
                      <span className="text-[12px] text-gray-400 truncate">{fol.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {currentUserId !== fol.id && (
                      <button 
                        onClick={() => handleModalFollowToggle(fol.id, 'following')} 
                        className={`font-semibold text-[11.5px] px-3 py-1.5 rounded-lg transition-all ${
                          fol.isFollowing 
                            ? 'bg-[#efefef] dark:bg-zinc-800 text-black dark:text-white hover:bg-[#dbdbdb] dark:hover:bg-zinc-700' 
                            : 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm'
                        }`}
                      >
                        {fol.isFollowing ? 'Following' : 'Follow'}
                      </button>
                    )}
                  </div>
                </div>
              ));
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {selectedPost && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          postId={selectedPost.id}
          shareUrl={getContentPermanentUrl(selectedPost)}
          previewText={selectedPost.caption || 'Check out this post on Tolee!'}
          postMediaUrl={selectedPost.mediaUrls}
          postMediaType={selectedPost.mediaTypes}
          postAuthor={selectedPost.author || user.username}
          postAuthorAvatar={selectedPost.authorAvatar || user.avatar}
          postCaption={selectedPost.caption}
          onShareSuccess={(newShareCount) => {
            setSelectedPost((prev: any) => prev ? { ...prev, shareCount: newShareCount } : null);
            setProfilePosts((prevPosts: any[]) => prevPosts.map((p: any) => p.id === selectedPost.id ? { ...p, shareCount: newShareCount } : p));
            setProfileResharedPosts((prevReshared: any[]) => prevReshared.map((p: any) => p.id === selectedPost.id ? { ...p, shareCount: newShareCount } : p));
          }}
        />
      )}

      {/* Image Crop Modal */}
      {cropImageSrc && (
        <ImageCropModal
          isOpen={cropModalOpen}
          onClose={() => setCropModalOpen(false)}
          imageSrc={cropImageSrc}
          onSave={(file) => handleUpload(file, cropType)}
          aspectRatio={cropType === 'avatar' ? 1 : 3} // Wide Cover Aspect Ratio
          cropShape={cropType === 'avatar' ? 'round' : 'rect'}
          title={cropType === 'avatar' ? 'Adjust Profile Picture' : 'Adjust Cover Photo'}
        />
      )}

      {/* Archive Modal */}
      <ArchiveModal 
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        onPostRestored={() => {
          router.refresh();
          window.location.reload();
        }}
      />

      {/* ===== HIGHLIGHT CREATOR / EDITOR DIALOG ===== */}
      <Dialog open={isCreatingHighlight || !!isEditingHighlight} onOpenChange={(open) => {
        if (!open) {
          setIsCreatingHighlight(false);
          setIsEditingHighlight(null);
          setHighlightNameInput('');
          setHighlightCoverUrl('');
          setSelectedArchiveStoryIds([]);
        }
      }}>
        <DialogContent className="max-w-md w-[94vw] h-[85vh] bg-white dark:bg-[#121212] p-0 flex flex-col overflow-hidden rounded-3xl shadow-2xl border border-gray-100 dark:border-zinc-800 gap-0">
          <DialogHeader className="p-4 border-b border-gray-100 dark:border-zinc-800/80 flex flex-row items-center justify-between shrink-0 bg-gray-50/50 dark:bg-zinc-900/20">
            <div>
              <DialogTitle className="text-lg font-black text-slate-800 dark:text-zinc-100 tracking-tight">
                {isEditingHighlight ? "Edit Highlight" : "New Highlight"}
              </DialogTitle>
              <p className="text-[11px] text-gray-400 mt-0.5">Organize your stories into a collection</p>
            </div>
            <button onClick={() => { setIsCreatingHighlight(false); setIsEditingHighlight(null); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors mr-6 md:mr-0">
              <X className="w-4 h-4 text-gray-400 dark:text-zinc-500" />
            </button>
          </DialogHeader>

          <div className="flex-grow overflow-y-auto p-4 custom-scrollbar space-y-4">
            {/* Title Input */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Highlight Name</label>
              <Input
                type="text"
                placeholder="e.g. Travel, Food, Life..."
                value={highlightNameInput}
                onChange={(e) => setHighlightNameInput(e.target.value)}
                className="rounded-xl border-gray-200 dark:border-zinc-800 text-sm font-semibold"
                maxLength={15}
              />
            </div>

            {/* Custom Cover Url or Select story cover */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Cover Image URL (Optional)</label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Paste image URL or select from stories below"
                  value={highlightCoverUrl}
                  onChange={(e) => setHighlightCoverUrl(e.target.value)}
                  className="rounded-xl border-gray-200 dark:border-zinc-800 text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    const url = prompt("Enter custom image url:");
                    if (url) setHighlightCoverUrl(url);
                  }}
                  className="px-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 dark:bg-zinc-900 dark:border-zinc-800 text-xs font-semibold rounded-xl text-gray-600 dark:text-zinc-300"
                >
                  Edit
                </button>
              </div>
            </div>

            {/* Stories Archive Checklist */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[12px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Select Stories</label>
                {isMe && (
                  <button
                    onClick={async () => {
                      const url = prompt("Enter mock story image/video url (e.g. Unsplash image url):");
                      if (!url) return;
                      const type = url.includes('.mp4') || url.includes('video') ? 'video' : 'image';
                      const res = await createTestStory(url, type);
                      if (res.success) {
                        loadStoriesArchive();
                      } else {
                        alert("Failed to create mock story.");
                      }
                    }}
                    className="text-[11px] font-bold text-primary hover:text-primary/90 flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" /> Create Test Story
                  </button>
                )}
              </div>
              
              {isLoadingArchive ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
              ) : storiesArchive.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl">
                  <Camera className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-400 font-semibold">No stories in your archive yet.</p>
                  <p className="text-[10px] text-gray-400 mt-1 max-w-[200px] mx-auto">Create a test story above to start building highlights.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-[30vh] overflow-y-auto pr-1">
                  {storiesArchive.map((story) => {
                    const isSelected = selectedArchiveStoryIds.includes(story.id);
                    const isVideo = story.mediaType?.startsWith('video');
                    return (
                      <div
                        key={story.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedArchiveStoryIds(prev => prev.filter(id => id !== story.id));
                            if (highlightCoverUrl === story.mediaUrl) {
                              setHighlightCoverUrl('');
                            }
                          } else {
                            setSelectedArchiveStoryIds(prev => [...prev, story.id]);
                            if (!highlightCoverUrl) {
                              setHighlightCoverUrl(story.mediaUrl);
                            }
                          }
                        }}
                        className={`relative aspect-[9/16] rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                          isSelected ? 'border-primary scale-[0.98]' : 'border-transparent hover:border-zinc-200 dark:hover:border-zinc-800'
                        }`}
                      >
                        {isVideo ? (
                          <video src={story.mediaUrl} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                        ) : (
                          <img src={story.mediaUrl} className="w-full h-full object-cover" alt="" />
                        )}
                        <div className={`absolute inset-0 transition-all ${isSelected ? 'bg-primary/10' : 'bg-black/10'}`} />
                        <div className="absolute top-1 right-1 w-5 h-5 rounded-full border border-white flex items-center justify-center text-[10px] font-bold shadow bg-white/80 dark:bg-black/80">
                          {isSelected ? (
                            <span className="w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center text-white text-[8px]">✓</span>
                          ) : null}
                        </div>
                        {isSelected && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setHighlightCoverUrl(story.mediaUrl);
                            }}
                            className={`absolute bottom-1 inset-x-1 py-0.5 rounded text-[8px] font-black tracking-wider uppercase transition-colors ${
                              highlightCoverUrl === story.mediaUrl
                                ? 'bg-green-500 text-white shadow-sm'
                                : 'bg-black/60 text-white/90 hover:bg-black/80'
                            }`}
                          >
                            {highlightCoverUrl === story.mediaUrl ? "COVER ✓" : "Set Cover"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-gray-100 dark:border-zinc-800 shrink-0 bg-gray-50 dark:bg-zinc-900/20 flex gap-2">
            {isEditingHighlight && (
              <button
                type="button"
                onClick={() => {
                  handleDeleteHighlight(isEditingHighlight.id);
                  setIsEditingHighlight(null);
                }}
                disabled={isSavingHighlight}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 font-bold text-xs rounded-xl flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            )}
            <button
              type="button"
              onClick={handleSaveHighlight}
              disabled={isSavingHighlight || selectedArchiveStoryIds.length === 0}
              className="flex-grow py-2.5 bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs rounded-full transition-all disabled:opacity-50"
            >
              {isSavingHighlight ? "Saving..." : isEditingHighlight ? "Save Changes" : "Create Highlight"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== DP ACTIONS DIALOG (ADD STORY / CHANGE DP) ===== */}
      <Dialog open={isDpMenuOpen} onOpenChange={setIsDpMenuOpen}>
        <DialogContent className="max-w-xs w-[85vw] bg-white dark:bg-[#121212] p-4 flex flex-col items-center justify-center rounded-3xl shadow-2xl border border-gray-100 dark:border-zinc-800 gap-3">
          <h3 className="font-extrabold text-sm text-slate-800 dark:text-zinc-100 uppercase tracking-wider mb-1">Profile Actions</h3>
          
          <button
            type="button"
            onClick={() => {
              setIsDpMenuOpen(false);
              setIsStoryCreatorOpen(true);
            }}
            className="w-full py-2.5 bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs rounded-full shadow-sm transition-all"
          >
            Add Story/Status
          </button>
          
          <button
            type="button"
            onClick={() => {
              setIsDpMenuOpen(false);
              avatarInputRef.current?.click();
            }}
            className="w-full py-2.5 bg-white border border-gray-200 hover:bg-gray-50 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold text-xs rounded-xl transition-all"
          >
            Change Profile Picture
          </button>

          <button
            type="button"
            onClick={() => setIsDpMenuOpen(false)}
            className="w-full py-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 font-bold text-[11px] uppercase tracking-wider transition-all"
          >
            Cancel
          </button>
        </DialogContent>
      </Dialog>

      {/* Story Viewer Dialog */}
      <StoryViewer
        isOpen={isStoryViewerOpen}
        onClose={() => setIsStoryViewerOpen(false)}
        storyGroups={[
          {
            user: {
              id: user.id,
              username: user.username || user.name,
              name: user.name,
              avatar: getValidAvatarUrl(user.avatar)
            },
            stories: userActiveStories,
            hasUnviewed: hasUnviewedUserStory
          }
        ]}
        initialGroupIndex={0}
        currentUserId={(session?.user as any)?.id}
        onStoryViewed={(storyId) => handleStoryViewed(storyId)}
        onStoryDeleted={(storyId) => handleStoryDeleted(storyId)}
      />

      {/* Story Editor Dialog */}
      <StoryEditor
        isOpen={isStoryEditorOpen}
        onClose={() => setIsStoryEditorOpen(false)}
        mediaUrl={storyMediaUrl}
        mediaType={storyMediaType}
        userAvatar={session?.user?.image || undefined}
        userName={session?.user?.name || undefined}
        onStoryPublished={() => {
          setStoryMediaUrl('');
          fetchUserStories();
          if (isCreatingHighlight || isEditingHighlight) {
            loadStoriesArchive();
          }
        }}
      />

      {/* ===== STORY CREATOR DIALOG ===== */}
      <Dialog open={isStoryCreatorOpen} onOpenChange={setIsStoryCreatorOpen}>
        <DialogContent className="max-w-sm w-[90vw] bg-white dark:bg-[#121212] p-0 flex flex-col overflow-hidden rounded-3xl shadow-2xl border border-gray-100 dark:border-zinc-800 gap-0">
          <DialogHeader className="p-4 border-b border-gray-100 dark:border-zinc-800/80 flex flex-row items-center justify-between shrink-0 bg-gray-50/50 dark:bg-zinc-900/20">
            <div>
              <DialogTitle className="text-lg font-black text-slate-800 dark:text-zinc-100 tracking-tight flex items-center gap-1.5">
                <Camera className="w-5 h-5 text-primary" />
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
            <div className="relative group border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-primary dark:hover:border-primary rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 bg-zinc-50/50 dark:bg-zinc-900/30 hover:bg-primary/5 min-h-[220px]">
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
                  <div className="p-4 bg-primary/10 rounded-full">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-800 dark:text-zinc-100">Uploading Media...</span>
                    <p className="text-[11px] text-slate-400 mt-1">Applying smart compression & optimization</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 bg-primary/10 dark:bg-primary/5 rounded-full group-hover:scale-110 transition-transform duration-300">
                    <Camera className="w-8 h-8 text-primary" />
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
