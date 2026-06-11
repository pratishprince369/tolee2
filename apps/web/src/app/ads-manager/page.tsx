'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Megaphone, Wallet, TrendingUp, Users, Percent, Sparkles, Plus, 
  Settings, UserCheck, ShieldAlert, BarChart3, Layers, Target, 
  Image as ImageIcon, Video, HelpCircle, Check, ArrowRight, ArrowLeft, 
  Play, Pause, Info, Copy, CheckCircle2, ChevronRight, X, AlertTriangle,
  ArrowLeftRight, Search, ShieldCheck, RefreshCw, Edit
} from 'lucide-react';
import { 
  getUserWallet, 
  createCampaignAction, 
  getAdCampaignsDashboard, 
  toggleCampaignStatus,
  searchUsersForTransfer,
  transferWalletCreditsAction,
  setTransferPinAction,
  updateCampaignAction
} from '@/actions/ads';
import { QuickBoostModal } from '@/components/QuickBoostModal';

export default function AdsManagerPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'overview' | 'campaigns' | 'wallet' | 'create'>('overview');
  
  // Dashboard & Wallet States
  const [walletInfo, setWalletInfo] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Edit Boost Campaign States
  const [isEditBoostOpen, setIsEditBoostOpen] = useState(false);
  const [editBoostType, setEditBoostType] = useState<'post' | 'reel' | 'listing'>('post');
  const [editBoostTargetId, setEditBoostTargetId] = useState('');
  const [editBoostCampaignId, setEditBoostCampaignId] = useState('');

  // Manual Campaign Edit States
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);

  // Wallet Transfer System States
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [transferSuccess, setTransferSuccess] = useState('');

  // Security PIN states
  const [hasTransferPin, setHasTransferPin] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [pinSetup, setPinSetup] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinSetupLoading, setPinSetupLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<'pin' | 'password'>('pin');
  const [confirmPin, setConfirmPin] = useState('');

  useEffect(() => {
    if (hasTransferPin) {
      setAuthMethod('pin');
    } else if (hasPassword) {
      setAuthMethod('password');
    }
  }, [hasTransferPin, hasPassword]);

  const handleSetPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinSetup || pinSetup.length < 4 || pinSetup.length > 6 || isNaN(Number(pinSetup))) {
      setTransferError('PIN must be a 4 to 6 digit numeric code.');
      return;
    }
    if (pinSetup !== pinConfirm) {
      setTransferError('PINs do not match. Please verify.');
      return;
    }

    try {
      setPinSetupLoading(true);
      setTransferError('');
      setTransferSuccess('');
      const res = await setTransferPinAction(pinSetup);
      if (res.success) {
        setTransferSuccess('Transfer PIN set successfully!');
        setHasTransferPin(true);
        setPinSetup('');
        setPinConfirm('');
        loadData();
      } else {
        setTransferError(res.error || 'Failed to set PIN.');
      }
    } catch (err: any) {
      setTransferError(err.message || 'Error setting Transfer PIN.');
    } finally {
      setPinSetupLoading(false);
    }
  };

  // Wizard / Builder State
  const [step, setStep] = useState(1);
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    objective: 'traffic',
    specialAdCategory: 'none',
    cboEnabled: false,
    abTestingEnabled: false,
    adSetName: '',
    conversionLocation: 'website',
    performanceGoal: 'link_clicks',
    budgetType: 'daily' as 'daily' | 'lifetime',
    budgetAmount: 500,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    targetingCountries: 'India',
    targetingStates: '',
    targetingCities: '',
    targetingPincodes: '',
    targetingToleeIds: '',
    targetingInterests: '',
    targetingFollowers: false,
    targetingEngagedUsers: false,
    placements: ['feed', 'reels'],
    adName: '',
    format: 'single_image' as 'single_image' | 'single_video' | 'carousel' | 'collection',
    mediaUrls: [''],
    primaryText: '',
    headline: '',
    description: '',
    ctaButton: 'learn_more',
    destinationUrl: ''
  });

  const objectives = [
    { id: 'awareness', title: 'Awareness', desc: 'Show your ads to people who are most likely to remember them.', color: 'from-blue-500/20 to-blue-600/30' },
    { id: 'traffic', title: 'Traffic', desc: 'Send people to a destination, like your website, app, or Tolee group.', color: 'from-emerald-500/20 to-emerald-600/30' },
    { id: 'engagement', title: 'Engagement', desc: 'Get more video views, post engagements, page likes or group joins.', color: 'from-violet-500/20 to-violet-600/30' },
    { id: 'leads', title: 'Leads', desc: 'Collect leads for your business or brand via messages or landing pages.', color: 'from-amber-500/20 to-amber-600/30' },
    { id: 'app_promotion', title: 'App Promotion', desc: 'Get people to install your app or take action within it.', color: 'from-pink-500/20 to-pink-600/30' },
    { id: 'sales', title: 'Sales', desc: 'Find people likely to purchase your goods, listings, or Tolee courses.', color: 'from-rose-500/20 to-rose-600/30' }
  ];

  // Load Initial Data
  const loadData = async () => {
    try {
      setLoading(true);
      const [walletRes, dbRes] = await Promise.all([
        getUserWallet(),
        getAdCampaignsDashboard()
      ]);

      if (walletRes.success) {
        setWalletInfo(walletRes);
        setHasTransferPin(!!walletRes.hasTransferPin);
        setHasPassword(!!walletRes.hasPassword);
      }
      if (dbRes.success) {
        setDashboardData(dbRes);
      }
    } catch (err: any) {
      console.error('Failed to load Ads Manager data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      loadData();
    }
  }, [session]);

  // Realtime debounce user search suggestions
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const delaySearch = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await searchUsersForTransfer(searchQuery);
        if (res.success && res.users) {
          setSearchResults(res.users);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipient) {
      setTransferError('Please search and select a recipient user first.');
      return;
    }

    const amountNum = Number(transferAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setTransferError('Please enter a valid transfer amount greater than zero.');
      return;
    }

    if (amountNum > (wallet?.balance || 0)) {
      setTransferError('Insufficient wallet balance to complete this transfer.');
      return;
    }

    if (authMethod === 'password' && !confirmPassword) {
      setTransferError('Please confirm your account password.');
      return;
    }

    if (authMethod === 'pin' && (!confirmPin || confirmPin.length < 4)) {
      setTransferError('Please enter your 4 to 6 digit Transfer PIN.');
      return;
    }

    try {
      setTransferLoading(true);
      setTransferError('');
      setTransferSuccess('');

      const res = await transferWalletCreditsAction({
        recipientId: selectedRecipient.id,
        amount: amountNum,
        password: authMethod === 'password' ? confirmPassword : undefined,
        pin: authMethod === 'pin' ? confirmPin : undefined,
        note: transferNote
      });

      if (res.success) {
        setTransferSuccess(res.message || 'Transfer completed successfully!');
        setConfirmPassword('');
        setConfirmPin('');
        setTransferAmount('');
        setTransferNote('');
        setSearchQuery('');
        setSelectedRecipient(null);
        setSearchResults([]);
        
        // Refresh balance instantly
        loadData();

        setTimeout(() => {
          setShowTransferModal(false);
          setTransferSuccess('');
        }, 2000);
      } else {
        setTransferError(res.error || 'Failed to complete transfer.');
      }
    } catch (err: any) {
      setTransferError(err.message || 'An unexpected error occurred.');
    } finally {
      setTransferLoading(false);
    }
  };

  const copyReferralLink = () => {
    if (walletInfo?.referralLink) {
      navigator.clipboard.writeText(walletInfo.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      const isPaused = currentStatus === 'paused';
      const res = await toggleCampaignStatus(id, !isPaused);
      if (res.success) {
        setSuccessMsg(`Campaign ${isPaused ? 'resumed' : 'paused'} successfully.`);
        loadData();
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setErrorMsg(res.error || 'Failed to toggle campaign status');
        setTimeout(() => setErrorMsg(''), 4000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const handleEditCampaign = (camp: any) => {
    if (camp.type === 'boost') {
      let boostType: 'post' | 'reel' | 'listing' = 'post';
      let targetId = '';
      if (camp.postBoostId) {
        boostType = 'post';
        targetId = camp.postBoostId;
      } else if (camp.reelBoostId) {
        boostType = 'reel';
        targetId = camp.reelBoostId;
      } else if (camp.listingBoostId) {
        boostType = 'listing';
        targetId = camp.listingBoostId;
      }
      setEditBoostCampaignId(camp.id);
      setEditBoostType(boostType);
      setEditBoostTargetId(targetId);
      setIsEditBoostOpen(true);
    } else {
      const adSet = camp.adSets?.[0];
      const ad = adSet?.ads?.[0];
      setEditingCampaignId(camp.id);
      setCampaignForm({
        name: camp.name || '',
        objective: camp.objective || 'traffic',
        specialAdCategory: camp.specialAdCategory || 'none',
        cboEnabled: camp.cboEnabled || false,
        abTestingEnabled: camp.abTestingEnabled || false,
        adSetName: adSet?.name || '',
        conversionLocation: adSet?.conversionLocation || 'website',
        performanceGoal: adSet?.performanceGoal || 'link_clicks',
        budgetType: (adSet?.budgetType || 'daily') as 'daily' | 'lifetime',
        budgetAmount: adSet?.budgetAmount || 500,
        startDate: adSet?.startDate ? new Date(adSet.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        endDate: adSet?.endDate ? new Date(adSet.endDate).toISOString().split('T')[0] : '',
        targetingCountries: adSet?.targetingCountries || 'India',
        targetingStates: adSet?.targetingStates || '',
        targetingCities: adSet?.targetingCities || '',
        targetingPincodes: adSet?.targetingPincodes || '',
        targetingToleeIds: adSet?.targetingToleeIds || '',
        targetingInterests: adSet?.targetingInterests || '',
        targetingFollowers: adSet?.targetingFollowers || false,
        targetingEngagedUsers: adSet?.targetingEngagedUsers || false,
        placements: adSet?.placements ? adSet.placements.split(',') : ['feed', 'reels'],
        adName: ad?.name || '',
        format: (ad?.format || 'single_image') as any,
        mediaUrls: ad?.mediaUrls ? ad.mediaUrls.split(',') : [''],
        primaryText: ad?.primaryText || '',
        headline: ad?.headline || '',
        description: ad?.description || '',
        ctaButton: ad?.ctaButton || 'learn_more',
        destinationUrl: ad?.destinationUrl || ''
      });
      setActiveTab('create');
      setStep(1);
    }
  };

  const handleFormSubmit = async () => {
    try {
      setActionLoading(true);
      setErrorMsg('');

      if (!campaignForm.name || !campaignForm.adSetName || !campaignForm.adName) {
        setErrorMsg('Please fill in the Campaign, Ad Set, and Ad Creative names.');
        setActionLoading(false);
        return;
      }

      if (campaignForm.mediaUrls.some(url => !url.trim())) {
        setErrorMsg('Please provide a valid creative media URL.');
        setActionLoading(false);
        return;
      }

      let res;
      if (editingCampaignId) {
        res = await updateCampaignAction(editingCampaignId, {
          ...campaignForm,
          status: 'pending' // Re-submits for admin review
        });
      } else {
        res = await createCampaignAction(campaignForm);
      }

      if (res.success) {
        setSuccessMsg(editingCampaignId 
          ? '🎉 Your campaign was updated successfully and re-submitted to the Super Admin for review!'
          : '🎉 Your campaign was created successfully and sent to the Super Admin for review!'
        );
        // Reset form & steps
        setStep(1);
        setEditingCampaignId(null);
        setActiveTab('campaigns');
        loadData();
        setTimeout(() => setSuccessMsg(''), 5000);
      } else {
        setErrorMsg(res.error || 'Failed to submit campaign');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Server error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center text-[#0a1530] bg-[#fafbfc]">
        <Megaphone className="h-16 w-16 text-zinc-400 animate-bounce" />
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-[#0a1530]">Tolee Ads Manager</h1>
        <p className="mt-2 text-zinc-500 max-w-md">Please sign in to access your digital ads wallet and launch custom high-converting campaigns.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-6 bg-[#fafbfc]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#00ba88] border-t-transparent" />
          <p className="text-sm font-semibold tracking-wider text-zinc-500 animate-pulse">Loading Ads Platform...</p>
        </div>
      </div>
    );
  }

  const wallet = walletInfo?.wallet;
  const stats = dashboardData?.stats || {
    totalSpend: 0,
    totalImpressions: 0,
    totalClicks: 0,
    totalLeads: 0,
    ctr: 0,
    cpc: 0,
    cpl: 0
  };

  // Find max value in graph for SVG scaling
  const graphData = dashboardData?.graphData || [];
  
  // Set up mock empty dates matching screenshot if graph data is empty
  const mockDates = [
    { date: 'May 9', spend: 0, clicks: 0 },
    { date: 'May 10', spend: 0, clicks: 0 },
    { date: 'May 11', spend: 0, clicks: 0 },
    { date: 'May 12', spend: 0, clicks: 0 },
    { date: 'May 13', spend: 0, clicks: 0 },
    { date: 'May 14', spend: 0, clicks: 0 },
    { date: 'May 15', spend: 0, clicks: 0 },
    { date: 'May 16', spend: 0, clicks: 0 },
    { date: 'May 17', spend: 0, clicks: 0 },
    { date: 'May 18', spend: 0, clicks: 0 },
    { date: 'May 19', spend: 0, clicks: 0 },
    { date: 'May 20', spend: 0, clicks: 0 },
    { date: 'May 21', spend: 0, clicks: 0 },
    { date: 'May 22', spend: 0, clicks: 0 }
  ];

  const activeGraphData = graphData.length > 0 ? graphData : mockDates;
  const maxSpend = Math.max(...activeGraphData.map((d: any) => d.spend), 10);
  const maxClicks = Math.max(...activeGraphData.map((d: any) => d.clicks), 1);

  return (
    <div className="min-h-screen bg-[#fafbfc] text-[#0f172a] p-4 sm:p-6 lg:p-8 pb-20">
      
      {/* Upper Title Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 mb-8 border-b border-zinc-100">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#00ba88]">
            <Sparkles className="h-4 w-4" />
            Grow Your Business Inside Tolee
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0a1530] mt-1">
            Tolee Ads Manager
          </h1>
        </div>

        <button 
          onClick={() => {
            setCampaignForm(prev => ({
              ...prev,
              name: `Campaign #${(dashboardData?.campaigns?.length || 0) + 1}`,
              adSetName: `Ad Set - #${(dashboardData?.campaigns?.length || 0) + 1}`,
              adName: `Creative - #${(dashboardData?.campaigns?.length || 0) + 1}`
            }));
            setEditingCampaignId(null);
            setActiveTab('create');
            setStep(1);
          }}
          className="flex items-center gap-2 bg-gradient-to-r from-[#00ba88] to-[#10b981] hover:opacity-95 text-sm font-semibold text-white px-5 py-2.5 rounded-xl shadow-sm transition-all hover:scale-[1.01]"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          Create Ad Campaign
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 animate-in slide-in-from-top duration-300">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-[#00ba88]" />
          <span className="text-sm font-semibold">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 animate-in slide-in-from-top duration-300">
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-500" />
          <span className="text-sm font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* Main Tab Navigation */}
      <div className="flex border-b border-zinc-200 gap-6 mb-8 text-sm overflow-x-auto whitespace-nowrap scrollbar-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 font-semibold transition-all relative ${
            activeTab === 'overview' 
              ? 'text-[#0a1530] font-bold' 
              : 'text-zinc-400 hover:text-zinc-800'
          }`}
        >
          Overview & Insights
          {activeTab === 'overview' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00ba88] rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`pb-3 font-semibold transition-all relative ${
            activeTab === 'campaigns' 
              ? 'text-[#0a1530] font-bold' 
              : 'text-zinc-400 hover:text-zinc-800'
          }`}
        >
          All Campaigns
          {activeTab === 'campaigns' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00ba88] rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('wallet')}
          className={`pb-3 font-semibold transition-all relative ${
            activeTab === 'wallet' 
              ? 'text-[#0a1530] font-bold' 
              : 'text-zinc-400 hover:text-zinc-800'
          }`}
        >
          Ads Wallet & Rewards
          {activeTab === 'wallet' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00ba88] rounded-full" />
          )}
        </button>
      </div>

      {/* Tab 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          
          {/* Top Row Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Wallet Balance Card */}
            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-[0_2px_8px_rgba(0,0,0,0.02)] relative overflow-hidden flex flex-col justify-between min-h-[145px] hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all duration-200">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Wallet Balance</span>
                  <Wallet className="h-5 w-5 text-[#00ba88]" />
                </div>
                <h3 className="mt-3 text-3xl font-extrabold tracking-tight text-[#0a1530] flex items-center gap-2.5">
                  <span>₹{wallet?.balance?.toLocaleString('en-IN') || '0.00'}</span>
                  <button
                    onClick={() => {
                      setTransferError('');
                      setTransferSuccess('');
                      setShowTransferModal(true);
                    }}
                    className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#00ba88] rounded-xl transition-all shadow-sm border border-emerald-100/50 hover:scale-105 active:scale-95 shrink-0 flex items-center justify-center"
                    title="Transfer Credits"
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                  </button>
                </h3>
              </div>
              <p className="mt-2 text-xs text-[#00ba88] font-bold flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                100% Promotional Credits
              </p>
            </div>

            {/* Ad Credits Spent Card */}
            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-[0_2px_8px_rgba(0,0,0,0.02)] relative overflow-hidden flex flex-col justify-between min-h-[145px] hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all duration-200">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Ad Credits Spent</span>
                  <TrendingUp className="h-5 w-5 text-[#00ba88]" />
                </div>
                <h3 className="mt-3 text-3xl font-extrabold tracking-tight text-[#0a1530]">
                  ₹{stats.totalSpend.toLocaleString('en-IN')}
                </h3>
              </div>
              <p className="mt-2 text-xs text-zinc-500 font-medium">
                Out of ₹{wallet?.totalEarned?.toLocaleString('en-IN') || '2,500'} limit
              </p>
            </div>

            {/* Impressions / Reach Card */}
            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-[0_2px_8px_rgba(0,0,0,0.02)] relative overflow-hidden flex flex-col justify-between min-h-[145px] hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all duration-200">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Impressions / Reach</span>
                  <Users className="h-5 w-5 text-[#00ba88]" />
                </div>
                <h3 className="mt-3 text-3xl font-extrabold tracking-tight text-[#0a1530]">
                  {stats.totalImpressions.toLocaleString('en-IN')}
                </h3>
              </div>
              <p className="mt-2 text-xs text-zinc-500 font-medium">
                Est. Reach: {Math.round(stats.totalImpressions * 0.9).toLocaleString()} unique users
              </p>
            </div>

            {/* Average CTR Card */}
            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-[0_2px_8px_rgba(0,0,0,0.02)] relative overflow-hidden flex flex-col justify-between min-h-[145px] hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all duration-200">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Average CTR</span>
                  <Percent className="h-5 w-5 text-[#00ba88]" />
                </div>
                <h3 className="mt-3 text-3xl font-extrabold tracking-tight text-[#0a1530]">
                  {stats.ctr.toFixed(2)}%
                </h3>
              </div>
              <p className="mt-2 text-xs text-zinc-500 font-medium">
                Total Link Clicks: {stats.totalClicks.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Premium Charts & Graphs Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* ROI Chart Card */}
            <div className="lg:col-span-2 rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-[#0a1530]">Campaign ROI & Spend Over Time</h3>
                  <p className="text-xs text-zinc-400">Track clicks and spend logs daily</p>
                </div>
                <div className="flex items-center gap-4 text-[11px] font-bold text-zinc-500">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-[#00ba88]" />
                    <span>Spend (₹)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-[#0a1530]" />
                    <span>Clicks</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Interactive SVG Chart */}
              <div className="w-full">
                <div className="relative h-64 w-full flex items-end justify-between gap-1 pt-6 px-2 sm:px-4">
                  {/* SVG background grid lines */}
                  <div className="absolute inset-0 bottom-6 flex flex-col justify-between pointer-events-none">
                    <div className="border-b border-gray-100/80 w-full h-[1px] border-dashed" />
                    <div className="border-b border-gray-100/80 w-full h-[1px] border-dashed" />
                    <div className="border-b border-gray-100/80 w-full h-[1px] border-dashed" />
                    <div className="border-b border-gray-100/80 w-full h-[1px] border-dashed" />
                  </div>

                  {activeGraphData.map((d: any, idx: number) => {
                    const spendHeight = (d.spend / maxSpend) * 100;
                    const clickHeight = (d.clicks / maxClicks) * 100;

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                        
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 bg-[#0a1530] text-[10px] rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 w-28 text-center shadow-lg border border-zinc-750 text-white">
                          <p className="font-bold mb-0.5">{d.date}</p>
                          <p className="text-[#00ba88]">Spend: ₹{d.spend.toFixed(1)}</p>
                          <p className="text-blue-300">Clicks: {d.clicks}</p>
                        </div>

                        {/* Interactive Bars */}
                        <div className="flex items-end gap-[2px] w-full max-w-[20px]">
                          {/* Spend Bar */}
                          <div 
                            style={{ height: `${Math.max(spendHeight, 2)}%` }} 
                            className="w-1/2 bg-[#00ba88] rounded-t-sm transition-all duration-300 hover:opacity-90 cursor-pointer"
                          />
                          {/* Clicks Bar */}
                          <div 
                            style={{ height: `${Math.max(clickHeight, 2)}%` }} 
                            className="w-1/2 bg-[#0a1530] rounded-t-sm transition-all duration-300 hover:opacity-90 cursor-pointer"
                          />
                        </div>
                        
                        {/* Date string */}
                        <span className="text-[10px] text-zinc-400 mt-2 font-bold truncate max-w-full">
                          {d.date}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Campaign ROI & Averages Card */}
            <div className="rounded-3xl border border-gray-100 bg-white p-6 flex flex-col justify-between shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
              <div>
                <h3 className="text-lg font-bold text-[#0a1530] mb-4">Ad Efficiency Metrics</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                    <div className="flex items-center gap-2.5">
                      <BarChart3 className="h-4.5 w-4.5 text-[#00ba88]" />
                      <span className="text-xs text-zinc-500 font-semibold">Avg Cost per Click (CPC)</span>
                    </div>
                    <span className="font-bold text-sm text-[#0a1530]">₹{stats.cpc.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                    <div className="flex items-center gap-2.5">
                      <Target className="h-4.5 w-4.5 text-[#00ba88]" />
                      <span className="text-xs text-zinc-500 font-semibold">Avg Cost per Lead (CPL)</span>
                    </div>
                    <span className="font-bold text-sm text-[#0a1530]">₹{stats.cpl.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                    <div className="flex items-center gap-2.5">
                      <Layers className="h-4.5 w-4.5 text-[#00ba88]" />
                      <span className="text-xs text-zinc-500 font-semibold">Total Leads Received</span>
                    </div>
                    <span className="font-bold text-sm text-[#0a1530]">{stats.totalLeads}</span>
                  </div>
                </div>
              </div>

              {/* Tips banner */}
              <div className="mt-6 rounded-2xl bg-[#e8f7f2] border border-[#00ba88]/20 p-4 flex gap-3">
                <Sparkles className="h-5 w-5 text-[#00ba88] shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-[#0a1530]">AI Placement Optimization</h4>
                  <p className="text-[10px] text-zinc-500 leading-relaxed mt-1">Our platform automatically places your campaigns across High-CTR feeds to yield lower CPC.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Referral Banner */}
          <div className="rounded-3xl border border-[#00ba88]/10 bg-[#e8f7f2] p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_2px_8px_rgba(0,0,0,0.01)] relative overflow-hidden">
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00ba88]/10 text-[#00ba88]">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#0a1530]">Earn ₹500 Ad Credits Instantly</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-lg">Invite creators or business owners to sign up via your referral code. They receive ₹2,500 ad credit and you get ₹500 instantly inside your wallet.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
              <input 
                type="text" 
                readOnly 
                value={walletInfo?.referralLink || ''} 
                className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-zinc-650 w-full md:w-60 focus:outline-none"
              />
              <button 
                onClick={copyReferralLink}
                className="flex items-center justify-center gap-1.5 bg-[#0a1530] hover:bg-[#142347] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all select-none shrink-0"
              >
                {copied ? <Check className="h-4 w-4 text-[#00ba88]" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: ALL CAMPAIGNS */}
      {activeTab === 'campaigns' && (
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.02)] animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-[#0a1530]">Your Campaigns</h3>
              <p className="text-xs text-zinc-400">View and toggle live, pending, or paused promotions.</p>
            </div>
          </div>

          {(!dashboardData?.campaigns || dashboardData.campaigns.length === 0) ? (
            <div className="text-center py-16">
              <Megaphone className="h-12 w-12 text-zinc-300 mx-auto" />
              <h4 className="mt-4 font-bold text-zinc-600">No campaigns launched yet</h4>
              <p className="text-xs text-zinc-400 mt-1">Boost posts, listings or create advanced custom audience ad campaigns today.</p>
              <button 
                onClick={() => setActiveTab('create')}
                className="mt-4 bg-[#0a1530] hover:bg-[#142347] text-white text-xs font-bold rounded-xl px-4 py-2 transition-all"
              >
                Launch Your First Campaign
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-zinc-400 text-[10px] font-bold uppercase tracking-wider">
                    <th className="pb-3 pr-4">Campaign Name</th>
                    <th className="pb-3 px-4 text-center">Status</th>
                    <th className="pb-3 px-4">Objective</th>
                    <th className="pb-3 px-4">Type</th>
                    <th className="pb-3 px-4 text-right">Spend</th>
                    <th className="pb-3 px-4 text-center">Clicks / CTR</th>
                    <th className="pb-3 pl-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {dashboardData.campaigns.map((camp: any) => {
                    // Compute basic analytics for this campaign
                    let spent = 0;
                    let clicks = 0;
                    let impressions = 0;

                    camp.adSets.forEach((as: any) => {
                      as.ads.forEach((ad: any) => {
                        ad.analytics.forEach((an: any) => {
                          spent += an.costDeducted;
                          if (an.type === 'click') clicks++;
                          if (an.type === 'impression') impressions++;
                        });
                      });
                    });

                    const campaignCtr = impressions > 0 ? (clicks / impressions) * 100 : 0;

                    // Get status colors
                    let statusBg = 'bg-zinc-50 text-zinc-500 border-zinc-200';
                    if (camp.status === 'running') statusBg = 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]';
                    if (camp.status === 'pending') statusBg = 'bg-[#fef7e0] text-[#b06000] border-[#feebc8]';
                    if (camp.status === 'paused') statusBg = 'bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc]';
                    if (camp.status === 'rejected') statusBg = 'bg-[#fce8e6] text-[#c5221f] border-[#fad2cf]';

                    return (
                      <tr key={camp.id} className="group hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 pr-4 font-semibold text-[#0a1530]">
                          <div>
                            <p>{camp.name}</p>
                            {camp.status === 'rejected' && camp.rejectionReason && (
                              <p className="text-[11px] text-rose-500 font-semibold mt-0.5">Rejection reason: {camp.rejectionReason}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${statusBg}`}>
                            {camp.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-zinc-500 font-medium capitalize">{camp.objective.replace('_', ' ')}</td>
                        <td className="py-4 px-4">
                          <span className="text-xs bg-zinc-50 border border-gray-150 px-2.5 py-0.5 rounded-lg text-zinc-600 font-bold capitalize">
                            {camp.type}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right font-bold text-[#00ba88]">₹{spent.toFixed(2)}</td>
                        <td className="py-4 px-4 text-center font-medium">
                          <div>
                            <p className="text-[#0a1530] font-semibold">{clicks} clicks</p>
                            <p className="text-[10px] text-zinc-400">{campaignCtr.toFixed(2)}% CTR</p>
                          </div>
                        </td>
                        <td className="py-4 pl-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditCampaign(camp)}
                              className="p-2 rounded-xl border bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border-zinc-200 transition-all shadow-sm"
                              title="Edit Campaign"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(camp.id, camp.status)}
                              disabled={camp.status === 'pending' || camp.status === 'rejected'}
                              className={`p-2 rounded-xl border transition-all ${
                                camp.status === 'running' 
                                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200' 
                                  : 'bg-[#e8f7f2] hover:bg-[#d5f2e8] text-[#00ba88] border-[#00ba88]/20'
                              } disabled:opacity-30 disabled:cursor-not-allowed`}
                              title={camp.status === 'running' ? 'Pause Campaign' : 'Resume Campaign'}
                            >
                              {camp.status === 'running' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: WALLET & REWARDS */}
      {activeTab === 'wallet' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Elegant Credit-Card representation */}
            <div className="relative overflow-hidden aspect-[1.586/1] rounded-3xl bg-gradient-to-br from-[#0a1530] via-[#152a57] to-[#00ba88] p-6 flex flex-col justify-between border border-white/10 shadow-xl text-white">
              {/* Overlay graphics */}
              <div className="absolute top-0 right-0 h-44 w-44 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

              <div className="flex justify-between items-start z-10">
                <div>
                  <h3 className="text-base font-black tracking-widest text-[#00ba88]">TOLEE</h3>
                  <p className="text-[9px] text-[#86f0d3] tracking-widest font-bold">CREATOR AD CARD</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-xl">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
              </div>

              <div className="z-10">
                <p className="text-[9px] tracking-wider text-zinc-300 uppercase font-semibold">Promotional Ad Credits</p>
                <div className="flex items-center gap-3 mt-1">
                  <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                    ₹{wallet?.balance?.toLocaleString('en-IN') || '0.00'}
                  </h2>
                  <button
                    onClick={() => {
                      setTransferError('');
                      setTransferSuccess('');
                      setShowTransferModal(true);
                    }}
                    className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md transition-all shadow-sm border border-white/10 hover:scale-105 active:scale-95 shrink-0 flex items-center justify-center"
                    title="Transfer Credits"
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-end border-t border-white/10 pt-4 z-10">
                <div>
                  <p className="text-[8px] text-zinc-400 uppercase tracking-widest">Card Holder</p>
                  <p className="text-xs font-bold text-slate-100 mt-0.5">{session.user.name || 'Tolee Member'}</p>
                </div>
                <div>
                  <p className="text-[8px] text-zinc-400 uppercase tracking-widest text-right">Validity</p>
                  <p className="text-xs font-bold text-slate-100 mt-0.5">Virtual Ad Credits</p>
                </div>
              </div>
            </div>

            {/* Referral Stats and Details */}
            <div className="rounded-3xl border border-gray-100 bg-white p-6 flex flex-col justify-between shadow-[0_2px_8px_rgba(0,0,0,0.02)] text-[#0a1530]">
              <div>
                <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
                  <h3 className="text-lg font-bold text-[#0a1530]">Referrals Program</h3>
                  <span className="text-xs bg-[#e8f7f2] text-[#00ba88] font-bold border border-[#00ba88]/20 px-3 py-0.5 rounded-full">
                    Active
                  </span>
                </div>

                <div className="space-y-4">
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Refer your friends or followers. When they register on Tolee using your referral link:
                  </p>
                  <ul className="text-xs text-zinc-650 space-y-2 list-disc pl-4 font-medium">
                    <li>They receive the ₹2,500 promotional wallet bonus automatically.</li>
                    <li>You instantly get credited ₹500 promo credits inside your wallet.</li>
                    <li>Attribution is secure and runs fraud-prevention filters automatically.</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 border-t border-gray-100 pt-4">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-zinc-500">Total friends referred:</span>
                  <span className="font-bold text-[#0a1530] text-sm">{walletInfo?.referralCount || 0} friends</span>
                </div>
                <div className="flex justify-between items-center text-xs font-semibold mt-2">
                  <span className="text-zinc-500">Total referral earnings:</span>
                  <span className="font-bold text-[#00ba88] text-sm">₹{((walletInfo?.referralCount || 0) * 500).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Transaction logs */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <h3 className="text-lg font-bold text-[#0a1530] mb-6">Wallet Transaction Statement</h3>

            {(!wallet?.transactions || wallet.transactions.length === 0) ? (
              <div className="text-center py-10 text-zinc-400 text-xs">
                No transactions recorded yet.
              </div>
            ) : (
              <div className="space-y-3.5">
                {wallet.transactions.map((tx: any) => {
                  const isDebit = tx.amount < 0;

                  return (
                    <div key={tx.id} className="flex justify-between items-center border-b border-gray-50 pb-3">
                      <div>
                        <p className="text-sm font-bold text-[#0a1530]">{tx.description || 'Wallet transaction'}</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          {new Date(tx.createdAt).toLocaleDateString()} at {new Date(tx.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <span className={`text-sm font-bold shrink-0 ${isDebit ? 'text-rose-500' : 'text-[#00ba88]'}`}>
                        {isDebit ? '-' : '+'}₹{Math.abs(tx.amount).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: CREATE AD CAMPAIGN */}
      {activeTab === 'create' && (
        <div className="max-w-3xl mx-auto rounded-3xl border border-gray-100 bg-white p-6 sm:p-8 shadow-[0_2px_8px_rgba(0,0,0,0.02)] text-[#0a1530] animate-in fade-in duration-200">
          
          {/* Step indicator */}
          <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-[#0a1530]">
                {editingCampaignId ? 'Edit Campaign' : 'Campaign Builder'}
              </h3>
              <p className="text-xs text-zinc-400">Step {step} of 4: {
                step === 1 ? 'Objective & Settings' : 
                step === 2 ? 'Ad Set Budget & Duration' : 
                step === 3 ? 'Audience Targeting' : 
                'Upload Creative & CTAs'
              }</p>
            </div>
            
            {/* Visual Steps dots */}
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((s) => (
                <div 
                  key={s} 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    s === step 
                      ? 'bg-[#00ba88] w-6' 
                      : s < step 
                        ? 'bg-[#00ba88]/60' 
                        : 'bg-zinc-100'
                  }`} 
                />
              ))}
            </div>
          </div>

          {/* Form Wizard Steps */}
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-5 duration-200">
              
              {/* Campaign name */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                  Campaign Name
                </label>
                <input 
                  type="text" 
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="E.g., Summer Brand Awareness" 
                  className="w-full rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm text-[#0a1530] focus:outline-none focus:border-[#00ba88] focus:ring-1 focus:ring-[#00ba88] transition-all"
                />
              </div>

              {/* Objectives Grid */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-3">
                  Choose Campaign Objective
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {objectives.map((obj) => (
                    <div
                      key={obj.id}
                      onClick={() => setCampaignForm(prev => ({ ...prev, objective: obj.id }))}
                      className={`relative rounded-2xl border p-4 cursor-pointer transition-all flex items-start gap-3 select-none ${
                        campaignForm.objective === obj.id 
                          ? 'border-[#00ba88] bg-[#e8f7f2]/20' 
                          : 'border-gray-200 bg-white hover:bg-gray-50/50'
                      }`}
                    >
                      <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        campaignForm.objective === obj.id 
                          ? 'border-[#00ba88] text-[#00ba88] bg-[#e8f7f2]' 
                          : 'border-zinc-300'
                      }`}>
                        {campaignForm.objective === obj.id && <Check className="h-3 w-3" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#0a1530]">{obj.title}</h4>
                        <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{obj.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Special Ad category toggle */}
              <div className="flex items-center justify-between bg-zinc-50/50 rounded-2xl p-4 border border-gray-100">
                <div>
                  <h4 className="text-sm font-semibold text-[#0a1530]">Special Ad Categories</h4>
                  <p className="text-xs text-zinc-500 mt-0.5">Is this campaign related to housing, employment, or social issues?</p>
                </div>
                <select 
                  value={campaignForm.specialAdCategory}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, specialAdCategory: e.target.value }))}
                  className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-[#0a1530] font-bold focus:outline-none"
                >
                  <option value="none">None / No Category</option>
                  <option value="housing">Housing</option>
                  <option value="employment">Employment</option>
                  <option value="social_issues">Social Issues</option>
                </select>
              </div>

              {/* A/B Test and CBO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between bg-zinc-50/50 rounded-2xl p-4 border border-gray-100 select-none">
                  <div>
                    <h4 className="text-sm font-semibold text-[#0a1530]">Campaign Budget Optimization</h4>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Distribute budget dynamically across sets</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={campaignForm.cboEnabled}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, cboEnabled: e.target.checked }))}
                    className="h-4.5 w-4.5 accent-[#00ba88] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between bg-zinc-50/50 rounded-2xl p-4 border border-gray-100 select-none">
                  <div>
                    <h4 className="text-sm font-semibold text-[#0a1530]">A/B Testing</h4>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Test multiple creatives to compare ROI</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={campaignForm.abTestingEnabled}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, abTestingEnabled: e.target.checked }))}
                    className="h-4.5 w-4.5 accent-[#00ba88] cursor-pointer"
                  />
                </div>
              </div>

            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-5 duration-200">
              
              {/* Ad Set Name */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                  Ad Set Name
                </label>
                <input 
                  type="text" 
                  value={campaignForm.adSetName}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, adSetName: e.target.value }))}
                  placeholder="E.g., Chennai Audiences" 
                  className="w-full rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm text-[#0a1530] focus:outline-none focus:border-[#00ba88] focus:ring-1 focus:ring-[#00ba88]"
                />
              </div>

              {/* Conversion location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                    Conversion Location
                  </label>
                  <select 
                    value={campaignForm.conversionLocation}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, conversionLocation: e.target.value }))}
                    className="w-full rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm text-[#0a1530] font-semibold focus:outline-none"
                  >
                    <option value="website">Website / Landing Page</option>
                    <option value="messenger">Tolee Chat Messages</option>
                    <option value="whatsapp">WhatsApp Business</option>
                    <option value="calls">Phone Calls</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                    Performance Goal
                  </label>
                  <select 
                    value={campaignForm.performanceGoal}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, performanceGoal: e.target.value }))}
                    className="w-full rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm text-[#0a1530] font-semibold focus:outline-none"
                  >
                    <option value="impressions">Maximize Impressions (₹0.20 per view)</option>
                    <option value="link_clicks">Maximize Clicks (₹2.00 per click)</option>
                    <option value="leads">Maximize Conversions / CTAs (₹10.00 per lead)</option>
                  </select>
                </div>
              </div>

              {/* Budget inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                    Budget Type
                  </label>
                  <select 
                    value={campaignForm.budgetType}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, budgetType: e.target.value as any }))}
                    className="w-full rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm text-[#0a1530] font-semibold focus:outline-none"
                  >
                    <option value="daily">Daily Budget Limit</option>
                    <option value="lifetime">Lifetime Campaign Budget</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                    Budget Amount (₹)
                  </label>
                  <input 
                    type="number" 
                    value={campaignForm.budgetAmount}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, budgetAmount: Number(e.target.value) }))}
                    placeholder="500" 
                    className="w-full rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm text-[#0a1530] focus:outline-none"
                  />
                </div>
              </div>

              {/* Schedules */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                    Start Date
                  </label>
                  <input 
                    type="date" 
                    value={campaignForm.startDate}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm text-[#0a1530] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                    End Date (Optional)
                  </label>
                  <input 
                    type="date" 
                    value={campaignForm.endDate}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm text-[#0a1530] focus:outline-none"
                  />
                </div>
              </div>

            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-5 duration-200">
              
              {/* Special Tolee group targeting */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  Target Specific Tolee Communities
                </label>
                <p className="text-[10px] text-zinc-400 mb-2">Enter comma-separated Tolee group slugs/IDs to boost inside specific groups.</p>
                <input 
                  type="text" 
                  value={campaignForm.targetingToleeIds}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, targetingToleeIds: e.target.value }))}
                  placeholder="E.g., tech-tolee, startup-club, organic-farmers" 
                  className="w-full rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm text-[#0a1530] focus:outline-none"
                />
              </div>

              {/* Geographic targeting */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                    Countries
                  </label>
                  <input 
                    type="text" 
                    value={campaignForm.targetingCountries}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, targetingCountries: e.target.value }))}
                    className="w-full rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm text-[#0a1530] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                    Target States / Regions
                  </label>
                  <input 
                    type="text" 
                    value={campaignForm.targetingStates}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, targetingStates: e.target.value }))}
                    placeholder="E.g., Tamil Nadu, Maharashtra" 
                    className="w-full rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm text-[#0a1530] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                    Target Cities
                  </label>
                  <input 
                    type="text" 
                    value={campaignForm.targetingCities}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, targetingCities: e.target.value }))}
                    placeholder="E.g., Chennai, Mumbai, Pune" 
                    className="w-full rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm text-[#0a1530] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                    Pincodes / Zip codes
                  </label>
                  <input 
                    type="text" 
                    value={campaignForm.targetingPincodes}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, targetingPincodes: e.target.value }))}
                    placeholder="E.g., 600001, 400001" 
                    className="w-full rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm text-[#0a1530] focus:outline-none"
                  />
                </div>
              </div>

              {/* Interest and Behaviors */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                  Detailed Interests & Demographics
                </label>
                <input 
                  type="text" 
                  value={campaignForm.targetingInterests}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, targetingInterests: e.target.value }))}
                  placeholder="E.g., Gardening, Real Estate, Blockchain, Students" 
                  className="w-full rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm text-[#0a1530] focus:outline-none"
                />
              </div>

              {/* Audience source toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between bg-zinc-50/50 rounded-2xl p-4 border border-gray-100 select-none">
                  <div>
                    <h4 className="text-sm font-semibold text-[#0a1530]">Target My Followers</h4>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Show ads strictly to users who follow you</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={campaignForm.targetingFollowers}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, targetingFollowers: e.target.checked }))}
                    className="h-4.5 w-4.5 accent-[#00ba88] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between bg-zinc-50/50 rounded-2xl p-4 border border-gray-100 select-none">
                  <div>
                    <h4 className="text-sm font-semibold text-[#0a1530]">Target Engaged Users</h4>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Include users who clicked/liked your posts recently</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={campaignForm.targetingEngagedUsers}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, targetingEngagedUsers: e.target.checked }))}
                    className="h-4.5 w-4.5 accent-[#00ba88] cursor-pointer"
                  />
                </div>
              </div>

              {/* Placement selection checkboxes */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-3">
                  Ad Placement Locations
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {['feed', 'reels', 'marketplace', 'discover', 'stories', 'chats'].map((p) => {
                    const selected = campaignForm.placements.includes(p);
                    return (
                      <div 
                        key={p}
                        onClick={() => {
                          setCampaignForm(prev => {
                            const pls = prev.placements.includes(p)
                              ? prev.placements.filter(item => item !== p)
                              : [...prev.placements, p];
                            return { ...prev, placements: pls };
                          });
                        }}
                        className={`flex items-center justify-between p-3.5 border rounded-xl cursor-pointer select-none transition-all ${
                          selected 
                            ? 'border-[#00ba88] bg-[#e8f7f2]/20 text-[#00ba88]' 
                            : 'border-gray-200 bg-white text-zinc-650'
                        }`}
                      >
                        <span className="text-xs font-bold capitalize">{p}</span>
                        <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          selected ? 'border-[#00ba88] bg-[#00ba88] text-white' : 'border-zinc-350'
                        }`}>
                          {selected && <Check className="h-3 w-3" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-in slide-in-from-right-5 duration-200">
              
              {/* Ad Creative fields */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                  Ad Creative Name
                </label>
                <input 
                  type="text" 
                  value={campaignForm.adName}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, adName: e.target.value }))}
                  placeholder="E.g., High-Resolution Promo Banner" 
                  className="w-full rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm text-[#0a1530] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                    Creative Format
                  </label>
                  <select 
                    value={campaignForm.format}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, format: e.target.value as any }))}
                    className="w-full rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm text-[#0a1530] font-semibold focus:outline-none"
                  >
                    <option value="single_image">Single Image Creative</option>
                    <option value="single_video">Single Video / Reel Creative</option>
                    <option value="carousel">Carousel (Multiple Images)</option>
                    <option value="collection">Product Collection Grid</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                    Call To Action (CTA) Button Text
                  </label>
                  <select 
                    value={campaignForm.ctaButton}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, ctaButton: e.target.value }))}
                    className="w-full rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm text-[#0a1530] font-semibold focus:outline-none"
                  >
                    <option value="learn_more">Learn More</option>
                    <option value="send_message">Send Tolee Message</option>
                    <option value="book_now">Book Now</option>
                    <option value="apply_now">Apply Now</option>
                    <option value="contact_us">Contact Us</option>
                    <option value="whatsapp">Send WhatsApp Message</option>
                    <option value="call_now">Call Now</option>
                  </select>
                </div>
              </div>

              {/* Upload Creative Media URL */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                  Creative Media URL (Paste Image or Video link)
                </label>
                <input 
                  type="text" 
                  value={campaignForm.mediaUrls[0]}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCampaignForm(prev => ({ ...prev, mediaUrls: [val] }));
                  }}
                  placeholder="https://images.unsplash.com/... or Cloudinary video link" 
                  className="w-full rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm text-[#0a1530] focus:outline-none"
                />
              </div>

              {/* Texts */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                  Primary Text (Ad Body Caption)
                </label>
                <textarea 
                  value={campaignForm.primaryText}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, primaryText: e.target.value }))}
                  placeholder="E.g., Unlock your organic growth potential inside Tolee Communities today!" 
                  rows={3}
                  className="w-full rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm text-[#0a1530] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                    Headline
                  </label>
                  <input 
                    type="text" 
                    value={campaignForm.headline}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, headline: e.target.value }))}
                    placeholder="E.g., Flat 50% Off Today" 
                    className="w-full rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm text-[#0a1530] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                    Short Description
                  </label>
                  <input 
                    type="text" 
                    value={campaignForm.description}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="E.g., High-converting communities" 
                    className="w-full rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm text-[#0a1530] focus:outline-none"
                  />
                </div>
              </div>

              {/* Destination URL */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                  Destination URL / Target Link
                </label>
                <input 
                  type="text" 
                  value={campaignForm.destinationUrl}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, destinationUrl: e.target.value }))}
                  placeholder="https://tolee.in/... or your website landing page" 
                  className="w-full rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm text-[#0a1530] focus:outline-none"
                />
              </div>

            </div>
          )}

          {/* Wizard Footer controls */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-6 mt-8">
            <button
              onClick={() => {
                if (step > 1) setStep(step - 1);
                else setActiveTab('overview');
              }}
              className="flex items-center gap-1.5 border border-gray-200 bg-white px-4 py-2.5 rounded-xl text-zinc-600 hover:bg-gray-50 text-xs font-bold transition-all"
            >
              <ArrowLeft className="h-4 w-4 text-zinc-550" />
              Back
            </button>

            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="flex items-center gap-1.5 bg-gradient-to-r from-[#00ba88] to-[#10b981] hover:opacity-95 text-xs font-bold text-white px-5 py-2.5 rounded-xl shadow-sm transition-all"
              >
                Continue
                <ArrowRight className="h-4 w-4 text-white" />
              </button>
            ) : (
              <button
                onClick={handleFormSubmit}
                disabled={actionLoading}
                className="flex items-center gap-1.5 bg-gradient-to-r from-[#00ba88] to-[#10b981] hover:opacity-95 text-xs font-bold text-white px-6 py-2.5 rounded-xl shadow-sm transition-all select-none disabled:opacity-50 disabled:cursor-wait"
              >
                {actionLoading 
                  ? editingCampaignId 
                    ? 'Updating Campaign...' 
                    : 'Creating Campaign...' 
                  : editingCampaignId 
                    ? 'Save & Re-publish' 
                    : 'Publish & Review'
                }
                <Check className="h-4 w-4 text-white" />
              </button>
            )}
          </div>

        </div>
      )}

      {/* Transfer Wallet Modal Popup */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-250">
          <div className="rounded-t-3xl sm:rounded-3xl border border-gray-150 bg-white w-full sm:max-w-md text-[#0a1530] shadow-2xl relative flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 max-h-[92vh] sm:max-h-[88vh]">
            
            {/* Fintech Gradient Header */}
            <div className="bg-gradient-to-r from-[#00ba88] to-[#10b981] p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                  <ArrowLeftRight className="h-5 w-5 text-white stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">Ads Wallet Transfer</h3>
                  <p className="text-[10px] text-emerald-100 uppercase tracking-widest font-bold mt-0.5">Send Credits Instantly</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowTransferModal(false);
                  setSelectedRecipient(null);
                  setSearchQuery('');
                  setTransferAmount('');
                  setTransferNote('');
                  setConfirmPassword('');
                  setTransferError('');
                  setTransferSuccess('');
                }}
                className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div className="overflow-y-auto flex-1">
            {(!hasTransferPin && !hasPassword) ? (
              <form onSubmit={handleSetPinSubmit} className="p-6 space-y-4">
                {transferSuccess && (
                  <div className="flex items-center gap-3 rounded-2xl border border-emerald-250 bg-emerald-50/50 p-4 text-emerald-800 animate-in slide-in-from-top-2">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-[#00ba88]" />
                    <span className="text-xs font-semibold">{transferSuccess}</span>
                  </div>
                )}
                {transferError && (
                  <div className="flex items-center gap-3 rounded-2xl border border-rose-250 bg-rose-50/50 p-4 text-rose-800 animate-in slide-in-from-top-2">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-rose-500" />
                    <span className="text-xs font-semibold">{transferError}</span>
                  </div>
                )}

                <div className="text-center py-2">
                  <div className="h-12 w-12 rounded-full bg-emerald-50 text-[#00ba88] flex items-center justify-center mx-auto mb-3 border border-emerald-100">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-extrabold text-[#0a1530]">Set a Security PIN</h4>
                  <p className="text-xs text-zinc-500 mt-1 px-4 leading-relaxed">
                    Set a 4 to 6 digit numeric Transfer PIN to authorize Ads Wallet transfers securely.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                      Choose numeric PIN
                    </label>
                    <input 
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="e.g. 1234"
                      value={pinSetup}
                      onChange={(e) => setPinSetup(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-zinc-150 text-center text-lg font-bold tracking-[0.75em] text-[#0a1530] focus:outline-none focus:border-[#00ba88]"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                      Confirm PIN
                    </label>
                    <input 
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="e.g. 1234"
                      value={pinConfirm}
                      onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-zinc-150 text-center text-lg font-bold tracking-[0.75em] text-[#0a1530] focus:outline-none focus:border-[#00ba88]"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowTransferModal(false)}
                    className="flex-1 border border-zinc-200 bg-white hover:bg-slate-50 text-zinc-600 font-bold h-11 rounded-xl text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={pinSetupLoading || pinSetup.length < 4}
                    className="flex-1 bg-[#00ba88] hover:bg-[#00a377] text-white font-bold h-11 rounded-xl text-xs flex items-center justify-center gap-2"
                  >
                    {pinSetupLoading ? (
                      <><RefreshCw className="h-4 w-4 animate-spin" /> Saving...</>
                    ) : (
                      'Save PIN'
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleTransferSubmit} className="p-4 sm:p-6 space-y-4">
                {/* Dynamic Notification Logs */}
                {transferSuccess && (
                  <div className="flex items-center gap-3 rounded-2xl border border-emerald-250 bg-emerald-50/50 p-4 text-emerald-800 animate-in slide-in-from-top-2">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-[#00ba88]" />
                    <span className="text-xs font-semibold">{transferSuccess}</span>
                  </div>
                )}
                {transferError && (
                  <div className="flex items-center gap-3 rounded-2xl border border-rose-250 bg-rose-50/50 p-4 text-rose-800 animate-in slide-in-from-top-2">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-rose-500" />
                    <span className="text-xs font-semibold">{transferError}</span>
                  </div>
                )}

                {/* 1. Search Recipient Panel */}
                {!selectedRecipient ? (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                      Search Recipient User
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
                      <input 
                        type="text" 
                        placeholder="Enter username, email, or Page ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-zinc-200 text-xs text-[#0a1530] focus:outline-none focus:border-[#00ba88] focus:ring-1 focus:ring-[#00ba88] transition-all font-semibold"
                      />
                      {searching && (
                        <div className="absolute right-3.5 top-3.5 h-4 w-4 animate-spin rounded-full border-2 border-[#00ba88] border-t-transparent" />
                      )}
                    </div>

                    {/* Suggestions — rendered inline NOT as absolute dropdown */}
                    {searchResults.length > 0 && (
                      <div className="mt-1 bg-white border border-zinc-200 rounded-2xl shadow-lg overflow-hidden divide-y divide-gray-50 animate-in fade-in slide-in-from-top-1 duration-150">
                        {searchResults.map((usr) => (
                          <button
                            type="button"
                            key={usr.id}
                            onClick={() => {
                              setSelectedRecipient(usr);
                              setSearchResults([]);
                              setSearchQuery('');
                            }}
                            className="w-full flex items-center gap-3 p-3 text-left hover:bg-emerald-50/60 transition-colors"
                          >
                            {/* Avatar */}
                            <div className="h-10 w-10 rounded-full bg-slate-100 border border-zinc-100 overflow-hidden flex items-center justify-center shrink-0">
                              <img 
                                src={usr.image || usr.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${usr.username}`} 
                                alt={usr.name}
                                className="h-full w-full object-cover" 
                              />
                            </div>
                            {/* Info — flex-1 ensures it stretches and truncates properly */}
                            <div className="flex-1 min-w-0">
                              <p className="font-extrabold text-[#0a1530] text-xs flex items-center gap-1 truncate">
                                @{usr.username || usr.name}
                                {usr.isVerified && <CheckCircle2 className="h-3 w-3 text-blue-500 shrink-0" />}
                              </p>
                              <p className="text-[10px] text-zinc-400 mt-0.5 truncate">{usr.email}</p>
                            </div>
                            {/* Select badge — always visible on the right */}
                            <span className="text-[10px] font-bold text-[#00ba88] bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full uppercase shrink-0">
                              Select
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Recipient Selected Card */
                  <div className="rounded-2xl border border-emerald-500/10 bg-[#e8f7f2]/60 p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full border border-[#00ba88]/20 bg-white overflow-hidden shrink-0 flex items-center justify-center">
                        <img src={selectedRecipient.image || selectedRecipient.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${selectedRecipient.username}`} className="h-full w-full object-cover" />
                      </div>
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-[#00ba88]">Recipient Selected</span>
                        <p className="text-xs font-bold text-[#0a1530] flex items-center gap-1">
                          @{selectedRecipient.username || selectedRecipient.name}
                          {selectedRecipient.isVerified && <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 fill-blue-500/10 shrink-0" />}
                        </p>
                        <p className="text-[9px] text-zinc-400">{selectedRecipient.email}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedRecipient(null)}
                      className="h-7 w-7 rounded-full bg-[#ceead6] hover:bg-[#bbf0cb] flex items-center justify-center text-[#137333] transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Amount, Note, and Security confirmation */}
                {selectedRecipient && (
                  <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                    
                    {/* Amount input */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                          Transfer Amount (₹)
                        </label>
                        <button
                          type="button"
                          onClick={() => setTransferAmount(String(wallet?.balance || 0))}
                          className="text-[10px] font-bold uppercase tracking-wider text-[#00ba88] hover:underline"
                        >
                          Send Max (₹{wallet?.balance?.toLocaleString('en-IN') || 0})
                        </button>
                      </div>
                      <input 
                        type="number"
                        placeholder="0.00"
                        min="1"
                        step="any"
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-zinc-150 text-sm text-[#0a1530] font-extrabold focus:outline-none focus:border-[#00ba88] focus:ring-1 focus:ring-[#00ba88] transition-all"
                        required
                      />
                    </div>

                    {/* Note input */}
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                        Add a note (Optional)
                      </label>
                      <input 
                        type="text"
                        placeholder="E.g., sponsored ad collaboration credit..."
                        value={transferNote}
                        onChange={(e) => setTransferNote(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-zinc-150 text-xs text-[#0a1530] focus:outline-none focus:border-[#00ba88]"
                      />
                    </div>

                    {/* Authentication Switcher and Input */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block flex items-center gap-1.5">
                          <ShieldCheck className="h-4 w-4 text-emerald-500 stroke-[2.5]" />
                          {authMethod === 'pin' ? 'Confirm Transfer PIN' : 'Confirm Password'}
                        </label>
                        {hasTransferPin && hasPassword && (
                          <button
                            type="button"
                            onClick={() => {
                              setAuthMethod(authMethod === 'pin' ? 'password' : 'pin');
                              setConfirmPin('');
                              setConfirmPassword('');
                              setTransferError('');
                            }}
                            className="text-[9px] font-bold uppercase text-[#00ba88] hover:underline"
                          >
                            Use {authMethod === 'pin' ? 'Password' : 'PIN'}
                          </button>
                        )}
                      </div>

                      {authMethod === 'pin' ? (
                        <input 
                          type="password"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          placeholder="Enter 4 to 6 digit Transfer PIN..."
                          value={confirmPin}
                          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                          className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-zinc-150 text-center text-lg font-bold tracking-[0.75em] text-[#0a1530] focus:outline-none focus:border-emerald-500"
                          required
                        />
                      ) : (
                        <input 
                          type="password"
                          placeholder="Enter Tolee login password..."
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-zinc-150 text-xs text-[#0a1530] focus:outline-none focus:border-emerald-500"
                          required
                        />
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowTransferModal(false);
                          setSelectedRecipient(null);
                          setConfirmPassword('');
                          setConfirmPin('');
                          setTransferAmount('');
                          setTransferNote('');
                          setTransferError('');
                          setTransferSuccess('');
                        }}
                        className="flex-1 border border-zinc-200 bg-white hover:bg-slate-50 text-zinc-600 font-bold h-11 rounded-xl text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={transferLoading || !transferAmount || (authMethod === 'pin' ? confirmPin.length < 4 : !confirmPassword)}
                        className="flex-1 bg-gradient-to-r from-[#00ba88] to-[#10b981] hover:opacity-95 text-white font-bold h-11 rounded-xl text-xs flex items-center justify-center gap-2 select-none"
                      >
                        {transferLoading ? (
                          <><RefreshCw className="h-4 w-4 animate-spin" /> Verifying...</>
                        ) : (
                          <><ArrowLeftRight className="h-4 w-4 text-white" /> Complete Transfer</>
                        )}
                      </button>
                    </div>

                  </div>
                )}
              </form>
            )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Boost Modal for Editing */}
      {isEditBoostOpen && (
        <QuickBoostModal
          isOpen={isEditBoostOpen}
          onClose={() => {
            setIsEditBoostOpen(false);
            setEditBoostCampaignId('');
          }}
          type={editBoostType}
          targetId={editBoostTargetId}
          campaignId={editBoostCampaignId}
          onSuccess={() => {
            loadData();
          }}
        />
      )}

    </div>
  );
}

