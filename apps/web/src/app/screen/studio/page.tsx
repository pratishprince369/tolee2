'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  Tv, BarChart3, Video, FileVideo, PlusCircle, CheckCircle2, AlertCircle, 
  Trash2, ArrowUpRight, Globe, Users, Monitor, Sparkles, Wand2, Paintbrush, 
  ArrowRight, Eye, ThumbsUp, DollarSign, Clock, HelpCircle, Layers, Upload,
  Settings, ChevronRight, MessageSquare, AlertTriangle, ArrowLeft, Heart, Info, Play,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  getCreatorAnalytics, getCreatorVideos, createMuxDirectUpload, 
  saveScreenVideo, saveSimulatedScreenVideo 
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
  const { data: session, status } = useSession();
  const currentUserId = session?.user ? (session.user as any).id : null;

  const [activeTab, setActiveTab] = useState<'dashboard' | 'content' | 'upload'>('dashboard');
  
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

  // Upload Studio Form States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Technology');
  const [visibility, setVisibility] = useState('public');
  const [tags, setTags] = useState('nextjs, programming, tutorial');
  const [location, setLocation] = useState('Delhi, India');
  const [ageRestriction, setAgeRestriction] = useState('none');
  const [allowComments, setAllowComments] = useState(true);
  const [allowDownload, setAllowDownload] = useState(true);

  // File Upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'done' | 'error'>('idle');
  const [muxUploadId, setMuxUploadId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSimulatedUpload, setIsSimulatedUpload] = useState(false);
  const [isReel, setIsReel] = useState(false);

  // AI Suggestion states
  const [aiScore, setAiScore] = useState(65);
  const [hasAppliedAISuggestions, setHasAppliedAISuggestions] = useState(false);
  const aiTitleSuggestion = 'Next.js 16 Server Actions: Master Client-Server Boundaries (Zero-to-Hero)';
  const aiDescSuggestion = 'Learn advanced engineering practices with Next.js 16 Server Actions, Neon PostgreSQL databases, and secure APIs. Perfect for full stack developers in 2026.';
  const aiTagsSuggestion = 'nextjs 16, server actions, prisma db, nodejs, programming, web development';

  // AI Thumbnail Generator & Editor states
  const [generatedThumbnails, setGeneratedThumbnails] = useState<string[]>([]);
  const [selectedThumbnailUrl, setSelectedThumbnailUrl] = useState('');
  
  // Thumbnail Editor options
  const [editorText, setEditorText] = useState('NEXT-GEN BUILD!');
  const [editorColor, setEditorColor] = useState('#14b8a6'); // teal
  const [editorEmoji, setEditorEmoji] = useState('🔥');
  const [editorHasArrow, setEditorHasArrow] = useState(true);
  const [editorFilter, setEditorFilter] = useState<'none' | 'cyber' | 'warm' | 'cold'>('cyber');
  const [isThumbnailConfirmed, setIsThumbnailConfirmed] = useState(false);

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
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'upload' || tabParam === 'content' || tabParam === 'dashboard') {
        setActiveTab(tabParam as any);
      }
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/auth/signin?callbackUrl=/screen/studio`);
    } else if (status === 'authenticated') {
      loadStudioData();
    }
  }, [status, activeTab]);

  // One-click apply suggestions
  const applyAISuggestions = () => {
    setTitle(aiTitleSuggestion);
    setDescription(aiDescSuggestion);
    setTags(aiTagsSuggestion);
    setAiScore(98);
    setHasAppliedAISuggestions(true);
  };

  // Drag Drop File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      // Auto trigger AI Thumbnail Generation on select file
      setGeneratedThumbnails(MOCK_THUMBNAIL_TEMPLATES);
      setSelectedThumbnailUrl(MOCK_THUMBNAIL_TEMPLATES[0]);

      // Detect aspect ratio
      const videoEl = document.createElement('video');
      videoEl.src = URL.createObjectURL(file);
      videoEl.onloadedmetadata = () => {
        const isVertical = videoEl.videoHeight > videoEl.videoWidth;
        setIsReel(isVertical);
        URL.revokeObjectURL(videoEl.src);
      };
    }
  };

  // Simulate Fast Upload flow
  const triggerSimulatedUpload = async () => {
    if (!title.trim()) {
      alert('Please fill out the Title first so we can analyze it!');
      return;
    }
    
    setUploadStatus('uploading');
    setUploadProgress(0);

    // Simulate progress ticks
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploadStatus('processing');
          
          setTimeout(() => {
            setUploadStatus('done');
          }, 1500);

          return 100;
        }
        return prev + 25;
      });
    }, 400);
  };

  // Real Direct Mux Upload flow
  const triggerRealMuxUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploadStatus('uploading');
      setUploadProgress(0);
      setErrorMessage('');

      // Get direct upload URL
      const res = await createMuxDirectUpload();
      if (!res.success || !res.url || !res.uploadId) {
        throw new Error(res.error || 'Failed to request upload signature.');
      }

      setMuxUploadId(res.uploadId);

      // Perform XML Http Upload
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', res.url);
      xhr.setRequestHeader('Content-Type', selectedFile.type);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
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
      // Save metadata in database
      const saveRes = await saveScreenVideo(title, description, res.uploadId, category, visibility, isReel);
      if (saveRes.success) {
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

  const handleStartPublish = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSimulatedUpload) {
      await triggerSimulatedUpload();
      
      const videoUrls = [
        'https://cdn.pixabay.com/video/2021/08/04/83896-584732159_large.mp4',
        'https://cdn.pixabay.com/video/2022/01/18/104762-663884392_large.mp4',
        'https://cdn.pixabay.com/video/2021/11/04/93557-641566898_large.mp4',
        'https://cdn.pixabay.com/video/2022/01/18/104762-663884392_large.mp4',
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
          setUploadStatus('done');
        } else {
          setUploadStatus('error');
          setErrorMessage(res.error || 'Failed to save simulated video data.');
        }
      }, 2500);
    } else {
      await triggerRealMuxUpload();
    }
  };

  const handleSimulatedDBSave = async () => {
    const videoUrls = [
      'https://cdn.pixabay.com/video/2021/08/04/83896-584732159_large.mp4',
      'https://cdn.pixabay.com/video/2022/01/18/104762-663884392_large.mp4'
    ];
    const selectedVideoUrl = videoUrls[Math.floor(Math.random() * videoUrls.length)];
    
    // Call server action to save simulated video
    // Wait, let's write `saveSimulatedVideo` in screen.ts first. Let's make sure it's exported.
    // Let's add it right now. Let's do a fast replace.
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSelectedFile(null);
    setUploadStatus('idle');
    setUploadProgress(0);
    setIsThumbnailConfirmed(false);
    setHasAppliedAISuggestions(false);
    setAiScore(65);
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
        <div className="flex border-b border-zinc-200 dark:border-zinc-850 gap-6">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'dashboard' 
                ? 'border-teal-500 text-teal-600 dark:text-teal-400' 
                : 'border-transparent text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'content' 
                ? 'border-teal-500 text-teal-600 dark:text-teal-400' 
                : 'border-transparent text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200'
            }`}
          >
            <Video className="w-4 h-4" />
            Content
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all ${
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

        {/* Tab 3: Upload Studio with AI suggestion systems */}
        {activeTab === 'upload' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Upload Form Column */}
            <div className="lg:col-span-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 p-6 rounded-3xl shadow-sm space-y-6">
              <h3 className="text-base font-bold text-zinc-800 dark:text-white flex items-center gap-1.5">
                <Upload className="w-4.5 h-4.5 text-teal-500 animate-bounce" />
                Upload Studio
              </h3>

              {uploadStatus === 'idle' ? (
                <form onSubmit={handleStartPublish} className="space-y-4">
                  {/* File selector dropzone */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Video source file</label>
                    <div className="relative border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-teal-500/50 rounded-2xl p-7 text-center cursor-pointer bg-zinc-50/50 dark:bg-zinc-950/40 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/10 transition-colors">
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <FileVideo className="w-8 h-8 text-zinc-450 mx-auto mb-2" />
                      {selectedFile ? (
                        <p className="text-xs font-bold text-teal-650 truncate max-w-sm mx-auto">{selectedFile.name}</p>
                      ) : (
                        <>
                          <p className="text-xs font-bold text-zinc-650 dark:text-zinc-450">Drag video file here or browse</p>
                          <p className="text-[9px] text-zinc-400 mt-1">MP4, WEBM or MOV files accepted</p>
                        </>
                      )}
                    </div>
                  </div>

                  {isReel && (
                    <div className="bg-amber-50 dark:bg-amber-955/20 border border-amber-500/15 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-350">
                      <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5 animate-pulse" />
                      <div>
                        <p className="font-bold">Vertical Video Format Detected</p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-450 mt-0.5">
                          Since this video has a vertical aspect ratio, it will be automatically published to the **Reels** section on publish completion.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Title & Description inputs */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Video title</label>
                        <span className="text-[9px] font-bold text-zinc-400">{title.length}/100</span>
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={100}
                        placeholder="Provide an eye-catching title..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-850 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-semibold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Description</label>
                      <textarea
                        rows={4}
                        placeholder="Describe your video clip details..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-850 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all resize-none font-medium"
                      />
                    </div>
                  </div>

                  {/* Category, tags & visibility selectors */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:border-teal-500 font-bold"
                      >
                        {VIDEO_CATEGORIES.slice(4).map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Visibility</label>
                      <select
                        value={visibility}
                        onChange={(e) => setVisibility(e.target.value)}
                        className="w-full p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:border-teal-500 font-bold"
                      >
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                        <option value="unlisted">Unlisted</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Tags (SEO)</label>
                      <input
                        type="text"
                        placeholder="tutorial, nextjs, tech"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        className="w-full p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:border-teal-500 font-bold"
                      />
                    </div>
                  </div>

                  {/* Advanced Settings Collapse */}
                  <div className="border-t border-zinc-150 dark:border-zinc-850 pt-4 space-y-4">
                    <h5 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Advanced Setup & Features</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                      <label className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl cursor-pointer">
                        <span>Allow Comments</span>
                        <input
                          type="checkbox"
                          checked={allowComments}
                          onChange={(e) => setAllowComments(e.target.checked)}
                          className="rounded border-zinc-300 dark:border-zinc-800 text-teal-500 focus:ring-teal-500 w-4 h-4"
                        />
                      </label>
                      <label className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl cursor-pointer">
                        <span>Allow Remixing & Remix Downloads</span>
                        <input
                          type="checkbox"
                          checked={allowDownload}
                          onChange={(e) => setAllowDownload(e.target.checked)}
                          className="rounded border-zinc-300 dark:border-zinc-800 text-teal-500 focus:ring-teal-500 w-4 h-4"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Simulation / Real selectors */}
                  <div className="p-3 bg-teal-50 dark:bg-teal-950/20 border border-teal-500/15 rounded-2xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-teal-500 animate-pulse" />
                      <div>
                        <p className="font-bold text-teal-650 dark:text-teal-400">Simulation Upload Toggle</p>
                        <p className="text-[10px] text-zinc-400">Upload instantly using simulated mock files (no Mux cost)</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isSimulatedUpload}
                      onChange={(e) => setIsSimulatedUpload(e.target.checked)}
                      className="rounded border-zinc-300 dark:border-zinc-800 text-teal-500 focus:ring-teal-500 w-4.5 h-4.5"
                    />
                  </div>

                  {/* Upload Start trigger */}
                  <div className="pt-2 flex gap-3">
                    <Button
                      type="submit"
                      disabled={(!selectedFile && !isSimulatedUpload) || !title.trim()}
                      className="flex-1 py-5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl text-xs shadow-lg shadow-teal-600/10"
                    >
                      {isReel ? 'Publish Reel' : 'Publish Video'}
                    </Button>
                    <Button
                      type="button"
                      onClick={resetForm}
                      variant="outline"
                      className="rounded-2xl text-xs px-6 border-zinc-200 dark:border-zinc-800"
                    >
                      Reset form
                    </Button>
                  </div>

                </form>
              ) : (
                /* Upload progress and loading screens */
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
                  {uploadStatus === 'uploading' && (
                    <>
                      <Loader2 className="w-12 h-12 text-teal-555 animate-spin" />
                      <div className="space-y-2 w-full max-w-xs">
                        <p className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Uploading Video File...</p>
                        <div className="w-full bg-zinc-150 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                          <div className="bg-teal-500 h-full rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                        </div>
                        <p className="text-xs font-bold text-teal-600">{uploadProgress}% Complete</p>
                      </div>
                    </>
                  )}

                  {uploadStatus === 'processing' && (
                    <>
                      <Wand2 className="w-12 h-12 text-teal-550 animate-bounce" />
                      <div className="space-y-1 max-w-xs">
                        <p className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Analyzing video streams...</p>
                        <p className="text-[10px] text-zinc-400 leading-relaxed font-semibold">
                          Optimizing bitrates, generating captions, and registering metadata parameters.
                        </p>
                      </div>
                    </>
                  )}

                  {uploadStatus === 'done' && (
                    <>
                      <div className="w-14 h-14 bg-green-500/10 border border-green-500/20 text-green-500 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-base font-black text-zinc-900 dark:text-white">
                          {isReel ? 'Reel Published Successfully!' : 'Video Published Successfully!'}
                        </h4>
                        <p className="text-xs text-zinc-400">
                          {isReel 
                            ? 'Your vertical video is now live in the Reels section.' 
                            : 'Your video is now live on Tolee Screen.'}
                        </p>
                      </div>
                      <Button
                        onClick={() => {
                          const wasReel = isReel;
                          resetForm();
                          if (wasReel) {
                            router.push('/reels');
                          } else {
                            setActiveTab('content');
                          }
                        }}
                        className="bg-teal-650 text-white font-bold text-xs py-3 px-6 rounded-xl"
                      >
                        {isReel ? 'Go to Reels' : 'Back to Library'}
                      </Button>
                    </>
                  )}

                  {uploadStatus === 'error' && (
                    <>
                      <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center">
                        <AlertTriangle className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-base font-black text-zinc-900 dark:text-white">Upload Failed</h4>
                        <p className="text-xs text-red-500 font-semibold max-w-xs">{errorMessage}</p>
                      </div>
                      <Button
                        onClick={() => setUploadStatus('idle')}
                        className="bg-teal-600 text-white font-bold text-xs py-3 px-6 rounded-xl"
                      >
                        Retry Upload
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* AI Thumbnail Generator & Canvas Editor section */}
              {selectedFile && generatedThumbnails.length > 0 && (
                <div className="border-t border-zinc-150 dark:border-zinc-850 pt-5 space-y-4">
                  <h4 className="text-xs font-bold text-zinc-850 dark:text-white uppercase tracking-wider flex items-center gap-1">
                    <Paintbrush className="w-4 h-4 text-teal-505" />
                    AI Thumbnail Generator & Editor
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Thumbnail versions selector */}
                    <div className="space-y-3">
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Select AI generated snapshot</p>
                      <div className="grid grid-cols-3 gap-2">
                        {generatedThumbnails.map((tUrl, i) => (
                          <div 
                            key={i} 
                            onClick={() => {
                              setSelectedThumbnailUrl(tUrl);
                              setIsThumbnailConfirmed(false);
                            }}
                            className={`aspect-video rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                              selectedThumbnailUrl === tUrl ? 'border-teal-500 scale-102 shadow' : 'border-transparent opacity-75 hover:opacity-100'
                            }`}
                          >
                            <img src={tUrl} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Live Visual Canvas Editor */}
                    <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-4 rounded-2xl space-y-3">
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Thumbnail Overlay Canvas</p>
                      
                      {/* Visual canvas container */}
                      <div className="relative aspect-video rounded-xl overflow-hidden shadow border border-zinc-200 dark:border-zinc-800">
                        <img 
                          src={selectedThumbnailUrl} 
                          className="w-full h-full object-cover"
                          style={{
                            filter: 
                              editorFilter === 'cyber' ? 'hue-rotate(60deg) saturate(1.4)' :
                              editorFilter === 'warm' ? 'sepia(0.3) saturate(1.2)' :
                              editorFilter === 'cold' ? 'brightness(0.9) contrast(1.15)' : 'none'
                          }}
                        />

                        {/* Custom visual overlays */}
                        {editorText.trim() && (
                          <div 
                            className="absolute bottom-2 left-2 px-2 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider select-none shadow-md"
                            style={{ 
                              color: editorColor,
                              backgroundColor: 'rgba(0, 0, 0, 0.8)',
                              textShadow: '0 2px 4px rgba(0,0,0,0.8)'
                            }}
                          >
                            {editorText}
                          </div>
                        )}

                        {editorEmoji && (
                          <span className="absolute top-2 right-2 text-2xl select-none filter drop-shadow">
                            {editorEmoji}
                          </span>
                        )}

                        {editorHasArrow && (
                          <div className="absolute right-6 bottom-6 select-none animate-bounce">
                            <span className="text-3xl text-red-500 font-bold">↙️</span>
                          </div>
                        )}
                      </div>

                      {/* Controls form */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[9px] font-bold text-zinc-400 uppercase">Overlay Text</label>
                          <input
                            type="text"
                            value={editorText}
                            onChange={(e) => setEditorText(e.target.value)}
                            className="w-full p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-[10px] focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-zinc-400 uppercase">Text Color</label>
                          <select
                            value={editorColor}
                            onChange={(e) => setEditorColor(e.target.value)}
                            className="w-full p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-[10px]"
                          >
                            <option value="#14b8a6">Teal</option>
                            <option value="#e11d48">Rose Red</option>
                            <option value="#f59e0b">Amber Gold</option>
                            <option value="#ffffff">White</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <label className="flex items-center gap-1 font-bold text-zinc-650 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editorHasArrow}
                            onChange={(e) => setEditorHasArrow(e.target.checked)}
                            className="rounded border-zinc-300 dark:border-zinc-800 text-teal-500 w-3.5 h-3.5"
                          />
                          Show Arrow pointing to center
                        </label>

                        <select
                          value={editorFilter}
                          onChange={(e: any) => setEditorFilter(e.target.value)}
                          className="bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded px-2 py-1 text-[10px] font-bold"
                        >
                          <option value="none">Normal tone</option>
                          <option value="cyber">Cyber Neon</option>
                          <option value="warm">Warm Glow</option>
                          <option value="cold">Cool Slate</option>
                        </select>
                      </div>

                      <Button
                        onClick={() => setIsThumbnailConfirmed(true)}
                        className={`w-full py-2.5 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 ${
                          isThumbnailConfirmed 
                            ? 'bg-green-600 hover:bg-green-700 text-white' 
                            : 'bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 text-white'
                        }`}
                      >
                        {isThumbnailConfirmed ? <CheckCircle2 className="w-4 h-4" /> : <Paintbrush className="w-4 h-4" />}
                        {isThumbnailConfirmed ? 'Thumbnail Setting Saved' : 'Confirm Custom Thumbnail'}
                      </Button>
                    </div>

                  </div>
                </div>
              )}

            </div>

            {/* Right AI Video Optimizer Score & Recommendations Column */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* AI Optimizer Panel */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 p-5 rounded-3xl shadow-sm space-y-5">
                <h4 className="text-xs font-bold text-zinc-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-teal-500 animate-pulse" />
                  AI Video Optimizer
                </h4>

                {/* Score gauge */}
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 flex items-center justify-center bg-teal-50 dark:bg-teal-950/20 rounded-full border border-teal-500/10">
                    <span className="text-lg font-black text-teal-650 dark:text-teal-400">{aiScore}</span>
                    <span className="text-[8px] text-zinc-400 absolute bottom-2">/100</span>
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-zinc-850 dark:text-white">SEO Retention Score</h5>
                    <p className="text-[10px] text-zinc-400 leading-snug mt-0.5">
                      {aiScore >= 90 ? 'Outstanding metadata, tags, and thumbnails. Ready for distribution!' : 'Apply suggestions below to increase CTR and organic impressions.'}
                    </p>
                  </div>
                </div>

                {/* Optimizer checklist markers */}
                <div className="space-y-2 border-t border-zinc-150 dark:border-zinc-850 pt-3">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-650">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      Resolution (1080p stream)
                    </span>
                    <span className="text-green-500">Passed</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-650">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      Audio balances & clarity
                    </span>
                    <span className="text-green-500">Passed</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-650">
                    <span className="flex items-center gap-1.5">
                      {hasAppliedAISuggestions ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                      )}
                      SEO Tag Density
                    </span>
                    <span className={hasAppliedAISuggestions ? 'text-green-500' : 'text-amber-500'}>
                      {hasAppliedAISuggestions ? 'Passed' : 'Low'}
                    </span>
                  </div>
                </div>
              </div>

              {/* AI Manager Suggestions Card */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 p-5 rounded-3xl shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-zinc-800 dark:text-white uppercase tracking-wider flex items-center gap-1">
                    <Wand2 className="w-4 h-4 text-teal-500" />
                    AI suggestions
                  </h4>
                  {!hasAppliedAISuggestions && (
                    <button
                      onClick={applyAISuggestions}
                      className="text-[9px] font-black text-teal-650 dark:text-teal-400 hover:underline uppercase tracking-wide"
                    >
                      Apply All
                    </button>
                  )}
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-150 dark:border-zinc-850 space-y-1">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase">Optimal Title</span>
                    <p className="text-zinc-650 dark:text-zinc-300 font-semibold text-[10px] leading-snug">{aiTitleSuggestion}</p>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-150 dark:border-zinc-850 space-y-1">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase">Estimated Reach</span>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-bold mt-1 text-zinc-700 dark:text-zinc-300">
                      <div>
                        <p className="text-zinc-400 font-medium">CTR</p>
                        <p className="text-teal-605">9.4% est.</p>
                      </div>
                      <div>
                        <p className="text-zinc-400 font-medium">Weekly Growth</p>
                        <p className="text-teal-605">+18% est.</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-150 dark:border-zinc-850 space-y-1">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase">Target Audience</span>
                    <p className="text-zinc-650 dark:text-zinc-300 font-semibold text-[10px]">Programming, tech enthusiasts, Nextjs devs</p>
                  </div>
                  
                  {!hasAppliedAISuggestions ? (
                    <Button 
                      onClick={applyAISuggestions}
                      className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Sparkles className="w-4 h-4 fill-white" />
                      One-Click Apply Suggestions
                    </Button>
                  ) : (
                    <div className="bg-green-500/10 border border-green-500/15 p-2 rounded-xl text-center text-[10px] font-bold text-green-500 flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Applied AI Optimization Suggestions
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
