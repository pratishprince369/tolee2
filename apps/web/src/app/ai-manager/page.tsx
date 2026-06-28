'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Paperclip, Send, Check, Image as ImageIcon, Video, X, Bot, 
  Globe, MapPin, Sparkles, ChevronRight, Target, DollarSign, 
  ArrowRight, ShieldCheck, RefreshCw, Upload, CheckSquare, PlusCircle,
  BarChart3, Inbox, Calendar, ShieldAlert, Mic, User, MessageSquare, Briefcase, Trash2
} from 'lucide-react';
import { createPost, addComment } from '@/actions/post';
import { fetchRealChatData, getOrCreatePersonalChat } from '@/actions/chat';
import { createCampaignAction, checkAndInitializeWallet } from '@/actions/ads';
import { uploadFile } from '@/lib/upload';

type ActiveTab = 'dashboard' | 'copywriter' | 'inbox' | 'leads' | 'calendar' | 'community' | 'business' | 'analyzer';

type FlowState = 
  | 'idle'
  // Post Flow
  | 'post_caption'
  | 'post_media_choice'
  | 'post_media_upload'
  | 'post_media_generate'
  | 'post_groups'
  | 'post_draft'
  // Ad Flow
  | 'ad_text'
  | 'ad_media_choice'
  | 'ad_media_upload'
  | 'ad_media_generate'
  | 'ad_groups'
  | 'ad_draft';

interface Message {
  id: string;
  sender: string;
  senderAvatar: string;
  text: string;
  time: string;
  isMe: boolean;
  isAI: boolean;
  media?: { type: 'image' | 'video'; url: string; name: string } | null;
}

export default function AIManagerPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-[#09090b]">
        <div className="text-center space-y-4">
          <Bot className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-sm font-bold text-gray-500 dark:text-zinc-400">Loading Tolee AI Workspace...</p>
        </div>
      </div>
    }>
      <AIManagerContent />
    </Suspense>
  );
}

function AIManagerContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [flowState, setFlowState] = useState<FlowState>('idle');
  const [aiMessages, setAiMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [aiTyping, setAiTyping] = useState(false);
  const [availableGroups, setAvailableGroups] = useState<any[]>([]);

  // Layout Analyzer states
  const [analyzerImage, setAnalyzerImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any[] | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [selectedElementIndex, setSelectedElementIndex] = useState<number | null>(null);
  const analyzerFileInputRef = useRef<HTMLInputElement>(null);

  // Form states gathered during steps
  const [draftTitle, setDraftTitle] = useState('');
  const [draftCaption, setDraftCaption] = useState('');
  const [draftMedia, setDraftMedia] = useState<{ type: 'image' | 'video'; url: string; name: string } | null>(null);
  const [draftGroups, setDraftGroups] = useState<string[]>([]); // Target tolee ids
  const [draftLocation, setDraftLocation] = useState('');
  const [draftAudience, setDraftAudience] = useState('');

  // AI Image generation specific states
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageStyle, setImageStyle] = useState<'realistic' | 'illustration' | 'marketing' | 'social' | 'minimalist'>('marketing');
  const [imageAspect, setImageAspect] = useState<'landscape' | 'portrait' | 'square'>('landscape');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  const [aiUploadProgress, setAiUploadProgress] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const aiFileInputRef = useRef<HTMLInputElement>(null);

  // Dashboard API loaded states
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [selectedNiche, setSelectedNiche] = useState('Real Estate');
  const [contentCalendar, setContentCalendar] = useState<any[]>([]);
  const [isGeneratingCalendar, setIsGeneratingCalendar] = useState(false);
  const [isGeneratingReplyMap, setIsGeneratingReplyMap] = useState<Record<string, boolean>>({});
  const [suggestedReplies, setSuggestedReplies] = useState<Record<string, string>>({});
  const [customReplyText, setCustomReplyText] = useState<Record<string, string>>({});

  // Mic recording voice simulation state
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');

  // Read URL params for active tab redirection
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'post_creator') {
      setActiveTab('copywriter');
      // Timeout to ensure UI mounts before running flow
      setTimeout(() => startPostFlow(), 200);
    } else if (tabParam === 'dashboard') {
      setActiveTab('dashboard');
    }
  }, [searchParams]);

  // Fetch groups and dashboard metadata on mount
  useEffect(() => {
    fetchRealChatData().then(res => {
      if (res.success && res.chats) {
        setAvailableGroups(res.chats.filter(c => c.isGroup));
      }
    });
    loadDashboard();
  }, []);

  const handleAnalyzeDocument = async (base64String: string) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);
    setSelectedElementIndex(null);
    try {
      const cleanBase64 = base64String.replace(/^data:image\/[a-z]+;base64,/, '');
      const res = await fetch('/api/ai-manager/analyze-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: cleanBase64 })
      });
      const data = await res.json();
      if (data.success) {
        setAnalysisResult(data.elements || []);
      } else {
        setAnalysisError(data.error || 'Failed to analyze document layout.');
      }
    } catch (err: any) {
      console.error(err);
      setAnalysisError(err.message || 'Server connection timed out.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setAnalyzerImage(result);
      handleAnalyzeDocument(result);
    };
    reader.readAsDataURL(file);
  };

  const loadDashboard = async () => {
    setIsLoadingDashboard(true);
    try {
      const response = await fetch('/api/ai-manager/dashboard');
      const data = await response.json();
      if (data.success) {
        setDashboardData(data);
      }
    } catch (err) {
      console.error("Failed to load AI Dashboard data", err);
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  // Initialize and load chat history defensively
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('tolee_ai_manager_history');
        if (stored) {
          const parsed = JSON.parse(stored);
          const isBroken = parsed.some((m: any) => typeof m !== 'object' || m.actions || m.card);
          if (isBroken) {
            throw new Error("Broken non-serializable JSX in legacy history");
          }
          setAiMessages(parsed);
          
          const lastMsg = parsed[parsed.length - 1];
          if (lastMsg && !lastMsg.isMe) {
            if (lastMsg.text.includes("organic post")) setFlowState('post_caption');
            else if (lastMsg.text.includes("sponsored ad")) setFlowState('ad_text');
            else setFlowState('idle');
          }
        } else {
          resetToWelcome();
        }
      } catch (err) {
        console.warn("Clearing corrupted chat history:", err);
        localStorage.removeItem('tolee_ai_manager_history');
        resetToWelcome();
      }
    }
  }, []);

  const saveHistory = (msgs: Message[]) => {
    setAiMessages(msgs);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tolee_ai_manager_history', JSON.stringify(msgs));
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeTab === 'copywriter') {
      scrollToBottom();
    }
  }, [aiMessages, aiTyping, flowState, activeTab]);

  const addBotMessage = (text: string) => {
    const newMsg: Message = {
      id: 'ai-' + Date.now() + Math.random(),
      sender: 'AI Tolee Manager',
      senderAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=ToleeManager',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: false,
      isAI: true
    };
    return newMsg;
  };

  const addUserMessage = (text: string, media?: { type: 'image' | 'video'; url: string; name: string } | null) => {
    const newMsg: Message = {
      id: 'usr-' + Date.now() + Math.random(),
      sender: 'Me',
      senderAvatar: session?.user?.image || 'https://api.dicebear.com/7.x/adventurer/svg?seed=User',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
      isAI: false,
      media
    };
    return newMsg;
  };

  const resetToWelcome = () => {
    setFlowState('idle');
    setDraftTitle('');
    setDraftCaption('');
    setDraftMedia(null);
    setDraftGroups([]);
    setDraftLocation('');
    setDraftAudience('');
    setGeneratedImageUrl(null);
    setImagePrompt('');

    const welcomeMsg = addBotMessage(
      `Welcome to Tolee AI Manager! 👋 I'm here to help you grow your business and audience on Tolee.\n\nI can help you build your audience by organic group posting, or launch a direct sponsored ad campaign to display your business across Tolee!`
    );
    saveHistory([welcomeMsg]);
  };

  // ==================== POST FLOW ====================
  const startPostFlow = () => {
    setFlowState('post_caption');
    const uMsg = addUserMessage('🚀 Create & Publish Post');
    setAiTyping(true);

    setTimeout(() => {
      const bMsg = addBotMessage(
        `Awesome! Let's draft an engaging organic post.\n\nFirst, enter a brief idea, description, or rough draft of what you want to post (Hindi, Marathi, or English). I will rewrite and polish it professionally for you!`
      );
      saveHistory([uMsg, bMsg]);
      setAiTyping(false);
    }, 800);
  };

  const handlePostCaption = async (text: string) => {
    const uMsg = addUserMessage(text);
    saveHistory([...aiMessages, uMsg]);
    setAiTyping(true);

    try {
      const response = await fetch('/api/ai-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ text: `Generate organic post draft for: ${text}`, isMe: true }]
        })
      });
      const data = await response.json();
      if (data.success && data.draft) {
        const title = data.draft.title || 'Special Update';
        const caption = data.draft.caption || text;
        const hashtags = Array.isArray(data.draft.hashtags) ? data.draft.hashtags.join(' ') : '';
        
        setDraftTitle(title);
        setDraftCaption(`${caption}\n\n${hashtags}`.trim());
        setImagePrompt(data.draft.imagePrompt || text);
        setDraftLocation(data.draft.location || '');
        setDraftAudience(data.draft.audience || '');
        setFlowState('post_media_choice');

        const bMsg = addBotMessage(
          `✨ **Professional Post Copywriting Generated!**\n\nI have polished your text with optimized formatting:\n\n**Headline:** ${title}\n\n**Caption:**\n${caption}\n\n${hashtags}\n\nNext, do you want to upload a creative visual from your device, or let me generate a stunning custom marketing banner using AI based on my visual prompt?\n\n*Visual prompt engineered:* "${data.draft.imagePrompt || text}"`
        );
        setAiMessages(prev => [...prev, bMsg]);
      } else {
        throw new Error('Draft failed');
      }
    } catch (err) {
      setDraftTitle('Organic Promotion');
      setDraftCaption(text);
      setImagePrompt(text);
      setFlowState('post_media_choice');

      const bMsg = addBotMessage(
        `I will use your raw text caption. Next, do you want to upload media or generate a custom image using AI?`
      );
      setAiMessages(prev => [...prev, bMsg]);
    } finally {
      setAiTyping(false);
    }
  };

  const handleGenerateAIImage = async () => {
    if (!imagePrompt.trim()) return alert('Please enter a description prompt for the image.');
    setIsGeneratingImage(true);
    setAiTyping(true);

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          style: imageStyle,
          aspectRatio: imageAspect,
          count: 1
        })
      });
      const data = await response.json();
      if (!data.success || !data.urls?.[0]) {
        throw new Error(data.error || 'Failed to generate image');
      }

      const generatedUrl = data.urls[0];
      setGeneratedImageUrl(generatedUrl);
      
      const bMsg = addBotMessage(
        `Here is the premium visual I generated for you using Flux Schnell! Do you want to keep this image, or describe changes to regenerate?`
      );
      setAiMessages(prev => [...prev, bMsg]);

    } catch (err: any) {
      console.error(err);
      const bErr = addBotMessage(`Could not generate image: ${err.message || 'Server timeout'}. Let's try uploading manually or retrying!`);
      setAiMessages(prev => [...prev, bErr]);
    } finally {
      setIsGeneratingImage(false);
      setAiTyping(false);
    }
  };

  const handleKeepGeneratedImage = async (url: string) => {
    setAiTyping(true);
    const uMsg = addUserMessage('Confirm AI Image');
    setAiMessages(prev => [...prev, uMsg]);

    try {
      const response = await fetch('/api/save-generated-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: url })
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      setDraftMedia({ type: 'image', url: data.url, name: 'ai-generated.jpg' });
      
      if (flowState === 'post_media_generate') {
        setFlowState('post_groups');
        const bMsg = addBotMessage(
          `Visual creative successfully locked and saved to Cloudinary! 🚀\n\nLastly, which Tolee groups (communities) do you want to publish this post to? Select the target communities below:`
        );
        setAiMessages(prev => [...prev, bMsg]);
      } else if (flowState === 'ad_media_generate') {
        setFlowState('ad_groups');
        const bMsg = addBotMessage(
          `Creative visual successfully locked and saved to Cloudinary! 🚀\n\nNext, which communities or Tolee groups should this ad be shown in? Select specific groups below or target 'All Groups' to run across the entire platform:`
        );
        setAiMessages(prev => [...prev, bMsg]);
      }

    } catch (err: any) {
      console.error(err);
      alert('Could not save generated image. Attaching fallback.');
      setDraftMedia({ type: 'image', url, name: 'ai-generated.jpg' });
      if (flowState === 'post_media_generate') {
        setFlowState('post_groups');
        const bMsg = addBotMessage(`Media attached. Niche groups selector is active. Choose your target groups:`);
        setAiMessages(prev => [...prev, bMsg]);
      } else if (flowState === 'ad_media_generate') {
        setFlowState('ad_groups');
        const bMsg = addBotMessage(`Media attached. Target groups selector is active. Choose your target groups:`);
        setAiMessages(prev => [...prev, bMsg]);
      }
    } finally {
      setAiTyping(false);
    }
  };

  const handleConfirmPostGroups = () => {
    if (draftGroups.length === 0) return alert('Please select at least one Tolee group to publish.');
    setFlowState('post_draft');

    const selectedNames = availableGroups.filter(g => draftGroups.includes(g.id)).map(g => g.name).join(', ');
    const uMsg = addUserMessage(`Publish to: ${selectedNames}`);
    setAiTyping(true);

    setTimeout(() => {
      const bMsg = addBotMessage(
        `Excellent! Your organic post campaign is fully configured. I have compiled all details into a premium draft card below. Review and click 'Confirm & Publish Post' to share live!`
      );
      setAiMessages(prev => [...prev, uMsg, bMsg]);
      setAiTyping(false);
    }, 800);
  };

  const handlePublishPostSubmit = async () => {
    setAiTyping(true);
    let successCount = 0;
    let failedCount = 0;

    const finalContent = `${draftTitle}\n\n${draftCaption}`;

    for (const toleeId of draftGroups) {
      try {
        const res = await createPost({
          content: finalContent,
          postType: 'regular',
          media: draftMedia ? { type: draftMedia.type, url: draftMedia.url } : null,
          toleeIds: [toleeId]
        });
        if (res.success) successCount++;
        else failedCount++;
      } catch (err) {
        failedCount++;
      }
    }

    setFlowState('idle');
    const bMsg = addBotMessage(
      `🎉 **Congratulations! Post Campaign Shared Live!**\n\nYour post was published successfully to **${successCount}** Tolee groups!${failedCount > 0 ? ` (${failedCount} failed to publish)` : ''}\n\nWhat would you like to do next?`
    );
    setAiMessages(prev => [...prev, bMsg]);
    setAiTyping(false);
  };

  // ==================== SPONSORED AD FLOW ====================
  const startAdFlow = () => {
    setFlowState('ad_text');
    const uMsg = addUserMessage('📢 Place a Sponsored Ad');
    setAiTyping(true);

    setTimeout(() => {
      const bMsg = addBotMessage(
        `Let's configure a highly targeted sponsored ad campaign!\n\nDescribe your business, product, or service in a few words (e.g. "real estate agency in Kalyan" or "bakery shop"). I will auto-generate the complete campaign copywriting, headline, targeting, and custom visual design prompts!`
      );
      saveHistory([uMsg, bMsg]);
      setAiTyping(false);
    }, 800);
  };

  const handleAdText = async (text: string) => {
    const uMsg = addUserMessage(text);
    saveHistory([...aiMessages, uMsg]);
    setAiTyping(true);

    try {
      const response = await fetch('/api/ai-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ text: `Generate sponsored ad campaign blueprint for: ${text}`, isMe: true }]
        })
      });
      const data = await response.json();
      if (data.success && data.draft) {
        const title = data.draft.title || 'Sponsored Campaign';
        const caption = data.draft.caption || text;
        const hashtags = Array.isArray(data.draft.hashtags) ? data.draft.hashtags.join(' ') : '';
        const location = data.draft.location || 'Maharashtra';
        const audience = data.draft.audience || 'General Niche';

        setDraftTitle(title);
        setDraftCaption(`${caption}\n\n${hashtags}`.trim());
        setDraftLocation(location);
        setDraftAudience(audience);
        setImagePrompt(data.draft.imagePrompt || text);
        setFlowState('ad_media_choice');

        const bMsg = addBotMessage(
          `🚀 **Expert Ad Copywriting & Campaign Blueprint Ready!**\n\nI have structured a complete sponsored marketing setup:\n\n**Headline Hook:** ${title}\n**Primary Text:** ${caption}\n**Target Location:** ${location}\n**Target Audience:** ${audience}\n\nNext, do you want to upload your own creative graphic, or let me generate a premium sponsored advertisement banner using AI based on my custom visual prompt?\n\n*Visual prompt engineered:* "${data.draft.imagePrompt || text}"`
        );
        setAiMessages(prev => [...prev, bMsg]);
      } else {
        throw new Error('Draft failed');
      }
    } catch (err) {
      setDraftTitle('Sponsored Ad');
      setDraftCaption(text);
      setDraftLocation('Maharashtra');
      setDraftAudience('Interests matching ' + text);
      setImagePrompt(text);
      setFlowState('ad_media_choice');

      const bMsg = addBotMessage(
        `I will build your ad. Next, do you want to upload media or generate a sponsored image using AI?`
      );
      setAiMessages(prev => [...prev, bMsg]);
    } finally {
      setAiTyping(false);
    }
  };

  const handleConfirmAdGroups = (targetAll: boolean) => {
    if (!targetAll && draftGroups.length === 0) {
      return alert('Please select at least one target community or select "Target All Groups".');
    }
    setFlowState('ad_draft');
    const selectionText = targetAll ? 'All Tolee Groups' : availableGroups.filter(g => draftGroups.includes(g.id)).map(g => g.name).join(', ');
    const uMsg = addUserMessage(`Target Groups: ${selectionText}`);
    setAiTyping(true);

    setTimeout(() => {
      const bMsg = addBotMessage(
        `Spectacular! Your campaign configuration is ready. Review all details in the premium Campaign Card below and click 'Publish Sponsored Ad' to launch your campaign instantly!`
      );
      setAiMessages(prev => [...prev, uMsg, bMsg]);
      setAiTyping(false);
    }, 800);
  };

  const handlePublishAdSubmit = async () => {
    setAiTyping(true);

    try {
      await checkAndInitializeWallet();
      const campaignName = `AI Campaign - ${draftLocation}`;
      const toleeIdsString = draftGroups.length > 0 ? draftGroups.join(',') : 'all';

      const res = await createCampaignAction({
        name: campaignName,
        objective: 'engagement',
        cboEnabled: true,
        abTestingEnabled: false,
        adSetName: `${campaignName} Set`,
        budgetType: 'daily',
        budgetAmount: 100.00,
        startDate: new Date().toISOString(),
        targetingCities: draftLocation,
        targetingToleeIds: toleeIdsString,
        targetingInterests: draftAudience,
        targetingFollowers: false,
        targetingEngagedUsers: true,
        placements: ['feed', 'reels', 'marketplace'],
        adName: `${campaignName} Creative`,
        format: draftMedia?.type === 'video' ? 'single_video' : 'single_image',
        mediaUrls: draftMedia ? [draftMedia.url] : [],
        primaryText: draftCaption,
        headline: draftTitle,
        ctaButton: 'learn_more',
        status: 'running'
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to place ad');
      }

      setFlowState('idle');
      const bMsg = addBotMessage(
        `🎉 **Congratulations! Sponsored Ad is now Active & Running!**\n\nYour campaign is officially launched and will start generating impressions immediately inside Tolee feeds, reels, and marketplace listings!\n\nYou can track live click-through-rates, impressions, and conversions in your Ads Manager dashboard.`
      );
      setAiMessages(prev => [...prev, bMsg]);

    } catch (err: any) {
      console.error(err);
      const bErr = addBotMessage(
        `Failed to publish ad: ${err.message || 'Check connection'}. Let's review the draft parameters and try publishing again!`
      );
      setAiMessages(prev => [...prev, bErr]);
    } finally {
      setAiTyping(false);
    }
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const text = newMessage.trim();
    setNewMessage('');

    if (flowState === 'post_caption') {
      handlePostCaption(text);
    } else if (flowState === 'ad_text') {
      handleAdText(text);
    } else {
      const uMsg = addUserMessage(text);
      setAiTyping(true);
      setTimeout(() => {
        const bMsg = addBotMessage(
          `I am currently guided in step-by-step setup mode. Let's restart our setup to keep everything structured!`
        );
        setAiMessages(prev => [...prev, uMsg, bMsg]);
        setAiTyping(false);
      }, 800);
    }
  };

  const handleFileUploadTrigger = async (file: File) => {
    setAiUploadProgress(5);
    try {
      const isVideo = file.type.startsWith('video/');
      setAiUploadProgress(35);
      
      const uploadResult = await uploadFile(file);

      setAiUploadProgress(100);
      const mediaObj = { type: isVideo ? 'video' as const : 'image' as const, url: uploadResult.secure_url, name: file.name };
      
      if (flowState === 'post_media_upload') {
        setDraftMedia(mediaObj);
        setFlowState('post_groups');
        const u = addUserMessage(`Uploaded visual: ${file.name}`, mediaObj);
        const b = addBotMessage(`Creative asset uploaded successfully! 📸\n\nLastly, select the Tolee groups you want to publish this post to:`);
        setAiMessages(prev => [...prev, u, b]);
      } else if (flowState === 'ad_media_upload') {
        setDraftMedia(mediaObj);
        setFlowState('ad_groups');
        const u = addUserMessage(`Uploaded advertisement visual: ${file.name}`, mediaObj);
        const b = addBotMessage(`Creative asset uploaded successfully! 📸\n\nNext, which communities or Tolee groups should this ad be shown in? Select specific groups below or target 'All Groups' to run across the entire platform:`);
        setAiMessages(prev => [...prev, u, b]);
      }
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally {
      setTimeout(() => setAiUploadProgress(0), 1000);
    }
  };

  const clearChatHistory = () => {
    if (confirm("Are you sure you want to clear AI manager history?")) {
      resetToWelcome();
    }
  };

  // ==================== DASHBOARD ACTIONS ====================
  const handleGenerateReply = async (commentId: string, commentText: string, postTitle?: string) => {
    setIsGeneratingReplyMap(prev => ({ ...prev, [commentId]: true }));
    try {
      const res = await fetch('/api/ai-manager/generate-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentText, postTitle })
      });
      const data = await res.json();
      if (data.success) {
        setSuggestedReplies(prev => ({ ...prev, [commentId]: data.replyText }));
        setCustomReplyText(prev => ({ ...prev, [commentId]: data.replyText }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingReplyMap(prev => ({ ...prev, [commentId]: false }));
    }
  };

  const handlePostReply = async (commentId: string, postId: string) => {
    const text = customReplyText[commentId];
    if (!text || !text.trim()) return alert('Reply cannot be empty.');

    try {
      const res = await addComment(postId, text);
      if (res.success) {
        alert('Reply posted successfully!');
        setSuggestedReplies(prev => {
          const c = { ...prev };
          delete c[commentId];
          return c;
        });
        loadDashboard(); // reload to refresh thread comments
      } else {
        alert('Failed to post reply: ' + (res.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to send comment.');
    }
  };

  const handleGenerateCalendar = async () => {
    setIsGeneratingCalendar(true);
    try {
      const res = await fetch('/api/ai-manager/generate-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche: selectedNiche })
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.calendar)) {
        setContentCalendar(data.calendar);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingCalendar(false);
    }
  };

  const handleApplyCalendarTopic = (topic: any) => {
    setActiveTab('copywriter');
    setFlowState('post_caption');
    
    // Setup wizard with calendar topic
    setDraftTitle(topic.theme);
    setDraftCaption(topic.caption + "\n\n" + topic.hashtags);
    setImagePrompt(topic.theme + " styled high quality marketing graphic");

    const uMsg = addUserMessage(`Write post about: ${topic.theme}`);
    setAiTyping(true);
    
    setTimeout(() => {
      const bMsg = addBotMessage(
        `✨ **Content Calendar Prompt Loaded!**\n\nI have prepared the post draft based on your calendar selection:\n\n**Headline Hook:** ${topic.theme}\n**Polished Caption:**\n${topic.caption}\n\n${topic.hashtags}\n\nDo you want to upload a matching media visual, or should I generate an image using AI based on my visual prompt?`
      );
      saveHistory([uMsg, bMsg]);
      setFlowState('post_media_choice');
      setAiTyping(false);
    }, 800);
  };

  const handleApplyAdCampaign = (campaignIdea: any) => {
    setActiveTab('copywriter');
    setFlowState('ad_text');
    
    setDraftTitle(campaignIdea.title);
    setDraftCaption(campaignIdea.caption);
    setDraftLocation(campaignIdea.location);
    setDraftAudience(campaignIdea.audience);
    setImagePrompt(campaignIdea.imagePrompt);

    const uMsg = addUserMessage(`Place Ad for: ${campaignIdea.title}`);
    setAiTyping(true);

    setTimeout(() => {
      const bMsg = addBotMessage(
        `🚀 **AI Ad Campaign Coach Prompt Loaded!**\n\nI have pre-configured the parameters for your sponsored ad:\n\n**Ad Headline Hook:** ${campaignIdea.title}\n**Primary Text Copy:** ${campaignIdea.caption}\n**Target Location:** ${campaignIdea.location}\n**Target Audience Niche:** ${campaignIdea.audience}\n\nDo you want to upload a banner visual, or generate one with AI using Flux Schnell?`
      );
      saveHistory([uMsg, bMsg]);
      setFlowState('ad_media_choice');
      setAiTyping(false);
    }, 800);
  };

  const handleLaunchChatRoomRedirect = async (userId: string) => {
    try {
      const res = await getOrCreatePersonalChat(userId);
      if (res.success && res.chatId) {
        router.push(`/chat?id=${res.chatId}&tab=personal`);
      } else {
        alert('Could not start direct chat.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Voice Assistant Simulation
  const handleToggleVoice = () => {
    if (isVoiceActive) {
      setIsVoiceActive(false);
      if (voiceTranscript) {
        setActiveTab('copywriter');
        setFlowState('post_caption');
        handlePostCaption(voiceTranscript);
        setVoiceTranscript('');
      }
    } else {
      setIsVoiceActive(true);
      setVoiceTranscript('Loading voice transcription...');
      
      const phrases = [
        "Create an organic post announcing our new residential property site in Kalyan East with a daily budget review.",
        "Draft a creative post about our cafe special cheese burst garlic bread combo offer.",
        "Write a trending topic post about real estate investment opportunities in Thane."
      ];
      
      setTimeout(() => {
        setVoiceTranscript(phrases[Math.floor(Math.random() * phrases.length)]);
      }, 2000);
    }
  };
  return (
    <div className="flex h-[calc(100vh-4rem)] md:h-screen w-full bg-white dark:bg-[#09090b] overflow-hidden text-gray-900 dark:text-gray-100 font-sans">
      
      {/* 1. Left Navigation Sidebar on Desktop */}
      <div className="hidden lg:flex flex-col w-64 bg-zinc-50/40 dark:bg-[#0b0b0d] border-r border-zinc-200/50 dark:border-zinc-900/60 shrink-0">
        {/* Workspace Brand */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-zinc-200/50 dark:border-zinc-900/60 shrink-0 bg-zinc-50/50 dark:bg-black/20 backdrop-blur-md">
          <Avatar className="w-8 h-8 border border-zinc-200/60 dark:border-zinc-800">
            <AvatarImage src="https://api.dicebear.com/7.x/bottts/svg?seed=ToleeManager" />
            <AvatarFallback>AI</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-[13px] font-black text-gray-800 dark:text-white flex items-center gap-1">
              AI Manager
              <Bot className="w-3.5 h-3.5 text-zinc-400" />
            </span>
            <span className="text-[8px] font-extrabold text-zinc-400 dark:text-zinc-500 tracking-wider uppercase">Tolee Growth Workspace</span>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
          <SidebarTabButton active={activeTab === 'dashboard'} icon={<BarChart3 className="w-4 h-4" />} label="Growth Dashboard" onClick={() => setActiveTab('dashboard')} />
          <SidebarTabButton active={activeTab === 'copywriter'} icon={<Sparkles className="w-4 h-4" />} label="Copywriter & Creator" onClick={() => setActiveTab('copywriter')} />
          <SidebarTabButton active={activeTab === 'analyzer'} icon={<ImageIcon className="w-4 h-4" />} label="Doc Layout Analyzer" onClick={() => setActiveTab('analyzer')} />
          <SidebarTabButton active={activeTab === 'inbox'} icon={<Inbox className="w-4 h-4" />} label="Priority Inbox" onClick={() => setActiveTab('inbox')} badge={dashboardData?.comments?.length} />
          <SidebarTabButton active={activeTab === 'leads'} icon={<Target className="w-4 h-4" />} label="AI Leads Hub" onClick={() => setActiveTab('leads')} badge={dashboardData?.leads?.length} badgeColor="bg-emerald-500" />
          <SidebarTabButton active={activeTab === 'calendar'} icon={<Calendar className="w-4 h-4" />} label="Content Calendar" onClick={() => setActiveTab('calendar')} />
          <SidebarTabButton active={activeTab === 'community'} icon={<ShieldAlert className="w-4 h-4" />} label="Community Guard" onClick={() => setActiveTab('community')} />
          <SidebarTabButton active={activeTab === 'business'} icon={<Briefcase className="w-4 h-4" />} label="Ad Campaign Coach" onClick={() => setActiveTab('business')} />
        </div>

        {/* User context footer */}
        <div className="p-4 border-t border-zinc-200/50 dark:border-zinc-900/60 flex items-center gap-3">
          <Avatar className="w-8 h-8 border border-zinc-200/60 dark:border-zinc-800">
            <AvatarImage src={session?.user?.image || '/default-user-avatar.svg'} />
            <AvatarFallback>{session?.user?.name?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col truncate">
            <span className="text-xs font-bold text-gray-800 dark:text-zinc-200 truncate">{session?.user?.name || 'Creator'}</span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold truncate">@{ (session?.user as any)?.username || 'user' }</span>
          </div>
        </div>
      </div>

      {/* 2. Main Content Workspace */}
      <div className="flex-grow flex flex-col overflow-hidden">
        
        {/* Mobile View Navigation (only on screens < lg) */}
        <div className="lg:hidden flex flex-col bg-white dark:bg-[#0c0c0e] border-b border-zinc-200/50 dark:border-zinc-900/60 shrink-0">
          {/* Top Header Row */}
          <div className="h-12 flex items-center px-4 justify-between border-b border-zinc-100 dark:border-zinc-900/40">
            <div className="flex items-center gap-2">
              <Avatar className="w-7 h-7 border border-zinc-200/60 dark:border-zinc-800">
                <AvatarImage src="https://api.dicebear.com/7.x/bottts/svg?seed=ToleeManager" />
                <AvatarFallback>AI</AvatarFallback>
              </Avatar>
              <span className="text-xs font-black text-gray-800 dark:text-white flex items-center gap-1">
                AI Manager
                <Bot className="w-3.5 h-3.5 text-zinc-400" />
              </span>
            </div>
            
            {isVoiceActive ? (
              <span className="flex items-center gap-1 text-[10px] font-black text-red-500 uppercase tracking-widest animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Live Mic
              </span>
            ) : (
              <span className="text-[9px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Tolee Growth</span>
            )}
          </div>
          
          {/* Horizontally Scrollable Tabs Row */}
          <div 
            className="flex items-center gap-2 overflow-x-auto px-4 py-2.5 bg-zinc-50/30 dark:bg-black/10 scrollbar-none [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <MobileTabButton active={activeTab === 'dashboard'} icon={<BarChart3 className="w-3.5 h-3.5" />} label="Growth Dashboard" onClick={() => setActiveTab('dashboard')} />
            <MobileTabButton active={activeTab === 'copywriter'} icon={<Sparkles className="w-3.5 h-3.5" />} label="Copywriter & Creator" onClick={() => setActiveTab('copywriter')} />
            <MobileTabButton active={activeTab === 'analyzer'} icon={<ImageIcon className="w-3.5 h-3.5" />} label="Doc Layout Analyzer" onClick={() => setActiveTab('analyzer')} />
            <MobileTabButton active={activeTab === 'inbox'} icon={<Inbox className="w-3.5 h-3.5" />} label="Priority Inbox" onClick={() => setActiveTab('inbox')} badge={dashboardData?.comments?.length} />
            <MobileTabButton active={activeTab === 'leads'} icon={<Target className="w-3.5 h-3.5" />} label="AI Leads Hub" onClick={() => setActiveTab('leads')} badge={dashboardData?.leads?.length} badgeColor="bg-emerald-500" />
            <MobileTabButton active={activeTab === 'calendar'} icon={<Calendar className="w-3.5 h-3.5" />} label="Content Calendar" onClick={() => setActiveTab('calendar')} />
            <MobileTabButton active={activeTab === 'community'} icon={<ShieldAlert className="w-3.5 h-3.5" />} label="Community Guard" onClick={() => setActiveTab('community')} />
            <MobileTabButton active={activeTab === 'business'} icon={<Briefcase className="w-3.5 h-3.5" />} label="Ad Campaign Coach" onClick={() => setActiveTab('business')} />
          </div>
        </div>

        {/* Tab view controller */}
        <div className="flex-1 overflow-y-auto">
          
          {/* TAB 1: DASHBOARD & COACH */}
          {activeTab === 'dashboard' && (
            <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-black text-zinc-850 dark:text-white tracking-tight flex items-center gap-2">
                    AI Growth Dashboard
                    <Sparkles className="w-5 h-5 text-zinc-400" />
                  </h1>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Real-time engagement analysis and personal coaching tips</p>
                </div>
                <Button onClick={loadDashboard} disabled={isLoadingDashboard} size="sm" variant="outline" className="text-xs font-bold border-zinc-200 dark:border-zinc-800 gap-1.5 h-8">
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDashboard ? 'animate-spin' : ''}`} />
                  Sync Metrics
                </Button>
              </div>

              {/* Metrics Grid Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard label="Growth Score" score={dashboardData?.metrics?.growthScore || 84} change="+4.8%" up />
                <MetricCard label="Reach Score" score={dashboardData?.metrics?.reachScore || 72} change="+6.2%" up />
                <MetricCard label="Engagement" score={dashboardData?.metrics?.engagementScore || 68} change="-1.5%" up={false} />
                <MetricCard label="Consistency" score={dashboardData?.metrics?.consistencyScore || 92} change="Stable" up={true} hideChange />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Visual SVG Follower Growth Chart */}
                <div className="md:col-span-2 bg-white dark:bg-[#0c0c0e] border border-zinc-200/60 dark:border-zinc-900/60 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-zinc-800 dark:text-white border-b border-zinc-100 dark:border-zinc-900/50 pb-3 mb-4">Followers Growth Trend</h3>
                  <div className="h-48 flex items-end justify-between gap-1 w-full relative pt-4">
                    {/* SVG Chart */}
                    <svg className="absolute inset-0 w-full h-full p-2 overflow-visible" preserveAspectRatio="none">
                      <path 
                        d="M 10 120 Q 80 100 150 90 T 290 50 T 430 30" 
                        fill="none" 
                        stroke="#71717a" 
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    {/* Visual Bars overlay */}
                    {[1020, 1032, 1054, 1089, 1102, 1140, 1175].map((val, idx) => (
                      <div key={idx} className="flex flex-col items-center flex-1 h-full justify-end z-10">
                        <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-550 mb-1">{val}</span>
                        <div 
                          className="w-full max-w-[20px] rounded-t bg-zinc-100 dark:bg-zinc-800/80 border-t border-zinc-250 dark:border-zinc-700"
                          style={{ height: `${(val - 900) / 3}%` }}
                        />
                        <span className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-550 mt-2">Day {idx+1}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Growth Coach card */}
                <div className="bg-zinc-50/50 dark:bg-zinc-900/20 border border-zinc-200/60 dark:border-zinc-800 rounded-2xl p-5 flex flex-col shadow-sm">
                  <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 border-b border-zinc-200/50 dark:border-zinc-850 pb-3 mb-4">
                    <Bot className="w-5 h-5 text-zinc-400" />
                    Growth Coach Tips
                  </h3>
                  <div className="space-y-4 flex-1">
                    {(dashboardData?.coachSuggestions || [
                      'Post between 7:00 PM and 9:00 PM today for highest audience activity.',
                      'Create more video content. Reels receive 4x more engagement than text updates.',
                      'Target real estate and investment groups like "Mumbai Real Estate" for property posts.',
                      'Share a client testimonial to build trust on the platform.'
                    ]).map((sug: string, idx: number) => (
                      <div key={idx} className="flex gap-2.5 items-start">
                        <span className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">{idx+1}</span>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">{sug}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Trending Topics & Content idea triggers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Trending Topics List */}
                <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200/60 dark:border-zinc-900/60 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-zinc-800 dark:text-white border-b border-zinc-100 dark:border-zinc-900/50 pb-3 mb-4">Trending Niche Topics Today</h3>
                  <div className="space-y-3">
                    {(dashboardData?.trendingTopics || [
                      'Property investment trends in Kalyan-Dombivli.',
                      'Advantage+ Creative hacks for local brands.',
                      'Top 3 home decor trends for 2026.'
                    ]).map((topic: string, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-zinc-50/40 dark:bg-zinc-900/10 border border-zinc-200/40 dark:border-zinc-850 rounded-xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">🔥</span>
                          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200">{topic}</span>
                        </div>
                        <Button 
                          onClick={() => {
                            setActiveTab('copywriter');
                            setFlowState('post_caption');
                            setDraftTitle(topic);
                            setImagePrompt(`${topic} visual advertisement banner`);
                            const u = addUserMessage(`Write post about: ${topic}`);
                            const b = addBotMessage(`I've loaded "${topic}" as your headline. Write a short idea or description for it and I will rewrite it professionally!`);
                            saveHistory([u, b]);
                          }}
                          size="sm" 
                          variant="ghost" 
                          className="text-xs text-zinc-500 hover:text-zinc-800 font-extrabold h-8 rounded-lg"
                        >
                          Draft Post
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Voice assistant card */}
                <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200/60 dark:border-zinc-900/60 rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-4">
                  <div className="relative">
                    <button 
                      onClick={handleToggleVoice}
                      className={`w-16 h-16 rounded-full ${isVoiceActive ? 'bg-red-500 animate-pulse text-white' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-350'} flex items-center justify-center border border-zinc-200/60 dark:border-zinc-700 transition-all shadow-sm active:scale-95`}
                    >
                      <Mic className="w-7 h-7" />
                    </button>
                    {isVoiceActive && (
                      <span className="absolute -inset-2 rounded-full border-2 border-red-500/20 animate-ping"></span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-zinc-850 dark:text-white">AI Voice Assistant (Beta)</h4>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-xs">Tap mic to simulate speaking your post topic and let AI draft it instantly.</p>
                  </div>
                  {voiceTranscript && (
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800 rounded-xl max-w-sm text-xs font-semibold font-mono text-zinc-600 dark:text-zinc-300">
                      "{voiceTranscript}"
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COPYWRITER & CREATIVE (chatbot chat wizard) */}
          {activeTab === 'copywriter' && (
            <div className="flex flex-col h-full bg-white dark:bg-[#09090b] relative">
              {/* Header inside pane */}
              <div className="h-14 border-b border-zinc-200/50 dark:border-zinc-900 bg-zinc-50/50 dark:bg-[#0c0c0e] flex items-center justify-between px-6 sticky top-0 z-20 shrink-0">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-zinc-500 animate-pulse" />
                  <span className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200">Copywriter Chat Assistant</span>
                </div>
                <Button onClick={clearChatHistory} variant="ghost" size="sm" className="text-xs text-zinc-500 hover:text-red-500 font-bold rounded-lg h-8">
                  Reset Flow
                </Button>
              </div>

              {/* Chat Message Scroll Area */}
              <div className="flex-1 overflow-hidden relative">
                <ScrollArea className="h-full px-4 py-6 pb-40">
                  <div className="max-w-3xl mx-auto space-y-4">
                    
                    {aiMessages.map((msg) => (
                      <div key={msg.id} className={`flex w-full gap-2 sm:gap-3 ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                        {!msg.isMe && (
                          <Avatar className="w-8 h-8 flex-shrink-0 mt-0.5 border border-zinc-200/60 dark:border-zinc-800 hidden sm:block">
                            <AvatarImage src={msg.senderAvatar} />
                            <AvatarFallback>AI</AvatarFallback>
                          </Avatar>
                        )}
                        
                        <div className={`flex flex-col max-w-[85%] ${msg.isMe ? 'items-end' : 'items-start'}`}>
                          {msg.media && (
                            <div className="mb-1 rounded-2xl overflow-hidden max-w-sm border border-zinc-200 dark:border-zinc-850 shadow-sm">
                              <img src={msg.media.url} alt="Attached" className="w-full object-cover max-h-60" />
                            </div>
                          )}

                          {msg.text && (
                            <div className={`relative px-4 py-3 text-[14.5px] leading-relaxed border ${
                              msg.isMe 
                                ? 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 border-zinc-250/60 dark:border-zinc-700/60 rounded-2xl rounded-tr-sm font-semibold' 
                                : 'bg-zinc-50/40 dark:bg-zinc-900/10 text-zinc-800 dark:text-zinc-200 border-zinc-200/40 dark:border-zinc-850 rounded-2xl rounded-tl-sm'
                            }`}>
                              <div className="whitespace-pre-wrap break-words">{msg.text}</div>
                            </div>
                          )}
                          <span className="text-[9px] text-zinc-400 mt-1 px-1">{msg.time}</span>
                        </div>
                      </div>
                    ))}

                    {/* Wizards buttons inside chat stream */}
                    {flowState === 'idle' && (
                      <div className="w-full max-w-lg mx-auto py-8 text-center space-y-6 animate-in fade-in duration-300">
                        <div className="space-y-2">
                          <Bot className="w-10 h-10 text-zinc-450 dark:text-zinc-500 mx-auto stroke-[1.5]" />
                          <h2 className="text-lg font-extrabold text-zinc-850 dark:text-zinc-200">How can I help you today?</h2>
                          <p className="text-xs text-zinc-400 dark:text-zinc-550 max-w-xs mx-auto">Select a quick helper task below to start collaborating with Tolee AI</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <button
                            onClick={() => startPostFlow()}
                            className="flex flex-col items-start p-3 bg-zinc-50/50 hover:bg-zinc-100/50 dark:bg-zinc-900/10 dark:hover:bg-zinc-900/30 border border-zinc-200/60 dark:border-zinc-800 rounded-xl text-left transition-all active:scale-[0.98]"
                          >
                            <PlusCircle className="w-4.5 h-4.5 text-zinc-500 mb-1.5" />
                            <span className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200">Create Organic Post</span>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-550 mt-0.5">Draft caption & design AI banner</span>
                          </button>
                          <button
                            onClick={() => startAdFlow()}
                            className="flex flex-col items-start p-3 bg-zinc-50/50 hover:bg-zinc-100/50 dark:bg-zinc-900/10 dark:hover:bg-zinc-900/30 border border-zinc-200/60 dark:border-zinc-800 rounded-xl text-left transition-all active:scale-[0.98]"
                          >
                            <Target className="w-4.5 h-4.5 text-zinc-500 mb-1.5" />
                            <span className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200">Place Sponsored Ad</span>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-550 mt-0.5">Promote services with custom budget</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {flowState === 'post_media_choice' && (
                      <div className="flex gap-3 mt-3 w-full max-w-sm mx-auto p-4 bg-zinc-50/50 dark:bg-zinc-900/10 border border-zinc-200/60 dark:border-zinc-800 rounded-2xl">
                        <Button
                          onClick={() => {
                            setFlowState('post_media_upload');
                            const u = addUserMessage('📸 Upload Media');
                            const b = addBotMessage(`Select or drag your visual image or video to upload:`);
                            setAiMessages(prev => [...prev, u, b]);
                          }}
                          className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 font-bold h-10 rounded-xl gap-1.5 border border-zinc-200/60 dark:border-zinc-750 text-xs transition-all"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Upload Photo/Video
                        </Button>
                        <Button
                          onClick={() => {
                            setFlowState('post_media_generate');
                            const u = addUserMessage('🎨 Generate AI Image');
                            const b = addBotMessage(`Stunning AI Image Generator active! Click "Generate visual graphic" below to design:`);
                            setAiMessages(prev => [...prev, u, b]);
                          }}
                          className="flex-1 bg-zinc-800 hover:bg-zinc-900 text-white font-bold h-10 rounded-xl gap-1.5 text-xs shadow-sm transition-all"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Generate with AI
                        </Button>
                      </div>
                    )}

                    {flowState === 'ad_media_choice' && (
                      <div className="flex gap-3 mt-3 w-full max-w-sm mx-auto p-4 bg-zinc-50/50 dark:bg-zinc-900/10 border border-zinc-200/60 dark:border-zinc-800 rounded-2xl">
                        <Button
                          onClick={() => {
                            setFlowState('ad_media_upload');
                            const u = addUserMessage('📸 Upload Media');
                            const b = addBotMessage(`Select your ad campaign creative photo/video to upload:`);
                            setAiMessages(prev => [...prev, u, b]);
                          }}
                          className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 font-bold h-10 rounded-xl gap-1.5 border border-zinc-200/60 dark:border-zinc-750 text-xs transition-all"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Upload Creative
                        </Button>
                        <Button
                          onClick={() => {
                            setFlowState('ad_media_generate');
                            const u = addUserMessage('🎨 Generate Ad Creative');
                            const b = addBotMessage(`AI Image Generator active! Select options and generate the visual:`);
                            setAiMessages(prev => [...prev, u, b]);
                          }}
                          className="flex-1 bg-zinc-800 hover:bg-zinc-900 text-white font-bold h-10 rounded-xl gap-1.5 text-xs shadow-sm transition-all"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Generate with AI
                        </Button>
                      </div>
                    )}

                    {generatedImageUrl && (flowState === 'post_media_generate' || flowState === 'ad_media_generate') && (
                      <div className="flex gap-3 mt-3 w-full max-w-sm mx-auto p-4 bg-zinc-50/50 dark:bg-zinc-900/10 border border-zinc-200/60 dark:border-zinc-800 rounded-2xl">
                        <Button
                          onClick={() => handleKeepGeneratedImage(generatedImageUrl)}
                          className="flex-1 bg-zinc-800 hover:bg-zinc-900 text-white font-bold h-10 text-xs rounded-xl gap-1.5 transition-all"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Keep this Image
                        </Button>
                        <Button
                          onClick={() => {
                            setGeneratedImageUrl(null);
                            const b = addBotMessage(`Sure, let's try again! You can modify prompt options below:`);
                            setAiMessages(prev => [...prev, b]);
                          }}
                          className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 font-bold h-10 text-xs rounded-xl gap-1.5 border border-zinc-200/60 dark:border-zinc-700 transition-all"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Try Another One
                        </Button>
                      </div>
                    )}

                    {/* AI image generator options panel */}
                    {(flowState === 'post_media_generate' || flowState === 'ad_media_generate') && !generatedImageUrl && (
                      <div className="w-full max-w-md mx-auto bg-zinc-950 border border-zinc-800 rounded-2xl p-4 shadow-2xl space-y-3">
                        <span className="text-indigo-400 font-extrabold text-xs flex items-center gap-1.5 pb-2 border-b border-zinc-900">
                          <Sparkles className="w-4 h-4" /> Visual Generator Prompt
                        </span>
                        <div>
                          <textarea
                            value={imagePrompt}
                            onChange={(e) => setImagePrompt(e.target.value)}
                            rows={3}
                            className="w-full bg-zinc-900 border border-zinc-850 text-xs rounded-lg p-2 text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <select 
                            value={imageStyle} 
                            onChange={(e: any) => setImageStyle(e.target.value)}
                            className="bg-zinc-900 border border-zinc-800 text-[11px] rounded-lg p-1.5 text-gray-300"
                          >
                            <option value="marketing">Advertising Banner</option>
                            <option value="realistic">Photorealistic (8K)</option>
                            <option value="illustration">Digital Illustration</option>
                            <option value="social">Pinterest Lifestyle</option>
                          </select>
                          <select 
                            value={imageAspect} 
                            onChange={(e: any) => setImageAspect(e.target.value)}
                            className="bg-zinc-900 border border-zinc-800 text-[11px] rounded-lg p-1.5 text-gray-300"
                          >
                            <option value="landscape">Landscape (16:9)</option>
                            <option value="portrait">Portrait (3:4)</option>
                            <option value="square">Square (1:1)</option>
                          </select>
                        </div>
                        <Button
                          onClick={handleGenerateAIImage}
                          disabled={isGeneratingImage}
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold h-9 text-xs rounded-xl shadow-md gap-1"
                        >
                          {isGeneratingImage ? <><RefreshCw className="w-3 animate-spin" /> Generating...</> : <><Sparkles className="w-3 h-3" /> Generate visual graphic</>}
                        </Button>
                      </div>
                    )}

                    {/* File Upload Box */}
                    {(flowState === 'post_media_upload' || flowState === 'ad_media_upload') && (
                      <div 
                        onClick={() => aiFileInputRef.current?.click()}
                        className="w-full max-w-sm mx-auto border-2 border-dashed border-zinc-800 bg-zinc-950/45 p-6 rounded-2xl text-center cursor-pointer hover:bg-zinc-950/80 transition-all"
                      >
                        <Upload className="w-5 h-5 mx-auto text-gray-400 mb-2" />
                        <p className="text-xs font-bold text-gray-200">Select Media Creative</p>
                        <span className="text-[10px] text-gray-500 mt-0.5 block">Images & Videos up to 50MB</span>
                      </div>
                    )}

                    {/* Target Groups Selector */}
                    {(flowState === 'post_groups' || flowState === 'ad_groups') && (
                      <div className="w-full max-w-md mx-auto bg-zinc-950 border border-zinc-800 rounded-2xl p-4 shadow-2xl space-y-3">
                        <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                          <span className="text-indigo-400 font-extrabold text-xs flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5" /> Target Groups
                          </span>
                          {flowState === 'ad_groups' && (
                            <label className="flex items-center gap-1.5 cursor-pointer bg-zinc-900/60 border border-zinc-800 px-2 py-0.5 rounded-lg">
                              <input 
                                type="checkbox" 
                                checked={draftGroups.length === 0} 
                                onChange={(e) => {
                                  if (e.target.checked) setDraftGroups([]);
                                  else if (availableGroups.length > 0) setDraftGroups([availableGroups[0].id]);
                                }}
                                className="rounded border-zinc-800 text-emerald-500 w-3 h-3"
                              />
                              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">All Groups</span>
                            </label>
                          )}
                        </div>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {availableGroups.map((g) => {
                            const isChecked = draftGroups.includes(g.id);
                            return (
                              <label key={g.id} className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-all ${isChecked ? 'bg-indigo-950/20 border-indigo-900/50 text-indigo-400 font-bold' : 'bg-zinc-900/20 border-zinc-900/30 text-gray-400 hover:border-zinc-800'}`}>
                                <input type="checkbox" checked={isChecked} disabled={flowState === 'ad_groups' && draftGroups.length === 0} onChange={(e) => {
                                  if (e.target.checked) setDraftGroups([...draftGroups, g.id]);
                                  else setDraftGroups(draftGroups.filter(id => id !== g.id));
                                }} className="w-3.5 h-3.5 rounded text-indigo-500 border-zinc-800 bg-zinc-950" />
                                <span className="truncate">{g.name}</span>
                              </label>
                            );
                          })}
                        </div>
                        <Button
                          onClick={() => {
                            if (flowState === 'post_groups') handleConfirmPostGroups();
                            else handleConfirmAdGroups(draftGroups.length === 0);
                          }}
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold h-9 text-xs rounded-xl shadow-md"
                        >
                          Confirm ({draftGroups.length === 0 ? 'All Groups' : `${draftGroups.length} Selected`})
                        </Button>
                      </div>
                    )}

                    {/* Post Draft Card */}
                    {flowState === 'post_draft' && (
                      <div className="w-full max-w-md mx-auto bg-zinc-950 border border-zinc-850 rounded-2xl overflow-hidden p-4 space-y-3">
                        <div className="flex items-center gap-2 text-indigo-400 font-extrabold text-xs border-b border-zinc-900 pb-2">
                          <Sparkles className="w-4.5 h-4.5 text-white animate-pulse" /> Confirm Organic Post
                        </div>
                        <Input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} className="bg-zinc-900 border-zinc-800 text-xs rounded-lg text-gray-200" />
                        <textarea value={draftCaption} onChange={(e) => setDraftCaption(e.target.value)} rows={3} className="w-full bg-zinc-900 border border-zinc-800 text-xs rounded-lg p-2 focus:outline-none text-gray-200" />
                        {draftMedia && <img src={draftMedia.url} className="rounded-lg max-h-24 object-cover" />}
                        <Button onClick={() => handlePublishPostSubmit()} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold h-10 text-xs rounded-xl shadow-lg">
                          🚀 Confirm & Publish Post ({draftGroups.length} Groups)
                        </Button>
                      </div>
                    )}

                    {/* Ad Draft Card */}
                    {flowState === 'ad_draft' && (
                      <div className="w-full max-w-md mx-auto bg-zinc-950 border border-zinc-850 rounded-2xl overflow-hidden p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                          <span className="text-emerald-400 font-extrabold text-xs flex items-center gap-1.5"><Target className="w-4 h-4" /> Confirm Sponsored Ad</span>
                          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] rounded-full font-bold uppercase tracking-wider animate-pulse">Running Ready</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input value={draftLocation} onChange={(e) => setDraftLocation(e.target.value)} placeholder="Target Location" className="bg-zinc-900 border-zinc-800 text-[11px] h-7 text-gray-200" />
                          <Input value={draftAudience} onChange={(e) => setDraftAudience(e.target.value)} placeholder="Target Audience" className="bg-zinc-900 border-zinc-800 text-[11px] h-7 text-gray-200" />
                        </div>
                        <Input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} className="bg-zinc-900 border-zinc-800 text-xs rounded-lg text-gray-200" />
                        <textarea value={draftCaption} onChange={(e) => setDraftCaption(e.target.value)} rows={3} className="w-full bg-zinc-900 border border-zinc-850 text-xs rounded-lg p-2 focus:outline-none text-gray-200" />
                        {draftMedia && <img src={draftMedia.url} className="rounded-lg max-h-24 object-cover" />}
                        <div className="flex items-center gap-2 bg-emerald-950/20 text-emerald-400 border border-emerald-900/40 p-2.5 rounded-xl text-[10px] font-bold justify-between">
                          <span>₹100.00 / Daily Ad Budget (Wallet promos)</span>
                          <ShieldCheck className="w-4 h-4 shrink-0" />
                        </div>
                        <Button onClick={() => handlePublishAdSubmit()} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold h-10 text-xs rounded-xl shadow-lg">
                          📢 Publish Sponsored Ad (Launch Live)
                        </Button>
                      </div>
                    )}

                    {aiTyping && (
                      <div className="flex w-full gap-2 sm:gap-3 my-2 justify-start animate-pulse">
                        <Avatar className="w-8 h-8 flex-shrink-0 mt-0.5 shadow-sm border border-zinc-900 hidden sm:block">
                          <AvatarImage src="https://api.dicebear.com/7.x/bottts/svg?seed=ToleeManager" />
                          <AvatarFallback>AI</AvatarFallback>
                        </Avatar>
                        <div className="relative px-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </div>

              {/* Chat Input Bar */}
              <div className="absolute bottom-0 left-0 right-0 max-w-3xl mx-auto p-4 bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent dark:from-[#09090b] dark:via-[#09090b]/90 dark:to-transparent">
                {aiUploadProgress > 0 && (
                  <div className="mb-2 p-2 bg-indigo-950/20 border border-indigo-900/60 rounded-xl text-[10px] font-extrabold text-indigo-400 flex justify-between items-center animate-pulse">
                    <span>Uploading asset...</span>
                    <span>{aiUploadProgress}%</span>
                  </div>
                )}
                <form onSubmit={handleChatSubmit} className="relative bg-white dark:bg-zinc-900 rounded-2xl border border-gray-250 dark:border-zinc-800 flex items-center px-2 py-1.5">
                  <input type="file" ref={aiFileInputRef} onChange={(e) => { if (e.target.files?.[0]) handleFileUploadTrigger(e.target.files[0]); }} className="hidden" accept="image/*,video/*" />
                  <Button type="button" onClick={() => aiFileInputRef.current?.click()} disabled={flowState === 'idle' || flowState === 'post_media_generate' || flowState === 'post_draft' || flowState === 'ad_draft' || flowState === 'ad_media_generate'} variant="ghost" size="icon" className="text-gray-400 hover:text-primary rounded-xl h-9 w-9 shrink-0">
                    <Paperclip className="w-4.5 h-4.5" />
                  </Button>
                  <Input 
                    value={newMessage} 
                    onChange={(e) => setNewMessage(e.target.value)} 
                    placeholder={flowState === 'idle' ? "Select an option from chat above to start..." : flowState === 'post_caption' ? "Type post idea and AI will copywrite it..." : flowState === 'ad_text' ? "Describe business/product for sponsored ad..." : "Proceed with configuration choices above..."} 
                    disabled={flowState === 'idle' || flowState === 'post_media_choice' || flowState === 'post_media_upload' || flowState === 'post_media_generate' || flowState === 'post_groups' || flowState === 'post_draft' || flowState === 'ad_media_choice' || flowState === 'ad_media_upload' || flowState === 'ad_media_generate' || flowState === 'ad_groups' || flowState === 'ad_draft'} 
                    className="flex-1 border-none shadow-none focus-visible:ring-0 bg-transparent text-xs h-10 px-2 text-gray-800 dark:text-gray-100 placeholder:text-gray-400"
                  />
                  <Button type="submit" disabled={!newMessage.trim() || flowState === 'idle' || flowState === 'post_media_choice' || flowState === 'post_media_upload' || flowState === 'post_media_generate' || flowState === 'post_groups' || flowState === 'post_draft' || flowState === 'ad_media_choice' || flowState === 'ad_media_upload' || flowState === 'ad_media_generate' || flowState === 'ad_groups' || flowState === 'ad_draft'} className="bg-primary text-white rounded-xl h-9 w-9 shrink-0 flex items-center justify-center">
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: SMART PRIORITY INBOX */}
          {activeTab === 'inbox' && (
            <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
              <div>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                  Smart Priority Inbox
                  <Inbox className="w-5 h-5 text-indigo-400" />
                </h1>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">Comments on your posts sorted by priority and intent</p>
              </div>

              {isLoadingDashboard ? (
                <div className="text-center py-20 text-gray-500 animate-pulse">Syncing smart comments inbox...</div>
              ) : !dashboardData?.comments || dashboardData.comments.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-[#0b0b0d] border border-gray-250 dark:border-zinc-900 rounded-2xl text-gray-500 font-bold">
                  No comments on your posts yet! Publish more content to build engagement.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* High Priority (Leads) */}
                  <PriorityGroupSection 
                    title="🔴 High Priority (Leads & Inquiries)" 
                    comments={dashboardData.comments.filter((c: any) => c.priority === 'high' && !c.isSpam)} 
                    onGenerateReply={handleGenerateReply}
                    onPostReply={handlePostReply}
                    isGeneratingReplyMap={isGeneratingReplyMap}
                    suggestedReplies={suggestedReplies}
                    customReplyText={customReplyText}
                    setCustomReplyText={setCustomReplyText}
                  />

                  {/* Medium Priority (Questions) */}
                  <PriorityGroupSection 
                    title="🟡 Medium Priority (Questions & Suggestions)" 
                    comments={dashboardData.comments.filter((c: any) => c.priority === 'medium' && !c.isSpam)} 
                    onGenerateReply={handleGenerateReply}
                    onPostReply={handlePostReply}
                    isGeneratingReplyMap={isGeneratingReplyMap}
                    suggestedReplies={suggestedReplies}
                    customReplyText={customReplyText}
                    setCustomReplyText={setCustomReplyText}
                  />

                  {/* Low Priority (General Comments) */}
                  <PriorityGroupSection 
                    title="🟢 Low Priority (Reactions & Emojis)" 
                    comments={dashboardData.comments.filter((c: any) => c.priority === 'low' && !c.isSpam)} 
                    onGenerateReply={handleGenerateReply}
                    onPostReply={handlePostReply}
                    isGeneratingReplyMap={isGeneratingReplyMap}
                    suggestedReplies={suggestedReplies}
                    customReplyText={customReplyText}
                    setCustomReplyText={setCustomReplyText}
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 4: AI LEADS HUB (Business Center) */}
          {activeTab === 'leads' && (
            <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
              <div>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                  AI Potential Leads Hub
                  <Target className="w-5 h-5 text-emerald-500 animate-pulse" />
                </h1>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">High-intent prospective buyers detected from comment inquiries</p>
              </div>

              {isLoadingDashboard ? (
                <div className="text-center py-20 text-gray-500 animate-pulse">Scanning comment logs for buyer leads...</div>
              ) : !dashboardData?.leads || dashboardData.leads.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-[#0b0b0d] border border-gray-250 dark:border-zinc-900 rounded-2xl text-gray-500 font-bold p-6">
                  No prospective buyer leads detected yet. Promote your listings/posts to gather interest!
                </div>
              ) : (
                <div className="space-y-4">
                  {dashboardData.leads.map((lead: any) => (
                    <div key={lead.id} className="bg-white dark:bg-[#0c0c0e] border border-emerald-500/20 dark:border-zinc-900/60 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10 border border-zinc-800">
                            <AvatarImage src={lead.author.avatar || lead.author.image || '/default-user-avatar.svg'} />
                            <AvatarFallback>{lead.author.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{lead.author.name || lead.author.username}</span>
                            <span className="text-[10px] text-gray-400">@{lead.author.username}</span>
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-extrabold uppercase rounded-full tracking-wider animate-pulse">Buyer Lead</span>
                      </div>

                      <div className="p-3 bg-zinc-50 dark:bg-zinc-900/40 border border-gray-150 dark:border-zinc-900 rounded-xl space-y-1.5">
                        <span className="text-[10px] text-gray-500 uppercase font-extrabold tracking-wider">Comment Query</span>
                        <p className="text-sm font-medium text-gray-800 dark:text-zinc-200">"{lead.content}"</p>
                      </div>

                      <div className="flex gap-2 justify-end pt-1">
                        <Button 
                          onClick={() => handleLaunchChatRoomRedirect(lead.author.id)}
                          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold h-9 text-xs rounded-xl shadow-md border border-teal-400/20 gap-1.5"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Direct Message Chat
                        </Button>
                        <Button 
                          onClick={() => {
                            setActiveTab('inbox');
                            setTimeout(() => {
                              handleGenerateReply(lead.id, lead.content, lead.post?.caption);
                            }, 200);
                          }}
                          variant="outline" 
                          className="border-zinc-200 dark:border-zinc-800 hover:bg-zinc-900 text-xs font-bold h-9 rounded-xl"
                        >
                          Draft AI Reply
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: NICHE CONTENT CALENDAR */}
          {activeTab === 'calendar' && (
            <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                    AI Content Calendar Planner
                    <Calendar className="w-5 h-5 text-indigo-400" />
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">Generate daily post hooks and ideas customized to your niche</p>
                </div>
                
                <div className="flex gap-2">
                  <select 
                    value={selectedNiche} 
                    onChange={(e) => setSelectedNiche(e.target.value)}
                    className="bg-white dark:bg-[#0c0c0e] border border-gray-200 dark:border-zinc-800 text-xs font-bold rounded-lg px-2.5 py-1 text-gray-700 dark:text-zinc-300 focus:outline-none"
                  >
                    <option value="Real Estate">🏢 Real Estate</option>
                    <option value="Food & Restaurant">🍳 Food & Cafe</option>
                    <option value="Fashion & Beauty">💅 Skincare & Beauty</option>
                    <option value="General Creator">🌟 Lifestyle/General</option>
                  </select>

                  <Button onClick={handleGenerateCalendar} disabled={isGeneratingCalendar} size="sm" className="bg-primary text-white text-xs font-bold rounded-xl h-8 gap-1">
                    {isGeneratingCalendar ? <><RefreshCw className="w-3 h-3 animate-spin" /> Generating...</> : <><Sparkles className="w-3.5 h-3.5" /> Plan Week</>}
                  </Button>
                </div>
              </div>

              {contentCalendar.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-[#0b0b0d] border border-gray-250 dark:border-zinc-900 rounded-2xl p-8 flex flex-col items-center gap-4">
                  <Calendar className="w-12 h-12 text-gray-400" />
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Content Planner Ready</h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">Select your niche above and click "Plan Week" to generate a tailored 7-day schedule of copywriting templates.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {contentCalendar.map((item) => (
                    <div key={item.day} className="bg-white dark:bg-[#0c0c0e] border border-gray-200 dark:border-zinc-900/60 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
                      <div className="flex gap-4 items-start">
                        <span className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 text-sm flex items-center justify-center shrink-0 font-bold border border-indigo-500/10">Day {item.day}</span>
                        <div className="space-y-1">
                          <h4 className="text-sm font-black text-gray-900 dark:text-white leading-tight">{item.theme}</h4>
                          <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed font-medium">"{item.caption}"</p>
                          <span className="text-[10px] font-semibold text-indigo-500 dark:text-indigo-400 block">{item.hashtags}</span>
                        </div>
                      </div>
                      <Button 
                        onClick={() => handleApplyCalendarTopic(item)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 text-xs rounded-xl shrink-0 gap-1"
                      >
                        Write Post
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: COMMUNITY GUARD (Abusive Language/Spam Moderation) */}
          {activeTab === 'community' && (
            <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
              <div>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                  AI Community Guard & Moderation
                  <ShieldAlert className="w-5 h-5 text-indigo-400" />
                </h1>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">Automated spam scanning and group moderation filters</p>
              </div>

              {/* Status Header */}
              <div className="flex items-center justify-between p-4 bg-emerald-950/20 border border-emerald-900/40 text-emerald-400 rounded-2xl text-xs font-bold shadow-sm">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div className="flex flex-col">
                    <span>Guard Scanner: ACTIVE</span>
                    <span className="text-[9px] text-emerald-500 uppercase tracking-wider mt-0.5">Filtering spams, abusive links, and fake users</span>
                  </div>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              </div>

              {/* Spam/Suspicious Comments List */}
              <div className="bg-white dark:bg-[#0b0b0d] border border-gray-200 dark:border-zinc-900/60 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-zinc-900/50 pb-3">Flagged Suspicious Comments</h3>
                
                {isLoadingDashboard ? (
                  <div className="text-center py-6 text-gray-500 animate-pulse text-xs">Scanning comments for spam...</div>
                ) : !dashboardData?.spam || dashboardData.spam.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 font-bold text-xs">
                    Clean record! No spam comments detected on your content.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-zinc-900">
                    {dashboardData.spam.map((sp: any) => (
                      <div key={sp.id} className="py-3 flex justify-between items-center gap-4">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-red-500">Spam Triggered</span>
                            <span className="text-[10px] text-gray-400 font-medium">by @{sp.author?.username}</span>
                          </div>
                          <p className="text-xs font-mono text-gray-700 dark:text-zinc-300 truncate font-semibold">"{sp.content}"</p>
                        </div>
                        <Button size="sm" variant="ghost" className="text-xs text-red-500 hover:text-white hover:bg-red-500 h-8 rounded-lg">
                          Delete
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Fake user warnings */}
              <div className="bg-white dark:bg-[#0b0b0d] border border-gray-200 dark:border-zinc-900/60 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-zinc-900/50 pb-3">Suspicious Registrations (Bot Detection log)</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-red-950/10 border border-red-900/20 text-red-400 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">🤖</span>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">Bot signup blocked: qa-test-bot-22</span>
                        <span className="text-[9px] text-red-500 font-semibold mt-0.5">Identified via frontend bot detection keywords matching</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold">Blocked</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-red-950/10 border border-red-900/20 text-red-400 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">🤖</span>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">Bot signup blocked: temp-user-spam@mail</span>
                        <span className="text-[9px] text-red-500 font-semibold mt-0.5">Identified via backend register API regex filter</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold">Blocked</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: AD CAMPAIGN & BUSINESS COACH */}
          {activeTab === 'business' && (
            <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
              <div>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                  AI Business Assistant & Coach
                  <Briefcase className="w-5 h-5 text-indigo-400" />
                </h1>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">Maximize lead conversions and sponsored ad budgets</p>
              </div>

              {/* Recommended Campaigns Setup */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Recommended Sponsored Campaigns for Your Niche</h3>

                <AdCampaignCoachCard 
                  title="🏢 Commercial Property Leads Campaign" 
                  niche="Real Estate"
                  budget="₹150.00 / Daily"
                  audience="Mumbai, Investors, Shop owners, age 25-54"
                  objective="Lead Generation / Inquiries"
                  tip="Use a high quality Flux Schnell generated illustration showcasing premium corporate storefronts."
                  onApply={() => handleApplyAdCampaign({
                    title: "Exclusive Commercial Shops in Kalyan",
                    caption: "Book premium corporate storefronts and retail spaces in Kalyan with 2x rental yields! Starting at just ₹45 Lakhs. DM us today for floor plans. 🏢💼",
                    location: "Kalyan, Thane, Mumbai",
                    audience: "Investors, Commercial buyers, Shop owners",
                    imagePrompt: "A premium modern corporate commercial building storefront with high-end glass windows, warm sunny day, architectural photography"
                  })}
                />

                <AdCampaignCoachCard 
                  title="☕ Cafe Combos Engagement Campaign" 
                  niche="Food & Restaurant"
                  budget="₹100.00 / Daily"
                  audience="Local town, Students, Food lovers, age 18-35"
                  objective="Engagement / Footfall"
                  tip="Offer a direct promo code. Showcase food items styled with warm natural lighting."
                  onApply={() => handleApplyAdCampaign({
                    title: "Mid-Week Combo Specials - Cafe Kalyan",
                    caption: "Feeling hungry? Grab our signature paneer tikka pizza + mocktail combo for just ₹199! Only available Tuesdays to Thursdays. Tag a friend to invite! 🍕🥤",
                    location: "Kalyan",
                    audience: "Food lovers, College students, Pizza fans",
                    imagePrompt: "A delicious piping hot wood-fired paneer pizza on a wooden plate next to a glowing mocktail glass, warm atmospheric cafe lighting"
                  })}
                />
              </div>
            </div>
          )}

          {/* TAB 8: DOC LAYOUT ANALYZER */}
          {activeTab === 'analyzer' && (
            <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
              <div>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                  Document Layout Analyzer
                  <ImageIcon className="w-5 h-5 text-indigo-400" />
                </h1>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">Detect tables, charts, and titles from uploaded document screenshots to draft instant AI posts</p>
              </div>

              {!analyzerImage ? (
                // Initial Upload Screen
                <div 
                  onClick={() => analyzerFileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 dark:border-zinc-800 bg-white dark:bg-[#0b0b0d] hover:bg-slate-50/50 dark:hover:bg-zinc-900/10 p-12 rounded-3xl text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[300px] shadow-sm group"
                >
                  <input type="file" ref={analyzerFileInputRef} onChange={handleAnalyzerFileChange} className="hidden" accept="image/*" />
                  <div className="w-14 h-14 rounded-full bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 flex items-center justify-center mb-4 border border-indigo-500/10 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Upload Document Screenshot</h3>
                  <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1.5 max-w-xs leading-relaxed">
                    Upload an image or screenshot of a dashboard, slide, chart page, or structured document to scan its elements.
                  </p>
                </div>
              ) : (
                // Active Analyzer Workspace
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Interactive Image Viewer & Overlay */}
                  <div className="lg:col-span-2 flex flex-col bg-white dark:bg-[#0c0c0e] border border-gray-200 dark:border-zinc-900/60 rounded-3xl p-5 shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-150 dark:border-zinc-900/40 pb-3">
                      <span className="text-xs font-black text-gray-800 dark:text-zinc-300 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-indigo-400" /> Image Layout Canvas
                      </span>
                      <Button 
                        onClick={() => {
                          setAnalyzerImage(null);
                          setAnalysisResult(null);
                          setAnalysisError(null);
                          setSelectedElementIndex(null);
                        }} 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs text-gray-500 hover:text-red-500 font-extrabold h-8 rounded-lg"
                      >
                        Reset / Upload New
                      </Button>
                    </div>

                    {/* Image Box and Canvas Overlay */}
                    <div className="relative border border-gray-100 dark:border-zinc-900 rounded-2xl overflow-hidden bg-slate-50 dark:bg-black/40 flex items-center justify-center min-h-[350px] max-h-[500px]">
                      <img src={analyzerImage} className="w-full h-full object-contain max-h-[500px]" alt="Document preview" />
                      
                      {/* Box Overlay */}
                      {analysisResult && analysisResult.map((el, index) => {
                        const isSelected = selectedElementIndex === index;
                        
                        // Select color coding based on label type
                        let colorClass = 'border-blue-500 bg-blue-500/10 hover:bg-blue-500/25 text-blue-500';
                        if (el.label === 'table') {
                          colorClass = 'border-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-500';
                        } else if (el.label === 'chart' || el.label === 'infographic') {
                          colorClass = 'border-cyan-500 bg-cyan-500/10 hover:bg-cyan-500/25 text-cyan-500';
                        } else if (el.label === 'paragraph' || el.label === 'text') {
                          colorClass = 'border-amber-500 bg-amber-500/10 hover:bg-amber-500/25 text-amber-500';
                        }
                        
                        // Convert normalized values (0-1) to percentages for absolute styling
                        const style = {
                          left: `${el.x_min * 100}%`,
                          top: `${el.y_min * 100}%`,
                          width: `${(el.x_max - el.x_min) * 100}%`,
                          height: `${(el.y_max - el.y_min) * 100}%`,
                        };

                        return (
                          <div 
                            key={index}
                            onClick={() => setSelectedElementIndex(index)}
                            className={`absolute border-2 cursor-pointer transition-all flex flex-col justify-start p-1 text-[8px] font-black rounded-lg uppercase tracking-wider ${colorClass} ${isSelected ? 'ring-2 ring-white border-white scale-[1.01] z-20 shadow-xl' : 'z-10'}`}
                            style={style}
                            title={`${el.label} (Conf: ${Math.round(el.confidence * 100)}%)`}
                          >
                            <span className="bg-black/70 text-white px-1.5 py-0.5 rounded text-[7px] w-max font-extrabold shadow-sm leading-none tracking-wide">
                              {el.label}
                            </span>
                          </div>
                        );
                      })}

                      {/* Loading State */}
                      {isAnalyzing && (
                        <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center space-y-4">
                          <Bot className="w-10 h-10 text-primary animate-spin" />
                          <div className="text-center space-y-1">
                            <p className="text-xs font-bold text-gray-900 dark:text-white">Scanning document elements...</p>
                            <p className="text-[10px] text-gray-500 dark:text-zinc-500 uppercase tracking-widest">NVIDIA Page Elements NIM Running</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Bounding Boxes List & Draft Action Drawer */}
                  <div className="flex flex-col bg-white dark:bg-[#0c0c0e] border border-gray-200 dark:border-zinc-900/60 rounded-3xl p-5 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-150 dark:border-zinc-900/40 pb-3">Detected Document Layout</h3>

                    {analysisError && (
                      <div className="p-3.5 bg-red-950/10 border border-red-900/20 text-red-400 rounded-2xl text-xs font-semibold leading-relaxed">
                        ⚠️ {analysisError}
                      </div>
                    )}

                    {isAnalyzing ? (
                      <div className="space-y-3 flex-1 flex flex-col justify-center py-10">
                        <div className="w-full h-8 bg-slate-100 dark:bg-zinc-900 rounded-xl animate-pulse" />
                        <div className="w-5/6 h-8 bg-slate-100 dark:bg-zinc-900 rounded-xl animate-pulse" />
                        <div className="w-4/5 h-8 bg-slate-100 dark:bg-zinc-900 rounded-xl animate-pulse" />
                      </div>
                    ) : !analysisResult || analysisResult.length === 0 ? (
                      <div className="text-center py-20 text-gray-500 font-bold text-xs flex-1 flex flex-col justify-center">
                        {!analysisResult ? 'Awaiting image analysis...' : 'No specific charts, tables, or titles detected in this document layout.'}
                      </div>
                    ) : (
                      <ScrollArea className="flex-1 max-h-[380px] pr-1">
                        <div className="space-y-2">
                          {analysisResult.map((el, idx) => {
                            const isSelected = selectedElementIndex === idx;
                            let pillColor = 'bg-blue-500/10 text-blue-500 border-blue-500/20';
                            if (el.label === 'table') pillColor = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
                            else if (el.label === 'chart' || el.label === 'infographic') pillColor = 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
                            else if (el.label === 'paragraph' || el.label === 'text') pillColor = 'bg-amber-500/10 text-amber-500 border-amber-500/20';

                            return (
                              <div 
                                key={idx}
                                onClick={() => setSelectedElementIndex(idx)}
                                className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all flex flex-col gap-2 ${isSelected ? 'bg-indigo-950/15 border-indigo-900/60 font-bold' : 'bg-zinc-50/50 dark:bg-zinc-900/10 border-gray-150 dark:border-zinc-900 hover:border-zinc-800'}`}
                              >
                                <div className="flex justify-between items-center">
                                  <span className={`px-2 py-0.5 border text-[9px] font-black uppercase rounded-full ${pillColor}`}>
                                    {el.label}
                                  </span>
                                  <span className="text-[10px] text-gray-400">Confidence: {Math.round(el.confidence * 100)}%</span>
                                </div>
                                <div className="text-[10px] text-gray-500 font-mono font-bold">
                                  BBox: [{el.x_min.toFixed(2)}, {el.y_min.toFixed(2)}] to [{el.x_max.toFixed(2)}, {el.y_max.toFixed(2)}]
                                </div>
                                
                                {isSelected && (
                                  <Button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Trigger Draft flow based on the element
                                      setActiveTab('copywriter');
                                      setFlowState('post_caption');
                                      
                                      const defaultPrompt = `Write a professional social media post discussing the findings in this ${el.label} layout element. Describe key metrics and invite group discussion:`;
                                      setNewMessage(defaultPrompt);
                                      
                                      const u = addUserMessage(`Create draft post from scanned ${el.label}`);
                                      const b = addBotMessage(`Layout analyzer connected! I have initialized copywriting based on your detected document element: **${el.label}**. \n\nPlease write a short sentence explaining what this element represents or edit the prompt inside the chatbar to generate the post draft!`);
                                      saveHistory([u, b]);
                                    }}
                                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold h-8 text-[11px] rounded-xl gap-1 mt-1 shrink-0"
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Draft AI Post from Element
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ==================== HELPER PRESENTATIONAL COMPONENTS ====================

interface SidebarTabButtonProps {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  badge?: number;
  badgeColor?: string;
}

function SidebarTabButton({ active, icon, label, onClick, badge, badgeColor = "bg-primary" }: SidebarTabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-extrabold rounded-xl transition-all ${
        active 
          ? 'bg-zinc-200/50 dark:bg-zinc-800/80 border border-zinc-300/40 dark:border-zinc-700/50 text-zinc-800 dark:text-zinc-100 shadow-sm' 
          : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/40 border border-transparent'
      }`}
    >
      <div className="flex items-center gap-2.5">
        {icon}
        <span>{label}</span>
      </div>
      {badge && badge > 0 ? (
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black text-white ${badgeColor} leading-none animate-pulse`}>
          {badge}
        </span>
      ) : null}
    </button>
  );
}

interface MobileTabButtonProps {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  badge?: number;
  badgeColor?: string;
}

function MobileTabButton({ active, icon, label, onClick, badge, badgeColor = "bg-primary" }: MobileTabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-extrabold rounded-lg border whitespace-nowrap shrink-0 transition-all ${
        active 
          ? 'bg-zinc-200/50 dark:bg-zinc-800/80 border border-zinc-350/50 dark:border-zinc-700/60 text-zinc-850 dark:text-zinc-100 shadow-sm' 
          : 'bg-white dark:bg-[#0c0c0e]/80 text-zinc-500 border-zinc-200/80 dark:border-zinc-800 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
      }`}
    >
      {icon}
      <span>{label}</span>
      {badge && badge > 0 ? (
        <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black text-white ${badgeColor} leading-none`}>
          {badge}
        </span>
      ) : null}
    </button>
  );
}

interface MetricCardProps {
  label: string;
  score: number;
  change: string;
  up: boolean;
  hideChange?: boolean;
}

function MetricCard({ label, score, change, up, hideChange }: MetricCardProps) {
  return (
    <div className="bg-zinc-50/40 dark:bg-zinc-900/10 border border-zinc-200/60 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-2">
      <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{label}</span>
      <div className="flex items-end justify-between">
        <span className="text-xl sm:text-2xl font-black text-zinc-800 dark:text-white leading-none">{score}</span>
        {!hideChange && (
          <span className={`text-[10px] font-bold ${up ? 'text-zinc-500' : 'text-zinc-400'} flex items-center gap-0.5`}>
            {up ? '▲' : '▼'} {change}
          </span>
        )}
      </div>
    </div>
  );
}

interface PriorityGroupSectionProps {
  title: string;
  comments: any[];
  onGenerateReply: (commentId: string, commentText: string, postTitle?: string) => Promise<void>;
  onPostReply: (commentId: string, postId: string) => Promise<void>;
  isGeneratingReplyMap: Record<string, boolean>;
  suggestedReplies: Record<string, string>;
  customReplyText: Record<string, string>;
  setCustomReplyText: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

function PriorityGroupSection({
  title,
  comments,
  onGenerateReply,
  onPostReply,
  isGeneratingReplyMap,
  suggestedReplies,
  customReplyText,
  setCustomReplyText
}: PriorityGroupSectionProps) {
  if (comments.length === 0) return null;

  return (
    <div className="space-y-3.5">
      <h3 className="text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest px-1">{title}</h3>
      <div className="space-y-3">
        {comments.map((comment) => {
          const isGeneratingReply = isGeneratingReplyMap[comment.id] || false;
          const replyText = suggestedReplies[comment.id] || '';

          return (
            <div key={comment.id} className="bg-white dark:bg-[#0c0c0e] border border-gray-200 dark:border-zinc-900/60 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2.5">
                  <Avatar className="w-8.5 h-8.5 border border-zinc-800">
                    <AvatarImage src={comment.author?.avatar || comment.author?.image || '/default-user-avatar.svg'} />
                    <AvatarFallback>{comment.author?.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-900 dark:text-white">{comment.author?.name || comment.author?.username}</span>
                    <span className="text-[9px] text-gray-500">@{comment.author?.username}</span>
                  </div>
                </div>
                <span className="text-[9px] font-semibold text-gray-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
              </div>

              <div className="text-xs font-medium text-gray-800 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-xl border border-gray-100 dark:border-zinc-900">
                "{comment.content}"
              </div>

              {/* suggested AI reply interface */}
              {replyText ? (
                <div className="border-t border-dashed border-zinc-800 pt-3 space-y-2">
                  <span className="text-[9px] font-extrabold text-indigo-400 flex items-center gap-1.5 animate-pulse">
                    <Bot className="w-3.5 h-3.5 text-indigo-400" />
                    Suggested AI Reply Copy
                  </span>
                  <textarea 
                    value={customReplyText[comment.id] || ''}
                    onChange={(e) => setCustomReplyText(prev => ({ ...prev, [comment.id]: e.target.value }))}
                    rows={2}
                    className="w-full bg-zinc-900 border border-zinc-850 text-xs rounded-xl p-2 text-gray-200 focus:outline-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button 
                      onClick={() => onPostReply(comment.id, comment.post.id)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-8 text-[11px] rounded-lg"
                    >
                      Post Reply
                    </Button>
                    <Button 
                      onClick={() => onGenerateReply(comment.id, comment.content, comment.post?.caption)}
                      variant="outline" 
                      className="border-zinc-800 hover:bg-zinc-900 text-[11px] font-bold h-8 rounded-lg"
                    >
                      Regenerate
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end pt-1">
                  <Button 
                    onClick={() => onGenerateReply(comment.id, comment.content, comment.post?.caption)}
                    disabled={isGeneratingReply}
                    className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 dark:text-indigo-400 font-bold border border-indigo-500/15 dark:border-indigo-900/30 h-8 text-[11px] rounded-lg gap-1"
                  >
                    {isGeneratingReply ? <><RefreshCw className="w-3 h-3 animate-spin" /> Analyzing...</> : <><Bot className="w-3.5 h-3.5 text-indigo-400" /> Draft AI Reply</>}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface AdCampaignCoachCardProps {
  title: string;
  niche: string;
  budget: string;
  audience: string;
  objective: string;
  tip: string;
  onApply: () => void;
}

function AdCampaignCoachCard({
  title,
  niche,
  budget,
  audience,
  objective,
  tip,
  onApply
}: AdCampaignCoachCardProps) {
  return (
    <div className="bg-white dark:bg-[#0c0c0e] border border-gray-200 dark:border-zinc-900/60 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex justify-between items-start border-b border-gray-100 dark:border-zinc-900/50 pb-2.5">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-gray-900 dark:text-white leading-tight">{title}</span>
          <span className="text-[10px] text-gray-400 mt-0.5">Category: {niche}</span>
        </div>
        <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] rounded font-bold uppercase tracking-wider">{objective}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex flex-col">
          <span className="text-[9px] text-gray-400 font-extrabold uppercase tracking-wider">Target Demographics</span>
          <span className="text-xs font-bold text-gray-800 dark:text-zinc-200 truncate mt-0.5">{audience}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] text-gray-400 font-extrabold uppercase tracking-wider">Optimized Budget</span>
          <span className="text-xs font-bold text-emerald-500 mt-0.5">{budget}</span>
        </div>
      </div>

      <div className="p-3 bg-zinc-900/40 border border-zinc-900 rounded-xl text-[11px] font-medium text-gray-600 dark:text-zinc-350 leading-relaxed">
        <span className="font-extrabold text-indigo-400 block mb-0.5">💡 Strategy Tip</span>
        {tip}
      </div>

      <div className="flex justify-end pt-1">
        <Button 
          onClick={onApply}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 text-xs rounded-xl gap-1"
        >
          Configure Ad Campaign
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
