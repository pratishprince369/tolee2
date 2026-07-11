'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  ArrowLeft, Eye, Calendar, Loader2, Play, Pause, Tv, Share2, 
  ThumbsUp, ThumbsDown, Heart, Pin, MessageSquare, Plus, Check, MoreVertical,
  Volume2, VolumeX, Maximize, Minimize, Settings, Lock, Unlock, Sun, RotateCcw,
  Sparkles, Bell, Send, CheckCircle2, ChevronDown, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { usePlaybackTracker } from '@/hooks/usePlaybackTracker';
import { 
  getScreenVideoDetails, toggleLikeScreenVideo, getScreenVideoComments, 
  addScreenVideoComment, togglePinComment, toggleHeartComment, 
  getPlaylists, createPlaylist, addVideoToPlaylist, removeVideoFromPlaylist,
  toggleSubscribeChannel 
} from '@/actions/screen';
import { videoMetadataCache } from '@/lib/videoCache';

// Format helpers
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
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const currentUserId = session?.user ? (session.user as any).id : null;
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null);

  const [video, setVideo] = useState<any>(null);
  const [recommended, setRecommended] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFullDescription, setShowFullDescription] = useState(false);

  // Engagement States
  const [likeStatus, setLikeStatus] = useState<'like' | 'dislike' | null>(null);
  const [likesCount, setLikesCount] = useState(0);
  const [dislikesCount, setDislikesCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [notificationPref, setNotificationPref] = useState<'all' | 'personalized' | 'none'>('all');
  const [showBellDropdown, setShowBellDropdown] = useState(false);

  // Playlists States
  const [showPlaylistDropdown, setShowPlaylistDropdown] = useState(false);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);

  // Video Player custom controls states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [quality, setQuality] = useState('Auto');
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  // Custom gesture overlays
  const [brightness, setBrightness] = useState(100);
  const [showBrightnessSlider, setShowBrightnessSlider] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [doubleTapOverlay, setDoubleTapOverlay] = useState<{ show: boolean; text: string; side: 'left' | 'right' }>({ show: false, text: '', side: 'left' });

  // Comments states
  const [comments, setComments] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyTargetCommentId, setReplyTargetCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [commentSort, setCommentSort] = useState<'relevant' | 'newest'>('relevant');
  
  // AI Suggestions
  const [aiReplies, setAiReplies] = useState<string[]>([]);
  const [isAIFiltering, setIsAIFiltering] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Stream source config: checks direct MP4 first, then builds fallbacks
  const videoSource = video ? (video.mediaUrl || (video.muxPlaybackId ? `https://stream.mux.com/${video.muxPlaybackId}.m3u8` : '')) : '';

  // Video Playback Analytics Tracking
  usePlaybackTracker({
    videoElement: videoRef.current,
    contentId: video?.id || '',
    contentType: 'post',
    trafficSource: 'screen',
    isActive: !loading && !!video,
    isVisible: true,
  });

  // Load details
  useEffect(() => {
    // Try to load from local cache first for instant playback start
    const cached = videoMetadataCache.get(params.id);
    if (cached) {
      setVideo(cached);
      setLikesCount(cached.likesCount || cached.likes || 0);
      setDislikesCount(cached.dislikesCount || 0);
      setLoading(false);
    }

    async function loadVideoDetails() {
      if (!cached) {
        setLoading(true);
      }
      const res = await getScreenVideoDetails(params.id);
      if (res.success && res.video) {
        setVideo(res.video);
        setRecommended(res.recommended || []);
        
        // Populate/update the metadata cache
        videoMetadataCache.set(params.id, res.video);
        
        // Setup initial social counts
        setLikeStatus(res.video.userLikeStatus);
        setLikesCount(res.video.likesCount);
        setDislikesCount(res.video.dislikesCount);
        setIsSubscribed(res.video.isSubscribed);
        setSubscriberCount(res.video.subscriberCount);
      } else {
        if (!cached) {
          alert(res.error || 'Video not found');
          router.push('/screen');
        }
      }
      setLoading(false);
    }
    loadVideoDetails();
  }, [params.id, router]);

  // Load Comments
  const loadComments = async () => {
    const res = await getScreenVideoComments(params.id);
    if (res.success && res.comments) {
      setComments(res.comments);
    }
  };

  useEffect(() => {
    if (video) {
      loadComments();
    }
  }, [video]);

  useEffect(() => {
    if (comments.length === 0) return;
    const commentId = searchParams?.get('commentId');
    const replyId = searchParams?.get('replyId');
    if (commentId) {
      const targetId = replyId || commentId;
      const targetExists = comments.some((c: any) => 
        c.id === targetId || (c.replies && c.replies.some((r: any) => r.id === targetId))
      );

      if (targetExists) {
        setTimeout(() => {
          const el = document.getElementById(`comment-${targetId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightedCommentId(targetId);
            
            setReplyTargetCommentId(commentId);
            setTimeout(() => {
              document.getElementById(`reply-input-${commentId}`)?.focus();
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
  }, [comments, searchParams]);

  // Load Playlists
  const loadUserPlaylists = async () => {
    if (!currentUserId) return;
    const res = await getPlaylists(currentUserId);
    if (res.success && res.playlists) {
      setPlaylists(res.playlists);
    }
  };

  useEffect(() => {
    if (showPlaylistDropdown) {
      loadUserPlaylists();
    }
  }, [showPlaylistDropdown]);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLocked) return;
      // Skip if user is typing in inputs or textareas
      const activeElement = document.activeElement;
      if (activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'm':
          toggleMute();
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 't':
          setIsTheaterMode(prev => !prev);
          break;
        case 'arrowright':
          seek(10);
          break;
        case 'arrowleft':
          seek(-10);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked, isPlaying]);

  // AI suggestions for replies if current user is the creator
  useEffect(() => {
    if (video && currentUserId === video.userId) {
      setAiReplies([
        'Wow, thank you so much! Really appreciate the kind words.',
        'Great question! I will cover this in my upcoming video.',
        'Thanks for watching! Make sure to join the Tolee programming group.'
      ]);
    } else {
      setAiReplies([]);
    }
  }, [video, currentUserId]);

  // HLS Stream Integration (hls.js)
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    let hlsInstance: any = null;
    let isDestroyed = false;
    const playbackId = video?.muxPlaybackId;

    if (playbackId) {
      const hlsUrl = `https://stream.mux.com/${playbackId}.m3u8`;
      
      import('hls.js').then((HlsModule) => {
        if (isDestroyed) return;
        const Hls = HlsModule.default;

        if (Hls.isSupported()) {
          hlsInstance = new Hls();
          hlsInstance.loadSource(hlsUrl);
          hlsInstance.attachMedia(videoElement);
          hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
            if (isPlaying) {
              videoElement.play().catch(e => console.log("Play failed:", e));
            }
          });
        } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
          // Native HLS support (Safari / iOS)
          videoElement.src = hlsUrl;
        }
      }).catch(err => console.error("Error loading hls.js dynamically:", err));
    } else if (videoSource) {
      // Direct MP4 fallback (e.g. simulated videos)
      videoElement.src = videoSource;
    }

    return () => {
      isDestroyed = true;
      if (hlsInstance) {
        hlsInstance.destroy();
      }
      videoElement.src = '';
    };
  }, [video?.muxPlaybackId, videoSource]);

  // Play / Pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(err => console.log(err));
      setIsPlaying(true);
    }
  };

  const seek = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration, videoRef.current.currentTime + seconds));
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const time = parseFloat(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const vol = parseFloat(e.target.value);
    videoRef.current.volume = vol;
    setVolume(vol);
    setIsMuted(vol === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleSpeedChange = (speed: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = speed;
    setPlaybackSpeed(speed);
  };

  const toggleFullscreen = () => {
    const container = document.getElementById('video-player-container');
    if (!container) return;

    if (!isFullscreen) {
      if (container.requestFullscreen) container.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Simulated Brightness drag gesture on Left Half
  const handleBrightnessSwipe = (direction: 'up' | 'down') => {
    setShowBrightnessSlider(true);
    setBrightness(prev => {
      const next = direction === 'up' ? Math.min(100, prev + 5) : Math.max(20, prev - 5);
      return next;
    });
    setTimeout(() => setShowBrightnessSlider(false), 2000);
  };

  // Simulated Volume drag gesture on Right Half
  const handleVolumeSwipe = (direction: 'up' | 'down') => {
    if (!videoRef.current) return;
    setShowVolumeSlider(true);
    setVolume(prev => {
      const next = direction === 'up' ? Math.min(1, prev + 0.05) : Math.max(0, prev - 0.05);
      videoRef.current!.volume = next;
      setIsMuted(next === 0);
      return next;
    });
    setTimeout(() => setShowVolumeSlider(false), 2000);
  };

  // Double Tap Seeking simulation
  const handlePlayerDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isLocked) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left; // x position within element
    const isLeft = x < rect.width / 2;

    if (isLeft) {
      seek(-10);
      setDoubleTapOverlay({ show: true, text: '◀◀ 10s', side: 'left' });
    } else {
      seek(10);
      setDoubleTapOverlay({ show: true, text: '10s ▶▶', side: 'right' });
    }

    setTimeout(() => {
      setDoubleTapOverlay(prev => ({ ...prev, show: false }));
    }, 800);
  };

  // Liking and Disliking video
  const handleLikeToggle = async (isDislike: boolean) => {
    if (!currentUserId) {
      router.push(`/auth/signin?callbackUrl=/screen/watch/${params.id}`);
      return;
    }

    const res = await toggleLikeScreenVideo(params.id, isDislike);
    if (res.success) {
      if (isDislike) {
        if (likeStatus === 'dislike') {
          setLikeStatus(null);
          setDislikesCount(prev => prev - 1);
        } else {
          if (likeStatus === 'like') setLikesCount(prev => prev - 1);
          setLikeStatus('dislike');
          setDislikesCount(prev => prev + 1);
        }
      } else {
        if (likeStatus === 'like') {
          setLikeStatus(null);
          setLikesCount(prev => prev - 1);
        } else {
          if (likeStatus === 'dislike') setDislikesCount(prev => prev - 1);
          setLikeStatus('like');
          setLikesCount(prev => prev + 1);
        }
      }
    }
  };

  // Subscribe channel toggle
  const handleSubscribeToggle = async () => {
    if (!currentUserId) {
      router.push(`/auth/signin?callbackUrl=/screen/watch/${params.id}`);
      return;
    }

    const res = await toggleSubscribeChannel(video.userId, video.id);
    if (res.success) {
      setIsSubscribed(res.subscribed || false);
      setSubscriberCount(prev => res.subscribed ? prev + 1 : prev - 1);
    }
  };

  // Add video to user custom playlist
  const handlePlaylistCheckbox = async (playlistId: string, isChecked: boolean) => {
    if (isChecked) {
      await addVideoToPlaylist(playlistId, video.id);
    } else {
      await removeVideoFromPlaylist(playlistId, video.id);
    }
    loadUserPlaylists();
  };

  // Create playlist and append video
  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    setIsCreatingPlaylist(true);
    const res = await createPlaylist(newPlaylistName, 'public');
    if (res.success && res.playlist) {
      await addVideoToPlaylist(res.playlist.id, video.id);
      setNewPlaylistName('');
      loadUserPlaylists();
    }
    setIsCreatingPlaylist(false);
  };

  // Comment publishers
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    setIsAIFiltering(true);

    // AI Toxicity check
    const toxicKeywords = ['hate', 'spam', 'stupid', 'scam', 'abuse'];
    const textLower = newCommentText.toLowerCase();
    const hasToxicity = toxicKeywords.some(kw => textLower.includes(kw));

    if (hasToxicity) {
      alert('⚠️ AI Moderation Flag: Comment contains potential spam or toxic language and cannot be published.');
      setIsAIFiltering(false);
      return;
    }

    const res = await addScreenVideoComment(video.id, newCommentText);
    if (res.success) {
      setNewCommentText('');
      loadComments();
    }
    setIsAIFiltering(false);
  };

  const handleAddReply = async (e: React.FormEvent, parentId: string) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    const res = await addScreenVideoComment(video.id, replyText, parentId);
    if (res.success) {
      setReplyText('');
      setReplyTargetCommentId(null);
      loadComments();
    }
  };

  // Creator pin comment
  const handlePinToggle = async (commentId: string) => {
    const res = await togglePinComment(commentId);
    if (res.success) {
      loadComments();
    }
  };

  // Creator heart comment
  const handleHeartToggle = async (commentId: string) => {
    const res = await toggleHeartComment(commentId);
    if (res.success) {
      loadComments();
    }
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      alert('📋 Video link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-55 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 pb-16 pt-4 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="mb-4 flex items-center justify-between animate-pulse">
            <div className="w-28 h-4 bg-zinc-200 dark:bg-zinc-850 rounded" />
            <div className="w-20 h-4 bg-zinc-200 dark:bg-zinc-850 rounded" />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Player + details */}
            <div className="lg:col-span-8 space-y-5">
              <div className="aspect-video w-full rounded-3xl bg-zinc-200 dark:bg-zinc-850 animate-pulse" />
              <div className="space-y-3 pt-2">
                <div className="h-6 bg-zinc-200 dark:bg-zinc-850 rounded w-3/4 animate-pulse" />
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-850 animate-pulse" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3.5 bg-zinc-200 dark:bg-zinc-850 rounded w-1/4 animate-pulse" />
                    <div className="h-2.5 bg-zinc-200 dark:bg-zinc-850 rounded w-1/6 animate-pulse" />
                  </div>
                  <div className="w-20 h-8 bg-zinc-200 dark:bg-zinc-850 rounded-xl animate-pulse" />
                </div>
                <div className="h-20 bg-zinc-200 dark:bg-zinc-850 rounded-2xl animate-pulse" />
              </div>
            </div>
            
            {/* Right: Recommendations */}
            <div className="lg:col-span-4 space-y-4">
              <div className="h-5 bg-zinc-200 dark:bg-zinc-850 rounded w-1/3 animate-pulse mb-2" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-32 aspect-video bg-zinc-200 dark:bg-zinc-850 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-3 bg-zinc-200 dark:bg-zinc-850 rounded w-full" />
                    <div className="h-2.5 bg-zinc-200 dark:bg-zinc-850 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!video) return null;

  // Sorted Comments List
  const sortedComments = [...comments].sort((a, b) => {
    if (commentSort === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    // Most Relevant: Pinned first, then likes/newest
    if (a.isPinned && !b.isPinned) return -1;
    if (b.isPinned && !a.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 pb-16 pt-4 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Back Link Header */}
        <div className="mb-4 flex items-center justify-between">
          <Link 
            href="/screen" 
            className="flex items-center gap-1.5 text-xs font-bold text-zinc-550 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Tolee Screen
          </Link>
          
          <div className="flex items-center gap-1 text-teal-600 font-bold tracking-widest text-[10px] uppercase">
            <Tv className="w-4 h-4" />
            Tolee Player
          </div>
        </div>

        {/* Video Player + Detail Section */}
        <div className={`grid grid-cols-1 ${isTheaterMode ? 'lg:grid-cols-12' : 'lg:grid-cols-12'} gap-6 items-start`}>
          
          {/* Left Column: Player, Meta, Comments */}
          <div className={`${isTheaterMode ? 'lg:col-span-12' : 'lg:col-span-8'} space-y-5`}>
            
            {/* Custom Interactive Video Player */}
            <div 
              id="video-player-container"
              onDoubleClick={handlePlayerDoubleClick}
              className="relative aspect-video rounded-3xl overflow-hidden bg-black shadow-2xl border border-zinc-200 dark:border-zinc-900/60 group"
              style={{ filter: `brightness(${brightness}%)` }}
            >
              {videoSource && (
                <video
                  ref={videoRef}
                  autoPlay
                  onClick={togglePlay}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onCanPlay={() => setIsReady(true)}
                  onLoadStart={() => setIsReady(false)}
                  className={`w-full h-full object-contain transition-opacity duration-500 ${isReady ? 'opacity-100' : 'opacity-0'}`}
                />
              )}
              
              <div 
                className={`absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 pointer-events-none transition-opacity duration-500 ${
                  !isReady ? 'opacity-100 z-10' : 'opacity-0 -z-10'
                }`}
              >
                {video?.thumbnailUrl && (
                  <img 
                    src={video.thumbnailUrl} 
                    alt={video.title} 
                    className="absolute inset-0 w-full h-full object-cover opacity-45 filter blur-[2px] scale-105" 
                  />
                )}
                <div className="relative z-10 flex flex-col items-center gap-2 text-white">
                  <div className="w-12 h-12 rounded-full bg-white/20 animate-pulse flex items-center justify-center">
                    <Play className="w-5 h-5 text-white/70 fill-white/20" />
                  </div>
                  <p className="text-[11px] font-bold text-white/60 tracking-wider">PREPARING STREAM...</p>
                </div>
              </div>

              {/* Fading Double Tap Overlay */}
              {doubleTapOverlay.show && (
                <div className={`absolute top-0 bottom-0 ${doubleTapOverlay.side === 'left' ? 'left-0' : 'right-0'} w-1/3 flex items-center justify-center bg-black/20 pointer-events-none transition-all`}>
                  <div className="bg-black/60 px-4 py-3 rounded-full text-xs font-bold text-white flex items-center gap-1 animate-ping">
                    {doubleTapOverlay.text}
                  </div>
                </div>
              )}

              {/* Screen Brightness Swipe Indicator */}
              {showBrightnessSlider && (
                <div className="absolute left-6 top-1/2 transform -translate-y-1/2 bg-black/70 p-3 rounded-2xl flex flex-col items-center gap-2 pointer-events-none">
                  <Sun className="w-4 h-4 text-yellow-500" />
                  <span className="text-[10px] font-bold text-white">{brightness}%</span>
                </div>
              )}

              {/* Volume Swipe Indicator */}
              {showVolumeSlider && (
                <div className="absolute right-6 top-1/2 transform -translate-y-1/2 bg-black/70 p-3 rounded-2xl flex flex-col items-center gap-2 pointer-events-none">
                  <Volume2 className="w-4 h-4 text-teal-500" />
                  <span className="text-[10px] font-bold text-white">{Math.round(volume * 100)}%</span>
                </div>
              )}

              {/* Screen Lock Simulator Overlay */}
              {isLocked && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10 pointer-events-none">
                  <Button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsLocked(false);
                    }}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold pointer-events-auto rounded-xl flex items-center gap-1 text-xs py-3 px-4"
                  >
                    <Unlock className="w-4 h-4" />
                    Unlock Screen
                  </Button>
                </div>
              )}

              {/* Video Controls Bar Overlay */}
              {showControls && !isLocked && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/35 flex flex-col justify-between p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  
                  {/* Top Bar controls */}
                  <div className="flex justify-between items-center">
                    <span className="text-white text-xs font-bold truncate max-w-sm">
                      {video.title}
                    </span>
                    <div className="flex items-center gap-2">
                      {/* Swipe Gestures simulation buttons */}
                      <button 
                        onClick={() => handleBrightnessSwipe('up')}
                        className="p-1.5 rounded-full hover:bg-white/10 text-white"
                        title="Simulate swipe brightness up"
                      >
                        <Sun className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleVolumeSwipe('up')}
                        className="p-1.5 rounded-full hover:bg-white/10 text-white"
                        title="Simulate swipe volume up"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                      
                      <button 
                        onClick={() => setIsLocked(true)}
                        className="p-1.5 rounded-full hover:bg-white/10 text-white"
                        title="Lock screen controls"
                      >
                        <Lock className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Bottom Bar Controls */}
                  <div className="space-y-3">
                    
                    {/* Time Progress slider */}
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] font-mono text-zinc-300 font-bold">
                        {formatDuration(currentTime)}
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={duration || 100}
                        value={currentTime}
                        onChange={handleProgressChange}
                        className="flex-1 accent-teal-500 h-1 rounded bg-white/20 cursor-pointer"
                      />
                      <span className="text-[10px] font-mono text-zinc-300 font-bold">
                        {formatDuration(duration)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      {/* Play/Pause/Seek */}
                      <div className="flex items-center gap-4">
                        <button onClick={togglePlay} className="text-white hover:text-teal-400 transition-colors">
                          {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
                        </button>
                        
                        {/* Volume controls */}
                        <div className="flex items-center gap-1.5">
                          <button onClick={toggleMute} className="text-white hover:text-teal-400 transition-colors">
                            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                          </button>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.1}
                            value={isMuted ? 0 : volume}
                            onChange={handleVolumeChange}
                            className="w-14 accent-teal-550 h-1.5 rounded bg-white/25 cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Display Settings, Theater, Fullscreen */}
                      <div className="flex items-center gap-4">
                        {/* Playback speed Selection */}
                        <div className="flex items-center gap-1 text-[10px] font-bold text-white bg-white/10 rounded-lg px-2 py-1">
                          <span>Speed:</span>
                          <select 
                            value={playbackSpeed}
                            onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                            className="bg-transparent border-none text-white focus:outline-none"
                          >
                            <option value="0.5" className="text-black">0.5x</option>
                            <option value="1" className="text-black">Normal</option>
                            <option value="1.5" className="text-black">1.5x</option>
                            <option value="2" className="text-black">2x</option>
                          </select>
                        </div>

                        {/* Quality selection */}
                        <div className="flex items-center gap-1 text-[10px] font-bold text-white bg-white/10 rounded-lg px-2 py-1">
                          <span>Quality:</span>
                          <select 
                            value={quality}
                            onChange={(e) => setQuality(e.target.value)}
                            className="bg-transparent border-none text-white focus:outline-none"
                          >
                            <option value="Auto" className="text-black">Auto</option>
                            <option value="1080p" className="text-black">1080p</option>
                            <option value="720p" className="text-black">720p</option>
                            <option value="480p" className="text-black">480p</option>
                          </select>
                        </div>

                        {/* Theater Mode toggle */}
                        <button 
                          onClick={() => setIsTheaterMode(!isTheaterMode)}
                          className="text-white hover:text-teal-400 transition-colors hidden md:block"
                          title="Theater Mode"
                        >
                          <Tv className="w-4.5 h-4.5" />
                        </button>

                        {/* Fullscreen */}
                        <button onClick={toggleFullscreen} className="text-white hover:text-teal-400 transition-colors">
                          {isFullscreen ? <Minimize className="w-4.5 h-4.5" /> : <Maximize className="w-4.5 h-4.5" />}
                        </button>
                      </div>

                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Video description and buttons */}
            <div className="space-y-4">
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-zinc-900 dark:text-white leading-tight">
                {video.title}
              </h1>

              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
                
                {/* Views & Timestamp info */}
                <div className="flex items-center gap-2 text-xs text-zinc-550 font-bold">
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
                <div className="flex items-center gap-2 relative">
                  
                  {/* Like/Dislike group button */}
                  <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-850 rounded-2xl overflow-hidden shadow-sm">
                    <button
                      onClick={() => handleLikeToggle(false)}
                      className={`px-4.5 py-2.5 text-xs font-bold flex items-center gap-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all ${
                        likeStatus === 'like' ? 'text-teal-650 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/20' : 'text-zinc-600 dark:text-zinc-300'
                      }`}
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 ${likeStatus === 'like' ? 'fill-teal-605' : ''}`} />
                      {likesCount}
                    </button>
                    <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700" />
                    <button
                      onClick={() => handleLikeToggle(true)}
                      className={`px-3.5 py-2.5 text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all ${
                        likeStatus === 'dislike' ? 'text-red-600 bg-red-50 dark:bg-red-950/20' : 'text-zinc-650 dark:text-zinc-300'
                      }`}
                      title="Dislike video"
                    >
                      <ThumbsDown className={`w-3.5 h-3.5 ${likeStatus === 'dislike' ? 'fill-red-650' : ''}`} />
                    </button>
                  </div>

                  {/* Share button */}
                  <Button
                    onClick={handleShare}
                    variant="outline"
                    className="rounded-2xl px-4 py-2.5 text-xs font-bold flex items-center gap-1 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Share
                  </Button>

                  {/* Playlist Overlay trigger */}
                  <div className="relative">
                    <Button
                      onClick={() => setShowPlaylistDropdown(!showPlaylistDropdown)}
                      variant="outline"
                      className="rounded-2xl px-4 py-2.5 text-xs font-bold flex items-center gap-1 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-600 dark:text-zinc-300"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Save
                    </Button>

                    {showPlaylistDropdown && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setShowPlaylistDropdown(false)} />
                        <div className="absolute right-0 bottom-full mb-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xl z-40 w-60 space-y-3">
                          <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Save to playlist</h4>
                          <div className="flex flex-col gap-2 max-h-36 overflow-y-auto">
                            {playlists.map((pl) => {
                              const containsVideo = pl.videos.some((v: any) => v.id === video.id);
                              return (
                                <label key={pl.id} className="flex items-center gap-2 text-xs font-bold cursor-pointer text-zinc-650 dark:text-zinc-200 hover:text-teal-600 dark:hover:text-teal-400">
                                  <input
                                    type="checkbox"
                                    checked={containsVideo}
                                    onChange={(e) => handlePlaylistCheckbox(pl.id, e.target.checked)}
                                    className="rounded border-zinc-300 dark:border-zinc-800 text-teal-500 focus:ring-teal-500 w-3.5 h-3.5"
                                  />
                                  {pl.name}
                                  <span className="text-[9px] text-zinc-450 uppercase font-semibold">({pl.visibility})</span>
                                </label>
                              );
                            })}
                          </div>
                          
                          {/* Create Playlist small Form */}
                          <form onSubmit={handleCreatePlaylist} className="border-t border-zinc-150 dark:border-zinc-800 pt-3 flex gap-2">
                            <input
                              type="text"
                              required
                              placeholder="New playlist name..."
                              value={newPlaylistName}
                              onChange={(e) => setNewPlaylistName(e.target.value)}
                              className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-lg px-2 py-1 text-[10px] focus:outline-none focus:border-teal-500"
                            />
                            <Button 
                              type="submit" 
                              disabled={isCreatingPlaylist}
                              className="bg-teal-600 text-white rounded-lg p-1 hover:bg-teal-700"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </Button>
                          </form>
                        </div>
                      </>
                    )}
                  </div>

                </div>
              </div>
            </div>

            {/* Creator details card with social subscriptions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 p-4.5 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3">
                <Avatar className="w-11 h-11 border border-zinc-200 dark:border-zinc-800">
                  <AvatarImage src={video.user.avatar} />
                  <AvatarFallback className="bg-zinc-200 dark:bg-zinc-800 text-sm font-bold text-teal-600">
                    {video.user.name[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xs.5 font-bold text-zinc-900 dark:text-white leading-tight flex items-center gap-1">
                    {video.user.name}
                    {video.user.isVerified && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 fill-teal-500/10" />
                    )}
                  </h3>
                  <p className="text-[10px] text-zinc-400 font-semibold mt-0.5">
                    {subscriberCount.toLocaleString()} subscribers
                  </p>
                </div>
              </div>

              {/* Subscribe button + Notifications dropdown */}
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleSubscribeToggle}
                  className={`font-bold rounded-xl text-xs py-4.5 px-5.5 transform active:scale-95 transition-all ${
                    isSubscribed 
                      ? 'bg-zinc-150 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200' 
                      : 'bg-zinc-950 hover:bg-zinc-850 dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-950 text-white'
                  }`}
                >
                  {isSubscribed ? 'Subscribed' : 'Subscribe'}
                </Button>

                {isSubscribed && (
                  <div className="relative">
                    <Button 
                      onClick={() => setShowBellDropdown(!showBellDropdown)}
                      variant="outline" 
                      className="p-3 rounded-xl border-zinc-200 dark:border-zinc-800 text-zinc-550"
                    >
                      <Bell className="w-4 h-4" />
                      <ChevronDown className="w-3 h-3 ml-0.5" />
                    </Button>

                    {showBellDropdown && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setShowBellDropdown(false)} />
                        <div className="absolute right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 shadow-xl z-40 w-44 flex flex-col gap-1">
                          <button
                            onClick={() => { setNotificationPref('all'); setShowBellDropdown(false); }}
                            className={`w-full text-left text-xs font-semibold px-3 py-2 rounded-lg flex items-center justify-between ${notificationPref === 'all' ? 'bg-teal-50 dark:bg-teal-950/20 text-teal-650' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                          >
                            <span>🔔 All notifications</span>
                            {notificationPref === 'all' && <Check className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => { setNotificationPref('personalized'); setShowBellDropdown(false); }}
                            className={`w-full text-left text-xs font-semibold px-3 py-2 rounded-lg flex items-center justify-between ${notificationPref === 'personalized' ? 'bg-teal-50 dark:bg-teal-950/20 text-teal-650' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                          >
                            <span>👤 Personalized</span>
                            {notificationPref === 'personalized' && <Check className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => { setNotificationPref('none'); setShowBellDropdown(false); }}
                            className={`w-full text-left text-xs font-semibold px-3 py-2 rounded-lg flex items-center justify-between ${notificationPref === 'none' ? 'bg-teal-50 dark:bg-teal-950/20 text-teal-650' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                          >
                            <span>🔕 None</span>
                            {notificationPref === 'none' && <Check className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Expandable description box */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 p-4.5 rounded-2xl shadow-sm space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Description details</h4>
              <p className={`text-xs text-zinc-650 dark:text-zinc-300 leading-relaxed font-medium whitespace-pre-wrap ${
                !showFullDescription && video.description && video.description.length > 200 ? 'line-clamp-3' : ''
              }`}>
                {video.description || 'No description provided for this video.'}
              </p>
              
              {video.description && video.description.length > 200 && (
                <button
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="text-xs font-bold text-teal-600 hover:text-teal-700 transition-colors mt-1 block"
                >
                  {showFullDescription ? 'Show Less' : 'Read More'}
                </button>
              )}
            </div>

            {/* Nested Comments system */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-teal-500" />
                  Comments ({comments.length})
                </h3>
                
                {/* Sort selection */}
                <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-500">
                  <span>Sort by:</span>
                  <select 
                    value={commentSort}
                    onChange={(e: any) => setCommentSort(e.target.value)}
                    className="bg-transparent border-none text-zinc-700 dark:text-zinc-200 font-bold focus:outline-none"
                  >
                    <option value="relevant">Most Relevant</option>
                    <option value="newest">Newest</option>
                  </select>
                </div>
              </div>

              {/* AI Suggested Replies panel (if creator is viewing) */}
              {currentUserId === video.userId && aiReplies.length > 0 && (
                <div className="bg-teal-50 dark:bg-teal-950/20 border border-teal-500/15 rounded-2xl p-4.5 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-teal-650 dark:text-teal-400 font-bold text-[10px] uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    Creator studio: AI Suggested replies
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {aiReplies.map((replyText, i) => (
                      <button
                        key={i}
                        onClick={() => setNewCommentText(replyText)}
                        className="bg-white dark:bg-zinc-900 border border-teal-500/20 hover:border-teal-500/50 text-left text-xs font-medium text-zinc-700 dark:text-zinc-300 px-3 py-2 rounded-xl transition-all shadow-sm"
                      >
                        {replyText}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Add comment Form */}
              <form onSubmit={handleAddComment} className="flex gap-3">
                <Avatar className="w-9 h-9 border border-zinc-200 dark:border-zinc-800">
                  <AvatarImage src={session?.user?.image || undefined} />
                  <AvatarFallback className="bg-zinc-200 dark:bg-zinc-800 text-xs font-bold text-teal-600">
                    U
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    required
                    placeholder="Add a public comment..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="w-full pl-3 pr-12 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs placeholder-zinc-400 focus:outline-none focus:border-teal-500"
                  />
                  <button 
                    type="submit" 
                    disabled={isAIFiltering}
                    className="absolute right-2.5 top-1/2 transform -translate-y-1/2 p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-850 text-teal-600 disabled:opacity-50"
                  >
                    {isAIFiltering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </form>

              {/* Comments list threads */}
              <div className="space-y-4.5 pt-2">
                {sortedComments.map((comment) => {
                  const isCreatorComment = comment.userId === video.userId;
                  const isReplyFormOpen = replyTargetCommentId === comment.id;

                  return (
                    <div 
                      key={comment.id} 
                      id={`comment-${comment.id}`}
                      className={`space-y-3 border-b border-zinc-150 dark:border-zinc-900 pb-3 transition-all duration-500 rounded-xl p-2 ${
                        highlightedCommentId === comment.id 
                          ? 'bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-250/30 dark:border-yellow-900/30 scale-102 shadow-sm animate-pulse' 
                          : ''
                      }`}
                    >
                      
                      {/* Top comment detail */}
                      <div className="flex gap-3">
                        <Avatar className="w-9 h-9 border border-zinc-200 dark:border-zinc-800">
                          <AvatarImage src={comment.user.avatar} />
                          <AvatarFallback className="bg-zinc-200 dark:bg-zinc-800 text-xs font-bold text-teal-600">
                            {comment.user.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0 space-y-1">
                          
                          {/* Username, tags, pinned status */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-200">
                              {comment.user.name}
                            </span>
                            {isCreatorComment && (
                              <span className="bg-teal-500/10 text-teal-600 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded">
                                Creator
                              </span>
                            )}
                            <span className="text-[10px] text-zinc-400 font-semibold">
                              {formatTimeAgo(comment.createdAt)}
                            </span>

                            {comment.isPinned && (
                              <span className="flex items-center gap-0.5 text-[9px] font-bold text-teal-600">
                                <Pin className="w-3 h-3 rotate-45" />
                                Pinned
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-zinc-650 dark:text-zinc-300 font-medium leading-relaxed">
                            {comment.text}
                          </p>

                          {/* Action icons (Likes, reply, pin/heart buttons for creator) */}
                          <div className="flex items-center gap-4 pt-1 text-zinc-450">
                            <button 
                              className="flex items-center gap-1 text-[10px] font-bold hover:text-teal-650 transition-colors"
                              title="Like comment"
                            >
                              <ThumbsUp className="w-3 h-3" />
                              <span>2</span>
                            </button>

                            <button
                              onClick={() => setReplyTargetCommentId(isReplyFormOpen ? null : comment.id)}
                              className="text-[10px] font-bold hover:text-teal-650 transition-colors"
                            >
                              Reply
                            </button>

                            {/* Creator special moderation tool buttons */}
                            {currentUserId === video.userId && (
                              <div className="flex items-center gap-2 pl-2 border-l border-zinc-250 dark:border-zinc-800">
                                <button
                                  onClick={() => handlePinToggle(comment.id)}
                                  className={`p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${comment.isPinned ? 'text-teal-605' : ''}`}
                                  title="Pin comment"
                                >
                                  <Pin className="w-3.5 h-3.5 rotate-45" />
                                </button>
                                <button
                                  onClick={() => handleHeartToggle(comment.id)}
                                  className={`p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${comment.isHearted ? 'text-red-550' : ''}`}
                                  title="Heart comment"
                                >
                                  <Heart className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            {/* Show Creator heart visual */}
                            {comment.isHearted && (
                              <span className="flex items-center gap-0.5 text-[9px] text-red-500 font-bold bg-red-50 dark:bg-red-950/20 px-1.5 py-0.5 rounded-lg">
                                <Heart className="w-3 h-3 fill-red-500" />
                                Hearted by Creator
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Comment replies list */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="pl-12 space-y-3">
                          {comment.replies.map((reply: any) => (
                            <div 
                              key={reply.id} 
                              id={`comment-${reply.id}`}
                              className={`flex gap-2.5 transition-all duration-500 rounded-xl p-1.5 ${
                                highlightedCommentId === reply.id 
                                  ? 'bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-250/30 dark:border-yellow-900/30 scale-102 shadow-sm animate-pulse' 
                                  : ''
                              }`}
                            >
                              <Avatar className="w-7 h-7 border border-zinc-200 dark:border-zinc-800">
                                <AvatarImage src={reply.user.avatar} />
                                <AvatarFallback className="bg-zinc-200 dark:bg-zinc-800 text-[10px] font-bold text-teal-600">
                                  {reply.user.name[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0 space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-200">{reply.user.name}</span>
                                  {reply.userId === video.userId && (
                                    <span className="bg-teal-500/10 text-teal-600 text-[7px] font-black uppercase tracking-wider px-1 py-0.2 rounded">Creator</span>
                                  )}
                                  <span className="text-[9px] text-zinc-400 font-semibold">{formatTimeAgo(reply.createdAt)}</span>
                                </div>
                                <p className="text-xs text-zinc-650 dark:text-zinc-300 font-medium leading-relaxed">
                                  {reply.text}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply form dropdown */}
                      {isReplyFormOpen && (
                        <form 
                          onSubmit={(e) => handleAddReply(e, comment.id)} 
                          className="pl-12 flex gap-2"
                        >
                          <input
                            id={`reply-input-${comment.id}`}
                            type="text"
                            required
                            placeholder="Write a reply..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-teal-500"
                          />
                          <Button 
                            type="submit" 
                            className="bg-teal-600 text-white font-bold rounded-xl text-xs py-2 px-4 hover:bg-teal-700"
                          >
                            Reply
                          </Button>
                          <Button 
                            type="button" 
                            onClick={() => setReplyTargetCommentId(null)}
                            variant="outline" 
                            className="rounded-xl text-xs"
                          >
                            Cancel
                          </Button>
                        </form>
                      )}

                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Column: Up Next Recommended Videos */}
          <div className={`${isTheaterMode ? 'lg:col-span-12' : 'lg:col-span-4'} space-y-4`}>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2 px-1">
              Up Next
            </h3>

            {recommended.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-850 rounded-2xl text-zinc-500 text-xs p-4 leading-relaxed font-semibold">
                No recommended videos right now. Try uploading more videos!
              </div>
            ) : (
              <div className={`grid ${isTheaterMode ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'} gap-4`}>
                {recommended.map((item) => (
                  <Link 
                    href={`/screen/watch/${item.id}`} 
                    key={item.id} 
                    className="flex gap-3 group cursor-pointer bg-white dark:bg-zinc-900/20 hover:bg-white dark:hover:bg-zinc-900 p-2 rounded-xl border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800/80 transition-all shadow-sm"
                  >
                    {/* Left side: Thumbnail */}
                    <div className="relative w-32 aspect-video rounded-lg overflow-hidden bg-zinc-200 dark:bg-zinc-800 flex-shrink-0 border border-zinc-200/40 dark:border-zinc-800/50">
                      {item.thumbnailUrl ? (
                        <img 
                          src={item.thumbnailUrl}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-200"
                        />
                      ) : item.muxPlaybackId ? (
                        <img 
                          src={`https://image.mux.com/${item.muxPlaybackId}/thumbnail.png?width=320&height=180&fit_mode=smartcrop`}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Tv className="w-5 h-5 text-zinc-400" />
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
                      <h4 className="font-bold text-[11px] text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug group-hover:text-teal-605 dark:group-hover:text-teal-400 transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-[9px] text-zinc-500 font-bold mt-0.5 truncate flex items-center gap-0.5">
                        {item.user.name}
                        {item.user.isVerified && <CheckCircle2 className="w-3 h-3 text-teal-500 fill-teal-500/10" />}
                      </p>
                      <div className="flex items-center gap-1 text-[8px] text-zinc-400 mt-0.5 font-semibold">
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
