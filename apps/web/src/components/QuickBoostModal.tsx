'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { 
  X, Sparkles, Wallet, Rocket, Calendar, MapPin, Target, 
  Users, CheckCircle2, AlertTriangle, TrendingUp, Edit2, 
  Check, Eye, ThumbsUp, MessageSquare, Share2, HelpCircle, 
  MessageCircle, ExternalLink, ShieldCheck, Laptop
} from 'lucide-react';
import { 
  createQuickBoostAction, 
  getUserWallet, 
  getBoostPreviewDataAction, 
  getCampaignDetailsAction, 
  updateCampaignAction 
} from '@/actions/ads';

interface QuickBoostModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'post' | 'reel' | 'listing';
  targetId: string;
  onSuccess?: () => void;
  campaignId?: string; // Present when editing an existing campaign
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
  
  // Base State for options (Facebook layout)
  const [goal, setGoal] = useState<'engagement' | 'website_visitors' | 'messages' | 'leads' | 'calls'>('engagement');
  const [showGoalChange, setShowGoalChange] = useState(false);
  const [advantageCreative, setAdvantageCreative] = useState(true);
  const [buttonLabel, setButtonLabel] = useState<string>('send_message');
  const [specialCategory, setSpecialCategory] = useState(false);
  
  // Targeting
  const [audienceType, setAudienceType] = useState<'advantage' | 'targeting'>('advantage');
  const [targetTolees, setTargetTolees] = useState('');
  const [locations, setLocations] = useState('India');
  const [interests, setInterests] = useState('small business');
  const [ageRange, setAgeRange] = useState('18 - 65+');
  const [isSecuritiesAd, setIsSecuritiesAd] = useState(false);
  const [showTargetingEdit, setShowTargetingEdit] = useState(false);
  
  // Duration & Budget
  const [runContinuously, setRunContinuously] = useState(true);
  const [durationDays, setDurationDays] = useState(7);
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [budget, setBudget] = useState(200); // Daily budget
  const [showBudgetEdit, setShowBudgetEdit] = useState(false);
  
  // Placements & Payment
  const [advantagePlacements, setAdvantagePlacements] = useState(true);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  // Preview Details fetched from server
  const [previewData, setPreviewData] = useState<{
    name: string;
    username: string;
    avatar: string;
    caption: string;
    mediaUrl: string;
  } | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch Preview data and Wallet Balance
  useEffect(() => {
    if (isOpen && session) {
      setLoading(true);
      setErrorMsg('');
      
      Promise.all([
        getUserWallet(),
        getBoostPreviewDataAction(type, targetId),
        campaignId ? getCampaignDetailsAction(campaignId) : Promise.resolve(null)
      ]).then(([walletRes, previewRes, campaignRes]) => {
        if (walletRes.success && walletRes.wallet) {
          setWalletBalance(walletRes.wallet.balance);
        }
        if (previewRes.success && previewRes.preview) {
          setPreviewData(previewRes.preview);
        } else {
          setErrorMsg(previewRes.error || 'Failed to fetch preview content');
        }

        // If in edit mode, pre-fill settings from campaign
        if (campaignRes?.success && campaignRes.campaign) {
          const camp = campaignRes.campaign;
          const adSet = camp.adSets?.[0];
          const ad = adSet?.ads?.[0];

          if (camp.objective) {
            setGoal(camp.objective as any);
          }
          setAdvantageCreative(camp.abTestingEnabled || false);
          if (ad?.ctaButton) {
            setButtonLabel(ad.ctaButton);
          }
          setSpecialCategory(camp.specialAdCategory !== 'none');
          
          if (adSet) {
            setBudget(adSet.budgetAmount || 200);
            setAdvantagePlacements(adSet.placements ? adSet.placements.includes('feed') : true);
            
            if (adSet.targetingCities) setLocations(adSet.targetingCities);
            if (adSet.targetingInterests) setInterests(adSet.targetingInterests);
            if (adSet.targetingToleeIds) setTargetTolees(adSet.targetingToleeIds);
            
            if (adSet.endDate) {
              setRunContinuously(false);
              setEndDate(new Date(adSet.endDate).toISOString().split('T')[0]);
              
              // Calculate duration difference
              const diffTime = Math.abs(new Date(adSet.endDate).getTime() - new Date(adSet.startDate).getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              setDurationDays(diffDays || 7);
            } else {
              setRunContinuously(true);
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

  if (!isOpen) return null;

  // Approximate impressions based on Facebook screenshot (₹200 budget yields 7.4K - 13.7K impressions per day)
  const estMinReach = Math.round(budget * 37);
  const estMaxReach = Math.round(budget * 68.5);

  const gstAmount = Math.round(budget * 0.18);
  const totalDailyCost = budget + gstAmount;

  // Render friendly Goal name
  const getGoalLabel = (g: string) => {
    switch (g) {
      case 'engagement': return 'Automatic - Get more engagement';
      case 'website_visitors': return 'Get more website visitors';
      case 'messages': return 'Get more messages';
      case 'leads': return 'Get more leads';
      case 'calls': return 'Get more calls';
      default: return 'Automatic - Get more engagement';
    }
  };

  // Render button label text
  const getCTAText = (b: string) => {
    switch (b) {
      case 'no_button': return '';
      case 'learn_more': return 'Learn more';
      case 'send_message': return 'Send message';
      case 'sign_up': return 'Sign up';
      case 'book_now': return 'Book now';
      case 'call_now': return 'Call now';
      case 'shop_now': return 'Shop now';
      case 'contact_us': return 'Contact us';
      default: return 'Send message';
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (walletBalance !== null && walletBalance < budget) {
      setErrorMsg('Insufficient ad credits in your wallet. Invite friends to get ₹500 credits per signup!');
      return;
    }

    try {
      setSubmitLoading(true);
      setErrorMsg('');

      const targeting = {
        budgetAmount: budget,
        durationDays: runContinuously ? 30 : durationDays, // If continuous, default to 30 days review cycle
        targetingToleeIds: targetTolees || undefined,
        targetingLocations: locations || undefined,
        targetingInterests: interests || undefined,
        ctaButton: buttonLabel,
        objective: goal,
        specialAdCategory: specialCategory ? 'social_issues' : 'none',
        endDate: runContinuously ? null : endDate
      };

      let res;
      if (campaignId) {
        // Edit and Re-publish mode
        res = await updateCampaignAction(campaignId, {
          name: `Boost ${type.toUpperCase()}: ${previewData?.caption.slice(0, 20) || 'Creative'}`,
          objective: goal,
          specialAdCategory: specialCategory ? 'social_issues' : 'none',
          adSetName: `Boost ${type.toUpperCase()} - Ad Set`,
          budgetAmount: budget,
          endDate: runContinuously ? undefined : endDate,
          targetingToleeIds: targetTolees,
          targetingCities: locations,
          targetingInterests: interests,
          ctaButton: buttonLabel,
          status: 'pending' // Re-submits for admin review
        });
      } else {
        // New Boost mode
        res = await createQuickBoostAction(type, targetId, targeting);
      }

      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
          if (onSuccess) onSuccess();
        }, 3000);
      } else {
        setErrorMsg(res.error || 'Failed to request boost campaign');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during submission');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl border border-zinc-200 text-zinc-900 shadow-2xl overflow-hidden flex flex-col md:grid md:grid-cols-5 animate-in zoom-in-95 duration-200 max-h-[92vh]">
        
        {/* Left Column - Form controls (3 cols) */}
        <div className="md:col-span-3 flex flex-col justify-between border-r border-zinc-200 max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-150 px-6 py-4.5 bg-zinc-50/50">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 shadow-sm text-white">
                <Rocket className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-zinc-900 leading-none">
                  {campaignId ? 'Edit Boosted Post' : 'Boost Post'}
                </h3>
                <p className="text-[10px] text-zinc-500 font-medium mt-1">Configure options to sponsor your content</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center flex-1 p-12 min-h-[300px]">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              <p className="text-xs font-semibold text-zinc-500 mt-3 animate-pulse">Loading boost setup...</p>
            </div>
          ) : (
            <form onSubmit={handlePublish} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-none text-zinc-800">
              {errorMsg && (
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-rose-800 text-xs font-semibold">
                  <AlertTriangle className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Goal Card */}
              <div className="rounded-2xl border border-zinc-200/80 p-4.5 bg-white shadow-sm space-y-3.5">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">Goal</h4>
                    <p className="text-sm font-bold text-zinc-900 mt-1">{getGoalLabel(goal)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGoalChange(!showGoalChange)}
                    className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-zinc-200 hover:border-blue-200 transition-all shadow-sm"
                  >
                    Change
                  </button>
                </div>

                {showGoalChange && (
                  <div className="pt-3 border-t border-zinc-150 space-y-2 animate-in slide-in-from-top-2 duration-150">
                    {[
                      { id: 'engagement', label: 'Get more engagement (Recommended)', desc: 'Show your post to people likely to like, share, and comment.' },
                      { id: 'website_visitors', label: 'Get more website visitors', desc: 'Direct people to a landing page or store URL.' },
                      { id: 'messages', label: 'Get more messages', desc: 'Encourage users to message you on Tolee Chat.' },
                      { id: 'leads', label: 'Get more leads', desc: 'Gain signups, contacts, or inquiry forms.' },
                      { id: 'calls', label: 'Get more calls', desc: 'Encourage direct business call leads.' }
                    ].map((item) => (
                      <label 
                        key={item.id}
                        onClick={() => {
                          setGoal(item.id as any);
                          setShowGoalChange(false);
                        }}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:bg-zinc-50 ${
                          goal === item.id ? 'border-blue-600 bg-blue-50/10' : 'border-zinc-200'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name="goal_select" 
                          checked={goal === item.id}
                          readOnly
                          className="mt-0.5 accent-blue-600" 
                        />
                        <div>
                          <p className="text-xs font-bold text-zinc-900">{item.label}</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">{item.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Advantage+ Creative Toggle */}
              <div className="flex items-start justify-between rounded-2xl border border-zinc-200/80 p-4.5 bg-white shadow-sm">
                <div className="space-y-1 pr-6">
                  <h4 className="text-sm font-extrabold text-zinc-900">Advantage+ creative</h4>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Let us optimize your ad creative by testing a mix of headlines, images, videos and buttons to show people the version they're most likely to respond to.
                  </p>
                </div>
                
                {/* Custom Toggle Switch */}
                <button
                  type="button"
                  onClick={() => setAdvantageCreative(!advantageCreative)}
                  className={`w-11 h-6 rounded-full flex items-center p-0.5 transition-colors duration-200 shrink-0 ${
                    advantageCreative ? 'bg-blue-600' : 'bg-zinc-300'
                  }`}
                >
                  <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${
                    advantageCreative ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Button Selection */}
              <div className="rounded-2xl border border-zinc-200/80 p-4.5 bg-white shadow-sm space-y-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 block">
                  Button Label
                </label>
                <select
                  value={buttonLabel}
                  onChange={(e) => setButtonLabel(e.target.value)}
                  className="w-full bg-white border border-zinc-250 rounded-xl px-4 py-3 text-sm text-zinc-900 font-bold focus:outline-none focus:border-blue-600 shadow-sm"
                >
                  <option value="no_button">No button</option>
                  <option value="learn_more">Learn more</option>
                  <option value="send_message">Send message</option>
                  <option value="sign_up">Sign up</option>
                  <option value="book_now">Book now</option>
                  <option value="call_now">Call now</option>
                  <option value="shop_now">Shop now</option>
                  <option value="contact_us">Contact us</option>
                </select>
              </div>

              {/* Special Ad Category */}
              <div className="flex items-start justify-between rounded-2xl border border-zinc-200/80 p-4.5 bg-white shadow-sm">
                <div className="space-y-1 pr-6">
                  <h4 className="text-sm font-extrabold text-zinc-900">Special Ad Category</h4>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Ads about financial products and services, employment, housing, or social issues, elections or politics.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSpecialCategory(!specialCategory)}
                  className={`w-11 h-6 rounded-full flex items-center p-0.5 transition-colors duration-200 shrink-0 ${
                    specialCategory ? 'bg-blue-600' : 'bg-zinc-300'
                  }`}
                >
                  <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${
                    specialCategory ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Audience Targeting */}
              <div className="rounded-2xl border border-zinc-200/80 p-4.5 bg-white shadow-sm space-y-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">Audience</h4>
                
                <div className="space-y-3">
                  <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all hover:bg-zinc-50 ${
                    audienceType === 'advantage' ? 'border-blue-600 bg-blue-50/5' : 'border-zinc-200'
                  }`}>
                    <input 
                      type="radio" 
                      name="audience_type" 
                      checked={audienceType === 'advantage'}
                      onChange={() => setAudienceType('advantage')}
                      className="mt-0.5 accent-blue-600" 
                    />
                    <div>
                      <p className="text-xs font-bold text-zinc-900">Advantage+ audience</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Let us automatically find your audience to reach more people interested in your ad.</p>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all hover:bg-zinc-50 ${
                    audienceType === 'targeting' ? 'border-blue-600 bg-blue-50/5' : 'border-zinc-200'
                  }`}>
                    <input 
                      type="radio" 
                      name="audience_type" 
                      checked={audienceType === 'targeting'}
                      onChange={() => setAudienceType('targeting')}
                      className="mt-0.5 accent-blue-600" 
                    />
                    <div>
                      <p className="text-xs font-bold text-zinc-900">People you choose through targeting</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Configure precise locations, tolees, and interests.</p>
                    </div>
                  </label>
                </div>

                {/* Audience details */}
                <div className="bg-zinc-50/60 rounded-xl border border-zinc-200/60 p-4 space-y-3.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="text-xs font-bold text-zinc-900">Audience details</h5>
                      <div className="text-[11px] text-zinc-500 mt-1.5 space-y-1 font-medium">
                        <p><span className="font-bold">Location:</span> {locations}</p>
                        <p><span className="font-bold">Age limit:</span> {ageRange}</p>
                        <p><span className="font-bold">Interests:</span> {interests}</p>
                        {targetTolees && <p><span className="font-bold">Target Groups:</span> {targetTolees}</p>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowTargetingEdit(!showTargetingEdit)}
                      className="p-2 bg-white border border-zinc-200 rounded-lg text-zinc-500 hover:bg-zinc-50 shadow-sm"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {showTargetingEdit && (
                    <div className="pt-3 border-t border-zinc-200 space-y-3 animate-in slide-in-from-top-2 duration-150 text-xs">
                      <div>
                        <label className="font-bold text-zinc-600 block mb-1">Target Locations</label>
                        <input 
                          type="text" 
                          value={locations}
                          onChange={(e) => setLocations(e.target.value)}
                          placeholder="E.g., Chennai, Mumbai, India"
                          className="w-full bg-white border border-zinc-200 rounded-lg p-2 text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-zinc-600 block mb-1">Target Interests</label>
                        <input 
                          type="text" 
                          value={interests}
                          onChange={(e) => setInterests(e.target.value)}
                          placeholder="E.g., small business, real estate"
                          className="w-full bg-white border border-zinc-200 rounded-lg p-2 text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-zinc-600 block mb-1">Target Tolee Group Slugs (Optional)</label>
                        <input 
                          type="text" 
                          value={targetTolees}
                          onChange={(e) => setTargetTolees(e.target.value)}
                          placeholder="E.g., tech-tolee, design-zone"
                          className="w-full bg-white border border-zinc-200 rounded-lg p-2 text-xs focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Securities verification checkbox */}
                  <label className="flex items-start gap-2.5 pt-2 border-t border-zinc-200/60 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={isSecuritiesAd}
                      onChange={(e) => setIsSecuritiesAd(e.target.checked)}
                      className="mt-0.5 accent-blue-600" 
                    />
                    <div className="text-[10px] text-zinc-500 font-medium leading-relaxed">
                      <p className="font-bold text-zinc-700">Is this ad about securities and investments with audiences in India?</p>
                      <p className="mt-0.5">To run an ad with investment audiences in India, you must declare it in the securities declaration.</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Duration & Scheduling */}
              <div className="rounded-2xl border border-zinc-200/80 p-4.5 bg-white shadow-sm space-y-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">Duration</h4>
                
                <div className="space-y-3">
                  <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all hover:bg-zinc-50 ${
                    runContinuously ? 'border-blue-600 bg-blue-50/5' : 'border-zinc-200'
                  }`}>
                    <input 
                      type="radio" 
                      name="duration_type" 
                      checked={runContinuously}
                      onChange={() => setRunContinuously(true)}
                      className="mt-0.5 accent-blue-600" 
                    />
                    <div>
                      <p className="text-xs font-bold text-zinc-900">Run continuously</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Your ad will run indefinitely on a daily budget. Pause anytime.</p>
                    </div>
                  </label>

                  <div className={`p-3.5 rounded-xl border transition-all ${
                    !runContinuously ? 'border-blue-600 bg-blue-50/5' : 'border-zinc-200'
                  }`}>
                    <label className="flex items-start gap-3 cursor-pointer hover:bg-zinc-50">
                      <input 
                        type="radio" 
                        name="duration_type" 
                        checked={!runContinuously}
                        onChange={() => setRunContinuously(false)}
                        className="mt-0.5 accent-blue-600" 
                      />
                      <div>
                        <p className="text-xs font-bold text-zinc-900">Choose end date</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">Specify when the sponsored campaign should automatically turn off.</p>
                      </div>
                    </label>

                    {!runContinuously && (
                      <div className="mt-3.5 flex gap-3 items-center animate-in slide-in-from-top-2 duration-150 text-xs">
                        <div className="flex-1">
                          <label className="font-bold text-zinc-500 block mb-1">Days to Run</label>
                          <input 
                            type="number" 
                            min="1"
                            max="30"
                            value={durationDays}
                            onChange={(e) => {
                              const days = Math.max(1, Number(e.target.value));
                              setDurationDays(days);
                              const d = new Date();
                              d.setDate(d.getDate() + days);
                              setEndDate(d.toISOString().split('T')[0]);
                            }}
                            className="w-full bg-white border border-zinc-200 rounded-lg p-2 text-xs focus:outline-none"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="font-bold text-zinc-500 block mb-1">End Date</label>
                          <input 
                            type="date" 
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full bg-white border border-zinc-200 rounded-lg p-2 text-xs focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Daily Budget Slider */}
              <div className="rounded-2xl border border-zinc-200/80 p-4.5 bg-white shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">Daily budget</h4>
                  
                  {/* Budget input with Edit Button */}
                  <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-xl">
                    <span className="text-zinc-500 font-extrabold text-xs">₹</span>
                    {showBudgetEdit ? (
                      <input 
                        type="number"
                        min="97"
                        max="5000"
                        value={budget}
                        onChange={(e) => setBudget(Number(e.target.value))}
                        onBlur={() => setShowBudgetEdit(false)}
                        className="bg-transparent font-black text-sm text-zinc-900 w-16 focus:outline-none border-b border-blue-600 px-1"
                        autoFocus
                      />
                    ) : (
                      <span className="font-black text-sm text-zinc-900">{budget.toFixed(2)}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowBudgetEdit(!showBudgetEdit)}
                      className="p-1 hover:bg-zinc-200 rounded-md transition-colors"
                    >
                      <Edit2 className="h-3 w-3 text-zinc-500" />
                    </button>
                  </div>
                </div>

                {/* Slider */}
                <div>
                  <input 
                    type="range" 
                    min="97" 
                    max="5000" 
                    step="50"
                    value={budget} 
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className="w-full accent-blue-600 bg-zinc-200 h-1.5 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-400 font-bold mt-1">
                    <span>₹97.00 (Min)</span>
                    <span>₹5,000.00 (Max)</span>
                  </div>
                </div>

                {/* Estimated Daily Reach Info Banner */}
                <div className="rounded-xl bg-blue-50/40 border border-blue-100 p-3.5 space-y-1.5 text-xs text-blue-800">
                  <div className="flex justify-between items-center font-bold">
                    <span className="flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-blue-600 animate-pulse" />
                      Estimated daily results
                    </span>
                    <span className="text-blue-900 font-black">
                      {(estMinReach / 1000).toFixed(1)}K - {(estMaxReach / 1000).toFixed(1)}K views / day
                    </span>
                  </div>
                </div>
              </div>

              {/* Placements */}
              <div className="flex items-start justify-between rounded-2xl border border-zinc-200/80 p-4.5 bg-white shadow-sm">
                <div className="space-y-1 pr-6">
                  <h4 className="text-sm font-extrabold text-zinc-900">Advantage+ placements</h4>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Reach more people at a lower cost by letting us show your ad on Facebook, Messenger, Instagram, and Audience Network.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAdvantagePlacements(!advantagePlacements)}
                  className={`w-11 h-6 rounded-full flex items-center p-0.5 transition-colors duration-200 shrink-0 ${
                    advantagePlacements ? 'bg-blue-600' : 'bg-zinc-300'
                  }`}
                >
                  <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${
                    advantagePlacements ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Payment Details */}
              <div className="rounded-2xl border border-zinc-200/80 p-4.5 bg-zinc-50/50 shadow-sm flex items-center justify-between text-xs font-semibold text-zinc-700">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-zinc-500" />
                  <span>Available Ads Wallet Balance:</span>
                </div>
                <span className="font-extrabold text-zinc-900">
                  ₹{walletBalance?.toLocaleString('en-IN') ?? '0.00'}
                </span>
              </div>
            </form>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-between border-t border-zinc-150 px-6 py-4 bg-zinc-50/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-xs font-bold text-zinc-600 transition-colors"
            >
              Cancel
            </button>
            
            <button
              type="button"
              onClick={handlePublish}
              disabled={submitLoading || loading}
              className="bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white px-6 py-2.5 rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {submitLoading ? (
                <>Submitting...</>
              ) : (
                <>{campaignId ? 'Save & Re-publish' : 'Publish Ad'}</>
              )}
            </button>
          </div>
        </div>

        {/* Right Column - Live Preview and payment breakdown (2 cols) */}
        <div className="md:col-span-2 bg-zinc-50 p-6 flex flex-col justify-between overflow-y-auto max-h-[85vh] text-zinc-800">
          
          <div className="space-y-6">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">Ad preview</h4>

            {/* Ad Mock Card (Facebook style) */}
            <div className="bg-white rounded-2xl border border-zinc-250/70 shadow-md overflow-hidden text-zinc-900 select-none animate-in fade-in zoom-in-95 duration-200">
              
              {/* Ad Header */}
              <div className="p-3.5 flex items-center justify-between border-b border-zinc-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-zinc-150 border border-zinc-200 overflow-hidden shrink-0 flex items-center justify-center">
                    <img 
                      src={previewData?.avatar || '/default-user-avatar.svg'} 
                      alt="User avatar"
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-extrabold text-xs text-zinc-900 truncate max-w-[130px]">
                        {previewData?.name || session?.user?.name || 'Advertiser'}
                      </span>
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0 fill-blue-600/10" />
                    </div>
                    <p className="text-[10px] text-zinc-400 font-bold mt-0.5 tracking-wide uppercase flex items-center gap-1">
                      <span>Sponsored</span>
                      <span>•</span>
                      <Laptop className="w-3 h-3 text-zinc-400" />
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400 shrink-0">
                  <span className="font-bold text-lg select-none cursor-pointer p-1 hover:text-zinc-600">•••</span>
                  <X className="w-4 h-4 cursor-pointer hover:text-zinc-600" />
                </div>
              </div>

              {/* Text Caption */}
              <div className="px-3.5 pt-3 pb-2 text-[11px] text-zinc-700 leading-relaxed break-words font-medium">
                <p className="text-[10px] text-blue-600 font-bold mb-1 uppercase tracking-wide">start on tolee.in</p>
                {previewData?.caption || 'Loading ad caption text details...'}
              </div>

              {/* Media Preview Box */}
              <div className="aspect-video bg-zinc-100 border-y border-zinc-100 flex items-center justify-center overflow-hidden">
                {previewData?.mediaUrl ? (
                  <img 
                    src={previewData.mediaUrl} 
                    alt="Creative preview" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-zinc-400 py-12">
                    <Sparkles className="w-8 h-8 opacity-25 animate-pulse" />
                    <span className="text-[10px] mt-2 font-bold tracking-wider">CREATIVE MEDIA BOX</span>
                  </div>
                )}
              </div>

              {/* Destination Bar (CTA section) */}
              <div className="px-3.5 py-3 bg-zinc-50 flex items-center justify-between border-b border-zinc-100">
                <div className="min-w-0 pr-4">
                  <p className="text-[9px] uppercase tracking-wider text-zinc-400 font-black">TOLEE.IN</p>
                  <h4 className="text-xs font-bold text-zinc-900 truncate mt-0.5">
                    {previewData?.caption ? previewData.caption.slice(0, 30) + '...' : 'Sponsored Content'}
                  </h4>
                </div>
                {buttonLabel !== 'no_button' && (
                  <button
                    type="button"
                    className="bg-white border border-zinc-250 hover:bg-zinc-100 text-zinc-800 text-[11px] font-bold px-3 py-1.5 rounded-lg shrink-0 shadow-sm flex items-center gap-1"
                  >
                    <span>{getCTAText(buttonLabel)}</span>
                    {buttonLabel === 'send_message' ? (
                      <MessageCircle className="w-3.5 h-3.5 text-zinc-500 fill-zinc-50" />
                    ) : (
                      <ExternalLink className="w-3 h-3 text-zinc-400" />
                    )}
                  </button>
                )}
              </div>

              {/* Actions Mock */}
              <div className="px-3.5 py-2 flex items-center justify-between text-zinc-500 text-xs font-bold font-medium select-none bg-white">
                <div className="flex items-center gap-1 hover:text-zinc-800 cursor-pointer">
                  <ThumbsUp className="w-4 h-4" />
                  <span>Like</span>
                </div>
                <div className="flex items-center gap-1 hover:text-zinc-800 cursor-pointer">
                  <MessageSquare className="w-4 h-4" />
                  <span>Comment</span>
                </div>
                <div className="flex items-center gap-1 hover:text-zinc-800 cursor-pointer">
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </div>
              </div>

            </div>

            {/* Daily results summary */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-4.5 shadow-sm space-y-3.5">
              <h5 className="text-xs font-extrabold text-zinc-900">Estimated daily results</h5>
              
              <div className="flex justify-between items-center text-xs border-b border-zinc-100 pb-2.5 font-semibold text-zinc-600">
                <span>Impressions</span>
                <span className="font-extrabold text-zinc-950">
                  {(estMinReach / 1000).toFixed(1)}K - {(estMaxReach / 1000).toFixed(1)}K views
                </span>
              </div>

              <div className="space-y-2 pt-1.5">
                <h5 className="text-xs font-extrabold text-zinc-900">Payment summary</h5>
                <p className="text-[10px] text-zinc-400 font-semibold leading-none">Your ad will run continuously.</p>

                <div className="space-y-2 text-xs font-semibold text-zinc-600 pt-2">
                  <div className="flex justify-between items-center">
                    <span>Budget</span>
                    <span className="font-bold text-zinc-950">₹{budget.toFixed(2)} INR</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Estimated GST (18%)</span>
                    <span className="font-bold text-zinc-950">₹{gstAmount.toFixed(2)} INR</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-zinc-100 pt-2 text-sm font-bold text-zinc-900">
                    <span>Daily total budget</span>
                    <span className="font-extrabold text-blue-600">₹{totalDailyCost.toFixed(2)} INR</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Legal Acknowledgement */}
          <div className="text-[9px] text-zinc-400 font-semibold leading-relaxed mt-6 border-t border-zinc-200 pt-4">
            By clicking {campaignId ? 'Save & Re-publish' : 'Publish Ad'}, you agree to Meta's Advertising Policies and verify the coordinates target. Tolee Wallet system will automatically debit credits per interaction according to CPC rules.
          </div>
        </div>

      </div>
    </div>
  );
}
