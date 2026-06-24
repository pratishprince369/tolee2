'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  Tv, BarChart3, Video, FileVideo, PlusCircle, CheckCircle2, AlertCircle, 
  Trash2, ArrowUpRight, Globe, Users, Monitor, Sparkles, Wand2, Paintbrush, 
  ArrowRight, Eye, ThumbsUp, DollarSign, Clock, HelpCircle, Layers, Upload,
  Settings, ChevronRight, MessageSquare, AlertTriangle, ArrowLeft, Heart, Info, Play,
  Loader2, Camera, FolderOpen, Languages, Share2, Plus, Search, Image as ImageIcon,
  FileText, Check, X, ChevronLeft, Lock, Unlock, Calendar, MapPin, UserPlus,
  Link2, Tag, PlayCircle, Download, Scissors, Volume2, ShieldAlert, Copy, Save,
  Undo, Pause, RefreshCw, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  getCreatorAnalytics, getCreatorVideos, createMuxDirectUpload, 
  saveScreenVideo, saveSimulatedScreenVideo,
  getPlaylists, createPlaylist, addVideoToPlaylist,
  getCreatorComments, togglePinComment, toggleHeartComment,
  checkMuxUploadStatus
} from '@/actions/screen';

const VIDEO_CATEGORIES = [
  'Recommended', 'Trending', 'Latest', 'Subscriptions',
  'Technology', 'Business', 'Education', 'Gaming', 'Comedy',
  'Entertainment', 'Music', 'Movies', 'News', 'Sports',
  'Health', 'Fashion', 'Finance', 'Real Estate', 'AI',
  'Programming', 'Travel', 'Food', 'Podcasts', 'Kids', 'Live'
];

// High-quality mock tech/finance images for AI thumbnails
const MOCK_THUMBNAIL_TEMPLATES = [
  'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=640&q=80', // Tech circuit
  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=640&q=80', // Matrix code
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=640&q=80', // Analytics chart
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=640&q=80', // Modern abstract
  'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=640&q=80'  // Gamer setup
];

