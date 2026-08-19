'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Share2, 
  Sparkles, 
  Copy, 
  Check, 
  Send, 
  Zap, 
  RefreshCw, 
  Wand2, 
  TrendingUp, 
  Sliders, 
  ExternalLink,
  ChevronLeft,
  ArrowRight,
  Hash,
  Lightbulb,
  CheckCircle2,
  Calendar,
  Clock,
  Trash2,
  Play,
  ListOrdered,
  PlusCircle,
  AlertCircle,
  Image as ImageIcon
} from 'lucide-react';
import { 
  generateSocialPostVariations, 
  improveSocialCaption, 
  generateViralHashtags, 
  scheduleSocialPost,
  getUserScheduledPosts,
  cancelScheduledPost,
  PlatformPostVariations,
  ScheduledPostItem
} from '@/actions/socialPublisher';

// ══════════════════════════════════════════════════════════════
// NATIVE SOCIAL SVG ICONS (100% HYDRATION & RUNTIME SAFE)
// ══════════════════════════════════════════════════════════════
const LinkedinIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.64a1.64 1.64 0 1 0 0 3.28 1.64 1.64 0 0 0 0-3.28Z" />
  </svg>
);

const InstagramIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const TwitterIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const FacebookIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const WhatsAppIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24M8.53 7.33c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.02.4 1.38.52.58.18 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.47-.28s-1.44-.71-1.66-.82c-.22-.11-.38-.16-.54.11s-.62.82-.76.99c-.14.17-.28.19-.53.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.41-.55-.42z" />
  </svg>
);

const PROMPT_SUGGESTIONS = [
  "5 AI tools that will save you 10+ hours every week in 2026",
  "Why building a personal brand on LinkedIn is better than sending 100 resumes",
  "The biggest mistake first-time entrepreneurs make (and how to fix it)",
  "How our startup gained our first 1,000 active users with zero ad spend",
  "Top 3 lessons learned from working remotely across 4 different timezones"
];

