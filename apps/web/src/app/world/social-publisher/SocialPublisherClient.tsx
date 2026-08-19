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
  Linkedin, 
  Instagram, 
  Twitter, 
  Facebook, 
  MessageSquare, 
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
  Image as ImageIcon
} from 'lucide-react';
import { 
  generateSocialPostVariations, 
  improveSocialCaption, 
  generateViralHashtags, 
  PlatformPostVariations 
} from '@/actions/socialPublisher';

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

  useEffect(() => {
    setMounted(true);
  }, []);

  // Strict Authentication Guard
  useEffect(() => {
    if (mounted && status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=' + encodeURIComponent('/world/social-publisher'));
    }
  }, [mounted, status, router]);

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

      <div className="max-w-7xl mx-auto">
        
        {/* Header Navigation */}
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
                  HYBRID ENGINE 🔥
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Write once, optimize with Llama 70B & Qwen 72B, and 1-click publish across LinkedIn, Instagram, Twitter/X, Facebook & WhatsApp.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-800/50 text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> No API Keys Required
            </span>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            MAIN 2-COLUMN STUDIO WORKSPACE
        ════════════════════════════════════════════════════════════ */}
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
                    placeholder="e.g. Founders, College Students"
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

              {/* Generate Button */}
              <button
                onClick={() => handleGenerate()}
                disabled={loadingAI}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-sm shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2.5 transition-all transform active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {loadingAI ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Generating Tailored Content...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-white" />
                    <span>Generate Multi-Platform Posts</span>
                  </>
                )}
              </button>
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
                { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'text-sky-400', activeBg: 'bg-sky-950/80 border-sky-600/60 text-sky-200' },
                { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'text-pink-400', activeBg: 'bg-pink-950/80 border-pink-600/60 text-pink-200' },
                { id: 'twitter', name: 'X (Twitter)', icon: Twitter, color: 'text-cyan-400', activeBg: 'bg-cyan-950/80 border-cyan-600/60 text-cyan-200' },
                { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'text-blue-400', activeBg: 'bg-blue-950/80 border-blue-600/60 text-blue-200' },
                { id: 'whatsapp', name: 'WhatsApp', icon: MessageSquare, color: 'text-emerald-400', activeBg: 'bg-emerald-950/80 border-emerald-600/60 text-emerald-200' },
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

      </div>

    </div>
  );
}
