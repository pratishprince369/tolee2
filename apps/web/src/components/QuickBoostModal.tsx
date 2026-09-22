'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  X, Sparkles, Wallet, Rocket, Calendar, MapPin, Target, 
  Users, CheckCircle2, AlertTriangle, TrendingUp, Edit2, 
  Check, Eye, ThumbsUp, MessageSquare, Share2, HelpCircle, 
  MessageCircle, ExternalLink, ShieldCheck, Laptop, ArrowRight,
  ArrowLeft, Globe, UserCheck, Heart, Send, Layers, Compass
} from 'lucide-react';
import { 
  createQuickBoostAction, 
  getUserWallet, 
  getBoostPreviewDataAction, 
  getCampaignDetailsAction, 
  updateCampaignAction 
} from '@/actions/ads';
import Link from 'next/link';

interface QuickBoostModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'post' | 'reel' | 'listing';
  targetId: string;
  onSuccess?: () => void;
  campaignId?: string;
}

export function QuickBoostModal({ 
  isOpen, 
  onClose, 
  type, 
  targetId, 
  onSuccess,
  campaignId 
}: QuickBoostModalProps) {
  const { data: session } = useSession();
  
  // Multi-step workflow state: 1: Goal, 2: Audience, 3: Placement, 4: Budget, 5: Review
  const [currentStep, setCurrentStep] = useState<number>(1);

  // STEP 1: GOAL
  const [goal, setGoal] = useState<'reach' | 'profile_visits' | 'website_visitors' | 'messages' | 'leads' | 'post_engagement'>('reach');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [ctaButton, setCtaButton] = useState('learn_more');

  // STEP 2: AUDIENCE
  const [audienceType, setAudienceType] = useState<'automatic' | 'custom'>('automatic');
  const [audienceName, setAudienceName] = useState('Custom Audience');
  const [locations, setLocations] = useState('All India');
  const [radiusKm, setRadiusKm] = useState(25);
  const [ageRange, setAgeRange] = useState('18-65+');
  const [gender, setGender] = useState<'all' | 'men' | 'women'>('all');
  const [interests, setInterests] = useState<string[]>(['Technology', 'Business', 'Shopping']);

  // STEP 3: PLACEMENTS
  const [placementFeed, setPlacementFeed] = useState(true);
  const [placementReels, setPlacementReels] = useState(true);
  const [placementDiscovery, setPlacementDiscovery] = useState(true);
  const [placementCommunities, setPlacementCommunities] = useState(true);

  // STEP 4: BUDGET & DURATION
  const [budgetType, setBudgetType] = useState<'daily' | 'lifetime'>('daily');
  const [dailyBudget, setDailyBudget] = useState(150); // Daily INR
  const [durationDays, setDurationDays] = useState(7);
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });

  // STEP 5: WALLET & 6-MONTH FREE OFFER
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [freeBoostEligible, setFreeBoostEligible] = useState(false);
  const [freeBoostDays, setFreeBoostDays] = useState(0);

  // PREVIEW DATA
  const [previewData, setPreviewData] = useState<{
    name: string;
    username: string;
    avatar: string;
    caption: string;
    mediaUrl: string;
    mediaType?: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch Preview data and Wallet Balance on open
  useEffect(() => {
    if (isOpen && session) {
      setLoading(true);
      setErrorMsg('');
      setCurrentStep(1);
      
      Promise.all([
        getUserWallet(),
        getBoostPreviewDataAction(type, targetId),
        campaignId ? getCampaignDetailsAction(campaignId) : Promise.resolve(null)
      ]).then(([walletRes, previewRes, campaignRes]) => {
        if (walletRes.success) {
          if (walletRes.wallet) {
            setWalletBalance(walletRes.wallet.balance);
          }
          if (walletRes.freeBoost) {
            setFreeBoostEligible(walletRes.freeBoost.isEligible);
            setFreeBoostDays(walletRes.freeBoost.daysRemaining);
          }
        }
        if (previewRes.success && previewRes.preview) {
          setPreviewData(previewRes.preview);
        } else {
          setErrorMsg(previewRes.error || 'Failed to fetch preview content');
        }

        // If in edit mode, pre-fill settings from existing campaign
        if (campaignRes?.success && campaignRes.campaign) {
          const camp = campaignRes.campaign;
          const adSet = camp.adSets?.[0];
          const ad = adSet?.ads?.[0];

          if (camp.objective) {
            setGoal(camp.objective as any);
          }
          if (ad?.ctaButton) {
            setCtaButton(ad.ctaButton);
          }
          if (ad?.destinationUrl) {
            setWebsiteUrl(ad.destinationUrl);
          }
          if (adSet) {
            setDailyBudget(adSet.budgetAmount || 150);
            if (adSet.targetingCities) setLocations(adSet.targetingCities);
            if (adSet.targetingInterests) {
              setInterests(adSet.targetingInterests.split(',').map((s: string) => s.trim()).filter(Boolean));
            }
            if (adSet.placements) {
              setPlacementFeed(adSet.placements.includes('feed'));
              setPlacementReels(adSet.placements.includes('reels'));
              setPlacementDiscovery(adSet.placements.includes('marketplace') || adSet.placements.includes('discovery'));
            }
          }
        }
      }).catch(err => {
        console.error('Error loading boost metadata', err);
        setErrorMsg('Error loading boost campaign metadata.');
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [isOpen, session, type, targetId, campaignId]);

  // Recalculate end date on duration change
  useEffect(() => {
    const s = new Date(startDate);
    s.setDate(s.getDate() + durationDays);
    setEndDate(s.toISOString().split('T')[0]);
  }, [startDate, durationDays]);

  if (!isOpen) return null;

  // Pricing calculations
  const totalBudgetAmount = budgetType === 'daily' ? dailyBudget * durationDays : dailyBudget;
  const gstAmount = Math.round(totalBudgetAmount * 0.18);
  const totalAmountToPay = freeBoostEligible ? 0 : totalBudgetAmount + gstAmount;
  const remainingBalanceAfterPay = Math.max(0, walletBalance - totalAmountToPay);
  const isBalanceSufficient = freeBoostEligible || walletBalance >= totalAmountToPay;

  // Estimated impressions based on empirical benchmarks (~37 to 68.5 views per rupee)
  const estMinReach = Math.round(dailyBudget * 37);
  const estMaxReach = Math.round(dailyBudget * 68.5);
  const totalEstMinReach = estMinReach * durationDays;
  const totalEstMaxReach = estMaxReach * durationDays;

  // Active placements string
  const activePlacementsList: string[] = [];
  if (placementFeed) activePlacementsList.push('feed');
  if (placementReels) activePlacementsList.push('reels');
  if (placementDiscovery) activePlacementsList.push('marketplace');
  if (placementCommunities) activePlacementsList.push('chats');
  const placementsString = activePlacementsList.join(',') || 'feed';

  // Toggle interest tags
  const toggleInterest = (interest: string) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter(i => i !== interest));
    } else {
      setInterests([...interests, interest]);
    }
  };

  // Submission handler
  const handlePublish = async () => {
    setErrorMsg('');
    setSubmitLoading(true);

    try {
      const options = {
        budgetAmount: dailyBudget,
        durationDays,
        budgetType,
        startDate,
        endDate,
        goal,
        audienceType,
        audienceName,
        radiusKm,
        ageRange,
        gender,
        targetingLocations: locations,
        targetingInterests: interests.join(','),
        placements: placementsString,
        destinationUrl: websiteUrl || undefined,
        ctaButton
      };

      let res;
      if (campaignId) {
        res = await updateCampaignAction(campaignId, {
          name: `Boost ${type.toUpperCase()}: ${previewData?.caption.slice(0, 20) || 'Creative'}`,
          objective: goal,
          adSetName: `Boost ${type.toUpperCase()} - Ad Set`,
          budgetAmount: dailyBudget,
          endDate,
          targetingCities: locations,
          targetingInterests: interests.join(','),
          ctaButton,
          status: 'pending'
        });
      } else {
        res = await createQuickBoostAction(type, targetId, options);
      }

      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
          if (onSuccess) onSuccess();
        }, 2500);
      } else {
        setErrorMsg(res.error || 'Failed to launch promotion campaign');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during submission');
    } finally {
      setSubmitLoading(false);
    }
  };

  const stepsList = [
    { num: 1, label: 'Goal' },
    { num: 2, label: 'Audience' },
    { num: 3, label: 'Placement' },
    { num: 4, label: 'Budget' },
    { num: 5, label: 'Review & Pay' }
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xl overflow-hidden flex flex-col md:grid md:grid-cols-5 animate-in zoom-in-95 duration-200 max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Column: Multi-Step Form Controls (3 cols) */}
        <div className="md:col-span-3 flex flex-col justify-between border-b md:border-b-0 md:border-r border-zinc-100 dark:border-zinc-900 max-h-[85vh] overflow-y-auto">
          
          {/* Header & Step Tracker */}
          <div>
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/60 dark:bg-zinc-900/40">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 shadow-sm text-white">
                  <Rocket className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-zinc-900 dark:text-white leading-none">
                    {campaignId ? 'Edit Promotion' : 'Boost Post'}
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Step {currentStep} of 5: {stepsList[currentStep - 1].label}
                  </p>
                </div>
              </div>

              <button 
                onClick={onClose} 
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Progress Bar */}
            <div className="px-6 py-3 bg-zinc-50/30 dark:bg-zinc-900/20 border-b border-zinc-100 dark:border-zinc-900/80 flex items-center justify-between">
              {stepsList.map((step, idx) => (
                <div key={step.num} className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      if (step.num < currentStep) setCurrentStep(step.num);
                    }}
                    disabled={step.num > currentStep}
                    className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-all ${
                      currentStep === step.num
                        ? 'bg-blue-600 text-white shadow-xs scale-105'
                        : currentStep > step.num
                        ? 'bg-emerald-600 text-white cursor-pointer hover:bg-emerald-700'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                    }`}
                  >
                    {currentStep > step.num ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : step.num}
                  </button>
                  <span className={`text-[11px] font-semibold hidden sm:inline ${
                    currentStep === step.num 
                      ? 'text-blue-600 dark:text-blue-400 font-bold' 
                      : currentStep > step.num 
                      ? 'text-zinc-700 dark:text-zinc-300' 
                      : 'text-zinc-400'
                  }`}>
                    {step.label}
                  </span>
                  {idx < stepsList.length - 1 && (
                    <div className="w-4 sm:w-6 h-[2px] bg-zinc-200 dark:bg-zinc-800 mx-1" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form Content Area */}
          <div className="p-6 space-y-5 overflow-y-auto">
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {success && (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm font-bold flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>🎉 Promotion launched successfully! Tracking live in Ads Manager.</span>
              </div>
            )}

            {/* 6-Month Free Offer Banner */}
            {freeBoostEligible && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-blue-500/15 border border-emerald-500/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-emerald-600 animate-bounce" />
                  <div>
                    <p className="font-extrabold text-emerald-900 dark:text-emerald-300">
                      6 Months Free Boost Active!
                    </p>
                    <p className="text-emerald-700/90 dark:text-emerald-400/90 text-[11px]">
                      Zero charges from your wallet for {freeBoostDays} more days.
                    </p>
                  </div>
                </div>
                <span className="font-black px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[11px] shadow-xs">
                  ₹0 COST
                </span>
              </div>
            )}

            {/* ==================== STEP 1: SELECT GOAL ==================== */}
            {currentStep === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                <div>
                  <h4 className="text-base font-extrabold text-zinc-900 dark:text-white">What is your goal?</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Select how you want people to interact with your boosted post.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {[
                    {
                      id: 'reach',
                      title: 'Get More Reach',
                      desc: 'Show your post to thousands of active users across India.',
                      icon: Rocket,
                      cta: 'learn_more'
                    },
                    {
                      id: 'profile_visits',
                      title: 'More Profile Visits',
                      desc: 'Drive traffic to your profile to gain new followers and brand awareness.',
                      icon: UserCheck,
                      cta: 'view_profile'
                    },
                    {
                      id: 'website_visitors',
                      title: 'More Website Visits',
                      desc: 'Send interested users directly to your external website or landing page.',
                      icon: Globe,
                      cta: 'visit_website'
                    },
                    {
                      id: 'messages',
                      title: 'More Messages',
                      desc: 'Encourage users to send direct messages to start conversations.',
                      icon: MessageCircle,
                      cta: 'send_message'
                    },
                    {
                      id: 'leads',
                      title: 'More Leads',
                      desc: 'Collect phone numbers and inquiries for your business or service.',
                      icon: Target,
                      cta: 'contact_us'
                    },
                    {
                      id: 'post_engagement',
                      title: 'More Post Engagement',
                      desc: 'Maximize likes, comments, and shares to boost algorithmic ranking.',
                      icon: Heart,
                      cta: 'learn_more'
                    }
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = goal === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setGoal(item.id as any);
                          setCtaButton(item.cta);
                        }}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'border-blue-600 dark:border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 shadow-xs'
                            : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl shrink-0 ${
                            isSelected 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                          }`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h5 className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">
                              {item.title}
                            </h5>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                              {item.desc}
                            </p>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected 
                            ? 'border-blue-600 bg-blue-600 text-white' 
                            : 'border-zinc-300 dark:border-zinc-700'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Additional URL Input for Website Visits */}
                {goal === 'website_visitors' && (
                  <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 space-y-2 animate-in fade-in duration-150">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      Destination Website URL:
                    </label>
                    <input
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://example.com/landing-page"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            )}

            {/* ==================== STEP 2: CHOOSE AUDIENCE ==================== */}
            {currentStep === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                <div>
                  <h4 className="text-base font-extrabold text-zinc-900 dark:text-white">Choose Your Audience</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Target who should see your boosted post.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setAudienceType('automatic')}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      audienceType === 'automatic'
                        ? 'border-blue-600 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 shadow-xs'
                        : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Sparkles className="w-5 h-5 text-blue-600" />
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        audienceType === 'automatic' ? 'border-blue-600 bg-blue-600 text-white' : 'border-zinc-300 dark:border-zinc-700'
                      }`}>
                        {audienceType === 'automatic' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>
                    <h5 className="text-xs font-bold text-zinc-900 dark:text-white">Automatic</h5>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                      Tolee targets people like your existing followers and community.
                    </p>
                  </div>

                  <div
                    onClick={() => setAudienceType('custom')}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      audienceType === 'custom'
                        ? 'border-blue-600 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 shadow-xs'
                        : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Target className="w-5 h-5 text-emerald-600" />
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        audienceType === 'custom' ? 'border-blue-600 bg-blue-600 text-white' : 'border-zinc-300 dark:border-zinc-700'
                      }`}>
                        {audienceType === 'custom' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>
                    <h5 className="text-xs font-bold text-zinc-900 dark:text-white">Create Custom</h5>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                      Manually select location, radius, age, gender, and categories.
                    </p>
                  </div>
                </div>

                {/* Custom Audience Configuration */}
                {audienceType === 'custom' && (
                  <div className="p-4.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-4 animate-in fade-in duration-150">
                    <div>
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                        Audience Name:
                      </label>
                      <input
                        type="text"
                        value={audienceName}
                        onChange={(e) => setAudienceName(e.target.value)}
                        placeholder="e.g. Mumbai Food Lovers"
                        className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                          Location (City/State):
                        </label>
                        <input
                          type="text"
                          value={locations}
                          onChange={(e) => setLocations(e.target.value)}
                          placeholder="Mumbai, Delhi, Bangalore"
                          className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                          Radius: {radiusKm} km
                        </label>
                        <input
                          type="range"
                          min="5"
                          max="100"
                          step="5"
                          value={radiusKm}
                          onChange={(e) => setRadiusKm(Number(e.target.value))}
                          className="w-full accent-blue-600 mt-2"
                        />
                      </div>
                    </div>

                    {/* Gender Selection */}
                    <div>
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                        Gender:
                      </label>
                      <div className="flex gap-2">
                        {(['all', 'men', 'women'] as const).map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setGender(g)}
                            className={`flex-1 py-1.5 rounded-xl text-xs font-bold uppercase transition-all ${
                              gender === g
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300'
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Interests Chips */}
                    <div>
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                        Target Interests:
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {['Technology', 'Business', 'Real Estate', 'Food & Dining', 'Fashion', 'Health & Fitness', 'Education', 'Entertainment', 'Shopping'].map((tag) => {
                          const isTagSelected = interests.includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => toggleInterest(tag)}
                              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                                isTagSelected
                                  ? 'bg-blue-600 text-white shadow-2xs'
                                  : 'bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                              }`}
                            >
                              {tag} {isTagSelected && '✓'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ==================== STEP 3: SELECT PLACEMENT ==================== */}
            {currentStep === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                <div>
                  <h4 className="text-base font-extrabold text-zinc-900 dark:text-white">Where Should Your Promotion Appear?</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Select the Tolee placements where your promoted post will be delivered.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div 
                    onClick={() => setPlacementFeed(!placementFeed)}
                    className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-zinc-900 dark:text-white">Tolee Main Feed</h5>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          Appears between organic updates on desktop and mobile feeds.
                        </p>
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={placementFeed} 
                      onChange={() => {}} 
                      className="w-4 h-4 rounded text-blue-600 accent-blue-600" 
                    />
                  </div>

                  <div 
                    onClick={() => setPlacementReels(!placementReels)}
                    className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                        <Rocket className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-zinc-900 dark:text-white">Tolee Reels (Video Stream)</h5>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          High-converting vertical video stream for maximum engagement.
                        </p>
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={placementReels} 
                      onChange={() => {}} 
                      className="w-4 h-4 rounded text-blue-600 accent-blue-600" 
                    />
                  </div>

                  <div 
                    onClick={() => setPlacementDiscovery(!placementDiscovery)}
                    className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <Compass className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-zinc-900 dark:text-white">Tolee Local Discovery & Radar</h5>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          Showcases content to users searching for neighborhood & local updates.
                        </p>
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={placementDiscovery} 
                      onChange={() => {}} 
                      className="w-4 h-4 rounded text-blue-600 accent-blue-600" 
                    />
                  </div>

                  <div 
                    onClick={() => setPlacementCommunities(!placementCommunities)}
                    className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-zinc-900 dark:text-white">Community & Group Hubs</h5>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          Targets relevant niche communities and interest groups.
                        </p>
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={placementCommunities} 
                      onChange={() => {}} 
                      className="w-4 h-4 rounded text-blue-600 accent-blue-600" 
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ==================== STEP 4: BUDGET & DURATION ==================== */}
            {currentStep === 4 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
                <div>
                  <h4 className="text-base font-extrabold text-zinc-900 dark:text-white">Set Your Budget & Duration</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Control how much you want to spend and how long the promotion runs.
                  </p>
                </div>

                {/* Daily Budget Slider */}
                <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Daily Budget</span>
                    <span className="text-lg font-black text-blue-600 dark:text-blue-400">
                      ₹{dailyBudget.toLocaleString('en-IN')} / day
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="3000"
                    step="50"
                    value={dailyBudget}
                    onChange={(e) => setDailyBudget(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] font-semibold text-zinc-400">
                    <span>₹50 (Min)</span>
                    <span>₹1,500</span>
                    <span>₹3,000 (Max)</span>
                  </div>
                </div>

                {/* Duration Slider */}
                <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Duration</span>
                    <span className="text-sm font-black text-zinc-900 dark:text-white">
                      {durationDays} Days ({startDate} to {endDate})
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="1"
                    value={durationDays}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] font-semibold text-zinc-400">
                    <span>1 Day</span>
                    <span>7 Days</span>
                    <span>30 Days</span>
                  </div>
                </div>

                {/* Estimated Daily & Total Results */}
                <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      Estimated Daily Reach:
                    </span>
                    <span className="font-extrabold text-blue-950 dark:text-blue-200">
                      {(estMinReach / 1000).toFixed(1)}K - {(estMaxReach / 1000).toFixed(1)}K accounts
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs border-t border-blue-200/50 dark:border-blue-900/40 pt-2">
                    <span className="font-bold text-blue-800 dark:text-blue-300">
                      Total Campaign Reach:
                    </span>
                    <span className="font-black text-blue-600 dark:text-blue-400">
                      {(totalEstMinReach / 1000).toFixed(1)}K - {(totalEstMaxReach / 1000).toFixed(1)}K views
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ==================== STEP 5: REVIEW & PAYMENT ==================== */}
            {currentStep === 5 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                <div>
                  <h4 className="text-base font-extrabold text-zinc-900 dark:text-white">Review Your Promotion</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Confirm your campaign details before publishing.
                  </p>
                </div>

                {/* Campaign Summary List */}
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-850 text-xs">
                  <div className="p-3.5 flex justify-between items-center">
                    <span className="text-zinc-500 font-medium">Goal</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        {goal.replace('_', ' ')}
                      </span>
                      <button onClick={() => setCurrentStep(1)} className="text-[11px] text-zinc-400 hover:text-blue-600">
                        Edit
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 flex justify-between items-center">
                    <span className="text-zinc-500 font-medium">Audience</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        {audienceType === 'automatic' ? 'Automatic (Smart AI)' : audienceName}
                      </span>
                      <button onClick={() => setCurrentStep(2)} className="text-[11px] text-zinc-400 hover:text-blue-600">
                        Edit
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 flex justify-between items-center">
                    <span className="text-zinc-500 font-medium">Placements</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        {activePlacementsList.join(', ')}
                      </span>
                      <button onClick={() => setCurrentStep(3)} className="text-[11px] text-zinc-400 hover:text-blue-600">
                        Edit
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 flex justify-between items-center">
                    <span className="text-zinc-500 font-medium">Duration & Schedule</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        {durationDays} Days ({startDate} - {endDate})
                      </span>
                      <button onClick={() => setCurrentStep(4)} className="text-[11px] text-zinc-400 hover:text-blue-600">
                        Edit
                      </button>
                    </div>
                  </div>
                </div>

                {/* Payment Breakdown Card */}
                <div className="p-4.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 space-y-3">
                  <h5 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                    Payment & Budget Breakdown
                  </h5>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                      <span>Base Budget (₹{dailyBudget} × {durationDays} days):</span>
                      <span className="font-semibold text-zinc-900 dark:text-white">
                        ₹{totalBudgetAmount.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                      <span>Estimated GST (18%):</span>
                      <span className="font-semibold text-zinc-900 dark:text-white">
                        {freeBoostEligible ? '₹0.00' : `₹${gstAmount.toFixed(2)}`}
                      </span>
                    </div>

                    {freeBoostEligible && (
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                        <span>6-Month Free Boost Discount:</span>
                        <span>-₹{(totalBudgetAmount + gstAmount).toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center border-t border-zinc-200 dark:border-zinc-800 pt-2 text-sm font-bold">
                      <span className="text-zinc-900 dark:text-white">Total Amount to Deduct:</span>
                      <span className={`text-base font-black ${freeBoostEligible ? 'text-emerald-600' : 'text-blue-600'}`}>
                        {freeBoostEligible ? '₹0.00 (Free)' : `₹${totalAmountToPay.toFixed(2)} INR`}
                      </span>
                    </div>
                  </div>

                  {/* Wallet Balance Verification */}
                  <div className="mt-3 p-3 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-zinc-500" />
                      <span>Available Ads Wallet Balance:</span>
                    </div>
                    <span className="font-bold text-zinc-900 dark:text-white">
                      ₹{walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {!isBalanceSufficient && (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center justify-between">
                      <span>Insufficient wallet balance.</span>
                      <Link 
                        href="/ads-manager" 
                        onClick={onClose}
                        className="underline font-bold text-red-700 dark:text-red-300"
                      >
                        Recharge Wallet
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Action Footer with Next / Back Controls */}
          <div className="p-4 sm:p-5 border-t border-zinc-100 dark:border-zinc-900 bg-zinc-50/80 dark:bg-zinc-900/40 flex items-center justify-between gap-3">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-600 dark:text-zinc-400 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep + 1)}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePublish}
                disabled={submitLoading || loading || !isBalanceSufficient}
                className={`${
                  freeBoostEligible 
                    ? 'bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700' 
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-xs font-bold text-white px-6 py-2.5 rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer active:scale-95`}
              >
                {submitLoading ? (
                  <>Launching...</>
                ) : freeBoostEligible ? (
                  <>Boost Post for Free 🚀</>
                ) : (
                  <>Confirm Payment & Promote 🚀</>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Live Instagram Ad Mock Card Preview (2 cols) */}
        <div className="md:col-span-2 bg-zinc-50 dark:bg-zinc-900/60 p-5 sm:p-6 flex flex-col justify-between overflow-y-auto max-h-[85vh] text-zinc-800 dark:text-zinc-200">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                Ad preview
              </h4>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full">
                Live
              </span>
            </div>

            {/* Instagram Style Preview Card */}
            <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-md overflow-hidden text-zinc-900 dark:text-white select-none animate-in fade-in duration-150">
              
              {/* Ad Header */}
              <div className="p-3.5 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-zinc-150 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center">
                    <img 
                      src={previewData?.avatar || '/default-user-avatar.svg'} 
                      alt="User avatar"
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100 truncate max-w-[120px]">
                        {previewData?.name || session?.user?.name || 'Creator'}
                      </span>
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0 fill-blue-600/10" />
                    </div>
                    <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wide flex items-center gap-1">
                      <span>Sponsored</span>
                      <span>•</span>
                      <Laptop className="w-3 h-3 text-zinc-400" />
                    </p>
                  </div>
                </div>
                <div className="text-zinc-400 text-xs">•••</div>
              </div>

              {/* Text Caption */}
              <div className="px-3.5 pt-2.5 pb-2 text-[11px] text-zinc-700 dark:text-zinc-300 leading-snug break-words">
                <p className="text-[10px] text-blue-600 font-bold mb-0.5 uppercase tracking-wide">start on tolee.in</p>
                {previewData?.caption || 'Check out this post on Tolee!'}
              </div>

              {/* Media Preview Box */}
              <div className="aspect-video bg-zinc-100 dark:bg-zinc-900 border-y border-zinc-100 dark:border-zinc-900 flex items-center justify-center overflow-hidden relative">
                {previewData?.mediaUrl ? (
                  previewData.mediaType === 'video' || previewData.mediaUrl.match(/\.(mp4|mov|webm)$/i) || previewData.mediaUrl.includes('/video/upload/') ? (
                    <video 
                      src={previewData.mediaUrl} 
                      className="w-full h-full object-cover" 
                      controls 
                      playsInline
                    />
                  ) : (
                    <img 
                      src={previewData.mediaUrl} 
                      alt="Creative preview" 
                      className="w-full h-full object-cover" 
                    />
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center text-zinc-400 py-10">
                    <Sparkles className="w-8 h-8 opacity-25 animate-pulse" />
                    <span className="text-[10px] mt-2 font-bold tracking-wider">CREATIVE MEDIA</span>
                  </div>
                )}
              </div>

              {/* Destination CTA Bar */}
              <div className="px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900">
                <div className="min-w-0 pr-2">
                  <p className="text-[9px] uppercase tracking-wider text-zinc-400 font-black">TOLEE.IN</p>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                    {previewData?.caption ? previewData.caption.slice(0, 25) + '...' : 'Sponsored Post'}
                  </h4>
                </div>
                <button
                  type="button"
                  className="bg-blue-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shrink-0 shadow-xs flex items-center gap-1 uppercase tracking-wide"
                >
                  {ctaButton.replace('_', ' ')}
                </button>
              </div>

              {/* Social Actions Mock */}
              <div className="px-3.5 py-2 flex items-center justify-between text-zinc-500 text-xs font-semibold bg-white dark:bg-zinc-950">
                <div className="flex items-center gap-1">
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Like</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Comment</span>
                </div>
                <div className="flex items-center gap-1">
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </div>
              </div>
            </div>

            {/* Live Campaign Insights Preview */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3.5 space-y-2 text-xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 block">
                Estimated Delivery
              </span>
              <div className="flex justify-between items-center font-bold">
                <span className="text-zinc-600 dark:text-zinc-400">Target Reach:</span>
                <span className="text-zinc-950 dark:text-white font-extrabold">
                  {(totalEstMinReach / 1000).toFixed(1)}K - {(totalEstMaxReach / 1000).toFixed(1)}K
                </span>
              </div>
              <div className="flex justify-between items-center font-bold">
                <span className="text-zinc-600 dark:text-zinc-400">Total Budget:</span>
                <span className="text-blue-600 dark:text-blue-400 font-extrabold">
                  ₹{totalBudgetAmount.toFixed(2)} INR
                </span>
              </div>
            </div>
          </div>

          {/* Privacy & Legal Policies */}
          <div className="text-[9px] text-zinc-400 leading-relaxed mt-4 border-t border-zinc-200 dark:border-zinc-800 pt-3">
            By promoting, you agree to Tolee's Advertising Guidelines and Moderation Policies. All campaigns undergo verification before delivery.
          </div>
        </div>

      </div>
    </div>
  );
}