export default function SocialPublisherClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // View Navigation
  const [viewTab, setViewTab] = useState<'COMPOSER' | 'QUEUE'>('COMPOSER');

  // Composer States
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState<'professional' | 'viral' | 'casual' | 'storytelling' | 'promotional'>('viral');
  const [targetAudience, setTargetAudience] = useState('');
  const [includeLink, setIncludeLink] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<'linkedin' | 'instagram' | 'twitter' | 'facebook' | 'whatsapp'>('linkedin');
  
  // Results & AI States
  const [variations, setVariations] = useState<PlatformPostVariations | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [loadingRefine, setLoadingRefine] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Editable fields per platform
  const [editablePosts, setEditablePosts] = useState<{
    linkedin: string;
    instagram: string;
    twitter: string;
    facebook: string;
    whatsapp: string;
  }>({
    linkedin: '',
    instagram: '',
    twitter: '',
    facebook: '',
    whatsapp: '',
  });

  // Scheduling State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPostItem[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [scheduleDateType, setScheduleDateType] = useState<'today_evening' | 'tomorrow_morning' | 'tomorrow_evening' | 'custom'>('tomorrow_morning');
  const [customDateTime, setCustomDateTime] = useState('');
  const [selectedChannelsForSchedule, setSelectedChannelsForSchedule] = useState<string[]>(['linkedin', 'twitter', 'instagram', 'facebook', 'whatsapp']);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Strict Authentication Guard
  useEffect(() => {
    if (mounted && status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=' + encodeURIComponent('/world/social-publisher'));
    }
  }, [mounted, status, router]);

  useEffect(() => {
    if (mounted && status === 'authenticated') {
      loadScheduledQueue();
    }
  }, [mounted, status]);

  const loadScheduledQueue = async () => {
    const res = await getUserScheduledPosts();
    if (res.success && res.posts) {
      setScheduledPosts(res.posts);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCopyText = (text: string, key: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else if (typeof document !== 'undefined') {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedKey(key);
      showToast('📋 Copied to clipboard!');
      setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      showToast('📋 Copied to clipboard!');
    }
  };

  const handleGenerate = async (suggestedTopic?: string) => {
    const topicToUse = suggestedTopic || topic;
    if (!topicToUse || topicToUse.trim().length < 4) {
      showToast('⚠️ Please enter a topic or select a suggestion first.');
      return;
    }

    if (suggestedTopic) setTopic(suggestedTopic);

    setLoadingAI(true);
    showToast('🚀 AI is crafting viral copy tailored for all 5 platforms...');

    const res = await generateSocialPostVariations({
      topic: topicToUse,
      tone,
      targetAudience: targetAudience || undefined,
      includeLink: includeLink || undefined,
    });

    if (res.success && res.variations) {
      setVariations(res.variations);
      setEditablePosts({
        linkedin: res.variations.linkedin?.fullPost || '',
        instagram: res.variations.instagram?.fullPost || '',
        twitter: res.variations.twitter?.fullPost || '',
        facebook: res.variations.facebook?.fullPost || '',
        whatsapp: res.variations.whatsapp?.formattedMessage || '',
      });
      showToast('🎉 Multi-platform content successfully generated!');
    } else {
      showToast('❌ ' + (res.error || 'Failed to generate content. Please try again.'));
    }
    setLoadingAI(false);
  };

  const handleRefine = async (instruction: 'shorter' | 'more_punchy' | 'add_emojis' | 'strong_cta') => {
    const currentText = editablePosts[selectedPlatform];
    if (!currentText || !currentText.trim()) return;

    setLoadingRefine(true);
    showToast('✨ AI is refining your ' + selectedPlatform.toUpperCase() + ' post...');

    const res = await improveSocialCaption({
      caption: currentText,
      platform: selectedPlatform,
      instruction,
    });

    if (res.success && res.improved) {
      setEditablePosts(prev => ({ ...prev, [selectedPlatform]: res.improved! }));
      showToast('⚡ Refined successfully!');
    } else {
      showToast('❌ Could not refine caption.');
    }
    setLoadingRefine(false);
  };

  // ══════════════════════════════════════════════════════════════
  // SCHEDULING LOGIC
  // ══════════════════════════════════════════════════════════════
  const handleConfirmSchedule = async () => {
    if (!editablePosts.linkedin && !editablePosts.twitter && !editablePosts.instagram) {
      showToast('⚠️ Please generate content before scheduling.');
      return;
    }

    let targetDate = new Date();

    if (scheduleDateType === 'today_evening') {
      targetDate.setHours(18, 0, 0, 0);
      if (targetDate.getTime() <= Date.now()) {
        targetDate.setHours(targetDate.getHours() + 2); // 2 hours from now if 6PM passed
      }
    } else if (scheduleDateType === 'tomorrow_morning') {
      targetDate.setDate(targetDate.getDate() + 1);
      targetDate.setHours(9, 0, 0, 0);
    } else if (scheduleDateType === 'tomorrow_evening') {
      targetDate.setDate(targetDate.getDate() + 1);
      targetDate.setHours(19, 0, 0, 0);
    } else if (scheduleDateType === 'custom') {
      if (!customDateTime) {
        showToast('⚠️ Please select a valid date & time.');
        return;
      }
      targetDate = new Date(customDateTime);
    }

    if (targetDate.getTime() <= Date.now()) {
      showToast('⚠️ Scheduled time must be in the future.');
      return;
    }

    setLoadingSchedule(true);
    showToast('⏰ Scheduling multi-platform campaign...');

    const res = await scheduleSocialPost({
      topic: topic || 'Social Campaign',
      tone,
      platforms: selectedChannelsForSchedule,
      postsData: editablePosts,
      scheduledAt: targetDate.toISOString(),
    });

    if (res.success && res.scheduledPost) {
      setScheduledPosts(prev => [...prev, res.scheduledPost!]);
      setShowScheduleModal(false);
      setViewTab('QUEUE');
      showToast('🎉 Campaign scheduled for ' + targetDate.toLocaleString());
    } else {
      showToast('❌ ' + (res.error || 'Failed to schedule.'));
    }
    setLoadingSchedule(false);
  };

  const handleCancelScheduled = async (id: string) => {
    const res = await cancelScheduledPost(id);
    if (res.success) {
      setScheduledPosts(prev => prev.filter(p => p.id !== id));
      showToast('🗑️ Scheduled post removed from queue.');
    } else {
      showToast('❌ Failed to cancel scheduled post.');
    }
  };

  // ══════════════════════════════════════════════════════════════
  // HYBRID 1-CLICK PUBLISHERS (NO API KEY REQUIRED)
  // ══════════════════════════════════════════════════════════════
  const handleLaunchPublish = (platform: 'linkedin' | 'instagram' | 'twitter' | 'facebook' | 'whatsapp') => {
    const textToShare = editablePosts[platform];
    if (!textToShare) {
      showToast('⚠️ No content to share. Please generate content first.');
      return;
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToShare);
      }
    } catch {}

    if (typeof window === 'undefined') return;

    switch (platform) {
      case 'linkedin':
        showToast('📋 Post copied! Opening LinkedIn sharing dialog...');
        window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(textToShare)}`, '_blank');
        break;

      case 'twitter':
        showToast('🚀 Launching X / Twitter...');
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(textToShare)}`, '_blank');
        break;

      case 'whatsapp':
        showToast('💬 Launching WhatsApp...');
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(textToShare)}`, '_blank');
        break;

      case 'facebook':
        showToast('📘 Opening Facebook...');
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(includeLink || 'https://tolee.in')}&quote=${encodeURIComponent(textToShare)}`, '_blank');
        break;

      case 'instagram':
        showToast('📸 Caption & hashtags copied! Opening Instagram in a new tab...');
        window.open('https://www.instagram.com/', '_blank');
        break;
    }
  };

  if (!mounted || status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#070b13] text-gray-200 p-6 flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-t-cyan-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-400 text-sm font-medium animate-pulse">
          {status === 'unauthenticated' ? 'Authentication required. Redirecting to login...' : 'Loading Social Publisher Studio...'}
        </p>
      </div>
    );
  }

  const currentPostContent = editablePosts[selectedPlatform] || '';
  const charCount = currentPostContent.length;
  const userName = (session?.user as any)?.name || 'Creator';
  const userHandle = (session?.user as any)?.username || (session?.user as any)?.name || 'tolee_creator';
  const avatarInitial = (userName && typeof userName === 'string' && userName.length > 0) ? userName.charAt(0).toUpperCase() : 'C';

  return (
    <div className="min-h-screen bg-[#070b13] text-[#e2e8f0] font-sans pb-28 pt-20 px-3 sm:px-6 lg:px-10 selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0e1e38] text-cyan-200 border border-cyan-500/40 px-5 py-3 rounded-xl shadow-2xl backdrop-blur-md animate-bounce text-sm font-semibold flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════
          SCHEDULE MODAL DIALOG
      ══════════════════════════════════════════════════════════════ */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1220] border border-[#182842] rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#141e33]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="text-base font-extrabold text-white">Schedule Multi-Platform Post</h3>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-gray-400 hover:text-white text-sm p-1"
              >
                ✕
              </button>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-300">Choose Scheduling Timing:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { id: 'today_evening', label: '🌅 Today at 6:00 PM', desc: 'Peak evening engagement' },
                  { id: 'tomorrow_morning', label: '☀️ Tomorrow 9:00 AM', desc: 'Prime morning commute' },
                  { id: 'tomorrow_evening', label: '🌙 Tomorrow 7:00 PM', desc: 'High visibility slot' },
                  { id: 'custom', label: '📅 Custom Date & Time', desc: 'Pick exact day & hour' },
                ].map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setScheduleDateType(slot.id as any)}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      scheduleDateType === slot.id
                        ? 'bg-cyan-950/70 border-cyan-500 text-cyan-200 shadow-md shadow-cyan-500/10'
                        : 'bg-[#070b13] border-[#182842] text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <div className="font-bold text-xs text-white">{slot.label}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{slot.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Picker if selected */}
            {scheduleDateType === 'custom' && (
              <div className="space-y-1.5 p-3 rounded-xl bg-[#070b13] border border-cyan-900/40">
                <label className="text-xs font-semibold text-cyan-300">Select Date & Time:</label>
                <input
                  type="datetime-local"
                  value={customDateTime}
                  onChange={(e) => setCustomDateTime(e.target.value)}
                  className="w-full bg-[#0e1828] border border-[#1a2b47] focus:border-cyan-500 rounded-lg p-2.5 text-xs text-white focus:outline-none"
                />
              </div>
            )}

            {/* Target Channels */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-300">Target Channels to Publish:</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'linkedin', label: 'LinkedIn', icon: LinkedinIcon },
                  { id: 'twitter', label: 'X (Twitter)', icon: TwitterIcon },
                  { id: 'instagram', label: 'Instagram', icon: InstagramIcon },
                  { id: 'facebook', label: 'Facebook', icon: FacebookIcon },
                  { id: 'whatsapp', label: 'WhatsApp', icon: WhatsAppIcon },
                ].map((c) => {
                  const isChecked = selectedChannelsForSchedule.includes(c.id);
                  const Icon = c.icon;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedChannelsForSchedule(prev => 
                          isChecked ? prev.filter(x => x !== c.id) : [...prev, c.id]
                        );
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        isChecked 
                          ? 'bg-cyan-950 border-cyan-600 text-cyan-200' 
                          : 'bg-[#070b13] border-gray-800 text-gray-500 opacity-60'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#141e33]">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSchedule}
                disabled={loadingSchedule || selectedChannelsForSchedule.length === 0}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-cyan-500/25 flex items-center gap-2 disabled:opacity-50"
              >
                {loadingSchedule ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Scheduling...</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5" />
                    <span>Confirm & Schedule</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        
        {/* Header Navigation & View Switcher */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-[#141e33]">
          <div className="flex items-center gap-4">
            <Link 
              href="/world" 
              className="p-2.5 rounded-xl bg-[#0b1220] border border-[#182842] hover:border-cyan-500/50 hover:text-cyan-400 transition-all text-gray-400"
              title="Back to Tolee World"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>

            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
                  <Share2 className="w-5 h-5" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  AI Social Media Publisher
                </h1>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700/50 uppercase tracking-wider">
                  HYBRID & SCHEDULER 🔥
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Write once, optimize with Llama 70B & Qwen 72B, and schedule or 1-click publish across all channels.
              </p>
            </div>
          </div>

          {/* View Tab Toggle */}
          <div className="flex items-center gap-2 bg-[#0b1220] border border-[#182842] p-1.5 rounded-2xl">
            <button
              onClick={() => setViewTab('COMPOSER')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewTab === 'COMPOSER'
                  ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>✍️ Post Composer</span>
            </button>
            <button
              onClick={() => setViewTab('QUEUE')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewTab === 'QUEUE'
                  ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>📅 Scheduled Queue ({scheduledPosts.length})</span>
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            TAB 1: COMPOSER & PUBLISHER WORKSPACE
        ════════════════════════════════════════════════════════════ */}
        {viewTab === 'COMPOSER' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* ═════════════════════════════════════════════════════════
                LEFT COLUMN: COMPOSER & AI PROMPTER (5 COLS)
            ══════════════════════════════════════════════════════════ */}
            <div className="lg:col-span-5 space-y-6">

              {/* Prompt Card */}
              <div className="bg-[#0b1220] border border-[#182842] rounded-2xl p-5 shadow-xl shadow-black/40 space-y-5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    What do you want to post about?
                  </label>
                  <span className="text-[11px] text-cyan-400 font-semibold uppercase tracking-wider">
                    AI Multi-Model
                  </span>
                </div>

                {/* Textarea */}
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="E.g., 5 productivity habits that save 10 hours a week, or why building in public helps startups grow faster..."
                  rows={4}
                  className="w-full bg-[#070b13] border border-[#1a2b47] focus:border-cyan-500/80 rounded-xl p-3.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 resize-none transition-all leading-relaxed"
                />

                {/* Tone Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    Select Tone of Voice:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'viral', label: '🔥 Viral & Hooky' },
                      { id: 'professional', label: '💼 Professional' },
                      { id: 'casual', label: '☕ Casual & Fun' },
                      { id: 'storytelling', label: '📖 Storytelling' },
                      { id: 'promotional', label: '🚀 Promotional' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTone(t.id as any)}
                        className={`text-xs font-semibold py-2 px-2.5 rounded-lg border transition-all text-center ${
                          tone === t.id
                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-200 shadow-md shadow-cyan-500/10'
                            : 'bg-[#0e1828] border-[#182842] text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional Fields Accordion */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#141e33]">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-400 mb-1 block">
                      Target Audience (Optional)
                    </label>
                    <input
                      type="text"
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      placeholder="e.g. Founders, Students"
                      className="w-full bg-[#070b13] border border-[#1a2b47] focus:border-cyan-500/80 rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-gray-400 mb-1 block">
                      Call-to-Action Link (Optional)
                    </label>
                    <input
                      type="url"
                      value={includeLink}
                      onChange={(e) => setIncludeLink(e.target.value)}
                      placeholder="https://yourlink.com"
                      className="w-full bg-[#070b13] border border-[#1a2b47] focus:border-cyan-500/80 rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Generate & Schedule Buttons */}
                <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                  <button
                    onClick={() => handleGenerate()}
                    disabled={loadingAI}
                    className="flex-1 py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-xs shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    {loadingAI ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 fill-white" />
                        <span>Generate Content</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setShowScheduleModal(true)}
                    className="py-3.5 px-4 rounded-xl bg-[#0e1b30] border border-cyan-700/50 hover:border-cyan-400 text-cyan-300 font-extrabold text-xs flex items-center justify-center gap-2 transition-all hover:bg-cyan-950/40"
                    title="Schedule for specific date & time"
                  >
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Schedule</span>
                  </button>
                </div>
              </div>

              {/* Quick Inspiration Suggestions */}
              <div className="bg-[#0b1220] border border-[#182842] rounded-2xl p-4 shadow-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-gray-300">Viral Topic Suggestions (1-Click Try):</span>
                </div>
                <div className="space-y-2">
                  {PROMPT_SUGGESTIONS.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleGenerate(s)}
                      className="w-full text-left text-xs text-gray-400 hover:text-cyan-300 hover:bg-[#0e1b30] p-2 rounded-lg transition-colors flex items-center justify-between group border border-transparent hover:border-cyan-900/40"
                    >
                      <span className="line-clamp-1">{s}</span>
                      <ArrowRight className="w-3 h-3 text-gray-600 group-hover:text-cyan-400 shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* ═════════════════════════════════════════════════════════
                RIGHT COLUMN: LIVE PLATFORM PREVIEW & PUBLISHER (7 COLS)
            ══════════════════════════════════════════════════════════ */}
            <div className="lg:col-span-7 space-y-6">

              {/* Platform Selector Tabs */}
              <div className="bg-[#0b1220] border border-[#182842] rounded-2xl p-2 flex items-center justify-between gap-1 overflow-x-auto shadow-md">
                {[
                  { id: 'linkedin', name: 'LinkedIn', icon: LinkedinIcon, color: 'text-sky-400', activeBg: 'bg-sky-950/80 border-sky-600/60 text-sky-200' },
                  { id: 'instagram', name: 'Instagram', icon: InstagramIcon, color: 'text-pink-400', activeBg: 'bg-pink-950/80 border-pink-600/60 text-pink-200' },
                  { id: 'twitter', name: 'X (Twitter)', icon: TwitterIcon, color: 'text-cyan-400', activeBg: 'bg-cyan-950/80 border-cyan-600/60 text-cyan-200' },
                  { id: 'facebook', name: 'Facebook', icon: FacebookIcon, color: 'text-blue-400', activeBg: 'bg-blue-950/80 border-blue-600/60 text-blue-200' },
                  { id: 'whatsapp', name: 'WhatsApp', icon: WhatsAppIcon, color: 'text-emerald-400', activeBg: 'bg-emerald-950/80 border-emerald-600/60 text-emerald-200' },
                ].map((p) => {
                  const Icon = p.icon;
                  const isActive = selectedPlatform === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPlatform(p.id as any)}
                      className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all border shrink-0 ${
                        isActive 
                          ? `${p.activeBg} shadow-inner` 
                          : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-[#0e1b30]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? p.color : 'text-gray-400'}`} />
                      <span>{p.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Editable Content & Quick AI Refiners */}
              <div className="bg-[#0b1220] border border-[#182842] rounded-2xl p-5 shadow-xl space-y-4">
                
                <div className="flex items-center justify-between pb-3 border-b border-[#141e33]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                      {selectedPlatform} Post Editor
                    </span>
                    <span className="text-[11px] text-gray-500">
                      ({charCount} characters)
                    </span>
                  </div>

                  {/* AI Refiner Buttons */}
                  <div className="flex items-center gap-1.5">
                    {[
                      { id: 'shorter', label: '✂️ Shorten' },
                      { id: 'more_punchy', label: '🔥 Punchy' },
                      { id: 'add_emojis', label: '✨ Emojis' },
                      { id: 'strong_cta', label: '🎯 CTA' },
                    ].map((btn) => (
                      <button
                        key={btn.id}
                        onClick={() => handleRefine(btn.id as any)}
                        disabled={loadingRefine || !currentPostContent}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-[#0e1b30] border border-[#1a2b47] hover:border-cyan-500/50 text-gray-300 hover:text-cyan-300 transition-all disabled:opacity-40"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Editable Text Area */}
                <textarea
                  value={editablePosts[selectedPlatform]}
                  onChange={(e) => setEditablePosts({ ...editablePosts, [selectedPlatform]: e.target.value })}
                  placeholder={`Your ${selectedPlatform.toUpperCase()} post will appear here...`}
                  rows={8}
                  className="w-full bg-[#070b13] border border-[#1a2b47] focus:border-cyan-500/80 rounded-xl p-4 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 resize-y leading-relaxed font-sans"
                />

                {/* 1-Click Publishing & Sharing Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyText(editablePosts[selectedPlatform], selectedPlatform)}
                      className="px-4 py-2.5 rounded-xl bg-[#0e1b30] border border-[#1a2b47] hover:border-cyan-500/60 text-gray-200 text-xs font-bold flex items-center gap-2 transition-all"
                    >
                      {copiedKey === selectedPlatform ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-cyan-400" />
                          <span>Copy Text</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setShowScheduleModal(true)}
                      className="px-4 py-2.5 rounded-xl bg-[#0e1b30] border border-cyan-800/40 hover:border-cyan-500 text-cyan-300 text-xs font-bold flex items-center gap-2 transition-all"
                    >
                      <Clock className="w-4 h-4 text-cyan-400" />
                      <span>Schedule Campaign</span>
                    </button>
                  </div>

                  {/* Direct 1-Click Publish Trigger */}
                  <button
                    onClick={() => handleLaunchPublish(selectedPlatform)}
                    className={`px-5 py-2.5 rounded-xl text-white font-extrabold text-xs flex items-center gap-2 shadow-lg transition-all transform active:scale-95 cursor-pointer ${
                      selectedPlatform === 'linkedin' ? 'bg-sky-600 hover:bg-sky-500 shadow-sky-600/25' :
                      selectedPlatform === 'instagram' ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-pink-600/25' :
                      selectedPlatform === 'twitter' ? 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-600/25' :
                      selectedPlatform === 'facebook' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/25' :
                      'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {selectedPlatform === 'linkedin' ? '1-Click Post to LinkedIn' :
                       selectedPlatform === 'twitter' ? '1-Click Tweet on X' :
                       selectedPlatform === 'whatsapp' ? '1-Click Share to WhatsApp' :
                       selectedPlatform === 'facebook' ? '1-Click Share to Facebook' :
                       'Copy & Open Instagram'}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                  </button>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════
                  LIVE SOCIAL MEDIA CARD MOCKUP PREVIEW
              ════════════════════════════════════════════════════════ */}
              <div className="bg-[#0b1220] border border-[#182842] rounded-2xl p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-400 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-cyan-400" />
                    Live Platform Preview Mockup
                  </span>

                  {variations?.viralityScore && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800/60 flex items-center gap-1">
                      ⚡ Virality Score: {variations.viralityScore}/100
                    </span>
                  )}
                </div>

                {/* LINKEDIN MOCKUP */}
                {selectedPlatform === 'linkedin' && (
                  <div className="bg-[#0f172a] border border-gray-700/60 rounded-xl p-4 text-gray-100 shadow-inner">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                        {avatarInitial}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          {userName}
                          <span className="text-[10px] text-gray-400 font-normal">• 1st</span>
                        </h4>
                        <p className="text-[10px] text-gray-400">Founder & Creator • Just now • 🌐</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-200 whitespace-pre-line leading-relaxed mb-4">
                      {editablePosts.linkedin || "Your LinkedIn post preview will appear here..."}
                    </div>
                    <div className="pt-3 border-t border-gray-800 flex items-center justify-between text-[11px] text-gray-400 font-semibold">
                      <span>👍 Like</span>
                      <span>💬 Comment</span>
                      <span>🔄 Repost</span>
                      <span>🚀 Send</span>
                    </div>
                  </div>
                )}

                {/* INSTAGRAM MOCKUP */}
                {selectedPlatform === 'instagram' && (
                  <div className="bg-[#0f172a] border border-gray-700/60 rounded-xl p-4 text-gray-100 max-w-md mx-auto">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-amber-500 p-[2px]">
                          <div className="w-full h-full rounded-full bg-[#0f172a] flex items-center justify-center text-white font-bold text-xs">
                            {avatarInitial}
                          </div>
                        </div>
                        <span className="text-xs font-bold text-white">{userHandle}</span>
                      </div>
                      <span className="text-gray-400 text-xs">•••</span>
                    </div>
                    
                    {/* Square media placeholder */}
                    <div className="w-full h-48 rounded-lg bg-gradient-to-tr from-purple-900/40 via-pink-900/30 to-slate-900 border border-pink-900/40 flex flex-col items-center justify-center text-pink-300/80 mb-3">
                      <ImageIcon className="w-8 h-8 mb-1" />
                      <span className="text-[11px] font-semibold">Square 1:1 Post Canvas</span>
                    </div>

                    <div className="text-xs text-gray-200 whitespace-pre-line leading-relaxed mb-3">
                      <span className="font-bold text-white mr-1.5">{userHandle}</span>
                      {editablePosts.instagram || "Your Instagram caption will appear here..."}
                    </div>
                  </div>
                )}

                {/* TWITTER / X MOCKUP */}
                {selectedPlatform === 'twitter' && (
                  <div className="bg-[#0f172a] border border-gray-700/60 rounded-xl p-4 text-gray-100">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-cyan-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                        {avatarInitial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-xs font-bold text-white truncate">{userName}</span>
                          <span className="text-[11px] text-gray-400">@{userHandle} • 1m</span>
                        </div>
                        <div className="text-xs text-gray-200 whitespace-pre-line leading-relaxed mb-3">
                          {editablePosts.twitter || "Your X / Tweet text will appear here..."}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-gray-400 font-semibold max-w-sm pt-2 border-t border-gray-800">
                          <span>💬 12</span>
                          <span>🔄 48</span>
                          <span>❤️ 194</span>
                          <span>📊 2.4K</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* WHATSAPP MOCKUP */}
                {selectedPlatform === 'whatsapp' && (
                  <div className="bg-[#0b141a] border border-emerald-900/50 rounded-xl p-4 text-gray-100">
                    <div className="max-w-md ml-auto bg-[#005c4b] text-emerald-50 rounded-2xl rounded-tr-none p-3.5 shadow-md">
                      <div className="text-xs whitespace-pre-line leading-relaxed font-sans">
                        {editablePosts.whatsapp || "*Your WhatsApp broadcast message will appear here...*"}
                      </div>
                      <div className="text-[9px] text-emerald-300/80 text-right mt-1.5 flex items-center justify-end gap-1">
                        <span>10:45 AM</span>
                        <span>✓✓</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* FACEBOOK MOCKUP */}
                {selectedPlatform === 'facebook' && (
                  <div className="bg-[#0f172a] border border-gray-700/60 rounded-xl p-4 text-gray-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                        {avatarInitial}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{userName}</h4>
                        <p className="text-[10px] text-gray-400">Just now • 👥 Public</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-200 whitespace-pre-line leading-relaxed mb-4">
                      {editablePosts.facebook || "Your Facebook post preview will appear here..."}
                    </div>
                  </div>
                )}

              </div>

            </div>

          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            TAB 2: SCHEDULED POSTS QUEUE & CONTENT CALENDAR
        ════════════════════════════════════════════════════════════ */}
        {viewTab === 'QUEUE' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-cyan-400" />
                  Upcoming Scheduled Campaigns ({scheduledPosts.length})
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Campaigns queued to auto-publish across your target channels.
                </p>
              </div>

              <button
                onClick={() => setViewTab('COMPOSER')}
                className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-cyan-500/20"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create New Post</span>
              </button>
            </div>

            {scheduledPosts.length === 0 ? (
              <div className="bg-[#0b1220] border border-[#182842] rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4 shadow-xl">
                <div className="w-14 h-14 rounded-2xl bg-cyan-950/60 border border-cyan-700/40 text-cyan-400 flex items-center justify-center mx-auto shadow-inner">
                  <Clock className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">No Scheduled Posts Yet</h4>
                  <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                    Generate a viral post in the composer and schedule it for the best peak engagement hours.
                  </p>
                </div>
                <button
                  onClick={() => setViewTab('COMPOSER')}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-xs font-bold shadow-lg transition-transform active:scale-95"
                >
                  Schedule Your First Post
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {scheduledPosts.map((post) => {
                  const targetTime = new Date(post.scheduledAt);
                  const isFuture = targetTime.getTime() > Date.now();
                  const diffMs = targetTime.getTime() - Date.now();
                  const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
                  const diffMins = Math.max(0, Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)));

                  return (
                    <div
                      key={post.id}
                      className="bg-[#0b1220] border border-[#182842] hover:border-cyan-500/40 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4 relative overflow-hidden group transition-all"
                    >
                      <div>
                        {/* Top Timing Badge */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-cyan-950 text-cyan-300 border border-cyan-700/50 flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-cyan-400" />
                            {isFuture ? `In ${diffHours}h ${diffMins}m` : 'Ready to Publish'}
                          </span>

                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-[#070b13] text-gray-400 border border-gray-800">
                            {post.tone.toUpperCase()}
                          </span>
                        </div>

                        {/* Topic */}
                        <h4 className="text-sm font-bold text-white line-clamp-2 mb-2 group-hover:text-cyan-300 transition-colors">
                          {post.topic}
                        </h4>

                        {/* Scheduled Date Display */}
                        <p className="text-[11px] text-cyan-400/90 font-medium flex items-center gap-1 mb-3">
                          <Calendar className="w-3 h-3" />
                          {targetTime.toLocaleString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </p>

                        {/* Target Channels Icons */}
                        <div className="flex items-center gap-1.5 mb-3">
                          {post.platforms.map((ch) => (
                            <span
                              key={ch}
                              className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#070b13] text-gray-300 border border-gray-800 capitalize"
                            >
                              {ch}
                            </span>
                          ))}
                        </div>

                        {/* Content Snippet */}
                        <p className="text-xs text-gray-400 line-clamp-3 bg-[#070b13] p-2.5 rounded-lg border border-gray-900 font-sans">
                          {post.postsData?.linkedin || post.postsData?.twitter || post.postsData?.instagram || "Content ready..."}
                        </p>
                      </div>

                      {/* Card Bottom Actions */}
                      <div className="flex items-center justify-between pt-3 border-t border-[#141e33]">
                        <button
                          onClick={() => handleCancelScheduled(post.id)}
                          className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 p-1 hover:bg-rose-950/40 rounded-lg transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>

                        <button
                          onClick={() => {
                            if (post.postsData?.linkedin) {
                              navigator.clipboard.writeText(post.postsData.linkedin);
                              showToast('📋 Copied scheduled copy to clipboard!');
                            }
                          }}
                          className="text-xs text-cyan-300 hover:text-cyan-200 font-bold flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-950/70 border border-cyan-800/40 hover:border-cyan-500/60 transition-all"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy Copy</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
}