export default function CreatorStudioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const { data: session, status } = useSession();
  const currentUserId = session?.user ? (session.user as any).id : null;

  const [activeTab, setActiveTab] = useState<'dashboard' | 'content' | 'analytics' | 'community' | 'upload'>('dashboard');
  
  // Comments state
  const [creatorComments, setCreatorComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  
  // Analytics State
  const [metrics, setMetrics] = useState<any>({
    videosCount: 0,
    subscriberCount: 0,
    totalViews: 0,
    totalLikes: 0,
    estimatedRevenue: 0,
    watchTime: 0,
    rpm: 2.45,
    cpm: 4.12
  });

  // Videos List State
  const [creatorVideos, setCreatorVideos] = useState<any[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [dragActive, setDragActive] = useState(false);
  const [hasDraftBanner, setHasDraftBanner] = useState(false);

  // Upload Studio Form States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Technology');
  const [visibility, setVisibility] = useState('public');
  const [tags, setTags] = useState('nextjs, programming, tutorial');
  const [hashtags, setHashtags] = useState('#NextJS #WebDev');
  const [language, setLanguage] = useState('English');
  const [location, setLocation] = useState('Delhi, India');
  const [recordingDate, setRecordingDate] = useState(new Date().toISOString().split('T')[0]);
  const [mentionPeople, setMentionPeople] = useState('');
  const [externalLink, setExternalLink] = useState('');
  const [productTag, setProductTag] = useState('');
  const [isMadeForKids, setIsMadeForKids] = useState<'yes' | 'no' | null>(null);

  // Playlist management states
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [selectedPlaylists, setSelectedPlaylists] = useState<string[]>([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistVisibility, setNewPlaylistVisibility] = useState('public');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);

  // Monetization & Settings states
  const [enableMonetization, setEnableMonetization] = useState(false);
  const [commentPolicy, setCommentPolicy] = useState<'allow' | 'hold' | 'disable'>('allow');
  const [allowLikes, setAllowLikes] = useState(true);
  const [hideLikeCount, setHideLikeCount] = useState(false);
  const [allowShares, setAllowShares] = useState(true);
  const [allowDownload, setAllowDownload] = useState(true);
  const [allowRemix, setAllowRemix] = useState(true);
  const [allowDuet, setAllowDuet] = useState(false); // Future Ready

  // Subtitles states
  const [subtitleSource, setSubtitleSource] = useState<'none' | 'srt' | 'auto' | 'manual'>('none');
  const [uploadedSrtName, setUploadedSrtName] = useState('');
  const [manualSubtitles, setManualSubtitles] = useState('');
  const [subtitleTranslations, setSubtitleTranslations] = useState<string[]>([]);

  // Schedule settings
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleTimezone, setScheduleTimezone] = useState('UTC');

  // File Upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'done' | 'error'>('idle');
  const [muxUploadId, setMuxUploadId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSimulatedUpload, setIsSimulatedUpload] = useState(false); // Default to real upload for production usage
  const [isReel, setIsReel] = useState(false);

  // Chunk upload simulation state
  const [uploadSpeed, setUploadSpeed] = useState('0 KB/s');
  const [uploadTimeRemaining, setUploadTimeRemaining] = useState('');
  const [uploadPaused, setUploadPaused] = useState(false);
  const [uploadCanceled, setUploadCanceled] = useState(false);
  const [chunkProgress, setChunkProgress] = useState({ current: 0, total: 4 });

  // Thumbnail states
  const [thumbnailSource, setThumbnailSource] = useState<'auto' | 'custom' | 'ai'>('auto');
  const [autoFrames, setAutoFrames] = useState<string[]>([]);
  const [customThumbnailFile, setCustomThumbnailFile] = useState<File | null>(null);
  const [customThumbnailUrl, setCustomThumbnailUrl] = useState('');
  const [aiThumbnails, setAiThumbnails] = useState<string[]>([]);
  const [selectedThumbnailUrl, setSelectedThumbnailUrl] = useState('');
  const [isThumbnailConfirmed, setIsThumbnailConfirmed] = useState(false);

  // Thumbnail Editor options
  const [editorText, setEditorText] = useState('NEXT-GEN BUILD!');
  const [editorColor, setEditorColor] = useState('#14b8a6');
  const [editorTextSize, setEditorTextSize] = useState<'text-[11px]' | 'text-[14px]' | 'text-[18px]' | 'text-[22px]'>('text-[14px]');
  const [editorTextFont, setEditorTextFont] = useState<'font-sans' | 'font-serif' | 'font-mono'>('font-sans');
  const [editorEmoji, setEditorEmoji] = useState('🔥');
  const [editorHasArrow, setEditorHasArrow] = useState(true);
  const [editorArrowDirection, setEditorArrowDirection] = useState<'↙️' | '↘️' | '⬇️' | '➡️' | '⬅️' | '⬆️' | '↗️' | '↖️'>('↙️');
  const [editorArrowSize, setEditorArrowSize] = useState<'text-2xl' | 'text-3xl' | 'text-4xl' | 'text-5xl'>('text-4xl');
  const [editorArrowColor, setEditorArrowColor] = useState('#e11d48');
  const [editorShape, setEditorShape] = useState<'none' | 'circle' | 'rectangle' | 'star'>('none');
  const [editorShapeColor, setEditorShapeColor] = useState<string>('#e11d48');
  const [editorShapeOpacity, setEditorShapeOpacity] = useState<number>(50);
  const [editorAspectRatio, setEditorAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [editorFilter, setEditorFilter] = useState<'none' | 'cyber' | 'warm' | 'cold'>('cyber');
  const [editorBlur, setEditorBlur] = useState(false);
  const [editorBrightness, setEditorBrightness] = useState(100);
  const [editorContrast, setEditorContrast] = useState(100);
  const [editorScale, setEditorScale] = useState(100);

  // AI Suggestion & SEO score states
  const [aiScore, setAiScore] = useState(65);
  const [hasAppliedAISuggestions, setHasAppliedAISuggestions] = useState(false);
  const [seoAnalysis, setSeoAnalysis] = useState<any>({
    score: 65,
    suggestions: [
      'Add target keywords to video title',
      'Provide detailed description with chapters',
      'Create custom high-impact thumbnail to improve CTR',
      'Mention related creators and choose relevant tags'
    ]
  });
  const [searchGroupQuery, setSearchGroupQuery] = useState('');
  const [recommendedGroups, setRecommendedGroups] = useState([
    { id: 'g1', name: 'Next.js Developers', members: 1250, selected: false },
    { id: 'g2', name: 'Web Development Mastery', members: 850, selected: false },
    { id: 'g3', name: 'AI & Machine Learning Hub', members: 2100, selected: false },
    { id: 'g4', name: 'UI/UX Design Guild', members: 450, selected: false },
    { id: 'g5', name: 'Tolee Creators Group', members: 3400, selected: false }
  ]);

  // Notifications toggles
  const [notifications, setNotifications] = useState({
    followers: true,
    subscribers: true,
    groups: true,
    push: true
  });

  // Copyright scan and processing status
  const [copyrightScan, setCopyrightScan] = useState<any>({
    status: 'idle', // 'idle' | 'scanning' | 'done'
    duplicateVideo: 'safe',
    duplicateAudio: 'safe',
    copyrightMusic: 'safe',
    duplicateThumbnail: 'safe',
    duplicateDescription: 'safe'
  });

  const [processingStatus, setProcessingStatus] = useState({
    sd: false,
    hd: false,
    fhd: false,
    qhd: false,
    uhd: false,
    estTime: 'Calculating...'
  });

  // Preview tab state
  const [activePreviewTab, setActivePreviewTab] = useState<'feed' | 'reels' | 'screen' | 'profile' | 'group'>('screen');
  const [savedVideoId, setSavedVideoId] = useState('');

  // Mocks templates
  const MOCK_THUMBNAIL_TEMPLATES = [
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=640&q=80', // Tech circuit
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=640&q=80', // Matrix code
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=640&q=80', // Analytics chart
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=640&q=80', // Modern abstract
    'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=640&q=80'  // Gamer setup
  ];

  const uploadTimerRef = useRef<NodeJS.Timeout | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  // Load Initial Studio Data
  const loadStudioData = async () => {
    if (!currentUserId) return;
    
    // Fetch dashboard metrics
    const analRes = await getCreatorAnalytics();
    if (analRes.success && analRes.metrics) {
      setMetrics(analRes.metrics);
    }

    // Fetch video listings
    setLoadingVideos(true);
    const vidRes = await getCreatorVideos();
    if (vidRes.success && vidRes.videos) {
      setCreatorVideos(vidRes.videos);
    }
    setLoadingVideos(false);

    // Fetch user playlists
    const playRes = await getPlaylists();
    if (playRes.success && playRes.playlists) {
      setPlaylists(playRes.playlists);
    }

    // Fetch creator comments
    setLoadingComments(true);
    const commRes = await getCreatorComments();
    if (commRes.success && commRes.comments) {
      setCreatorComments(commRes.comments);
    }
    setLoadingComments(false);
  };

  const handleTabChange = (tab: 'dashboard' | 'content' | 'analytics' | 'community' | 'upload') => {
    setActiveTab(tab);
    router.push(`/screen/studio?tab=${tab}`);
  };

  useEffect(() => {
    if (tabParam === 'upload' || tabParam === 'content' || tabParam === 'dashboard' || tabParam === 'analytics' || tabParam === 'community') {
      setActiveTab(tabParam as any);
    }
  }, [tabParam]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/auth/signin?callbackUrl=/screen/studio`);
    } else if (status === 'authenticated') {
      loadStudioData();
    }
  }, [status]);

  // Search local storage for drafts on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedDraft = localStorage.getItem('tolee_upload_draft');
      if (savedDraft) {
        setHasDraftBanner(true);
      }
    }
  }, []);

  // Auto-save drafts every 30 seconds
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const interval = setInterval(() => {
      if (title.trim() || selectedFile) {
        const draftObj = {
          title,
          description,
          category,
          visibility,
          tags,
          location,
          hashtags,
          language,
          recordingDate,
          mentionPeople,
          externalLink,
          productTag,
          isMadeForKids,
          enableMonetization,
          commentPolicy,
          allowLikes,
          hideLikeCount,
          allowShares,
          allowRemix,
          allowDuet,
          scheduleEnabled,
          scheduleDate,
          scheduleTime,
          scheduleTimezone,
          notifications
        };
        localStorage.setItem('tolee_upload_draft', JSON.stringify(draftObj));
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [
    title, description, category, visibility, tags, location, hashtags, language,
    recordingDate, mentionPeople, externalLink, productTag, isMadeForKids,
    enableMonetization, commentPolicy, allowLikes, hideLikeCount, allowShares,
    allowRemix, allowDuet, scheduleEnabled, scheduleDate, scheduleTime,
    scheduleTimezone, notifications, selectedFile
  ]);

  const restoreDraft = () => {
    try {
      const savedDraft = localStorage.getItem('tolee_upload_draft');
      if (savedDraft) {
        const d = JSON.parse(savedDraft);
        if (d.title) setTitle(d.title);
        if (d.description) setDescription(d.description);
        if (d.category) setCategory(d.category);
        if (d.visibility) setVisibility(d.visibility);
        if (d.tags) setTags(d.tags);
        if (d.location) setLocation(d.location);
        if (d.hashtags) setHashtags(d.hashtags);
        if (d.language) setLanguage(d.language);
        if (d.recordingDate) setRecordingDate(d.recordingDate);
        if (d.mentionPeople) setMentionPeople(d.mentionPeople);
        if (d.externalLink) setExternalLink(d.externalLink);
        if (d.productTag) setProductTag(d.productTag);
        if (d.isMadeForKids) setIsMadeForKids(d.isMadeForKids);
        if (d.enableMonetization !== undefined) setEnableMonetization(d.enableMonetization);
        if (d.commentPolicy) setCommentPolicy(d.commentPolicy);
        if (d.allowLikes !== undefined) setAllowLikes(d.allowLikes);
        if (d.hideLikeCount !== undefined) setHideLikeCount(d.hideLikeCount);
        if (d.allowShares !== undefined) setAllowShares(d.allowShares);
        if (d.allowRemix !== undefined) setAllowRemix(d.allowRemix);
        if (d.allowDuet !== undefined) setAllowDuet(d.allowDuet);
        if (d.scheduleEnabled !== undefined) setScheduleEnabled(d.scheduleEnabled);
        if (d.scheduleDate) setScheduleDate(d.scheduleDate);
        if (d.scheduleTime) setScheduleTime(d.scheduleTime);
        if (d.scheduleTimezone) setScheduleTimezone(d.scheduleTimezone);
        if (d.notifications) setNotifications(d.notifications);
        setCurrentStep(2); // Auto advance to details tab once draft is loaded
      }
    } catch (e) {
      console.error('Failed to restore draft', e);
    }
    setHasDraftBanner(false);
  };

  const discardDraft = () => {
    localStorage.removeItem('tolee_upload_draft');
    setHasDraftBanner(false);
  };

  // Unified select and drag file validation helper
  const processSelectedFile = (file: File) => {
    // Check extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowed = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
    if (!extension || !allowed.includes(extension)) {
      alert(`Invalid format. Please select one of the allowed video formats: ${allowed.join(', ')}`);
      return;
    }

    setSelectedFile(file);
    const objUrl = URL.createObjectURL(file);
    setVideoPreviewUrl(objUrl);

    // Setup auto-generated frames mocks (from unsplash to look distinct)
    const mockFrames = [
      'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=640&q=80',
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=640&q=80',
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=640&q=80',
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=640&q=80',
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=640&q=80'
    ];
    setAutoFrames(mockFrames);
    setSelectedThumbnailUrl(mockFrames[0]);

    // Parse aspect ratio from file metadata
    const videoEl = document.createElement('video');
    videoEl.src = objUrl;
    videoEl.onloadedmetadata = () => {
      const isVertical = videoEl.videoHeight > videoEl.videoWidth;
      setIsReel(isVertical);
      // Auto fill title if empty
      if (!title) {
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        setTitle(baseName.substring(0, 80));
      }
    };
    
    // Progress to Step 2
    setCurrentStep(2);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  // Thumbnail Custom Upload handler
  const handleCustomThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCustomThumbnailFile(file);
      const url = URL.createObjectURL(file);
      setCustomThumbnailUrl(url);
      setSelectedThumbnailUrl(url);
      setThumbnailSource('custom');
      setIsThumbnailConfirmed(false);
    }
  };

  // Simulated Chunked Upload
  const startSimulatedUpload = () => {
    if (!title.trim()) {
      alert('Please fill out the Title first so we can analyze it!');
      return;
    }
    setUploadStatus('uploading');
    setUploadPaused(false);
    setUploadCanceled(false);
    
    // We will simulate 4 chunks of 5MB each (Total 20MB)
    const runUploadTick = () => {
      uploadTimerRef.current = setTimeout(() => {
        setChunkProgress((prev) => {
          const nextChunk = prev.current + 1;
          const totalChunks = prev.total;
          
          if (nextChunk > totalChunks) {
            setUploadProgress(100);
            setUploadStatus('processing');
            
            // Set resolution ready times
            setProcessingStatus({
              sd: true,
              hd: false,
              fhd: false,
              qhd: false,
              uhd: false,
              estTime: '2 minutes'
            });

            setTimeout(() => {
              setProcessingStatus(p => ({ ...p, hd: true, estTime: '1 minute' }));
              
              setCopyrightScan({
                status: 'scanning',
                duplicateVideo: 'safe',
                duplicateAudio: 'safe',
                copyrightMusic: 'safe',
                duplicateThumbnail: 'safe',
                duplicateDescription: 'safe'
              });

              setTimeout(() => {
                setCopyrightScan({
                  status: 'done',
                  duplicateVideo: 'safe',
                  duplicateAudio: 'safe',
                  copyrightMusic: 'safe',
                  duplicateThumbnail: 'safe',
                  duplicateDescription: 'safe'
                });
                setProcessingStatus(p => ({ ...p, fhd: true, estTime: 'Ready' }));
                setUploadStatus('done');
                localStorage.removeItem('tolee_upload_draft');
              }, 2000);

            }, 2000);
            
            return prev;
          }
          
          const speed = (Math.random() * 2.7 + 1.5).toFixed(1);
          setUploadSpeed(`${speed} MB/s`);
          const remainingSecs = Math.max(1, Math.round(((totalChunks - nextChunk) * 5) / parseFloat(speed)));
          setUploadTimeRemaining(`${remainingSecs} seconds`);
          setUploadProgress(Math.round((nextChunk / totalChunks) * 100));
          
          runUploadTick();
          return { ...prev, current: nextChunk };
        });
      }, 1000);
    };

    runUploadTick();
  };

  const pauseSimulatedUpload = () => {
    setUploadPaused(true);
    setUploadSpeed('0 KB/s');
    setUploadTimeRemaining('Paused');
    if (uploadTimerRef.current) {
      clearTimeout(uploadTimerRef.current);
    }
  };

  const resumeSimulatedUpload = () => {
    setUploadPaused(false);
    const runUploadTick = () => {
      uploadTimerRef.current = setTimeout(() => {
        setChunkProgress((prev) => {
          const nextChunk = prev.current + 1;
          const totalChunks = prev.total;
          
          if (nextChunk > totalChunks) {
            setUploadProgress(100);
            setUploadStatus('processing');
            setTimeout(() => {
              setUploadStatus('done');
              localStorage.removeItem('tolee_upload_draft');
            }, 2000);
            return prev;
          }
          const speed = (Math.random() * 2.7 + 1.5).toFixed(1);
          setUploadSpeed(`${speed} MB/s`);
          const remainingSecs = Math.max(1, Math.round(((totalChunks - nextChunk) * 5) / parseFloat(speed)));
          setUploadTimeRemaining(`${remainingSecs} seconds`);
          setUploadProgress(Math.round((nextChunk / totalChunks) * 100));
          runUploadTick();
          return { ...prev, current: nextChunk };
        });
      }, 1000);
    };
    runUploadTick();
  };

  const cancelSimulatedUpload = () => {
    setUploadCanceled(true);
    setUploadStatus('idle');
    setUploadProgress(0);
    setChunkProgress({ current: 0, total: 4 });
    setUploadSpeed('0 KB/s');
    setUploadTimeRemaining('');
    if (uploadTimerRef.current) {
      clearTimeout(uploadTimerRef.current);
    }
  };

  // Real Direct Mux Upload flow
  const triggerRealMuxUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploadStatus('uploading');
      setUploadProgress(0);
      setErrorMessage('');

      const res = await createMuxDirectUpload();
      if (!res.success || !res.url || !res.uploadId) {
        throw new Error(res.error || 'Failed to request upload signature.');
      }

      setMuxUploadId(res.uploadId);

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      xhr.open('PUT', res.url);
      xhr.setRequestHeader('Content-Type', selectedFile.type);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
          const speedMB = (event.loaded / (1024 * 1024) / 2).toFixed(1); // Rough estimate
          setUploadSpeed(`${speedMB} MB/s`);
        }
      };

      const uploadPromise = new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload status error: ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error('Network connection failed.'));
      });

      xhr.send(selectedFile);
      await uploadPromise;

      setUploadStatus('processing');
      
      // Client-side polling for Mux to process the upload and assign an asset_id
      let assetId = null;
      let retries = 0;
      const maxRetries = 20; // 20 retries * 2.5s = 50 seconds max
      
      while (!assetId && retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2500));
        const statusRes = await checkMuxUploadStatus(res.uploadId);
        if (statusRes.success) {
          if (statusRes.assetId) {
            assetId = statusRes.assetId;
            break;
          }
          if (statusRes.status === 'errored') {
            throw new Error('Mux video processing failed on Mux servers.');
          }
        }
        retries++;
      }

      if (!assetId) {
        throw new Error('Video asset creation took longer than expected on Mux servers. Please wait a moment and check your Content library.');
      }

      const saveRes = await saveScreenVideo(title, description, assetId, category, visibility, isReel);
      if (saveRes.success) {
        let createdId = '';
        if ('video' in saveRes && saveRes.video?.id) createdId = saveRes.video.id;
        else if ('post' in saveRes && saveRes.post?.id) createdId = saveRes.post.id;
        
        if (createdId) setSavedVideoId(createdId);
        
        if (selectedPlaylists.length > 0 && createdId) {
          for (const pId of selectedPlaylists) {
            await addVideoToPlaylist(pId, createdId);
          }
        }
        setUploadStatus('done');
      } else {
        throw new Error(saveRes.error || 'Database registry failed.');
      }
    } catch (err: any) {
      console.error(err);
      setUploadStatus('error');
      setErrorMessage(err.message || 'An error occurred during Mux transmission.');
    }
  };

  const cancelRealUpload = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
    }
    setUploadStatus('idle');
    setUploadProgress(0);
  };

  const handleStartPublish = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSimulatedUpload) {
      startSimulatedUpload();
      
      const videoUrls = [
        'https://cdn.pixabay.com/video/2021/08/04/83896-584732159_large.mp4',
        'https://cdn.pixabay.com/video/2022/01/18/104762-663884392_large.mp4',
        'https://cdn.pixabay.com/video/2021/11/04/93557-641566898_large.mp4',
        'https://cdn.pixabay.com/video/2023/10/22/186071-877209700_large.mp4'
      ];
      const selectedVideoUrl = videoUrls[Math.floor(Math.random() * videoUrls.length)];
      const thumbUrl = selectedThumbnailUrl || MOCK_THUMBNAIL_TEMPLATES[0];

      setTimeout(async () => {
        const res = await saveSimulatedScreenVideo(
          title,
          description,
          category,
          visibility,
          thumbUrl,
          selectedVideoUrl,
          isReel
        );
        if (res.success) {
          let createdId = '';
          if ('video' in res && res.video?.id) createdId = res.video.id;
          else if ('post' in res && res.post?.id) createdId = res.post.id;
          
          if (createdId) setSavedVideoId(createdId);
          
          if (selectedPlaylists.length > 0 && createdId) {
            for (const pId of selectedPlaylists) {
              await addVideoToPlaylist(pId, createdId);
            }
          }
          setUploadStatus('done');
        } else {
          setUploadStatus('error');
          setErrorMessage(res.error || 'Failed to save simulated video data.');
        }
      }, 5000);
    } else {
      await triggerRealMuxUpload();
    }
  };

  // Inline Playlist creation
  const handleCreatePlaylistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    setIsCreatingPlaylist(true);
    const res = await createPlaylist(newPlaylistName, newPlaylistVisibility);
    setIsCreatingPlaylist(false);

    if (res.success && res.playlist) {
      setPlaylists(prev => [...prev, res.playlist]);
      setSelectedPlaylists(prev => [...prev, res.playlist.id]);
      setNewPlaylistName('');
      alert('New playlist created successfully!');
    } else {
      alert(res.error || 'Failed to create playlist');
    }
  };

  // AI 14 one-click assist triggers
  const runAIAction = async (actionType: string) => {
    switch (actionType) {
      case 'generate_title':
        setTitle('Master Next.js 16 Server Actions: Architecture & Security Patterns 🚀');
        setAiScore(prev => Math.min(100, prev + 8));
        break;
      case 'improve_title':
        if (title) {
          setTitle(`[PRO GUIDE] ${title} - In-Depth Walkthrough (2026)`);
        } else {
          setTitle('[PRO GUIDE] Next.js Server Actions Masterclass (2026)');
        }
        setAiScore(prev => Math.min(100, prev + 5));
        break;
      case 'generate_description':
        setDescription(`In this video, we dive deep into the architecture of Next.js 16 Server Actions.\n\nKey Topics Covered:\n1. Client-Server boundary models\n2. Validation patterns with Zod\n3. Database transactions on Neon PostgreSQL\n4. Securing mutations with Session-based auth.\n\nDon't forget to like, subscribe, and share!`);
        setAiScore(prev => Math.min(100, prev + 12));
        break;
      case 'generate_keywords':
        setTags('nextjs 16, server actions, webdev, react, javascript, tailwindcss, neon postgresql, next-auth');
        setAiScore(prev => Math.min(100, prev + 8));
        break;
      case 'generate_hashtags':
        setHashtags('#NextJS #ReactJS #FullStack #WebDevelopment #Programming');
        setAiScore(prev => Math.min(100, prev + 5));
        break;
      case 'suggest_category':
        setCategory('Technology');
        alert('AI analyzed title keywords and suggests the "Technology" category (99% confidence).');
        break;
      case 'detect_language':
        setLanguage('English');
        alert('AI detected English spoken audio (100% confidence).');
        break;
      case 'suggest_upload_time':
        alert('AI suggests uploading on Thursday at 6:00 PM EST (your subscribers are most active then).');
        break;
      case 'estimate_reach':
        alert('AI estimates a reach of 10k - 25k impressions within the first 48 hours based on title CTR.');
        break;
      case 'generate_thumbnail':
        setThumbnailSource('ai');
        setAiThumbnails([
          'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=640&q=80',
          'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=640&q=80',
          'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=640&q=80'
        ]);
        setSelectedThumbnailUrl('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=640&q=80');
        setAiScore(prev => Math.min(100, prev + 10));
        break;
      case 'generate_chapters':
        setDescription(prev => prev + `\n\nChapters:\n00:00 - Introduction\n01:30 - System Design & Core Concepts\n05:15 - Server Actions Setup\n12:45 - Database Mutations\n19:10 - Security & Auth Validation\n28:30 - Final Wrap-Up`);
        setAiScore(prev => Math.min(100, prev + 5));
        break;
      case 'auto_subtitle':
        setSubtitleSource('auto');
        setManualSubtitles('[00:00] Welcome back to Tolee Screen.\n[00:15] Today we are going to explore Next.js Server Actions.\n[00:45] We will secure our actions with NextAuth.\n[01:20] Let\'s get coding!');
        alert('AI Auto Captions generated successfully.');
        break;
      case 'translate_subtitle':
        setManualSubtitles(prev => prev + '\n\n[Spanish Translation]\n[00:00] Bienvenido de nuevo a Tolee Screen.\n[00:15] Hoy vamos a explorar las acciones del servidor de Next.js.');
        alert('Subtitles translated into Spanish successfully.');
        break;
      case 'content_score':
        setAiScore(95);
        setSeoAnalysis({
          score: 95,
          suggestions: [
            'Title contains high-impact action verbs (Passed)',
            'Description length is optimal with chapters (Passed)',
            'Video contains highly engaging thumbnail (Passed)',
            'Tag density is excellent for search discovery (Passed)',
            'Add recording location to improve local search query matching'
          ]
        });
        break;
      default:
        break;
    }
  };

  const applyAISuggestions = () => {
    setTitle('[PRO GUIDE] Next.js 16 Server Actions: Master Client-Server Boundaries (2026)');
    setDescription('Learn advanced engineering practices with Next.js 16 Server Actions, Neon PostgreSQL databases, and secure APIs. Perfect for full stack developers in 2026.\n\nChapters:\n00:00 - Introduction\n05:00 - Architecture Overview\n15:00 - Real Coding Demo');
    setTags('nextjs 16, server actions, prisma db, nodejs, programming, web development');
    setHashtags('#NextJS #ReactJS #WebDevelopment');
    setAiScore(98);
    setHasAppliedAISuggestions(true);
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSelectedFile(null);
    setVideoPreviewUrl('');
    setUploadStatus('idle');
    setUploadProgress(0);
    setChunkProgress({ current: 0, total: 4 });
    setUploadSpeed('0 KB/s');
    setUploadTimeRemaining('');
    setIsThumbnailConfirmed(false);
    setHasAppliedAISuggestions(false);
    setAiScore(65);
    setCurrentStep(1);
    setSelectedPlaylists([]);
    setIsMadeForKids(null);
    setSavedVideoId('');
    localStorage.removeItem('tolee_upload_draft');
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 pb-16 pt-4 px-4 md:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Breadcrumbs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <div className="flex items-center gap-2 text-zinc-500">
            <Link href="/screen" className="text-xs font-bold hover:text-teal-500 flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              Tolee Screen
            </Link>
            <ChevronRight className="w-3 h-3 text-zinc-400" />
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-250">Creator Studio</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Avatar className="w-9 h-9 border border-zinc-200 dark:border-zinc-800">
                <AvatarImage src={session?.user?.image || undefined} />
                <AvatarFallback className="bg-zinc-200 dark:bg-zinc-800 text-xs font-bold text-teal-650">U</AvatarFallback>
              </Avatar>
              <div>
                <h4 className="text-xs font-bold text-zinc-800 dark:text-white leading-none">{session?.user?.name}</h4>
                <span className="text-[10px] text-zinc-400 font-semibold mt-0.5">Creator Partner</span>
              </div>
            </div>
          </div>
        </div>

        {/* Workspace Layout Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-850 gap-6 overflow-x-auto scrollbar-none">
          <button
            onClick={() => handleTabChange('dashboard')}
            className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'dashboard' 
                ? 'border-teal-500 text-teal-600 dark:text-teal-400' 
                : 'border-transparent text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Dashboard
          </button>
          <button
            onClick={() => handleTabChange('content')}
            className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'content' 
                ? 'border-teal-500 text-teal-600 dark:text-teal-400' 
                : 'border-transparent text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200'
            }`}
          >
            <Video className="w-4 h-4" />
            Content
          </button>
          <button
            onClick={() => handleTabChange('analytics')}
            className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'analytics' 
                ? 'border-teal-500 text-teal-600 dark:text-teal-400' 
                : 'border-transparent text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Analytics
          </button>
          <button
            onClick={() => handleTabChange('community')}
            className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'community' 
                ? 'border-teal-500 text-teal-600 dark:text-teal-400' 
                : 'border-transparent text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Community
          </button>
          <button
            onClick={() => handleTabChange('upload')}
            className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'upload' 
                ? 'border-teal-500 text-teal-600 dark:text-teal-400' 
                : 'border-transparent text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            Upload Video
          </button>
        </div>

        {/* Tab 1: Dashboard Analytics & Monetization */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* Realtime Monetization Metric cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4.5 rounded-2xl shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Est. Revenue</p>
                  <h3 className="text-base font-black text-zinc-900 dark:text-white mt-0.5">${metrics.estimatedRevenue}</h3>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4.5 rounded-2xl shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Views</p>
                  <h3 className="text-base font-black text-zinc-900 dark:text-white mt-0.5">{metrics.totalViews.toLocaleString()}</h3>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4.5 rounded-2xl shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Watch Time</p>
                  <h3 className="text-base font-black text-zinc-900 dark:text-white mt-0.5">{metrics.watchTime} hrs</h3>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4.5 rounded-2xl shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Subscribers</p>
                  <h3 className="text-base font-black text-zinc-900 dark:text-white mt-0.5">{metrics.subscriberCount}</h3>
                </div>
              </div>
            </div>

            {/* RPM / CPM Financial stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl text-center">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">RPM (Revenue per 1k views)</span>
                <h4 className="text-lg font-black text-teal-600 dark:text-teal-400 mt-1">${metrics.rpm}</h4>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl text-center">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">CPM (Cost per 1k ad impressions)</span>
                <h4 className="text-lg font-black text-teal-650 dark:text-teal-400 mt-1">${metrics.cpm}</h4>
              </div>
            </div>

            {/* Audience metrics & retention graph */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Audience Retention curve */}
              <div className="lg:col-span-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 p-5 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-zinc-800 dark:text-white uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-teal-500 animate-spin-slow" />
                    Average Audience Retention
                  </h4>
                  <span className="text-[10px] text-zinc-400 font-semibold">Typical retention: 55-65%</span>
                </div>
                
                {/* SVG Curve Graph */}
                <div className="relative h-44 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-xl overflow-hidden p-2">
                  <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {/* Grid Lines */}
                    <line x1="0" y1="25" x2="400" y2="25" stroke="#e4e4e7" strokeDasharray="3" className="dark:stroke-zinc-800" />
                    <line x1="0" y1="50" x2="400" y2="50" stroke="#e4e4e7" strokeDasharray="3" className="dark:stroke-zinc-800" />
                    <line x1="0" y1="75" x2="400" y2="75" stroke="#e4e4e7" strokeDasharray="3" className="dark:stroke-zinc-800" />
                    {/* Shading Area */}
                    <path d="M0,0 L0,15 C50,25 100,35 150,45 C200,50 250,55 300,58 C350,60 400,62 400,62 L400,100 L0,100 Z" fill="url(#chartGradient)" />
                    {/* Retention Line */}
                    <path d="M0,15 C50,25 100,35 150,45 C200,50 250,55 300,58 C350,60 400,62 400,62" fill="none" stroke="#14b8a6" strokeWidth="2.5" />
                  </svg>
                  
                  {/* Overlays */}
                  <span className="absolute left-2.5 top-2 text-[9px] font-bold text-zinc-400">100% (Start)</span>
                  <span className="absolute right-2.5 bottom-2 text-[9px] font-bold text-zinc-400">42% (End)</span>
                  <span className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[9px] font-bold text-teal-650 bg-teal-50 dark:bg-teal-950/20 px-2 py-0.5 rounded border border-teal-500/10">Avg Watch: 3m 45s</span>
                </div>
              </div>

              {/* Geographic, Device, traffic metadata */}
              <div className="lg:col-span-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 p-5 rounded-2xl shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-zinc-800 dark:text-white uppercase tracking-wider flex items-center gap-1">
                  <Globe className="w-4 h-4 text-teal-500" />
                  Traffic & Demographics
                </h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[11px] font-bold mb-1">
                      <span>India</span>
                      <span>72%</span>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full">
                      <div className="bg-teal-500 h-full rounded-full" style={{ width: '72%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] font-bold mb-1">
                      <span>United States</span>
                      <span>15%</span>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full">
                      <div className="bg-teal-500 h-full rounded-full" style={{ width: '15%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] font-bold mb-1">
                      <span>Mobile Web</span>
                      <span>64%</span>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full">
                      <div className="bg-teal-605 h-full rounded-full" style={{ width: '64%' }} />
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* Tab 2: Creator Content Table list */}
        {activeTab === 'content' && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-zinc-150 dark:border-zinc-850">
              <h3 className="font-bold text-sm text-zinc-850 dark:text-white flex items-center gap-1.5">
                <FileVideo className="w-4.5 h-4.5 text-teal-500" />
                Uploads ({creatorVideos.length})
              </h3>
            </div>

            {loadingVideos ? (
              <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-8 h-8 text-teal-555 animate-spin" />
                <p className="text-xs text-zinc-450 font-bold">Querying library...</p>
              </div>
            ) : creatorVideos.length === 0 ? (
              <div className="p-16 text-center space-y-3">
                <p className="text-xs font-semibold text-zinc-400">You haven't uploaded any videos yet.</p>
                <Button 
                  onClick={() => setActiveTab('upload')}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-3 px-5"
                >
                  Upload First Video
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      <th className="p-4">Video details</th>
                      <th className="p-4">Visibility</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Views</th>
                      <th className="p-4">Publish Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-150 dark:divide-zinc-850 text-xs">
                    {creatorVideos.map((vid) => (
                      <tr key={vid.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10">
                        <td className="p-4 flex gap-3.5 items-center max-w-sm">
                          <div className="relative w-24 aspect-video rounded-lg overflow-hidden bg-zinc-200 dark:bg-zinc-800 flex-shrink-0">
                            {vid.thumbnailUrl ? (
                              <img src={vid.thumbnailUrl} className="w-full h-full object-cover" />
                            ) : vid.muxPlaybackId ? (
                              <img src={`https://image.mux.com/${vid.muxPlaybackId}/thumbnail.png?width=160&height=90`} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-450 font-bold font-mono">[NO AD]</div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link href={`/screen/watch/${vid.id}`} className="font-bold text-zinc-900 dark:text-zinc-200 hover:text-teal-600 truncate block">
                              {vid.title}
                            </Link>
                            <p className="text-[10px] text-zinc-450 line-clamp-1 mt-0.5">{vid.description || 'No description'}</p>
                          </div>
                        </td>
                        <td className="p-4 capitalize font-semibold text-zinc-500">{vid.visibility}</td>
                        <td className="p-4 font-semibold text-zinc-505">{vid.category}</td>
                        <td className="p-4 font-bold text-zinc-800 dark:text-zinc-200">{vid.viewsCount}</td>
                        <td className="p-4 text-zinc-400 font-semibold">{new Date(vid.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab: Analytics */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <h2 className="text-lg font-black text-zinc-900 dark:text-white">Channel analytics</h2>
            
            <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-6 text-xs font-bold text-zinc-400 pb-2">
              <span className="text-teal-600 dark:text-teal-400 border-b-2 border-teal-500 pb-2 cursor-pointer">Overview</span>
              <span className="hover:text-zinc-650 dark:hover:text-zinc-200 pb-2 cursor-pointer">Content</span>
              <span className="hover:text-zinc-650 dark:hover:text-zinc-200 pb-2 cursor-pointer">Audience</span>
              <span className="hover:text-zinc-650 dark:hover:text-zinc-200 pb-2 cursor-pointer">Trends</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Overview Column */}
              <div className="lg:col-span-8 space-y-6">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl shadow-sm space-y-6">
                  <div className="text-center space-y-1">
                    <p className="text-xs text-zinc-400 font-semibold">Overview</p>
                    <h3 className="text-xl font-black text-zinc-900 dark:text-white">
                      Your channel got {metrics.totalViews.toLocaleString() || 'one'} view{metrics.totalViews === 1 ? '' : 's'} in the last 28 days
                    </h3>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-3 gap-4 border-b border-zinc-100 dark:border-zinc-800/80 pb-6 text-center">
                    <div className="space-y-1.5 p-3 rounded-2xl bg-zinc-50/50 dark:bg-zinc-950/20">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Views</p>
                      <h4 className="text-lg font-black text-zinc-900 dark:text-white">{metrics.totalViews.toLocaleString()}</h4>
                    </div>
                    <div className="space-y-1.5 p-3 rounded-2xl bg-zinc-50/50 dark:bg-zinc-950/20">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Watch time (hours)</p>
                      <h4 className="text-lg font-black text-zinc-900 dark:text-white">{(metrics.watchTime || (metrics.totalViews * 0.1)).toFixed(1)}</h4>
                    </div>
                    <div className="space-y-1.5 p-3 rounded-2xl bg-zinc-50/50 dark:bg-zinc-950/20">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Subscribers</p>
                      <h4 className="text-lg font-black text-zinc-900 dark:text-white">{metrics.subscriberCount}</h4>
                    </div>
                  </div>

                  {/* SVG Analytics Graph Chart */}
                  <div className="h-56 w-full relative pt-4 flex flex-col justify-between">
                    <svg className="w-full h-44 overflow-visible" viewBox="0 0 100 30" preserveAspectRatio="none">
                      <path
                        d="M 0 25 Q 25 10 50 15 T 100 5 L 100 30 L 0 30 Z"
                        fill="url(#colorView)"
                        opacity="0.15"
                      />
                      <path
                        d="M 0 25 Q 25 10 50 15 T 100 5"
                        fill="none"
                        stroke="#0d9488"
                        strokeWidth="1.2"
                      />
                      <defs>
                        <linearGradient id="colorView" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0d9488" />
                          <stop offset="95%" stopColor="#0d9488" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="flex justify-between text-[9px] font-bold text-zinc-400 uppercase px-2">
                      <span>May 27, 2026</span>
                      <span>Jun 1, 2026</span>
                      <span>Jun 10, 2026</span>
                      <span>Jun 19, 2026</span>
                      <span>Jun 23, 2026</span>
                    </div>
                  </div>
                </div>

                {/* Top content list */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-3xl shadow-sm space-y-4">
                  <h3 className="font-bold text-xs.5 text-zinc-850 dark:text-white uppercase tracking-wider">Your top content in this period</h3>
                  <div className="divide-y divide-zinc-150 dark:divide-zinc-850">
                    {creatorVideos.slice(0, 3).map((vid, idx) => (
                      <div key={vid.id} className="py-3.5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs font-black text-zinc-400 w-4">{idx + 1}</span>
                          <div className="w-16 aspect-video rounded-lg overflow-hidden bg-zinc-200 dark:bg-zinc-800 flex-shrink-0">
                            {vid.thumbnailUrl ? (
                              <img src={vid.thumbnailUrl} className="w-full h-full object-cover" />
                            ) : vid.muxPlaybackId ? (
                              <img src={`https://image.mux.com/${vid.muxPlaybackId}/thumbnail.png?width=120&height=68`} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-zinc-400 uppercase">Video</div>
                            )}
                          </div>
                          <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{vid.title}</p>
                        </div>
                        <div className="text-right flex-shrink-0 text-xs font-bold text-zinc-550 dark:text-zinc-300">
                          <span>{vid.viewsCount} views</span>
                        </div>
                      </div>
                    ))}
                    {creatorVideos.length === 0 && (
                      <p className="text-xs text-zinc-400 py-2">No videos uploaded in this period.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Realtime widget panel */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-3xl shadow-sm space-y-5">
                  <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
                    <h3 className="font-bold text-xs.5 text-zinc-850 dark:text-white uppercase tracking-wider">Realtime</h3>
                    <p className="text-[10px] text-teal-650 flex items-center gap-1 mt-0.5 font-bold animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                      Updating live
                    </p>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-2xl font-black text-zinc-900 dark:text-white">{metrics.subscriberCount}</h4>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Subscribers</p>
                  </div>

                  <button className="w-full py-2.5 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 text-[10px] font-bold rounded-xl text-zinc-650 dark:text-zinc-300">
                    See live count
                  </button>

                  <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 space-y-4">
                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <h5 className="font-black text-zinc-850 dark:text-zinc-200">{metrics.totalViews}</h5>
                        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wide">Views • Last 48 hours</p>
                      </div>
                      <div className="h-8 w-24 flex items-end gap-0.5 justify-end">
                        <span className="bg-teal-500/25 w-1 h-3 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <span className="bg-teal-500/40 w-1 h-5 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                        <span className="bg-teal-500 w-1 h-8 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }} />
                        <span className="bg-teal-500/35 w-1 h-2 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        <span className="bg-teal-500/60 w-1 h-6 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Community */}
        {activeTab === 'community' && (
          <div className="space-y-6">
            <h2 className="text-lg font-black text-zinc-900 dark:text-white">Community</h2>

            <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-6 text-xs font-bold text-zinc-400 pb-2">
              <span className="text-teal-600 dark:text-teal-400 border-b-2 border-teal-500 pb-2 cursor-pointer">Comments</span>
              <span className="hover:text-zinc-650 dark:hover:text-zinc-200 pb-2 cursor-pointer">Viewer posts</span>
              <span className="hover:text-zinc-650 dark:hover:text-zinc-200 pb-2 cursor-pointer">Mentions</span>
            </div>

            {/* Filter controls bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 flex-1 max-w-sm">
                <Search className="w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Filter comments..."
                  className="bg-transparent border-none text-xs w-full focus:outline-none placeholder-zinc-400 font-medium"
                />
              </div>
              <div className="flex gap-2">
                <span className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-600 dark:text-zinc-350 rounded-lg flex items-center gap-1">
                  Published <X className="w-3 h-3 cursor-pointer hover:text-red-500" />
                </span>
                <span className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-600 dark:text-zinc-350 rounded-lg flex items-center gap-1">
                  Most relevant <X className="w-3 h-3 cursor-pointer hover:text-red-500" />
                </span>
                <span className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-600 dark:text-zinc-350 rounded-lg flex items-center gap-1">
                  Response status: Unresponded <X className="w-3 h-3 cursor-pointer hover:text-red-500" />
                </span>
              </div>
            </div>

            {loadingComments ? (
              <div className="p-16 text-center flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
                <p className="text-xs text-zinc-450 font-bold">Retrieving viewer comments...</p>
              </div>
            ) : creatorComments.length === 0 ? (
              /* Youtube-like Cute Purple Character Empty State */
              <div className="p-16 text-center space-y-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl">
                <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
                  <svg className="w-full h-full text-teal-555 animate-pulse" viewBox="0 0 100 100" fill="none">
                    <circle cx="50" cy="50" r="30" fill="currentColor" fillOpacity="0.1" />
                    <rect x="42" y="35" width="16" height="30" rx="8" fill="currentColor" />
                    <circle cx="35" cy="45" r="4" fill="currentColor" />
                    <circle cx="65" cy="45" r="4" fill="currentColor" />
                    <path d="M 40 55 Q 50 62 60 55" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="35" cy="30" r="2.5" fill="currentColor" />
                    <circle cx="65" cy="30" r="2.5" fill="currentColor" />
                    <path d="M 35 30 L 45 40" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M 65 30 L 55 40" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-black text-zinc-550 dark:text-zinc-300">No comments found</p>
                  <p className="text-[10px] text-zinc-450">Try searching for something else or removing filters.</p>
                </div>
              </div>
            ) : (
              /* Real Comments List */
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm divide-y divide-zinc-150 dark:divide-zinc-850">
                {creatorComments.map((comment) => (
                  <div key={comment.id} className="p-5 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <Avatar className="w-9 h-9 border border-zinc-200 dark:border-zinc-800 flex-shrink-0">
                        <AvatarImage src={comment.user.avatar || undefined} />
                        <AvatarFallback className="bg-zinc-200 dark:bg-zinc-800 text-xs font-bold text-teal-650">U</AvatarFallback>
                      </Avatar>

                      <div className="space-y-2 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-zinc-800 dark:text-white">@{comment.user.username || comment.user.name}</span>
                          <span className="text-[9px] text-zinc-400 font-semibold">{new Date(comment.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-350 leading-relaxed">{comment.text}</p>
                        
                        <div className="flex items-center gap-4 pt-1 text-[10px] font-bold text-zinc-500">
                          <button 
                            onClick={async () => {
                              await toggleHeartComment(comment.id);
                              loadStudioData();
                            }}
                            className={`flex items-center gap-1 hover:text-red-500 ${comment.isHearted ? 'text-red-550' : ''}`}
                          >
                            <Heart className={`w-3.5 h-3.5 ${comment.isHearted ? 'fill-red-550' : ''}`} />
                            {comment.isHearted ? 'Hearted' : 'Heart'}
                          </button>

                          <button 
                            onClick={async () => {
                              await togglePinComment(comment.id);
                              loadStudioData();
                            }}
                            className={`flex items-center gap-1 hover:text-teal-600 ${comment.isPinned ? 'text-teal-650' : ''}`}
                          >
                            <Lock className="w-3.5 h-3.5" />
                            {comment.isPinned ? 'Pinned' : 'Pin'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right side context: Video thumbnail and title comment was left on */}
                    <div className="w-32 flex-shrink-0 flex gap-2 items-center text-right border-l border-zinc-150 dark:border-zinc-800 pl-3">
                      <div className="w-12 aspect-video rounded overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex-shrink-0">
                        {comment.video.thumbnailUrl ? (
                          <img src={comment.video.thumbnailUrl} className="w-full h-full object-cover" />
                        ) : comment.video.muxPlaybackId ? (
                          <img src={`https://image.mux.com/${comment.video.muxPlaybackId}/thumbnail.png?width=80&height=45`} className="w-full h-full object-cover" />
                        ) : null}
                      </div>
                      <p className="text-[10px] font-semibold text-zinc-400 line-clamp-2 text-left leading-tight">{comment.video.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Upload Studio with AI suggestion systems */}
        {activeTab === 'upload' && (
          <div className="space-y-6">
            
            {/* Draft recovery banner */}
            {hasDraftBanner && (
              <div className="p-4 bg-teal-50 dark:bg-teal-950/20 border border-teal-500/15 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-900 dark:text-white">Unsaved draft detected</p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">Would you like to restore your previous video upload metadata?</p>
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button onClick={restoreDraft} className="flex-1 sm:flex-initial text-xs font-bold bg-teal-650 hover:bg-teal-700 text-white px-4 py-2 rounded-xl">Restore</Button>
                  <Button onClick={discardDraft} variant="outline" className="flex-1 sm:flex-initial text-xs font-bold px-4 py-2 rounded-xl border-zinc-200 dark:border-zinc-800 text-zinc-650">Discard</Button>
                </div>
              </div>
            )}

            {/* Steps Navigation Progress Indicator */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 p-5 rounded-3xl shadow-sm">
              <div className="flex items-center justify-between max-w-4xl mx-auto">
                {[
                  { step: 1, label: 'Upload Video', icon: Upload },
                  { step: 2, label: 'Video Details', icon: FileText },
                  { step: 3, label: 'AI Optimization', icon: Sparkles },
                  { step: 4, label: 'Visibility & Settings', icon: Settings },
                  { step: 5, label: 'Preview & Publish', icon: PlayCircle }
                ].map((item, idx, arr) => {
                  const isCompleted = currentStep > item.step;
                  const isActive = currentStep === item.step;
                  const isSelectable = selectedFile !== null;
                  const ItemIcon = item.icon;
                  
                  return (
                    <React.Fragment key={item.step}>
                      <button
                        type="button"
                        disabled={!isSelectable && item.step > 1}
                        onClick={() => setCurrentStep(item.step)}
                        className={`flex flex-col items-center gap-1.5 focus:outline-none transition-all ${
                          isActive ? 'text-teal-600 dark:text-teal-400 font-black' : isCompleted ? 'text-green-500 font-bold' : 'text-zinc-400'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                          isActive 
                            ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-450 scale-110 shadow-sm' 
                            : isCompleted 
                            ? 'border-green-500 bg-green-50 dark:bg-green-950/20 text-green-500' 
                            : 'border-zinc-200 dark:border-zinc-800 text-zinc-400'
                        }`}>
                          {isCompleted ? <Check className="w-4.5 h-4.5" /> : <ItemIcon className="w-4.5 h-4.5" />}
                        </div>
                        <span className="text-[9px] hidden md:inline uppercase tracking-widest font-black">{item.label}</span>
                      </button>
                      {idx < arr.length - 1 && (
                        <div className={`h-0.5 flex-1 mx-2 rounded-full transition-colors ${
                          currentStep > item.step ? 'bg-green-500' : 'bg-zinc-200 dark:bg-zinc-800'
                        }`} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Main wizard step content */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 p-6 rounded-3xl shadow-sm space-y-6">
                
                {/* STEP 1: UPLOAD VIDEO */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-zinc-850 dark:text-white flex items-center gap-1.5">
                        <Upload className="w-5 h-5 text-teal-500" />
                        Step 1: Upload Source Video
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-zinc-400">Mode:</span>
                        <select 
                          value={isSimulatedUpload ? 'simulated' : 'real'} 
                          onChange={(e) => setIsSimulatedUpload(e.target.value === 'simulated')}
                          className="bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold rounded-lg border-none px-2 py-1 focus:outline-none"
                        >
                          <option value="simulated">Simulation (Free)</option>
                          <option value="real">Real Mux Upload</option>
                        </select>
                      </div>
                    </div>

                    {uploadStatus === 'idle' ? (
                      <div className="space-y-4">
                        {/* Drag & Drop File Select Zone */}
                        <div 
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
                            dragActive 
                              ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/20' 
                              : 'border-zinc-200 dark:border-zinc-800 hover:border-teal-500/50 bg-zinc-50/40 dark:bg-zinc-950/20'
                          }`}
                        >
                          <input
                            type="file"
                            accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <FileVideo className="w-12 h-12 text-zinc-400 mx-auto mb-3 animate-pulse" />
                          <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Drag video file here or click to browse</p>
                          <p className="text-[10px] text-zinc-400 mt-1">Supports MP4, MOV, AVI, MKV, WebM formats</p>
                        </div>

                        {/* Mobile Camera/Gallery uploads */}
                        <div className="grid grid-cols-2 gap-4">
                          <label className="flex flex-col items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer transition-colors">
                            <input 
                              type="file" 
                              accept="video/*" 
                              capture="environment" 
                              onChange={handleFileChange}
                              className="hidden" 
                            />
                            <Camera className="w-5 h-5 text-teal-505 mb-1.5" />
                            <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300">Take Video with Camera</span>
                          </label>

                          <label className="flex flex-col items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer transition-colors">
                            <input 
                              type="file" 
                              accept="video/*" 
                              onChange={handleFileChange}
                              className="hidden" 
                            />
                            <FolderOpen className="w-5 h-5 text-teal-550 mb-1.5" />
                            <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300">Select from Gallery</span>
                          </label>
                        </div>
                      </div>
                    ) : (
                      /* Active progress card (chunk simulation or real direct mux progress) */
                      <div className="p-6 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
                            <div>
                              <p className="text-xs font-bold text-zinc-800 dark:text-white">
                                {uploadStatus === 'uploading' 
                                  ? (uploadPaused ? 'Upload Paused' : 'Uploading video file...') 
                                  : 'Processing streams...'}
                              </p>
                              <p className="text-[9px] text-zinc-400 mt-0.5">Size: 20.4 MB | Format: MP4</p>
                            </div>
                          </div>
                          <span className="text-xs font-black text-teal-650 dark:text-teal-400">{uploadProgress}%</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                          <div className="bg-teal-500 h-full rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                        </div>

                        {/* Speed & Chunks indicator */}
                        {uploadStatus === 'uploading' && (
                          <div className="grid grid-cols-3 gap-4 text-[10px] font-bold text-zinc-500">
                            <div>
                              <p className="text-[9px] text-zinc-400 font-medium">CHUNK PROGRESS</p>
                              <p className="text-zinc-800 dark:text-zinc-200">Chunk {chunkProgress.current} of {chunkProgress.total}</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-zinc-400 font-medium">SPEED</p>
                              <p className="text-zinc-800 dark:text-zinc-200">{uploadSpeed}</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-zinc-400 font-medium">EST. TIME REMAINING</p>
                              <p className="text-zinc-800 dark:text-zinc-200">{uploadTimeRemaining || 'Calculating...'}</p>
                            </div>
                          </div>
                        )}

                        {/* Controls */}
                        <div className="flex gap-2 justify-end pt-2">
                          {isSimulatedUpload && uploadStatus === 'uploading' && (
                            <>
                              {uploadPaused ? (
                                <Button 
                                  type="button" 
                                  onClick={resumeSimulatedUpload}
                                  className="text-xs font-bold bg-teal-600 text-white px-4 py-2 rounded-xl"
                                >
                                  Resume
                                </Button>
                              ) : (
                                <Button 
                                  type="button" 
                                  onClick={pauseSimulatedUpload}
                                  variant="outline"
                                  className="text-xs font-bold border-zinc-200 dark:border-zinc-800 text-zinc-650 px-4 py-2 rounded-xl"
                                >
                                  Pause
                                </Button>
                              )}
                            </>
                          )}
                          <Button 
                            type="button" 
                            onClick={isSimulatedUpload ? cancelSimulatedUpload : cancelRealUpload}
                            variant="destructive"
                            className="text-xs font-bold px-4 py-2 rounded-xl"
                          >
                            Cancel Upload
                          </Button>
                        </div>
                      </div>
                    )}

                    {selectedFile && (
                      <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3">
                        {isReel && (
                          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-xs flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold">Vertical Video Format Detected</p>
                              <p className="text-[10px] opacity-90 mt-0.5">This video will be automatically published and routed to the <strong>Reels</strong> section, and it will also appear in the home feeds.</p>
                            </div>
                          </div>
                        )}
                        <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Video source preview</p>
                        <div className="relative aspect-video rounded-xl overflow-hidden shadow border border-zinc-205 dark:border-zinc-850">
                          <video 
                            src={videoPreviewUrl} 
                            controls 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-zinc-450 font-bold">
                          <span>Name: {selectedFile.name}</span>
                          <span>Format: {selectedFile.type || 'video/mp4'}</span>
                        </div>
                        <Button 
                          onClick={() => setCurrentStep(2)} 
                          className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 shadow"
                        >
                          Configure Video Details
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 2: VIDEO DETAILS */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <h3 className="text-base font-bold text-zinc-850 dark:text-white flex items-center gap-1.5">
                      <FileText className="w-5 h-5 text-teal-500" />
                      Step 2: Video Details & Custom Thumbnail
                    </h3>

                    {/* Metadata fields */}
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Video Title (Required)</label>
                          <span className="text-[9px] font-bold text-zinc-400">{title.length}/100</span>
                        </div>
                        <input
                          type="text"
                          required
                          maxLength={100}
                          placeholder="Provide a catchy title that explains your video..."
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-850 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-semibold"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Description</label>
                          <span className="text-[9px] font-bold text-zinc-400">{description.length}/5000</span>
                        </div>
                        <textarea
                          rows={5}
                          maxLength={5000}
                          placeholder="Describe the content of your video clip..."
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-850 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all resize-none font-medium"
                        />
                      </div>

                      {/* Hashtags & Tags */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Hashtags</label>
                          <input
                            type="text"
                            placeholder="#nextjs #tutorial #webdev"
                            value={hashtags}
                            onChange={(e) => setHashtags(e.target.value)}
                            className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:border-teal-500 font-semibold"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Tags / Keywords</label>
                          <input
                            type="text"
                            placeholder="nextjs, react, prisma, nodejs"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:border-teal-500 font-semibold"
                          />
                        </div>
                      </div>

                      {/* Category & Language */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Category</label>
                          <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:border-teal-500 font-bold"
                          >
                            {VIDEO_CATEGORIES.slice(4).map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Language</label>
                          <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:border-teal-500 font-bold"
                          >
                            <option value="English">English</option>
                            <option value="Hindi">Hindi</option>
                            <option value="Spanish">Spanish</option>
                            <option value="French">French</option>
                            <option value="German">German</option>
                          </select>
                        </div>
                      </div>

                      {/* Optional Advanced Details */}
                      <div className="border-t border-zinc-150 dark:border-zinc-850 pt-4 space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Optional Parameters</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-zinc-500 uppercase flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                              Recording Location
                            </label>
                            <input
                              type="text"
                              value={location}
                              onChange={(e) => setLocation(e.target.value)}
                              placeholder="e.g. New York, USA"
                              className="w-full p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-zinc-500 uppercase flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                              Recording Date
                            </label>
                            <input
                              type="date"
                              value={recordingDate}
                              onChange={(e) => setRecordingDate(e.target.value)}
                              className="w-full p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none font-bold"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-zinc-500 uppercase flex items-center gap-1">
                              <UserPlus className="w-3.5 h-3.5 text-zinc-400" />
                              Mention Creators
                            </label>
                            <input
                              type="text"
                              value={mentionPeople}
                              onChange={(e) => setMentionPeople(e.target.value)}
                              placeholder="e.g. @prince, @sam"
                              className="w-full p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-zinc-500 uppercase flex items-center gap-1">
                              <Link2 className="w-3.5 h-3.5 text-zinc-400" />
                              External Link
                            </label>
                            <input
                              type="text"
                              value={externalLink}
                              onChange={(e) => setExternalLink(e.target.value)}
                              placeholder="e.g. https://tolee.com"
                              className="w-full p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1 sm:col-span-2">
                            <label className="text-[9px] font-bold text-zinc-500 uppercase flex items-center gap-1">
                              <Tag className="w-3.5 h-3.5 text-zinc-400" />
                              Product / Business Tags
                            </label>
                            <input
                              type="text"
                              value={productTag}
                              onChange={(e) => setProductTag(e.target.value)}
                              placeholder="e.g. NextJS Course, Tolee Pro Premium"
                              className="w-full p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Thumbnail Section */}
                    <div className="border-t border-zinc-150 dark:border-zinc-850 pt-5 space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Video Thumbnail Source</h4>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <button
                          type="button"
                          onClick={() => setThumbnailSource('auto')}
                          className={`p-3 rounded-xl border text-center transition-all ${
                            thumbnailSource === 'auto' ? 'border-teal-500 bg-teal-500/5 text-teal-605 font-bold' : 'border-zinc-200 dark:border-zinc-800 text-zinc-450'
                          }`}
                        >
                          <ImageIcon className="w-4 h-4 mx-auto mb-1" />
                          <span className="text-[10px] uppercase tracking-wider block">Auto Frames</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setThumbnailSource('custom')}
                          className={`p-3 rounded-xl border text-center transition-all ${
                            thumbnailSource === 'custom' ? 'border-teal-500 bg-teal-500/5 text-teal-605 font-bold' : 'border-zinc-200 dark:border-zinc-800 text-zinc-450'
                          }`}
                        >
                          <Upload className="w-4 h-4 mx-auto mb-1" />
                          <span className="text-[10px] uppercase tracking-wider block">Upload Custom</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => runAIAction('generate_thumbnail')}
                          className={`p-3 rounded-xl border text-center transition-all ${
                            thumbnailSource === 'ai' ? 'border-teal-500 bg-teal-500/5 text-teal-650 font-bold' : 'border-zinc-200 dark:border-zinc-800 text-zinc-450'
                          }`}
                        >
                          <Sparkles className="w-4 h-4 mx-auto mb-1 text-amber-500" />
                          <span className="text-[10px] uppercase tracking-wider block">AI Generate</span>
                        </button>
                      </div>

                      {/* Source details selector details */}
                      {thumbnailSource === 'auto' && autoFrames.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Select extracted frame</p>
                          <div className="grid grid-cols-5 gap-2">
                            {autoFrames.map((url, i) => (
                              <div 
                                key={i} 
                                onClick={() => {
                                  setSelectedThumbnailUrl(url);
                                  setIsThumbnailConfirmed(false);
                                }}
                                className={`aspect-video rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                                  selectedThumbnailUrl === url ? 'border-teal-500 scale-105' : 'border-transparent opacity-80 hover:opacity-100'
                                }`}
                              >
                                <img src={url} className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {thumbnailSource === 'custom' && (
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
                          <p className="text-[10px] font-bold text-zinc-400 uppercase">Select custom image file</p>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleCustomThumbnailChange}
                            className="text-xs text-zinc-500 file:mr-3 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-teal-500/10 file:text-teal-605 hover:file:bg-teal-500/20 cursor-pointer"
                          />
                          {customThumbnailUrl && (
                            <div className="aspect-video w-32 rounded-lg overflow-hidden border border-zinc-200 mt-2">
                              <img src={customThumbnailUrl} className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>
                      )}

                      {thumbnailSource === 'ai' && aiThumbnails.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Select AI Generated Template</p>
                          <div className="grid grid-cols-3 gap-2">
                            {aiThumbnails.map((url, i) => (
                              <div 
                                key={i} 
                                onClick={() => {
                                  setSelectedThumbnailUrl(url);
                                  setIsThumbnailConfirmed(false);
                                }}
                                className={`aspect-video rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                                  selectedThumbnailUrl === url ? 'border-teal-500 scale-105' : 'border-transparent opacity-80 hover:opacity-100'
                                }`}
                              >
                                <img src={url} className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Interactive Visual Editor Panel */}
                      {selectedThumbnailUrl && (
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-4">
                          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                              <Paintbrush className="w-3.5 h-3.5 text-teal-500" />
                              Visual Overlay Editor
                            </span>
                            {isThumbnailConfirmed && (
                              <span className="text-[9px] text-green-500 font-bold bg-green-500/10 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                <Check className="w-3 h-3" /> Saved
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Live Canvas Mockup */}
                            <div className="relative aspect-video rounded-xl overflow-hidden border border-zinc-250 dark:border-zinc-850 shadow-md bg-black">
                              <div className="w-full h-full overflow-hidden flex items-center justify-center">
                                <img
                                  src={selectedThumbnailUrl}
                                  alt="Canvas Preview"
                                  className="w-full h-full object-cover transition-all"
                                  style={{
                                    transform: `scale(${editorScale / 100})`,
                                    filter: `
                                      brightness(${editorBrightness}%)
                                      contrast(${editorContrast}%)
                                      blur(${editorBlur ? '4px' : '0px'})
                                      ${editorFilter === 'cyber' ? 'hue-rotate(60deg) saturate(1.5)' : ''}
                                      ${editorFilter === 'warm' ? 'sepia(0.3) saturate(1.2)' : ''}
                                      ${editorFilter === 'cold' ? 'brightness(0.9) contrast(1.15) saturate(0.85)' : ''}
                                    `
                                  }}
                                />
                              </div>

                              {/* Shape Overlay */}
                              {editorShape !== 'none' && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                                  {editorShape === 'circle' && (
                                    <div 
                                      className="w-24 h-24 rounded-full border-4" 
                                      style={{ 
                                        borderColor: editorShapeColor, 
                                        backgroundColor: `${editorShapeColor}20`,
                                        opacity: editorShapeOpacity / 100 
                                      }}
                                    />
                                  )}
                                  {editorShape === 'rectangle' && (
                                    <div 
                                      className="w-32 h-20 border-4" 
                                      style={{ 
                                        borderColor: editorShapeColor, 
                                        backgroundColor: `${editorShapeColor}20`,
                                        opacity: editorShapeOpacity / 100 
                                      }}
                                    />
                                  )}
                                  {editorShape === 'star' && (
                                    <span 
                                      className="text-6xl" 
                                      style={{ 
                                        color: editorShapeColor,
                                        opacity: editorShapeOpacity / 100,
                                        filter: `drop-shadow(0 0 10px ${editorShapeColor})` 
                                      }}
                                    >
                                      ⭐
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Custom Text Overlay */}
                              {editorText.trim() && (
                                <div 
                                  className={`absolute bottom-3 left-3 px-2 py-1 font-black uppercase tracking-widest rounded-lg shadow-lg border border-black/10 max-w-[80%] truncate ${editorTextFont} ${editorTextSize}`}
                                  style={{ 
                                    color: editorColor,
                                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                                    textShadow: '0 2px 4px rgba(0,0,0,0.8)'
                                  }}
                                >
                                  {editorText}
                                </div>
                              )}

                              {/* Emoji Stickers */}
                              {editorEmoji && (
                                <span className="absolute top-3 right-3 text-3xl select-none filter drop-shadow">
                                  {editorEmoji}
                                </span>
                              )}

                              {/* Arrow Neon Overlay */}
                              {editorHasArrow && (
                                <div 
                                  className="absolute right-8 bottom-8 select-none animate-bounce"
                                  style={{ filter: `drop-shadow(0 0 8px ${editorArrowColor})` }}
                                >
                                  <span className={`${editorArrowSize} font-bold font-mono`} style={{ color: editorArrowColor }}>
                                    {editorArrowDirection}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Canvas control fields */}
                            <div className="space-y-3 text-xs">
                              <div>
                                <label className="text-[9px] font-bold text-zinc-400 uppercase">Text Overlay</label>
                                <input
                                  type="text"
                                  value={editorText}
                                  onChange={(e) => setEditorText(e.target.value)}
                                  className="w-full p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[9px] font-bold text-zinc-400 uppercase">Text Color</label>
                                  <select
                                    value={editorColor}
                                    onChange={(e) => setEditorColor(e.target.value)}
                                    className="w-full p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px]"
                                  >
                                    <option value="#14b8a6">Teal</option>
                                    <option value="#e11d48">Rose Red</option>
                                    <option value="#f59e0b">Amber Gold</option>
                                    <option value="#ffffff">White</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="text-[9px] font-bold text-zinc-400 uppercase">Stickers / Emoji</label>
                                  <select
                                    value={editorEmoji}
                                    onChange={(e) => setEditorEmoji(e.target.value)}
                                    className="w-full p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px]"
                                  >
                                    <option value="🔥">🔥 Hot</option>
                                    <option value="🆕">🆕 New</option>
                                    <option value="⭐">⭐ Star</option>
                                    <option value="💡">💡 Tip</option>
                                    <option value="💯">💯 100</option>
                                    <option value="">None</option>
                                  </select>
                                </div>
                              </div>

                              {/* Adjustments: Blur, Arrow, Filter */}
                              <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-zinc-150 dark:border-zinc-850">
                                <label className="flex items-center gap-1.5 font-bold text-zinc-650 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={editorHasArrow}
                                    onChange={(e) => setEditorHasArrow(e.target.checked)}
                                    className="rounded border-zinc-300 dark:border-zinc-850 text-teal-500 w-3.5 h-3.5"
                                  />
                                  Show Arrow
                                </label>

                                <label className="flex items-center gap-1.5 font-bold text-zinc-650 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={editorBlur}
                                    onChange={(e) => setEditorBlur(e.target.checked)}
                                    className="rounded border-zinc-300 dark:border-zinc-850 text-teal-500 w-3.5 h-3.5"
                                  />
                                  Background Blur
                                </label>

                                <select
                                  value={editorFilter}
                                  onChange={(e: any) => setEditorFilter(e.target.value)}
                                  className="p-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 rounded text-[9px] font-bold"
                                >
                                  <option value="none">Normal tone</option>
                                  <option value="cyber">Cyber Neon</option>
                                  <option value="warm">Warm Glow</option>
                                  <option value="cold">Cool Slate</option>
                                </select>
                              </div>

                              {/* Text Font & Size Controls */}
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[9px] font-bold text-zinc-400 uppercase">Text Font</label>
                                  <select
                                    value={editorTextFont}
                                    onChange={(e: any) => setEditorTextFont(e.target.value)}
                                    className="w-full p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px]"
                                  >
                                    <option value="font-sans">Sans Serif</option>
                                    <option value="font-serif">Serif</option>
                                    <option value="font-mono">Monospace</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold text-zinc-400 uppercase">Text Size</label>
                                  <select
                                    value={editorTextSize}
                                    onChange={(e: any) => setEditorTextSize(e.target.value)}
                                    className="w-full p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px]"
                                  >
                                    <option value="text-[11px]">Small</option>
                                    <option value="text-[14px]">Medium</option>
                                    <option value="text-[18px]">Large</option>
                                    <option value="text-[22px]">Extra Large</option>
                                  </select>
                                </div>
                              </div>

                              {/* Shape Customization Controls */}
                              <div className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2">
                                <span className="text-[9px] font-black text-zinc-400 uppercase block">Shape Accent</span>
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <label className="text-[8px] font-bold text-zinc-450 uppercase block mb-1">Type</label>
                                    <select
                                      value={editorShape}
                                      onChange={(e: any) => setEditorShape(e.target.value)}
                                      className="w-full p-1 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-855 rounded text-[9px]"
                                    >
                                      <option value="none">None</option>
                                      <option value="circle">Circle</option>
                                      <option value="rectangle">Rectangle</option>
                                      <option value="star">Star</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-bold text-zinc-450 uppercase block mb-1">Color</label>
                                    <input 
                                      type="color" 
                                      value={editorShapeColor}
                                      onChange={(e) => setEditorShapeColor(e.target.value)}
                                      className="w-full h-6 bg-transparent border-0 cursor-pointer p-0"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-bold text-zinc-455 uppercase block mb-1">Opacity ({editorShapeOpacity}%)</label>
                                    <input 
                                      type="range" 
                                      min={10} 
                                      max={100} 
                                      value={editorShapeOpacity}
                                      onChange={(e) => setEditorShapeOpacity(parseInt(e.target.value))}
                                      className="w-full accent-teal-500 h-1 rounded-full cursor-pointer bg-zinc-250 dark:bg-zinc-800"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Arrow Glow & Direction Controls */}
                              {editorHasArrow && (
                                <div className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2">
                                  <span className="text-[9px] font-black text-zinc-400 uppercase block">Arrow Preset Settings</span>
                                  <div className="grid grid-cols-3 gap-2">
                                    <div>
                                      <label className="text-[8px] font-bold text-zinc-455 uppercase block mb-1">Direction</label>
                                      <select
                                        value={editorArrowDirection}
                                        onChange={(e: any) => setEditorArrowDirection(e.target.value)}
                                        className="w-full p-1 bg-zinc-50 dark:bg-zinc-955 border border-zinc-850 rounded text-[9px]"
                                      >
                                        <option value="↙️">↙️ Bottom-Left</option>
                                        <option value="↘️">↘️ Bottom-Right</option>
                                        <option value="⬇️">⬇️ Down</option>
                                        <option value="➡️">➡️ Right</option>
                                        <option value="⬅️">⬅️ Left</option>
                                        <option value="⬆️">⬆️ Up</option>
                                        <option value="↗️">↗️ Top-Right</option>
                                        <option value="↖️">↖️ Top-Left</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-[8px] font-bold text-zinc-455 uppercase block mb-1">Size</label>
                                      <select
                                        value={editorArrowSize}
                                        onChange={(e: any) => setEditorArrowSize(e.target.value)}
                                        className="w-full p-1 bg-zinc-50 dark:bg-zinc-955 border border-zinc-855 rounded text-[9px]"
                                      >
                                        <option value="text-2xl">Small</option>
                                        <option value="text-3xl">Medium</option>
                                        <option value="text-4xl">Large</option>
                                        <option value="text-5xl">Extra Large</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-[8px] font-bold text-zinc-455 uppercase block mb-1">Glow Color</label>
                                      <input 
                                        type="color" 
                                        value={editorArrowColor}
                                        onChange={(e) => setEditorArrowColor(e.target.value)}
                                        className="w-full h-6 bg-transparent border-0 cursor-pointer p-0"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Sliders: Scale, Brightness, Contrast */}
                              <div className="space-y-2">
                                <div>
                                  <div className="flex justify-between text-[9px] font-bold text-zinc-400">
                                    <span>BRIGHTNESS ({editorBrightness}%)</span>
                                    <span>100% (Default)</span>
                                  </div>
                                  <input 
                                    type="range" 
                                    min={50} 
                                    max={150} 
                                    value={editorBrightness} 
                                    onChange={(e) => setEditorBrightness(parseInt(e.target.value))}
                                    className="w-full accent-teal-500 h-1 rounded-full cursor-pointer bg-zinc-200 dark:bg-zinc-800"
                                  />
                                </div>

                                <div>
                                  <div className="flex justify-between text-[9px] font-bold text-zinc-400">
                                    <span>CONTRAST ({editorContrast}%)</span>
                                    <span>100% (Default)</span>
                                  </div>
                                  <input 
                                    type="range" 
                                    min={50} 
                                    max={150} 
                                    value={editorContrast} 
                                    onChange={(e) => setEditorContrast(parseInt(e.target.value))}
                                    className="w-full accent-teal-500 h-1 rounded-full cursor-pointer bg-zinc-200 dark:bg-zinc-800"
                                  />
                                </div>

                                <div>
                                  <div className="flex justify-between text-[9px] font-bold text-zinc-400">
                                    <span>CROP ZOOM ({editorScale}%)</span>
                                    <span>100% (Normal)</span>
                                  </div>
                                  <input 
                                    type="range" 
                                    min={100} 
                                    max={200} 
                                    value={editorScale} 
                                    onChange={(e) => setEditorScale(parseInt(e.target.value))}
                                    className="w-full accent-teal-500 h-1 rounded-full cursor-pointer bg-zinc-200 dark:bg-zinc-800"
                                  />
                                </div>
                              </div>

                              <Button
                                onClick={() => setIsThumbnailConfirmed(true)}
                                className={`w-full py-2 font-bold text-[10px] uppercase tracking-wider rounded-xl flex items-center justify-center gap-1 ${
                                  isThumbnailConfirmed ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-teal-650 hover:bg-teal-700 text-white shadow'
                                }`}
                              >
                                {isThumbnailConfirmed ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                                {isThumbnailConfirmed ? 'Thumbnail confirmed' : 'Confirm adjustments'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* STEP 3: AI OPTIMIZATION */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-zinc-850 dark:text-white flex items-center gap-1.5">
                        <Sparkles className="w-5 h-5 text-teal-500 animate-pulse" />
                        Step 3: Tolee AI Manager Integration
                      </h3>
                      <span className="text-[10px] text-zinc-400 font-bold bg-teal-500/10 text-teal-650 px-2 py-0.5 rounded-lg border border-teal-500/10">Active Session</span>
                    </div>

                    {/* AI Actions toolbar grid */}
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">One-Click AI Optimization Assistants</p>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {[
                          { action: 'generate_title', label: 'AI Generate Title', icon: Sparkles },
                          { action: 'improve_title', label: 'AI Improve Title', icon: Wand2 },
                          { action: 'generate_description', label: 'AI Generate Description', icon: FileText },
                          { action: 'generate_keywords', label: 'AI SEO Keywords', icon: Tag },
                          { action: 'generate_hashtags', label: 'AI Generate Hashtags', icon: 'hash' },
                          { action: 'suggest_category', label: 'Suggest Category', icon: Layers },
                          { action: 'detect_language', label: 'Detect Language', icon: Languages },
                          { action: 'suggest_upload_time', label: 'Optimal Time', icon: Clock },
                          { action: 'estimate_reach', label: 'Estimate Reach', icon: BarChart3 },
                          { action: 'generate_thumbnail', label: 'AI Generate Thumb', icon: ImageIcon },
                          { action: 'generate_chapters', label: 'AI Auto Chapters', icon: Plus },
                          { action: 'auto_subtitle', label: 'AI Auto Subtitles', icon: MessageSquare },
                          { action: 'translate_subtitle', label: 'AI Translate Subs', icon: Globe },
                          { action: 'content_score', label: 'Recalculate Score', icon: RefreshCw }
                        ].map((btn) => {
                          const Icon = btn.icon === 'hash' ? () => <span className="font-mono text-xs font-black">#</span> : btn.icon;
                          return (
                            <button
                              key={btn.action}
                              type="button"
                              onClick={() => runAIAction(btn.action)}
                              className="p-2.5 bg-zinc-50 dark:bg-zinc-950 hover:bg-teal-500/5 hover:border-teal-500 border border-zinc-200 dark:border-zinc-850 rounded-xl text-left transition-all flex items-center gap-2 group cursor-pointer"
                            >
                              <div className="w-6.5 h-6.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:border-teal-555">
                                <Icon className="w-3.5 h-3.5 text-teal-505" />
                              </div>
                              <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 truncate">{btn.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="p-4 bg-teal-50/40 dark:bg-teal-950/10 border border-teal-500/10 rounded-2xl space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-wider text-teal-605">AI Video recommendations review</p>
                      <div className="space-y-2 text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
                        <p className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-green-500" /> Title score is healthy, contains target keyword "Next.js"</p>
                        <p className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-green-500" /> High description density with index chapters (Passed)</p>
                        <p className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-green-500" /> Resolution meets full high-definition requirements (Passed)</p>
                      </div>
                    </div>

                    {/* Tolee Groups Integration */}
                    <div className="border-t border-zinc-150 dark:border-zinc-850 pt-5 space-y-4">
                      <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Tolee Groups Selection</h4>
                        <p className="text-[10px] text-zinc-400 font-semibold mt-0.5">Publish your video content directly to relevant group feeds to increase discovery.</p>
                      </div>

                      {/* Search Groups bar */}
                      <div className="relative">
                        <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search Tolee groups..."
                          value={searchGroupQuery}
                          onChange={(e) => setSearchGroupQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none"
                        />
                      </div>

                      {/* Groups List */}
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {recommendedGroups
                          .filter((g: any) => g.name.toLowerCase().includes(searchGroupQuery.toLowerCase()))
                          .map((group: any) => (
                            <label 
                              key={group.id}
                              className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-colors ${
                                group.selected 
                                  ? 'border-teal-500 bg-teal-500/5' 
                                  : 'border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-950'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-lg bg-zinc-200 dark:bg-zinc-850 flex items-center justify-center font-bold text-xs text-teal-655 uppercase">
                                  {group.name[0]}
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{group.name}</p>
                                  <p className="text-[9px] text-zinc-400 font-semibold">{group.members.toLocaleString()} members</p>
                                </div>
                              </div>
                              <input
                                type="checkbox"
                                checked={group.selected}
                                onChange={() => {
                                  setRecommendedGroups((prev: any) => prev.map((g: any) => g.id === group.id ? { ...g, selected: !g.selected } : g));
                                }}
                                className="rounded border-zinc-300 dark:border-zinc-800 text-teal-500 focus:ring-teal-500 w-4 h-4"
                              />
                            </label>
                          ))
                        }
                      </div>
                    </div>

                    <div className="flex justify-between gap-4 pt-2">
                      <Button onClick={() => setCurrentStep(2)} variant="outline" className="rounded-xl text-xs px-5 border-zinc-200 dark:border-zinc-800 font-bold">
                        <ChevronLeft className="w-4 h-4 mr-1" /> Back
                      </Button>
                      <Button onClick={() => setCurrentStep(4)} className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-6 rounded-xl flex items-center gap-1 shadow">
                        Continue to Visibility <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 4: VISIBILITY & SETTINGS */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <h3 className="text-base font-bold text-zinc-850 dark:text-white flex items-center gap-1.5">
                      <Settings className="w-5 h-5 text-teal-500" />
                      Step 4: Visibility & Engagement Settings
                    </h3>

                    {/* COPPA Kids section */}
                    <div className="space-y-3 p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-2xl">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Audience Restrictions (Required)</span>
                        <p className="text-xs font-bold text-zinc-800 dark:text-zinc-250 mt-1">Is this video made for kids?</p>
                        <p className="text-[10px] text-zinc-400 font-semibold mt-0.5 leading-snug">Regardless of your location, you must comply with COPPA. You are required to tell us if your videos are made for kids.</p>
                      </div>

                      <div className="flex gap-4">
                        <label className={`flex-1 p-3 border rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                          isMadeForKids === 'yes' ? 'border-teal-500 bg-teal-500/5 font-bold text-teal-605' : 'border-zinc-200 dark:border-zinc-800 text-zinc-500'
                        }`}>
                          <span className="text-xs">Yes, it's made for kids</span>
                          <input 
                            type="radio" 
                            name="coppa" 
                            checked={isMadeForKids === 'yes'}
                            onChange={() => setIsMadeForKids('yes')}
                            className="text-teal-500 focus:ring-teal-500 w-4 h-4" 
                          />
                        </label>

                        <label className={`flex-1 p-3 border rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                          isMadeForKids === 'no' ? 'border-teal-500 bg-teal-500/5 font-bold text-teal-650' : 'border-zinc-200 dark:border-zinc-800 text-zinc-500'
                        }`}>
                          <span className="text-xs">No, not made for kids</span>
                          <input 
                            type="radio" 
                            name="coppa" 
                            checked={isMadeForKids === 'no'}
                            onChange={() => setIsMadeForKids('no')}
                            className="text-teal-500 focus:ring-teal-500 w-4 h-4" 
                          />
                        </label>
                      </div>
                    </div>

                    {/* Playlist Selection and inline creation */}
                    <div className="space-y-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Playlists</span>
                      
                      <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-2xl space-y-4">
                        {playlists.length === 0 ? (
                          <p className="text-[10px] text-zinc-450 font-bold">No playlists found.</p>
                        ) : (
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {playlists.map(p => (
                              <label key={p.id} className="flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-350 cursor-pointer">
                                <span>{p.name}</span>
                                <input
                                  type="checkbox"
                                  checked={selectedPlaylists.includes(p.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedPlaylists(prev => [...prev, p.id]);
                                    } else {
                                      setSelectedPlaylists(prev => prev.filter(id => id !== p.id));
                                    }
                                  }}
                                  className="rounded border-zinc-300 dark:border-zinc-800 text-teal-500 focus:ring-teal-500 w-4 h-4"
                                />
                              </label>
                            ))}
                          </div>
                        )}

                        {/* Inline playlist creation */}
                        <form onSubmit={handleCreatePlaylistSubmit} className="border-t border-zinc-200 dark:border-zinc-800 pt-3 flex gap-2">
                          <input 
                            type="text" 
                            required
                            placeholder="Playlist name..."
                            value={newPlaylistName}
                            onChange={(e) => setNewPlaylistName(e.target.value)}
                            className="flex-1 p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none"
                          />
                          <select
                            value={newPlaylistVisibility}
                            onChange={(e) => setNewPlaylistVisibility(e.target.value)}
                            className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px] font-bold"
                          >
                            <option value="public">Public</option>
                            <option value="private">Private</option>
                          </select>
                          <Button 
                            type="submit" 
                            disabled={isCreatingPlaylist}
                            className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-3 rounded-xl flex items-center justify-center"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </Button>
                        </form>
                      </div>
                    </div>

                    {/* Monetization Ready Toggle */}
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <DollarSign className="w-5 h-5 text-teal-505" />
                        <div>
                          <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Enable Monetization</p>
                          <p className="text-[9px] text-zinc-400">Generate ad revenues and premium subscriptions</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] uppercase tracking-wider font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">Coming Soon</span>
                        <input
                          type="checkbox"
                          disabled
                          checked={enableMonetization}
                          onChange={(e) => setEnableMonetization(e.target.checked)}
                          className="rounded border-zinc-300 dark:border-zinc-800 text-teal-500 w-4.5 h-4.5 opacity-50"
                        />
                      </div>
                    </div>

                    {/* Comments & Engagement controls */}
                    <div className="border-t border-zinc-150 dark:border-zinc-850 pt-5 space-y-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Engagement & Comment Policies</span>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-zinc-400 uppercase">Comments Moderation</label>
                          <select
                            value={commentPolicy}
                            onChange={(e: any) => setCommentPolicy(e.target.value)}
                            className="w-full p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl font-bold"
                          >
                            <option value="allow">Allow All Comments</option>
                            <option value="hold">Hold Comments for Review</option>
                            <option value="disable">Disable Comments</option>
                          </select>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                          <div className="space-y-0.5">
                            <p className="font-bold text-zinc-850">Show Likes Count</p>
                            <p className="text-[9px] text-zinc-400">Allow users to see total likes</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={allowLikes}
                            onChange={(e) => setAllowLikes(e.target.checked)}
                            className="rounded border-zinc-300 dark:border-zinc-800 text-teal-500 w-4 h-4"
                          />
                        </div>

                        <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                          <div className="space-y-0.5">
                            <p className="font-bold text-zinc-850">Allow Downloads</p>
                            <p className="text-[9px] text-zinc-400">Let creators download raw video file</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={allowDownload}
                            onChange={(e) => setAllowDownload(e.target.checked)}
                            className="rounded border-zinc-300 dark:border-zinc-800 text-teal-500 w-4 h-4"
                          />
                        </div>

                        <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                          <div className="space-y-0.5">
                            <p className="font-bold text-zinc-850">Allow Remix & Edits</p>
                            <p className="text-[9px] text-zinc-400">Let other creators slice audio</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={allowRemix}
                            onChange={(e) => setAllowRemix(e.target.checked)}
                            className="rounded border-zinc-300 dark:border-zinc-800 text-teal-500 w-4 h-4"
                          />
                        </div>

                        <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl sm:col-span-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-zinc-855">Allow Duet / Repost</p>
                              <span className="text-[8px] uppercase tracking-wider font-black text-amber-500 bg-amber-500/10 px-1 rounded">Coming Soon</span>
                            </div>
                            <p className="text-[9px] text-zinc-400">Let other creators split-screen this post</p>
                          </div>
                          <input
                            type="checkbox"
                            disabled
                            checked={allowDuet}
                            className="rounded border-zinc-300 dark:border-zinc-800 text-teal-500 w-4.5 h-4.5 opacity-50"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Subtitle setup section */}
                    <div className="border-t border-zinc-150 dark:border-zinc-850 pt-5 space-y-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Subtitles & Captions</span>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl space-y-3">
                          <span className="text-[9px] font-bold text-zinc-450 uppercase block">Subtitle Sources</span>
                          <div className="space-y-2 text-xs">
                            <label className="flex items-center gap-2 cursor-pointer font-semibold text-zinc-700">
                              <input 
                                type="radio" 
                                name="subSource" 
                                checked={subtitleSource === 'none'}
                                onChange={() => setSubtitleSource('none')}
                                className="text-teal-500" 
                              />
                              No Subtitles
                            </label>
                            
                            <label className="flex items-center gap-2 cursor-pointer font-semibold text-zinc-700">
                              <input 
                                type="radio" 
                                name="subSource" 
                                checked={subtitleSource === 'srt'}
                                onChange={() => setSubtitleSource('srt')}
                                className="text-teal-500" 
                              />
                              Upload .SRT File
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer font-semibold text-zinc-700">
                              <input 
                                type="radio" 
                                name="subSource" 
                                checked={subtitleSource === 'auto'}
                                onChange={() => setSubtitleSource('auto')}
                                className="text-teal-500" 
                              />
                              AI Auto Generate
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer font-semibold text-zinc-700">
                              <input 
                                type="radio" 
                                name="subSource" 
                                checked={subtitleSource === 'manual'}
                                onChange={() => setSubtitleSource('manual')}
                                className="text-teal-500" 
                              />
                              Manual Caption Editor
                            </label>
                          </div>
                        </div>

                        {/* Source Specific editor templates */}
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl flex items-center justify-center">
                          {subtitleSource === 'none' && (
                            <p className="text-[10px] text-zinc-400 font-bold">Configure options to activate caption workflows.</p>
                          )}

                          {subtitleSource === 'srt' && (
                            <div className="space-y-2 text-center w-full">
                              <p className="text-[10px] font-bold text-zinc-500">Choose .SRT or WebVTT file</p>
                              <input 
                                type="file" 
                                accept=".srt,.vtt"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    setUploadedSrtName(e.target.files[0].name);
                                  }
                                }}
                                className="text-[10px] mx-auto"
                              />
                              {uploadedSrtName && (
                                <p className="text-[10px] text-green-500 font-bold flex items-center justify-center gap-1">
                                  <Check className="w-3.5 h-3.5" /> {uploadedSrtName}
                                </p>
                              )}
                            </div>
                          )}

                          {subtitleSource === 'auto' && (
                            <div className="space-y-2 text-center">
                              <p className="text-[10px] font-bold text-zinc-500">Run Tolee AI speech-to-text algorithm</p>
                              <Button 
                                onClick={() => runAIAction('auto_subtitle')}
                                className="bg-teal-500/10 text-teal-605 border border-teal-500/20 text-xs font-bold px-4 py-2 rounded-xl"
                              >
                                Run AI speech analysis
                              </Button>
                            </div>
                          )}

                          {subtitleSource === 'manual' && (
                            <div className="space-y-2 w-full">
                              <p className="text-[9px] font-bold text-zinc-405 uppercase">Manual Subtitle Timing Editor</p>
                              <textarea
                                rows={3}
                                value={manualSubtitles}
                                onChange={(e) => setManualSubtitles(e.target.value)}
                                placeholder="e.g. [00:10] Hi, welcome to the course..."
                                className="w-full p-2 bg-white dark:bg-zinc-900 border border-zinc-200 rounded-xl text-[10px]"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Visibility & Schedule Selector */}
                    <div className="border-t border-zinc-150 dark:border-zinc-850 pt-5 space-y-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Visibility & Schedule</span>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Channel selector options */}
                        <div className="space-y-2.5">
                          {[
                            { val: 'public', label: 'Public', desc: 'Anyone can view this video' },
                            { val: 'followers', label: 'Followers Only', desc: 'Only your followers can view' },
                            { val: 'members', label: 'Group Members Only', desc: 'Only select group members can view' },
                            { val: 'private', label: 'Private', desc: 'Only you can view this video' },
                            { val: 'unlisted', label: 'Unlisted', desc: 'Anyone with the link can view' }
                          ].map(item => (
                            <label 
                              key={item.val} 
                              className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${
                                visibility === item.val ? 'border-teal-500 bg-teal-505/5' : 'border-zinc-200 dark:border-zinc-800'
                              }`}
                            >
                              <input 
                                type="radio" 
                                name="visibility" 
                                checked={visibility === item.val} 
                                onChange={() => {
                                  setVisibility(item.val);
                                  setScheduleEnabled(false);
                                }}
                                className="text-teal-500 focus:ring-teal-500 w-4 h-4 mt-0.5" 
                              />
                              <div>
                                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{item.label}</p>
                                <p className="text-[10px] text-zinc-450 mt-0.5">{item.desc}</p>
                              </div>
                            </label>
                          ))}
                        </div>

                        {/* Scheduling picker block */}
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-2xl space-y-4">
                          <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-zinc-800">
                            <input
                              type="checkbox"
                              checked={scheduleEnabled}
                              onChange={(e) => {
                                setScheduleEnabled(e.target.checked);
                                if (e.target.checked) setVisibility('schedule');
                                else setVisibility('public');
                              }}
                              className="rounded border-zinc-300 dark:border-zinc-800 text-teal-500 w-4.5 h-4.5"
                            />
                            Schedule Release Publish
                          </label>

                          {scheduleEnabled && (
                            <div className="space-y-3.5 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                              <div>
                                <label className="text-[9px] font-bold text-zinc-400 uppercase">Select Release Date</label>
                                <input 
                                  type="date" 
                                  value={scheduleDate}
                                  onChange={(e) => setScheduleDate(e.target.value)}
                                  className="w-full p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 rounded-xl text-xs font-bold" 
                                />
                              </div>

                              <div>
                                <label className="text-[9px] font-bold text-zinc-400 uppercase">Select Release Time</label>
                                <input 
                                  type="time" 
                                  value={scheduleTime}
                                  onChange={(e) => setScheduleTime(e.target.value)}
                                  className="w-full p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 rounded-xl text-xs font-bold" 
                                />
                              </div>

                              <div>
                                <label className="text-[9px] font-bold text-zinc-400 uppercase">Select Time Zone</label>
                                <select
                                  value={scheduleTimezone}
                                  onChange={(e) => setScheduleTimezone(e.target.value)}
                                  className="w-full p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 rounded-xl text-xs font-bold"
                                >
                                  <option value="UTC">UTC (GMT+0)</option>
                                  <option value="IST">IST (GMT+5:30)</option>
                                  <option value="EST">EST (GMT-5)</option>
                                  <option value="PST">PST (GMT-8)</option>
                                </select>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between gap-4 pt-2">
                      <Button onClick={() => setCurrentStep(3)} variant="outline" className="rounded-xl text-xs px-5 border-zinc-200 dark:border-zinc-800 font-bold">
                        <ChevronLeft className="w-4 h-4 mr-1" /> Back
                      </Button>
                      <Button 
                        disabled={isMadeForKids === null}
                        onClick={() => setCurrentStep(5)} 
                        className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-6 rounded-xl flex items-center gap-1 shadow"
                      >
                        Continue to Preview <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 5: PREVIEW & PUBLISH */}
                {currentStep === 5 && (
                  <div className="space-y-6">
                    <h3 className="text-base font-bold text-zinc-850 dark:text-white flex items-center gap-1.5">
                      <PlayCircle className="w-5 h-5 text-teal-500 animate-bounce" />
                      Step 5: Review & Publish Video
                    </h3>

                    {/* Transcoding resolution badges */}
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-2xl space-y-3">
                      <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Resolution Transcoding Ready Badges</span>
                        <span className="text-[10px] text-teal-605 font-bold">Est: {processingStatus.estTime}</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border ${
                          processingStatus.sd ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-zinc-200 text-zinc-400 border-transparent'
                        }`}>SD Ready</span>
                        
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border ${
                          processingStatus.hd ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-zinc-200 text-zinc-400 border-transparent animate-pulse'
                        }`}>HD Ready</span>

                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border ${
                          processingStatus.fhd ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-zinc-200 text-zinc-400 border-transparent'
                        }`}>Full HD Ready</span>

                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border ${
                          processingStatus.qhd ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-zinc-200 text-zinc-400 border-transparent'
                        }`}>2K Ready</span>

                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border ${
                          processingStatus.uhd ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-zinc-200 text-zinc-400 border-transparent'
                        }`}>4K Ready</span>
                      </div>
                    </div>

                    {/* Copyright scan results */}
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-2xl space-y-3.5">
                      <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5 text-zinc-400" />
                          Copyright Scanner Scan
                        </span>
                        {copyrightScan.status === 'scanning' ? (
                          <span className="text-[9px] text-amber-505 font-bold flex items-center gap-1 animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" /> Scanning files...
                          </span>
                        ) : copyrightScan.status === 'done' ? (
                          <span className="text-[9px] text-green-500 font-bold bg-green-500/10 px-2.5 py-0.5 rounded-lg border border-green-500/10 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Safe
                          </span>
                        ) : (
                          <span className="text-[9px] text-zinc-400 font-bold">Idle</span>
                        )}
                      </div>

                      {copyrightScan.status !== 'idle' && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[10px] font-bold text-zinc-650">
                          <div className="flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-green-500" />
                            <span>Video Hash Check</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-green-500" />
                            <span>Audio Hash Check</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-green-500" />
                            <span>Copyright Music Scan</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-green-500" />
                            <span>Thumbnail Check</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-green-500" />
                            <span>Description Scan</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Feed Placement Mockup Preview Tab panel */}
                    <div className="space-y-3">
                      <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Visual Placement Mockup Previews</span>
                      
                      <div className="flex gap-1.5 border-b border-zinc-200 dark:border-zinc-800 pb-1.5 overflow-x-auto">
                        {[
                          { val: 'screen', label: 'Tolee Screen' },
                          { val: 'feed', label: 'Feed Post' },
                          { val: 'reels', label: 'Reels Tab' },
                          { val: 'profile', label: 'Profile Tab' },
                          { val: 'group', label: 'Group Feed' }
                        ].map(t => (
                          <button
                            key={t.val}
                            type="button"
                            onClick={() => setActivePreviewTab(t.val as any)}
                            className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg border focus:outline-none transition-all ${
                              activePreviewTab === t.val 
                                ? 'bg-teal-500/10 border-teal-500 text-teal-655 font-bold shadow-sm' 
                                : 'border-zinc-200 dark:border-zinc-850 hover:bg-zinc-100 text-zinc-450'
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>

                      {/* Mockup panels templates */}
                      <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-855 rounded-2xl flex items-center justify-center min-h-64 shadow-inner">
                        {activePreviewTab === 'screen' && (
                          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-md">
                            <div className="aspect-video relative bg-black flex items-center justify-center">
                              <img src={selectedThumbnailUrl || MOCK_THUMBNAIL_TEMPLATES[0]} className="w-full h-full object-cover" />
                              <PlayCircle className="w-12 h-12 text-white/95 absolute" />
                            </div>
                            <div className="p-4 space-y-2">
                              <h4 className="text-xs font-black text-zinc-900 dark:text-white leading-snug">{title || 'Untitled Video'}</h4>
                              <div className="flex items-center gap-2">
                                <Avatar className="w-6 h-6">
                                  <AvatarImage src={session?.user?.image || undefined} />
                                  <AvatarFallback className="text-[8px]">U</AvatarFallback>
                                </Avatar>
                                <span className="text-[10px] text-zinc-700 dark:text-zinc-300 font-bold">{session?.user?.name || 'Creator'}</span>
                              </div>
                              <p className="text-[9px] text-zinc-450 line-clamp-2 leading-relaxed bg-zinc-50 dark:bg-zinc-950 p-2 rounded-xl border border-zinc-100 dark:border-zinc-850">{description || 'No description provided'}</p>
                            </div>
                          </div>
                        )}

                        {activePreviewTab === 'feed' && (
                          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm p-4 space-y-3">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-7 h-7">
                                <AvatarImage src={session?.user?.image || undefined} />
                                <AvatarFallback className="text-[8px]">U</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-[10px] font-black text-zinc-900 dark:text-white">{session?.user?.name || 'Creator'}</p>
                                <p className="text-[8px] text-zinc-400">Just now • Tolee Screen</p>
                              </div>
                            </div>
                            <p className="text-[10px] text-zinc-650 dark:text-zinc-300 font-semibold line-clamp-2">{title}</p>
                            <div className="aspect-video relative rounded-xl overflow-hidden bg-black">
                              <img src={selectedThumbnailUrl || MOCK_THUMBNAIL_TEMPLATES[0]} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-850 pt-2 text-[10px] font-bold text-zinc-400">
                              <span className="flex items-center gap-1"><ThumbsUp className="w-3.5 h-3.5" /> Like</span>
                              <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> Comment</span>
                              <span className="flex items-center gap-1"><Share2 className="w-3.5 h-3.5" /> Share</span>
                            </div>
                          </div>
                        )}

                        {activePreviewTab === 'reels' && (
                          <div className="w-48 aspect-[9/16] relative rounded-3xl overflow-hidden bg-black shadow-lg">
                            <img src={selectedThumbnailUrl || MOCK_THUMBNAIL_TEMPLATES[0]} className="w-full h-full object-cover opacity-80" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3.5 space-y-2 text-white">
                              <div className="flex items-center gap-2">
                                <Avatar className="w-6 h-6 border border-white/20">
                                  <AvatarImage src={session?.user?.image || undefined} />
                                  <AvatarFallback className="text-[8px]">U</AvatarFallback>
                                </Avatar>
                                <span className="text-[8px] font-black truncate">{session?.user?.name || 'Creator'}</span>
                              </div>
                              <p className="text-[9px] font-bold truncate">{title}</p>
                              <div className="flex items-center justify-between text-[8px] opacity-70">
                                <span>❤️ 0 likes</span>
                                <span>💬 0 comments</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {activePreviewTab === 'profile' && (
                          <div className="grid grid-cols-3 gap-2 w-full max-w-sm">
                            {[1, 2, 3].map(i => (
                              <div key={i} className="aspect-video relative bg-zinc-100 rounded-lg overflow-hidden border border-zinc-200">
                                <img src={i === 1 ? (selectedThumbnailUrl || MOCK_THUMBNAIL_TEMPLATES[0]) : MOCK_THUMBNAIL_TEMPLATES[i]} className="w-full h-full object-cover" />
                                <div className="absolute bottom-1 right-1 bg-black/70 px-1 py-0.5 rounded text-[8px] font-mono text-white">09:12</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {activePreviewTab === 'group' && (
                          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm p-4 space-y-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 bg-teal-500/10 text-teal-650 rounded-lg flex items-center justify-center font-bold text-xs">G</div>
                              <div>
                                <p className="text-[10px] font-black text-zinc-900 dark:text-white">NextJS Developers Group</p>
                                <p className="text-[8px] text-zinc-400">Shared by {session?.user?.name || 'Creator'} • Just now</p>
                              </div>
                            </div>
                            <div className="aspect-video relative rounded-xl overflow-hidden bg-black">
                              <img src={selectedThumbnailUrl || MOCK_THUMBNAIL_TEMPLATES[0]} className="w-full h-full object-cover" />
                            </div>
                            <h5 className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200 line-clamp-1">{title}</h5>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Publish Submit Trigger */}
                    {isReel && (
                      <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-xs flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Reels Auto-Routing Active</p>
                          <p className="text-[10px] opacity-90 mt-0.5">Since this is a vertical video format, it will be saved to the database as a Reel and shown on both Reels and main Feed streams.</p>
                        </div>
                      </div>
                    )}

                    {/* Active Upload/Processing Progress in Step 5 */}
                    {(uploadStatus === 'uploading' || uploadStatus === 'processing') && (
                      <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-4 mb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 text-teal-505 animate-spin" />
                            <div>
                              <p className="text-xs font-bold text-zinc-800 dark:text-white">
                                {uploadStatus === 'uploading' 
                                  ? 'Uploading video file...' 
                                  : 'Processing streams...'}
                              </p>
                              <p className="text-[9px] text-zinc-400 mt-0.5">
                                Size: {selectedFile ? (selectedFile.size / (1024 * 1024)).toFixed(1) : '0'} MB | Format: {selectedFile ? selectedFile.name.split('.').pop()?.toUpperCase() : 'MP4'}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-black text-teal-650 dark:text-teal-400">{uploadProgress}%</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                          <div className="bg-teal-550 h-full rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                        </div>

                        {uploadStatus === 'uploading' && !isSimulatedUpload && (
                          <div className="grid grid-cols-2 gap-4 text-[10px] font-bold text-zinc-500">
                            <div>
                              <p className="text-[9px] text-zinc-400 font-medium">SPEED</p>
                              <p className="text-zinc-800 dark:text-zinc-200">{uploadSpeed}</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-zinc-400 font-medium">EST. TIME REMAINING</p>
                              <p className="text-zinc-800 dark:text-zinc-200">{uploadTimeRemaining || 'Calculating...'}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Error Banner in Step 5 */}
                    {uploadStatus === 'error' && errorMessage && (
                      <div className="mb-4 p-4 bg-red-500/10 border border-red-500/25 text-red-650 dark:text-red-400 rounded-2xl text-xs space-y-1.5">
                        <p className="font-bold flex items-center gap-1.5">
                          <ShieldAlert className="w-4 h-4" />
                          Publishing Error
                        </p>
                        <p className="opacity-95 leading-relaxed">{errorMessage}</p>
                      </div>
                    )}

                    <form onSubmit={handleStartPublish} className="pt-2 flex gap-3">
                      <Button
                        type="submit"
                        disabled={uploadStatus === 'uploading' || uploadStatus === 'processing'}
                        className="flex-1 py-5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl text-xs shadow-lg shadow-teal-650/15"
                      >
                        {uploadStatus === 'uploading' || uploadStatus === 'processing' ? (
                          <span className="flex items-center gap-1.5 justify-center">
                            <Loader2 className="w-4 h-4 animate-spin" /> Publishing Video...
                          </span>
                        ) : (
                          <span>Publish Video Now</span>
                        )}
                      </Button>
                      
                      <Button
                        type="button"
                        onClick={resetForm}
                        variant="outline"
                        className="rounded-2xl text-xs px-6 border-zinc-200 dark:border-zinc-850 font-bold"
                      >
                        Reset Wizard
                      </Button>
                    </form>
                  </div>
                )}

              </div>

              {/* Right Side Wizard Status Panel */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* AI Optimizer Checklist & SEO score gauge */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 p-5 rounded-3xl shadow-sm space-y-5">
                  <h4 className="text-xs font-bold text-zinc-850 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-teal-500" />
                    AI SEO Score Analyzer
                  </h4>

                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 flex items-center justify-center bg-teal-50 dark:bg-teal-950/20 rounded-full border border-teal-500/10">
                      <span className="text-lg font-black text-teal-650 dark:text-teal-400">{aiScore}</span>
                      <span className="text-[8px] text-zinc-400 absolute bottom-2">/100</span>
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-zinc-850 dark:text-white">Metadata CTR Score</h5>
                      <p className="text-[9px] text-zinc-400 leading-snug mt-0.5">
                        {aiScore >= 90 
                          ? 'Outstanding metadata settings. Distribution potential maximized!' 
                          : 'Optimizing title keywords and description density will improve reach.'}
                      </p>
                    </div>
                  </div>

                  {/* Checklist item details */}
                  <div className="space-y-2 border-t border-zinc-150 dark:border-zinc-850 pt-3">
                    {seoAnalysis.suggestions.map((sug: string, i: number) => (
                      <div key={i} className="flex items-start gap-1.5 text-[10px] font-semibold text-zinc-650 dark:text-zinc-400">
                        <AlertCircle className="w-3.5 h-3.5 text-teal-500 flex-shrink-0 mt-0.5" />
                        <span>{sug}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Video Info Card details preview */}
                {selectedFile && (
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-3xl shadow-sm overflow-hidden">
                    <div className="aspect-video relative bg-black">
                      <img src={selectedThumbnailUrl || MOCK_THUMBNAIL_TEMPLATES[0]} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-4.5 space-y-2">
                      <span className="text-[8px] uppercase tracking-wider font-black text-teal-605 bg-teal-500/10 px-2 py-0.5 rounded-lg">Draft Video metadata</span>
                      <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 line-clamp-2 leading-snug">{title || 'Untitled Draft'}</h4>
                      
                      <div className="grid grid-cols-2 gap-2 text-[9px] font-bold text-zinc-500 border-t border-zinc-100 dark:border-zinc-850 pt-3">
                        <div>
                          <p className="text-zinc-400 font-medium">CATEGORY</p>
                          <p className="text-zinc-850 dark:text-zinc-200">{category}</p>
                        </div>
                        <div>
                          <p className="text-zinc-400 font-medium">VISIBILITY</p>
                          <p className="text-zinc-855 dark:text-zinc-200 capitalize">{visibility}</p>
                        </div>
                        <div>
                          <p className="text-zinc-400 font-medium">MADE FOR KIDS</p>
                          <p className="text-zinc-850 dark:text-zinc-200 capitalize">{isMadeForKids || 'Not Set'}</p>
                        </div>
                        <div>
                          <p className="text-zinc-400 font-medium">FORMAT</p>
                          <p className="text-zinc-855 dark:text-zinc-200">{isReel ? 'Reel (Vertical)' : 'Screen (Horizontal)'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Success publishing status dialog */}
            {uploadStatus === 'done' && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full text-center space-y-6 shadow-2xl">
                  <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-zinc-900 dark:text-white">✅ Your video has been published successfully!</h3>
                    <p className="text-xs text-zinc-400">The video registry tables are updated and ad insertion layers are registered.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    {savedVideoId ? (
                      <Link 
                        href={`/screen/watch/${savedVideoId}`} 
                        className="p-3 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center font-bold text-xs"
                      >
                        <PlayCircle className="w-5 h-5 text-teal-505 mb-1" />
                        View Video
                      </Link>
                    ) : (
                      <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-2xl flex flex-col items-center justify-center font-bold text-xs opacity-50">
                        <PlayCircle className="w-5 h-5 text-zinc-400 mb-1" />
                        View Video
                      </div>
                    )}

                    <button 
                      onClick={() => {
                        const watchUrl = `${window.location.origin}/screen/watch/${savedVideoId}`;
                        navigator.clipboard.writeText(watchUrl);
                        alert('Video link copied to clipboard!');
                      }}
                      className="p-3 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center font-bold text-xs cursor-pointer"
                    >
                      <Share2 className="w-5 h-5 text-teal-500 mb-1" />
                      Share Video
                    </button>

                    <button 
                      onClick={() => {
                        resetForm();
                        setActiveTab('content');
                      }}
                      className="p-3 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center font-bold text-xs cursor-pointer"
                    >
                      <Paintbrush className="w-5 h-5 text-teal-505 mb-1" />
                      Edit Video
                    </button>

                    <button 
                      onClick={() => {
                        resetForm();
                        setActiveTab('dashboard');
                      }}
                      className="p-3 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center font-bold text-xs cursor-pointer"
                    >
                      <BarChart3 className="w-5 h-5 text-teal-505 mb-1" />
                      View Analytics
                    </button>
                  </div>

                  <Button 
                    onClick={() => {
                      resetForm();
                      setActiveTab('content');
                    }}
                    className="w-full py-4.5 bg-zinc-900 hover:bg-zinc-850 dark:bg-zinc-800 text-white font-bold text-xs rounded-2xl shadow"
                  >
                    Go back to library
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

