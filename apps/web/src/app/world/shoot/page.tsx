'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  Megaphone, 
  ArrowLeft, 
  Plus, 
  Send, 
  Target, 
  Users, 
  MapPin, 
  Hash, 
  Eye, 
  MousePointerClick, 
  BarChart3, 
  Percent, 
  Clock, 
  ChevronRight, 
  Sparkles, 
  AlertTriangle,
  Upload,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Info
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSidebarData } from '@/actions/user';
import { getWorldProjects } from '@/actions/world';
import { sendToleeShootBroadcast, getToleeShootAnalytics } from '@/actions/shoot';

export default function ToleeShootWizardPage() {
  const { status, data: session } = useSession();
  const router = useRouter();

  // Dashboard & State data
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [analytics, setAnalytics] = React.useState<any>(null);
  const [myTolees, setMyTolees] = React.useState<any[]>([]);
  const [myProjects, setMyProjects] = React.useState<any[]>([]);
  
  // View mode: 'DASHBOARD' | 'WIZARD'
  const [viewMode, setViewMode] = React.useState<'DASHBOARD' | 'WIZARD'>('DASHBOARD');

  // Wizard state steps: 1: Targeting Type, 2: Target Selection, 3: Message & Media, 4: Preview & AI Check, 5: Confirm & Launch
  const [wizardStep, setWizardStep] = React.useState<number>(1);

  // Form State
  const [targetingType, setTargetingType] = React.useState<'GROUP' | 'LOCATION' | 'PINCODE'>('GROUP');
  const [selectedGroups, setSelectedGroups] = React.useState<string[]>([]);
  const [locationInput, setLocationInput] = React.useState('');
  const [pincodeInput, setPincodeInput] = React.useState('');
  
  const [content, setContent] = React.useState('');
  const [mediaUrl, setMediaUrl] = React.useState('');
  const [contentType, setContentType] = React.useState<'TEXT' | 'PRODUCT' | 'REEL' | 'BLOG' | 'RESTAURANT' | 'STORE' | 'MARKETPLACE'>('TEXT');
  const [contentId, setContentId] = React.useState('');
  
  // Image Uploading State
  const [uploadingImage, setUploadingImage] = React.useState(false);

  // Estimation and Limits
  const [audienceEstimate, setAudienceEstimate] = React.useState<number>(0);
  const [spamCheckMessage, setSpamCheckMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      loadData();
    }
  }, [status]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, sidebarRes, projectsRes] = await Promise.all([
        getToleeShootAnalytics(),
        getSidebarData(),
        getWorldProjects()
      ]);

      if (analyticsRes.success) {
        setAnalytics(analyticsRes);
      }
      if (sidebarRes.success) {
        const all = [...(sidebarRes.managedTolees || []), ...(sidebarRes.joinedTolees || [])];
        const unique = all.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
        setMyTolees(unique);
      }
      if (projectsRes.success && projectsRes.projects) {
        setMyProjects(projectsRes.projects);
      }
    } catch (err) {
      console.error("Error loading shoot data:", err);
    }
    setLoading(false);
  };

  // Estimate audience size dynamically (simulation)
  React.useEffect(() => {
    let size = 0;
    if (targetingType === 'GROUP') {
      // Approximate group members
      selectedGroups.forEach(gId => {
        const tolee = myTolees.find(t => t.id === gId);
        // Multiply by a simulated multiplier or default size
        size += (tolee?.membersCount || 12);
      });
    } else if (targetingType === 'LOCATION') {
      const locations = locationInput.split(',').map(l => l.trim()).filter(Boolean);
      size = locations.length * 75; // simulated count
    } else if (targetingType === 'PINCODE') {
      const pincodes = pincodeInput.split(',').map(p => p.trim()).filter(Boolean);
      size = pincodes.length * 35; // simulated count
    }
    
    // Cap according to free/premium limits
    const limit = analytics?.isPremium ? 500 : 50;
    setAudienceEstimate(Math.min(size, limit));
  }, [targetingType, selectedGroups, locationInput, pincodeInput, myTolees, analytics]);

  // AI Content / Keyword Check
  React.useEffect(() => {
    const spamKeywords = [
      "free money", "lottery", "win cash", "viagra", "click here now", 
      "congratulations you won", "earn 1000", "make money online", 
      "get rich quick", "phishing", "free-gift", "win-prize"
    ];
    const text = content.toLowerCase();
    const hasSpam = spamKeywords.some(kw => text.includes(kw));
    if (hasSpam) {
      setSpamCheckMessage("Warning: Your content contains phrases flagged by our spam filter. Sending this message may result in automated moderation.");
    } else {
      setSpamCheckMessage(null);
    }
  }, [content]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const fd = new FormData();
    fd.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: fd
      });
      const data = await res.json();
      if (data.success && data.url) {
        setMediaUrl(data.url);
      } else {
        alert("Image upload failed. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading image.");
    }
    setUploadingImage(false);
  };

  const handleAttachProject = (project: any) => {
    let typeMap: 'STORE' | 'RESTAURANT' | 'BLOG' | 'PRODUCT' = 'STORE';
    if (project.type === 'WEBSITE') typeMap = 'STORE'; // default
    else if (project.type === 'BLOG') typeMap = 'BLOG';
    else if (project.type === 'RESTAURANT') typeMap = 'RESTAURANT';
    else if (project.type === 'STORE') typeMap = 'STORE';

    setContentType(typeMap);
    setContentId(project.id);
    // Auto-fill some content if empty
    if (!content) {
      setContent(`Check out our new Tolee World launch: "${project.name}"!\n\n${project.description || ''}`);
    }
    if (project.bannerImage) {
      setMediaUrl(project.bannerImage);
    }
  };

  const handleShoot = async () => {
    setSubmitting(true);
    
    const targetGroups = targetingType === 'GROUP' ? selectedGroups : undefined;
    const targetLocations = targetingType === 'LOCATION' ? locationInput.split(',').map(l => l.trim()).filter(Boolean) : undefined;
    const targetPincodes = targetingType === 'PINCODE' ? pincodeInput.split(',').map(p => p.trim()).filter(Boolean) : undefined;

    const params = {
      content,
      mediaUrl: mediaUrl || undefined,
      targetingType,
      targetGroups,
      targetLocations,
      targetPincodes,
      contentType,
      contentId: contentId || undefined
    };

    const res = await sendToleeShootBroadcast(params);
    setSubmitting(false);

    if (res.success) {
      alert(`🚀 Shoot Campaign Sent Successfully! Delivered to ${res.deliveredCount} users.`);
      setViewMode('DASHBOARD');
      // Reset state
      setWizardStep(1);
      setContent('');
      setMediaUrl('');
      setContentType('TEXT');
      setContentId('');
      setSelectedGroups([]);
      setLocationInput('');
      setPincodeInput('');
      loadData();
    } else {
      alert(`Shoot failed: ${res.error}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] text-gray-900 dark:text-white p-6 lg:p-12 flex flex-col justify-center items-center">
        <div className="w-16 h-16 border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-500 dark:text-zinc-400 font-semibold tracking-wider animate-pulse">LOADING TOLEE SHOOT CAMPAIGNS...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] text-gray-900 dark:text-white pb-20 selection:bg-primary selection:text-white relative">
      {/* Decors */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 lg:pt-8 relative z-10">
        
        {/* Header navigation bar */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200 dark:border-zinc-800">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-xl border border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-900"
            onClick={() => {
              if (viewMode === 'WIZARD') {
                setViewMode('DASHBOARD');
              } else {
                router.push('/world');
              }
            }}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-amber-500/5 border-amber-500/20 text-amber-500 font-bold px-2 py-0.5 text-[10px] uppercase tracking-wider flex items-center gap-1 rounded-full">
                <Megaphone className="w-3 h-3" /> Community Marketing
              </Badge>
              {analytics?.isPremium && (
                <Badge variant="secondary" className="bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-extrabold text-[10px] rounded-full px-2">
                  Premium Sender
                </Badge>
              )}
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-gray-700 to-gray-500 dark:from-white dark:via-zinc-200 dark:to-zinc-500">
              Tolee Shoot
            </h1>
            <p className="text-gray-500 dark:text-zinc-400 text-xs">
              WhatsApp-style bulk promotions and Telegram-style announcements targeting localized communities.
            </p>
          </div>
        </div>

        {viewMode === 'DASHBOARD' ? (
          /* DASHBOARD VIEW */
          <div className="space-y-10">
            {/* Stats Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <Card className="bg-white dark:bg-zinc-900/40 border-gray-200 dark:border-zinc-800 backdrop-blur-md rounded-2xl shadow-sm">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] text-gray-500 dark:text-zinc-400 font-bold uppercase tracking-wider">Total Campaigns</span>
                    <div className="p-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl"><Megaphone className="w-4 h-4" /></div>
                  </div>
                  <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{analytics?.summary?.totalShoots || 0}</p>
                  <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1">Total bulk messaging broadcasts</p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-zinc-900/40 border-gray-200 dark:border-zinc-800 backdrop-blur-md rounded-2xl shadow-sm">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] text-gray-500 dark:text-zinc-400 font-bold uppercase tracking-wider">Total Delivered</span>
                    <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl"><Users className="w-4 h-4" /></div>
                  </div>
                  <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{analytics?.summary?.totalDelivered || 0}</p>
                  <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1">Unique inbox DMs delivered</p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-zinc-900/40 border-gray-200 dark:border-zinc-800 backdrop-blur-md rounded-2xl shadow-sm">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] text-gray-500 dark:text-zinc-400 font-bold uppercase tracking-wider">Link Click Clicks</span>
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl"><MousePointerClick className="w-4 h-4" /></div>
                  </div>
                  <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{analytics?.summary?.totalClicks || 0}</p>
                  <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1">Receiver link & attachment clicks</p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-zinc-900/40 border-gray-200 dark:border-zinc-800 backdrop-blur-md rounded-2xl shadow-sm">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] text-gray-500 dark:text-zinc-400 font-bold uppercase tracking-wider">Average CTR</span>
                    <div className="p-2 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl"><Percent className="w-4 h-4" /></div>
                  </div>
                  <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{analytics?.summary?.avgCtr || '0.0'}%</p>
                  <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1">Campaign engagement rate</p>
                </CardContent>
              </Card>
            </div>

            {/* Launch Banner */}
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-transparent border border-amber-500/20 rounded-3xl p-6 lg:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  🚀 Launch a Broadcast Campaign
                </h2>
                <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-2xl">
                  Reach customers natively inside Tolee. Promote products, offer discounts, or share news. 
                  Target users based on communities they belong to, their geolocation areas, or specific pincodes.
                </p>
                <div className="text-[11px] text-gray-400">
                  Daily Quota Used: <span className="font-bold text-amber-500">{analytics?.shootsToday || 0}</span> / {analytics?.dailyLimit || 2} campaigns today.
                </div>
              </div>
              <Button 
                onClick={() => setViewMode('WIZARD')}
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl shadow-lg shadow-amber-500/10 flex items-center gap-2 h-11 px-6 font-bold"
              >
                <Plus className="w-4 h-4" /> Create Tolee Shoot
              </Button>
            </div>

            {/* Past Campaigns Table */}
            <Card className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
              <CardHeader className="p-6 border-b border-gray-200 dark:border-zinc-800">
                <CardTitle className="text-base font-bold text-gray-900 dark:text-white">Broadcast History</CardTitle>
                <CardDescription className="text-xs text-gray-500 dark:text-zinc-400">Track and monitor status and engagement details of your bulk campaigns.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {!analytics?.shoots || analytics.shoots.length === 0 ? (
                  <div className="text-center py-16">
                    <Clock className="w-12 h-12 text-gray-300 dark:text-zinc-700 mx-auto mb-4" />
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">No Shoots Sent Yet</h3>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-xs mx-auto mt-1">Start promoting your local offerings or updates now.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 font-bold">
                          <th className="p-4">Campaign ID</th>
                          <th className="p-4">Message</th>
                          <th className="p-4">Targeting</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Delivered</th>
                          <th className="p-4">Clicks (CTR)</th>
                          <th className="p-4">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.shoots.map((shoot: any) => {
                          let targetingSummary = '';
                          if (shoot.targetingType === 'GROUP') {
                            const grps = JSON.parse(shoot.targetGroups || '[]');
                            targetingSummary = `Groups: ${grps.length}`;
                          } else if (shoot.targetingType === 'LOCATION') {
                            const locs = JSON.parse(shoot.targetLocations || '[]');
                            targetingSummary = `Locs: ${locs.join(', ')}`;
                          } else if (shoot.targetingType === 'PINCODE') {
                            const pins = JSON.parse(shoot.targetPincodes || '[]');
                            targetingSummary = `Pincodes: ${pins.join(', ')}`;
                          }

                          const ctr = shoot.deliveredCount > 0 ? ((shoot.clickCount / shoot.deliveredCount) * 100).toFixed(1) : '0.0';

                          return (
                            <tr key={shoot.id} className="border-b border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-900/30 transition-colors">
                              <td className="p-4 font-mono font-bold text-[10px] text-gray-400">{shoot.id.substring(0, 8)}...</td>
                              <td className="p-4 max-w-[200px] truncate text-gray-800 dark:text-zinc-300 font-medium">{shoot.content}</td>
                              <td className="p-4">
                                <Badge variant="outline" className="text-[10px] capitalize bg-gray-100 dark:bg-zinc-850 border-none">
                                  {shoot.targetingType.toLowerCase()}: {targetingSummary}
                                </Badge>
                              </td>
                              <td className="p-4">
                                <Badge className={
                                  shoot.status === 'sent' ? 'bg-emerald-500/10 text-emerald-500 border-none' :
                                  shoot.status === 'moderated' ? 'bg-red-500/10 text-red-500 border-none' :
                                  'bg-amber-500/10 text-amber-500 border-none'
                                }>
                                  {shoot.status.toUpperCase()}
                                </Badge>
                              </td>
                              <td className="p-4 font-bold text-gray-900 dark:text-white">{shoot.deliveredCount}</td>
                              <td className="p-4 font-bold text-gray-900 dark:text-white">
                                {shoot.clickCount} <span className="text-gray-400 font-normal">({ctr}%)</span>
                              </td>
                              <td className="p-4 text-gray-400">{new Date(shoot.createdAt).toLocaleDateString()}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          /* WIZARD VIEW */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Steps & Config Panel (Col 1 & 2) */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Wizard Steps indicator */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/80 p-1.5 rounded-2xl w-fit">
                {[
                  { label: "Targeting", step: 1 },
                  { label: "Criteria", step: 2 },
                  { label: "Message", step: 3 },
                  { label: "AI & Preview", step: 4 },
                  { label: "Launch", step: 5 }
                ].map((s) => (
                  <button
                    key={s.step}
                    onClick={() => {
                      if (s.step < wizardStep) {
                        setWizardStep(s.step);
                      }
                    }}
                    disabled={s.step > wizardStep}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      wizardStep === s.step
                        ? 'bg-amber-500 text-black shadow-sm'
                        : s.step < wizardStep
                          ? 'text-amber-500 hover:bg-gray-200 dark:hover:bg-zinc-800'
                          : 'text-gray-400 dark:text-zinc-650 cursor-not-allowed'
                    }`}
                  >
                    <span>{s.step}.</span>
                    <span>{s.label}</span>
                    {s.step < 5 && <ChevronRight className="w-3.5 h-3.5 opacity-55 ml-0.5" />}
                  </button>
                ))}
              </div>

              {/* Wizard Cards rendering */}
              <Card className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 lg:p-8">
                
                {/* STEP 1: Targeting Options */}
                {wizardStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                        <Target className="w-5 h-5 text-amber-500" /> 1. Select Targeting Mode
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                        Select how you want to target recipients. Tolee Shoot supports only community, location, and pincode targeting.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                      <button
                        onClick={() => {
                          setTargetingType('GROUP');
                          setWizardStep(2);
                        }}
                        className={`p-6 border rounded-2xl flex flex-col items-center justify-between text-center gap-3 transition-all duration-300 ${
                          targetingType === 'GROUP' 
                            ? 'bg-amber-500/5 border-amber-500 text-amber-500 ring-1 ring-amber-500/50'
                            : 'bg-gray-50 dark:bg-zinc-900/30 border-gray-250 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 hover:border-amber-500/50'
                        }`}
                      >
                        <div className="p-3 bg-amber-500/10 rounded-2xl"><Users className="w-6 h-6" /></div>
                        <div>
                          <div className="font-bold text-sm">Group-wise Broadcast</div>
                          <div className="text-[10px] text-gray-400 mt-1">Promote to members of specific Tolees/Groups that you belong to.</div>
                        </div>
                        <Badge className="bg-amber-500/10 text-amber-500 text-[9px] border-none mt-2">Community</Badge>
                      </button>

                      <button
                        onClick={() => {
                          setTargetingType('LOCATION');
                          setWizardStep(2);
                        }}
                        className={`p-6 border rounded-2xl flex flex-col items-center justify-between text-center gap-3 transition-all duration-300 ${
                          targetingType === 'LOCATION' 
                            ? 'bg-amber-500/5 border-amber-500 text-amber-500 ring-1 ring-amber-500/50'
                            : 'bg-gray-50 dark:bg-zinc-900/30 border-gray-250 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 hover:border-amber-500/50'
                        }`}
                      >
                        <div className="p-3 bg-amber-500/10 rounded-2xl"><MapPin className="w-6 h-6" /></div>
                        <div>
                          <div className="font-bold text-sm">Location-wise Broadcast</div>
                          <div className="text-[10px] text-gray-400 mt-1">Target users matching specific cities, areas, states, or countries.</div>
                        </div>
                        <Badge className="bg-amber-500/10 text-amber-500 text-[9px] border-none mt-2">Geo-targeting</Badge>
                      </button>

                      <button
                        onClick={() => {
                          setTargetingType('PINCODE');
                          setWizardStep(2);
                        }}
                        className={`p-6 border rounded-2xl flex flex-col items-center justify-between text-center gap-3 transition-all duration-300 ${
                          targetingType === 'PINCODE' 
                            ? 'bg-amber-500/5 border-amber-500 text-amber-500 ring-1 ring-amber-500/50'
                            : 'bg-gray-50 dark:bg-zinc-900/30 border-gray-250 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 hover:border-amber-500/50'
                        }`}
                      >
                        <div className="p-3 bg-amber-500/10 rounded-2xl"><Hash className="w-6 h-6" /></div>
                        <div>
                          <div className="font-bold text-sm">Pincode-wise Broadcast</div>
                          <div className="text-[10px] text-gray-400 mt-1">Target postal/pincode locations. Ideal for hyper-local businesses.</div>
                        </div>
                        <Badge className="bg-amber-500/10 text-amber-500 text-[9px] border-none mt-2">Hyperlocal</Badge>
                      </button>
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button 
                        onClick={() => setWizardStep(2)}
                        className="bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl"
                      >
                        Next: Configure Targets <ArrowRight className="w-4 h-4 ml-1.5" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 2: Configure Criteria */}
                {wizardStep === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                        {targetingType === 'GROUP' ? <Users className="w-5 h-5 text-amber-500" /> : 
                         targetingType === 'LOCATION' ? <MapPin className="w-5 h-5 text-amber-500" /> : 
                         <Hash className="w-5 h-5 text-amber-500" />}
                        2. Define Targeting Criteria
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                        Select which segments to push this broadcast campaign to.
                      </p>
                    </div>

                    {targetingType === 'GROUP' && (
                      <div className="space-y-4">
                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">Select Groups / Tolees</Label>
                        {myTolees.length === 0 ? (
                          <div className="p-6 text-center border border-dashed rounded-xl bg-gray-50 dark:bg-zinc-900/30">
                            <Info className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-xs text-gray-500 dark:text-zinc-400">You are not a member of any Tolee groups yet. Cannot send group shoots.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2">
                            {myTolees.map((tolee) => {
                              const selected = selectedGroups.includes(tolee.id);
                              return (
                                <button
                                  key={tolee.id}
                                  onClick={() => {
                                    if (selected) {
                                      setSelectedGroups(selectedGroups.filter(id => id !== tolee.id));
                                    } else {
                                      setSelectedGroups([...selectedGroups, tolee.id]);
                                    }
                                  }}
                                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                                    selected 
                                      ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                                      : 'bg-white dark:bg-zinc-900/30 border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800'
                                  }`}
                                >
                                  <div className="w-5 h-5 rounded border border-gray-300 dark:border-zinc-700 flex items-center justify-center bg-white dark:bg-zinc-950">
                                    {selected && <div className="w-3 h-3 bg-amber-500 rounded-sm" />}
                                  </div>
                                  <div>
                                    <div className="font-bold text-xs">{tolee.name}</div>
                                    <div className="text-[10px] text-gray-400">{tolee.membersCount || 0} members • {tolee.slug}</div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {targetingType === 'LOCATION' && (
                      <div className="space-y-3">
                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">Target Geographies (Comma separated)</Label>
                        <Input 
                          placeholder="e.g. Mumbai, Delhi, Kalyan, Maharashtra"
                          value={locationInput}
                          onChange={(e) => setLocationInput(e.target.value)}
                          className="h-11 bg-white dark:bg-zinc-950 rounded-xl"
                        />
                        <p className="text-[10px] text-gray-400 leading-relaxed">
                          Matches user profile addresses. Specify cities, states, areas, or countries. Multiple entries separated by commas are supported.
                        </p>
                      </div>
                    )}

                    {targetingType === 'PINCODE' && (
                      <div className="space-y-3">
                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">Target Postal Codes (Comma separated)</Label>
                        <Input 
                          placeholder="e.g. 400075, 421301"
                          value={pincodeInput}
                          onChange={(e) => setPincodeInput(e.target.value)}
                          className="h-11 bg-white dark:bg-zinc-950 rounded-xl"
                        />
                        <p className="text-[10px] text-gray-400 leading-relaxed">
                          Enter target pincodes. Excellent for hyper-localized campaigns, restaurants, and property promotions.
                        </p>
                      </div>
                    )}

                    {/* Reach Meter */}
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-xs text-gray-800 dark:text-white">Estimated Reach</div>
                        <div className="text-[10px] text-gray-500 dark:text-zinc-400">Approximate active users targeted</div>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-black text-amber-500">{audienceEstimate}</span>
                        <span className="text-[10px] text-gray-400 block">users matches</span>
                      </div>
                    </div>

                    <div className="flex justify-between pt-4">
                      <Button 
                        variant="outline"
                        onClick={() => setWizardStep(1)}
                        className="rounded-xl"
                      >
                        Back
                      </Button>
                      <Button 
                        onClick={() => {
                          if (targetingType === 'GROUP' && selectedGroups.length === 0) {
                            alert("Please select at least one target group.");
                            return;
                          }
                          if (targetingType === 'LOCATION' && !locationInput.trim()) {
                            alert("Please enter at least one location.");
                            return;
                          }
                          if (targetingType === 'PINCODE' && !pincodeInput.trim()) {
                            alert("Please enter at least one pincode.");
                            return;
                          }
                          setWizardStep(3);
                        }}
                        className="bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl"
                      >
                        Next: Add Message <ArrowRight className="w-4 h-4 ml-1.5" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 3: Message & Attachments */}
                {wizardStep === 3 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                        <Megaphone className="w-5 h-5 text-amber-500" /> 3. Compose Promotion / Message
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                        Write the text content and upload media or attach products/shops from your Tolee World.
                      </p>
                    </div>

                    {/* Message content */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">Broadcast Message Text</Label>
                      <textarea
                        rows={4}
                        placeholder="Write your campaign details, discount offer, announcement, etc..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full rounded-xl border border-gray-250 dark:border-zinc-800 bg-transparent p-3 text-xs outline-none focus:border-amber-500 dark:bg-zinc-950/60"
                      />
                    </div>

                    {/* Image / Banner Upload */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">Campaign Image / Banner (Optional)</Label>
                      <div className="flex gap-3">
                        <Input 
                          placeholder="Or paste image URL directly..."
                          value={mediaUrl}
                          onChange={(e) => setMediaUrl(e.target.value)}
                          className="h-11 bg-white dark:bg-zinc-950 rounded-xl"
                        />
                        <label className="flex items-center justify-center gap-2 h-11 px-4 border border-dashed border-gray-300 dark:border-zinc-700 hover:border-amber-500 rounded-xl cursor-pointer text-xs font-bold flex-shrink-0 bg-white dark:bg-zinc-950/40">
                          <Upload className="w-4 h-4 text-amber-500" />
                          <span>{uploadingImage ? 'Uploading...' : 'Upload Image'}</span>
                          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                        </label>
                      </div>
                      {mediaUrl && (
                        <div className="relative w-28 h-20 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden mt-1 group">
                          <img src={mediaUrl} className="w-full h-full object-cover" alt="Preview" />
                          <button 
                            onClick={() => setMediaUrl('')}
                            className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Tolee-first Attachments Integrations */}
                    <div className="space-y-4 pt-2">
                      <div className="border-t border-gray-150 dark:border-zinc-850 pt-4">
                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-amber-500" /> Attach a Tolee World Project / Offer
                        </Label>
                        <p className="text-[10px] text-gray-400 mt-1">
                          Make this campaign interactive by attaching your published restaurant, store, blog, or micro website.
                        </p>
                      </div>

                      {myProjects.length === 0 ? (
                        <div className="text-center py-4 border border-dashed rounded-xl bg-gray-50 dark:bg-zinc-900/30">
                          <span className="text-[10px] text-gray-400">You don't have any published Tolee World projects yet.</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-[160px] overflow-y-auto pr-1">
                          {myProjects.map((p) => {
                            const isAttached = contentId === p.id;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => handleAttachProject(p)}
                                className={`p-2.5 rounded-xl border text-left transition-all ${
                                  isAttached 
                                    ? 'bg-amber-500/15 border-amber-500 text-amber-500 font-bold'
                                    : 'bg-white dark:bg-zinc-950/60 border-gray-200 dark:border-zinc-850 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800'
                                }`}
                              >
                                <div className="text-[10px] font-extrabold truncate">{p.name}</div>
                                <div className="text-[8px] text-gray-400 uppercase mt-0.5">{p.type}</div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Manual Attachment Mode */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold text-gray-400 uppercase">Attachment Entity Type</Label>
                          <select 
                            value={contentType} 
                            onChange={(e) => setContentType(e.target.value as any)}
                            className="w-full h-11 border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xl px-3 text-xs outline-none text-gray-800 dark:text-white"
                          >
                            <option value="TEXT">Text Only (No Entity card)</option>
                            <option value="STORE">Store Front / Shop</option>
                            <option value="PRODUCT">E-Commerce Product</option>
                            <option value="RESTAURANT">Restaurant / Menu</option>
                            <option value="BLOG">News Blog Post</option>
                            <option value="MARKETPLACE">Marketplace Item</option>
                            <option value="REEL">Reel / Feed Post</option>
                          </select>
                        </div>

                        {contentType !== 'TEXT' && (
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-gray-400 uppercase">Attached Entity ID or Slug</Label>
                            <Input 
                              placeholder="e.g. project-slug or entity-id"
                              value={contentId}
                              onChange={(e) => setContentId(e.target.value)}
                              className="h-11 bg-white dark:bg-zinc-950 rounded-xl"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between pt-4 border-t border-gray-100 dark:border-zinc-850">
                      <Button 
                        variant="outline"
                        onClick={() => setWizardStep(2)}
                        className="rounded-xl"
                      >
                        Back
                      </Button>
                      <Button 
                        onClick={() => {
                          if (!content.trim()) {
                            alert("Broadcast message text is required.");
                            return;
                          }
                          setWizardStep(4);
                        }}
                        className="bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl"
                      >
                        Next: Preview & Moderation <ArrowRight className="w-4 h-4 ml-1.5" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 4: Preview & AI Content Check */}
                {wizardStep === 4 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-amber-500" /> 4. AI Spam Moderation & Trust Check
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                        Our anti-abuse system verifies broadcast content before transmission to protect recipients from spam.
                      </p>
                    </div>

                    {/* Warnings/Checks */}
                    <div className="space-y-3">
                      {spamCheckMessage ? (
                        <div className="p-4 bg-red-500/10 border border-red-500/35 rounded-2xl flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold text-xs text-red-500">Spam Check Flagged</div>
                            <p className="text-[10px] text-red-400 mt-0.5 leading-relaxed">{spamCheckMessage}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/35 rounded-2xl flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold text-xs text-emerald-500">AI Trust Check Passed</div>
                            <p className="text-[10px] text-emerald-400 mt-0.5 leading-relaxed">
                              No suspicious keywords or scam indicators detected. Your broadcast meets community trust metrics.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Daily Quota Limit Details */}
                      <div className="p-4 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-2xl flex justify-between items-center">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
                          <div>
                            <div className="font-bold text-xs text-gray-800 dark:text-white">Daily Campaign Limit</div>
                            <div className="text-[9px] text-gray-400 mt-0.5">Campaign limit reset every midnight.</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-xs text-gray-800 dark:text-white">
                            {analytics?.shootsToday || 0} / {analytics?.dailyLimit || 2} Sent Today
                          </div>
                          <div className="text-[9px] text-amber-500 font-extrabold uppercase mt-0.5">
                            {((analytics?.dailyLimit || 2) - (analytics?.shootsToday || 0))} Remaining
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Preview visual notice */}
                    <div className="pt-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">Live Mock Preview</Label>
                      <p className="text-[10px] text-gray-400 mb-2">Check the simulator preview in the sidebar. Once satisfied, click next.</p>
                    </div>

                    <div className="flex justify-between pt-4 border-t border-gray-100 dark:border-zinc-850">
                      <Button 
                        variant="outline"
                        onClick={() => setWizardStep(3)}
                        className="rounded-xl"
                      >
                        Back
                      </Button>
                      <Button 
                        onClick={() => setWizardStep(5)}
                        className="bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl"
                      >
                        Next: Confirm Launch <ArrowRight className="w-4 h-4 ml-1.5" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 5: Confirm & Send */}
                {wizardStep === 5 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                        <Send className="w-5 h-5 text-amber-500" /> 5. Confirm & Send Broadcast
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                        Double-check details before launching the community broadcast. Action cannot be undone.
                      </p>
                    </div>

                    <div className="p-5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-850 rounded-2xl space-y-3 text-xs">
                      <div className="flex justify-between pb-2.5 border-b border-gray-200 dark:border-zinc-850">
                        <span className="text-gray-400">Target Type:</span>
                        <Badge variant="outline" className="text-[10px] capitalize bg-white dark:bg-zinc-900 font-bold">{targetingType.toLowerCase()}</Badge>
                      </div>

                      <div className="flex justify-between pb-2.5 border-b border-gray-200 dark:border-zinc-850">
                        <span className="text-gray-400">Target Match Reach:</span>
                        <span className="font-extrabold text-amber-500">{audienceEstimate} users</span>
                      </div>

                      <div className="flex justify-between pb-2.5 border-b border-gray-200 dark:border-zinc-850">
                        <span className="text-gray-400">Attachment:</span>
                        <span className="font-medium text-gray-700 dark:text-zinc-300">
                          {contentType === 'TEXT' ? 'None (Text Only)' : `${contentType}: ${contentId}`}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-gray-400">Media Image:</span>
                        <span className="truncate max-w-[200px] text-gray-400 font-mono text-[10px]">
                          {mediaUrl ? mediaUrl : 'None'}
                        </span>
                      </div>
                    </div>

                    {/* Opt-out & Mute Disclaimer */}
                    <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex items-start gap-3 text-xs text-gray-500 dark:text-zinc-400">
                      <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-[10px] leading-relaxed">
                        To maintain inbox quality, users who opt out of promotional broadcasts or who have muted you will automatically be bypassed. Target estimate is adjusted for user preferences.
                      </p>
                    </div>

                    <div className="flex justify-between pt-4 border-t border-gray-100 dark:border-zinc-850">
                      <Button 
                        variant="outline"
                        onClick={() => setWizardStep(4)}
                        className="rounded-xl"
                      >
                        Back
                      </Button>
                      <Button 
                        onClick={handleShoot}
                        disabled={submitting}
                        className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl shadow-lg shadow-amber-500/10 flex items-center gap-2 h-11 px-6 font-bold"
                      >
                        <Send className="w-4 h-4" /> 
                        <span>{submitting ? 'Shooting...' : 'Shoot Now!'}</span>
                      </Button>
                    </div>
                  </div>
                )}

              </Card>
            </div>

            {/* Visual Preview Simulator (Col 3) */}
            <div className="lg:col-span-1">
              <div className="sticky top-28 space-y-4">
                <h3 className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider px-1">Receiver Chat Simulator</h3>
                
                <Card className="bg-[#efebd8] dark:bg-[#0b141a] border border-[#d1d7db] dark:border-zinc-800 rounded-3xl overflow-hidden shadow-md min-h-[400px] flex flex-col justify-between">
                  {/* Mock Simulator Header */}
                  <div className="bg-[#f0f2f5] dark:bg-[#1f2c34] border-b border-[#e9edef] dark:border-zinc-800/80 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                        {session?.user?.name ? session.user.name[0].toUpperCase() : 'T'}
                      </div>
                      <div>
                        <div className="font-extrabold text-[12px] text-gray-900 dark:text-white leading-tight">
                          {session?.user?.name || 'My Tolee Brand'}
                        </div>
                        <div className="text-[9px] text-gray-400">Promotions & Shoots</div>
                      </div>
                    </div>
                    <Badge className="bg-amber-500/10 text-amber-500 text-[8px] font-bold border-none">Preview</Badge>
                  </div>

                  {/* Simulator Body */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[url('/chat-bg-light.png')] dark:bg-[url('/chat-bg-dark.png')] bg-repeat bg-contain">
                    
                    {/* promotional tag notice */}
                    <div className="w-full flex justify-center">
                      <div className="bg-[#ffe8cc] dark:bg-amber-950/30 border border-amber-500/20 text-[#a35200] dark:text-amber-300 rounded-lg px-2.5 py-1 text-[9px] font-bold text-center flex items-center gap-1 shadow-sm">
                        <Megaphone className="w-3 h-3 flex-shrink-0 text-amber-500" />
                        <span>Promotional Broadcast • Sent via Tolee Shoot</span>
                      </div>
                    </div>

                    {/* Chat Bubble representation */}
                    <div className="w-full flex justify-start">
                      <div className="max-w-[85%] bg-white dark:bg-[#202c33] border border-amber-500/30 rounded-2xl rounded-tl-sm p-3.5 shadow-md relative group hover:border-amber-500 transition-all duration-300">
                        <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-60">
                          <Badge className="text-[8px] font-bold bg-amber-500/10 text-amber-500 border-none px-1 rounded-sm">Shoot</Badge>
                        </div>
                        
                        <div className="text-[10px] text-gray-400 font-bold mb-1.5 flex items-center gap-1">
                          <span>{session?.user?.name || 'Tolee Creator'}</span>
                          <span className="text-[8px] font-normal">• {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>

                        {/* image content */}
                        {mediaUrl && (
                          <div className="w-full h-32 rounded-xl overflow-hidden mb-2.5 bg-gray-50 border border-gray-100 dark:border-zinc-800">
                            <img src={mediaUrl} className="w-full h-full object-cover" alt="Campaign Banner" />
                          </div>
                        )}

                        {/* text content */}
                        <p className="text-[11px] text-gray-800 dark:text-zinc-250 leading-relaxed whitespace-pre-wrap font-medium">
                          {content || "Your campaign message will render here as the user's direct chat bubble. Start typing in step 3 to populate this mockup simulator."}
                        </p>

                        {/* attachment entity card */}
                        {contentType !== 'TEXT' && (
                          <div className="mt-3 p-3 bg-amber-500/5 dark:bg-amber-950/15 border border-amber-500/20 rounded-xl hover:bg-amber-500/10 transition-colors flex items-center justify-between gap-3">
                            <div className="truncate">
                              <span className="text-[8px] font-extrabold text-amber-500 uppercase tracking-widest block mb-0.5">ATTACHED {contentType}</span>
                              <span className="text-[10px] font-bold text-gray-850 dark:text-white truncate block">
                                {contentId || 'No entity attached yet'}
                              </span>
                              <span className="text-[8px] text-gray-400 block mt-0.5">Click to open & shop</span>
                            </div>
                            <div className="p-2 bg-amber-500 text-black rounded-lg flex-shrink-0">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Simulator Footer Controls (Sender controls mock) */}
                  <div className="bg-[#f0f2f5] dark:bg-[#1f2c34] px-4 py-3 border-t border-[#e9edef] dark:border-zinc-800/80">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-gray-400">Receiver controls available in header</span>
                      <div className="flex gap-1.5">
                        <Badge variant="outline" className="text-[8px] bg-red-500/5 text-red-500 border-none font-bold">Report Spam</Badge>
                        <Badge variant="outline" className="text-[8px] bg-gray-500/5 text-gray-400 border-none font-bold">Mute</Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
