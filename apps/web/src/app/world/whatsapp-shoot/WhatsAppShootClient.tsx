'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  MessageCircle, 
  Sparkles, 
  Copy, 
  Check, 
  Send, 
  Zap, 
  ChevronLeft,
  ArrowRight,
  UploadCloud,
  CheckCircle2,
  Users,
  Paperclip,
  Trash2,
  Play,
  Pause,
  RefreshCw,
  Clock,
  Download,
  PlusCircle,
  FileText,
  Film,
  X,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Image as ImageIcon
} from 'lucide-react';
import { 
  generateWhatsAppShootMessage, 
  saveWhatsAppCampaign, 
  getUserWhatsAppCampaigns, 
  updateWhatsAppContactStatus, 
  deleteWhatsAppCampaign,
  WhatsAppContact,
  WhatsAppCampaignItem
} from '@/actions/whatsappShoot';

// Native WhatsApp SVG Icon
const WhatsAppIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24M8.53 7.33c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.02.4 1.38.52.58.18 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.47-.28s-1.44-.71-1.66-.82c-.22-.11-.38-.16-.54.11s-.62.82-.76.99c-.14.17-.28.19-.53.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.41-.55-.42z" />
  </svg>
);

export default function WhatsAppShootClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  // Tab View
  const [viewTab, setViewTab] = useState<'BUILDER' | 'CAMPAIGNS'>('BUILDER');

  // Campaign States
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [campaignTitle, setCampaignTitle] = useState('My WhatsApp Campaign');
  const [defaultCountryCode, setDefaultCountryCode] = useState('+91');
  const [rawContactsInput, setRawContactsInput] = useState(
    "9876543210, Rahul Sharma, 20% Special Discount\n9123456780, Priya Patel, Exclusive VIP Pass\n9988776655, Amit Verma, Early Bird Access"
  );
  const [parsedContacts, setParsedContacts] = useState<WhatsAppContact[]>([]);

  // Message & AI States
  const [messageTemplate, setMessageTemplate] = useState(
    "Hey *{{name}}*! 👋\n\nWe have an exclusive update for you: *{{note}}*.\n\nCheck it out here: https://tolee.in\n\nLet us know if you have any questions! 🚀"
  );
  const [topicPrompt, setTopicPrompt] = useState('Festive 30% discount on all premium plans for early adopters');
  const [tone, setTone] = useState<'promotional' | 'formal' | 'festive' | 'followup' | 'networking' | 'reminder'>('promotional');
  const [businessName, setBusinessName] = useState('Tolee Team');
  const [loadingAI, setLoadingAI] = useState(false);

  // Media Attachment State
  const [mediaFile, setMediaFile] = useState<{
    url: string;
    type: 'image' | 'video' | 'document';
    name?: string;
  } | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Live Preview Contact Index
  const [previewContactIdx, setPreviewContactIdx] = useState(0);

  // Auto-Shooter States
  const [autoShootRunning, setAutoShootRunning] = useState(false);
  const [shootDelaySec, setShootDelaySec] = useState(6);
  const [currentShootingIdx, setCurrentShootingIdx] = useState(0);

  // History & Toast
  const [campaignsList, setCampaignsList] = useState<WhatsAppCampaignItem[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Strict Auth Guard
  useEffect(() => {
    if (mounted && status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=' + encodeURIComponent('/world/whatsapp-shoot'));
    }
  }, [mounted, status, router]);

  // Load Saved Campaigns
  useEffect(() => {
    if (mounted && status === 'authenticated') {
      loadCampaigns();
    }
  }, [mounted, status]);

  // Real-Time Contact Parser
  useEffect(() => {
    parseContactsFromRaw(rawContactsInput, defaultCountryCode);
  }, [rawContactsInput, defaultCountryCode]);

  const loadCampaigns = async () => {
    const res = await getUserWhatsAppCampaigns();
    if (res.success && res.campaigns) {
      setCampaignsList(res.campaigns);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Contact Parsing & Sanitizing
  const parseContactsFromRaw = (text: string, cCode: string) => {
    if (!text.trim()) {
      setParsedContacts([]);
      return;
    }

    const lines = text.split('\n');
    const cleaned: WhatsAppContact[] = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Match comma or tab separated fields: phone, name, note
      const parts = trimmed.split(/[,;\t]/).map((p) => p.trim());
      let rawPhone = parts[0] || '';
      const name = parts[1] || 'Friend';
      const customVar = parts[2] || 'Special Offer';

      // Clean phone number: remove spaces, dashes, parentheses
      let cleanDigits = rawPhone.replace(/[^\d+]/g, '');

      if (!cleanDigits) return;

      // Prefix country code if missing
      if (!cleanDigits.startsWith('+')) {
        const cleanCode = cCode.replace('+', '');
        if (!cleanDigits.startsWith(cleanCode)) {
          cleanDigits = `${cCode}${cleanDigits}`;
        } else {
          cleanDigits = `+${cleanDigits}`;
        }
      }

      cleaned.push({
        id: `contact_${idx}_${Date.now()}`,
        phone: cleanDigits,
        name,
        customVar,
        status: 'PENDING',
      });
    });

    setParsedContacts(cleaned);
  };

  // CSV File Uploader
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawContactsInput(content);
        showToast('📁 Contacts imported from CSV successfully!');
      }
    };
    reader.readAsText(file);
  };

  // Media Attachment Upload
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';

    if (!isImage && !isVideo && !isPdf) {
      showToast('⚠️ Please upload an image (JPG/PNG), video (MP4), or PDF catalog.');
      return;
    }

    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast(`⚠️ File size exceeds ${isVideo ? '50MB' : '10MB'} limit.`);
      return;
    }

    setUploadingMedia(true);
    showToast(`📤 Uploading ${isVideo ? 'video' : isPdf ? 'document' : 'image'} to media cloud...`);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.url) {
        setMediaFile({
          url: data.url,
          type: isVideo ? 'video' : isPdf ? 'document' : 'image',
          name: file.name,
        });
        showToast(`🎉 Media attached successfully!`);
      } else {
        showToast('❌ ' + (data.error || 'Failed to upload media.'));
      }
    } catch (err: any) {
      showToast('❌ Upload failed: ' + err.message);
    } finally {
      setUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // AI Message Generator
  const handleGenerateCopy = async () => {
    if (!topicPrompt.trim()) {
      showToast('⚠️ Please enter a topic or offer description.');
      return;
    }

    setLoadingAI(true);
    showToast('🚀 AI is writing high-converting WhatsApp broadcast copy...');

    const res = await generateWhatsAppShootMessage({
      topicOrOffer: topicPrompt,
      tone,
      businessName,
    });

    if (res.success && res.message) {
      setMessageTemplate(res.message);
      showToast('✨ High-converting WhatsApp message generated!');
    } else {
      showToast('❌ ' + (res.error || 'Failed to generate copy.'));
    }
    setLoadingAI(false);
  };

  // Replace dynamic tags for a given contact
  const formatMessageForContact = (contact?: WhatsAppContact) => {
    if (!contact) return messageTemplate;
    let formatted = messageTemplate;
    formatted = formatted.replace(/\{\{name\}\}/gi, contact.name || 'Friend');
    formatted = formatted.replace(/\{\{phone\}\}/gi, contact.phone || '');
    formatted = formatted.replace(/\{\{note\}\}/gi, contact.customVar || '');
    formatted = formatted.replace(/\{\{company\}\}/gi, businessName || 'Our Team');
    return formatted;
  };

  // 1-Click Shoot Single Contact (Opens WhatsApp Web / App)
  const handleShootContact = (contact: WhatsAppContact, idx: number) => {
    const textToSend = formatMessageForContact(contact);
    const sanitizedDigits = contact.phone.replace(/[^\d]/g, '');
    const waUrl = `https://api.whatsapp.com/send?phone=${sanitizedDigits}&text=${encodeURIComponent(textToSend)}`;

    // Mark as SENT
    setParsedContacts((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, status: 'SENT' } : c))
    );

    // Open WhatsApp Web in new tab
    if (typeof window !== 'undefined') {
      window.open(waUrl, '_blank');
    }

    showToast(`🚀 Dispatched WhatsApp to ${contact.name || contact.phone}!`);
  };

  // Auto-Sequence Shooter
  const handleStartAutoShoot = () => {
    const pendingIdx = parsedContacts.findIndex((c) => c.status === 'PENDING');
    if (pendingIdx === -1) {
      showToast('🎉 All contacts have already been dispatched!');
      return;
    }

    setAutoShootRunning(true);
    setCurrentShootingIdx(pendingIdx);
    showToast(`▶️ Auto-Shooter started! Sending Contact #${pendingIdx + 1}...`);
    handleShootContact(parsedContacts[pendingIdx], pendingIdx);
  };

  // Auto-advancement effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (autoShootRunning) {
      timer = setTimeout(() => {
        const nextPending = parsedContacts.findIndex((c, i) => i > currentShootingIdx && c.status === 'PENDING');
        if (nextPending !== -1) {
          setCurrentShootingIdx(nextPending);
          handleShootContact(parsedContacts[nextPending], nextPending);
        } else {
          setAutoShootRunning(false);
          showToast('🏆 Auto-Shoot Complete! All pending contacts dispatched.');
        }
      }, shootDelaySec * 1000);
    }
    return () => clearTimeout(timer);
  }, [autoShootRunning, currentShootingIdx, parsedContacts, shootDelaySec]);

  // Save Campaign to Database
  const handleSaveCampaign = async () => {
    if (parsedContacts.length === 0) {
      showToast('⚠️ Please add at least one contact.');
      return;
    }

    showToast('💾 Saving WhatsApp Shoot Campaign...');
    const res = await saveWhatsAppCampaign({
      id: campaignId || undefined,
      title: campaignTitle || 'WhatsApp Campaign',
      messageTemplate,
      mediaUrl: mediaFile?.url || null,
      mediaType: mediaFile?.type || null,
      contactsData: parsedContacts,
    });

    if (res.success && res.campaign) {
      setCampaignId(res.campaign.id);
      loadCampaigns();
      showToast('🎉 Campaign successfully saved in database!');
    } else {
      showToast('❌ ' + (res.error || 'Failed to save campaign.'));
    }
  };

  // Export Campaign Report
  const handleExportCSV = () => {
    if (parsedContacts.length === 0) {
      showToast('⚠️ No contacts to export.');
      return;
    }

    const header = 'Phone,Name,CustomVar,Status\n';
    const rows = parsedContacts.map((c) => `"${c.phone}","${c.name || ''}","${c.customVar || ''}","${c.status}"`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whatsapp_shoot_${Date.now()}.csv`;
    a.click();
    showToast('📥 Campaign report downloaded!');
  };

  if (!mounted || status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#070b13] text-gray-200 p-6 flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-t-emerald-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-400 text-sm font-medium animate-pulse">
          {status === 'unauthenticated' ? 'Authentication required. Redirecting to login...' : 'Loading WhatsApp Shoot Studio...'}
        </p>
      </div>
    );
  }

  const sentCount = parsedContacts.filter((c) => c.status === 'SENT').length;
  const totalCount = parsedContacts.length;
  const progressPercent = totalCount > 0 ? Math.round((sentCount / totalCount) * 100) : 0;
  const currentPreviewContact = parsedContacts[previewContactIdx] || parsedContacts[0];

  return (
    <div className="min-h-screen bg-[#070b13] text-[#e2e8f0] font-sans pb-28 pt-20 px-3 sm:px-6 lg:px-10 selection:bg-emerald-500/30 selection:text-emerald-200">
      
      {/* Hidden File Inputs */}
      <input type="file" ref={fileInputRef} onChange={handleMediaUpload} accept="image/*,video/*,application/pdf" className="hidden" />
      <input type="file" ref={csvInputRef} onChange={handleCSVUpload} accept=".csv,.txt" className="hidden" />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0e2a22] text-emerald-200 border border-emerald-500/40 px-5 py-3 rounded-xl shadow-2xl backdrop-blur-md animate-bounce text-sm font-semibold flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        
        {/* Header Navigation & View Switcher */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-[#141e33]">
          <div className="flex items-center gap-4">
            <Link 
              href="/world" 
              className="p-2.5 rounded-xl bg-[#0b1220] border border-[#182842] hover:border-emerald-500/50 hover:text-emerald-400 transition-all text-gray-400"
              title="Back to Tolee World"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>

            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                  <WhatsAppIcon className="w-5 h-5" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  WhatsApp Shoot
                </h1>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/50 uppercase tracking-wider">
                  OPEN-WA ENGINE 🚀
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                AI personalized bulk WhatsApp marketing & campaign runner with zero-ban sequence shooter.
              </p>
            </div>
          </div>

          {/* View Tab Toggle */}
          <div className="flex items-center gap-2 bg-[#0b1220] border border-[#182842] p-1.5 rounded-2xl">
            <button
              onClick={() => setViewTab('BUILDER')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewTab === 'BUILDER'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>🎯 Campaign Builder</span>
            </button>
            <button
              onClick={() => setViewTab('CAMPAIGNS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewTab === 'CAMPAIGNS'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>📊 Saved Campaigns ({campaignsList.length})</span>
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            TAB 1: CAMPAIGN BUILDER & SEQUENCE SHOOTER
        ════════════════════════════════════════════════════════════ */}
        {viewTab === 'BUILDER' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* ═════════════════════════════════════════════════════════
                LEFT COLUMN: CONTACTS & AI MESSAGE STUDIO (5 COLS)
            ══════════════════════════════════════════════════════════ */}
            <div className="lg:col-span-5 space-y-6">

              {/* CARD 1: CONTACTS MANAGER */}
              <div className="bg-[#0b1220] border border-[#182842] rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    Target Contacts ({parsedContacts.length})
                  </label>
                  <button
                    onClick={() => csvInputRef.current?.click()}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-1 rounded-lg"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Upload CSV</span>
                  </button>
                </div>

                {/* Country Code & Fast Preset */}
                <div className="flex items-center gap-2">
                  <div className="w-36 shrink-0">
                    <label className="text-[10px] font-semibold text-gray-400 block mb-1">Country Code:</label>
                    <select
                      value={defaultCountryCode}
                      onChange={(e) => setDefaultCountryCode(e.target.value)}
                      className="w-full bg-[#070b13] border border-[#1a2b47] focus:border-emerald-500 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="+91">🇮🇳 India (+91)</option>
                      <option value="+1">🇺🇸 US / CA (+1)</option>
                      <option value="+44">🇬🇧 UK (+44)</option>
                      <option value="+971">🇦🇪 UAE (+971)</option>
                      <option value="+61">🇦🇺 Australia (+61)</option>
                      <option value="+65">🇸🇬 Singapore (+65)</option>
                    </select>
                  </div>

                  <div className="flex-1">
                    <label className="text-[10px] font-semibold text-gray-400 block mb-1">Campaign Name:</label>
                    <input
                      type="text"
                      value={campaignTitle}
                      onChange={(e) => setCampaignTitle(e.target.value)}
                      placeholder="e.g. VIP Product Launch"
                      className="w-full bg-[#070b13] border border-[#1a2b47] focus:border-emerald-500 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Bulk Textarea */}
                <div>
                  <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                    <span>Format: <code className="text-emerald-400 font-mono">phone, name, custom_note</code></span>
                    <span>1 contact per line</span>
                  </div>
                  <textarea
                    value={rawContactsInput}
                    onChange={(e) => setRawContactsInput(e.target.value)}
                    rows={4}
                    placeholder="9876543210, Rahul, 20% Off"
                    className="w-full bg-[#070b13] border border-[#1a2b47] focus:border-emerald-500/80 rounded-xl p-3 text-xs text-gray-200 font-mono placeholder-gray-600 focus:outline-none resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* CARD 2: AI MESSAGE STUDIO & MEDIA */}
              <div className="bg-[#0b1220] border border-[#182842] rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    AI WhatsApp Copywriter
                  </label>
                  <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/60 uppercase">
                    SMART TAGS 🔥
                  </span>
                </div>

                {/* Topic input */}
                <div>
                  <input
                    type="text"
                    value={topicPrompt}
                    onChange={(e) => setTopicPrompt(e.target.value)}
                    placeholder="Describe your offer, campaign, or message goal..."
                    className="w-full bg-[#070b13] border border-[#1a2b47] focus:border-emerald-500 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none"
                  />
                </div>

                {/* Tone Presets */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'promotional', label: '🔥 Offer / Promo' },
                    { id: 'formal', label: '💼 Formal B2B' },
                    { id: 'festive', label: '🎉 Festive Greeting' },
                    { id: 'followup', label: '📞 Client Follow-up' },
                    { id: 'networking', label: '🤝 Networking' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTone(t.id as any)}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-md border transition-all ${
                        tone === t.id
                          ? 'bg-emerald-950 border-emerald-500 text-emerald-200'
                          : 'bg-[#070b13] border-[#182842] text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* AI Generate Button */}
                <button
                  onClick={handleGenerateCopy}
                  disabled={loadingAI}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
                >
                  {loadingAI ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Generating AI Copy...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 fill-white" />
                      <span>Generate Personalized Copy</span>
                    </>
                  )}
                </button>

                {/* Message Template Editor */}
                <div className="space-y-1.5 pt-2 border-t border-[#141e33]">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-300">Message Template:</label>
                    {/* Smart Tag Chips */}
                    <div className="flex items-center gap-1">
                      {['{{name}}', '{{company}}', '{{note}}'].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setMessageTemplate((prev) => prev + ` ${tag} `)}
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900"
                          title="Click to insert tag"
                        >
                          +{tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    value={messageTemplate}
                    onChange={(e) => setMessageTemplate(e.target.value)}
                    rows={6}
                    className="w-full bg-[#070b13] border border-[#1a2b47] focus:border-emerald-500 rounded-xl p-3 text-xs text-gray-100 placeholder-gray-600 focus:outline-none resize-y leading-relaxed font-sans"
                  />
                </div>

                {/* Media Attachment Upload */}
                <div className="space-y-2 pt-2 border-t border-[#141e33]">
                  <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-emerald-400" />
                    Attach Media (Flyer / Image / Video / PDF):
                  </label>

                  {!mediaFile ? (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingMedia}
                      className="w-full border-2 border-dashed border-[#1e3354] hover:border-emerald-500/70 bg-[#070e1b] rounded-xl p-3 flex items-center justify-center gap-2.5 text-gray-400 hover:text-emerald-300 transition-all cursor-pointer"
                    >
                      {uploadingMedia ? (
                        <>
                          <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-xs font-semibold text-emerald-300">Uploading Media...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs font-bold text-gray-200">Upload Image, Video or PDF Flyer</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="bg-[#070e1b] border border-emerald-800/40 rounded-xl p-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {mediaFile.type === 'video' ? (
                          <Film className="w-5 h-5 text-pink-400 shrink-0" />
                        ) : mediaFile.type === 'document' ? (
                          <FileText className="w-5 h-5 text-amber-400 shrink-0" />
                        ) : (
                          <img src={mediaFile.url} alt="Media" className="w-8 h-8 rounded object-cover shrink-0" />
                        )}
                        <span className="text-xs text-white font-semibold truncate">{mediaFile.name || 'Attached Media'}</span>
                      </div>
                      <button onClick={() => setMediaFile(null)} className="text-rose-400 hover:text-rose-300 p-1">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Save Campaign Button */}
                <button
                  onClick={handleSaveCampaign}
                  className="w-full py-2.5 rounded-xl bg-[#0e1b30] border border-emerald-800/50 hover:border-emerald-500 text-emerald-300 font-extrabold text-xs flex items-center justify-center gap-2 transition-all hover:bg-emerald-950/40"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Save Campaign Progress</span>
                </button>
              </div>

            </div>

            {/* ═════════════════════════════════════════════════════════
                RIGHT COLUMN: LIVE CHAT PREVIEW & SEQUENCE SHOOTER (7 COLS)
            ══════════════════════════════════════════════════════════ */}
            <div className="lg:col-span-7 space-y-6">

              {/* CARD 3: LIVE WHATSAPP CHAT PREVIEW */}
              <div className="bg-[#0b1220] border border-[#182842] rounded-2xl p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-gray-300 flex items-center gap-2">
                    <WhatsAppIcon className="w-4 h-4 text-emerald-400" />
                    Live Personalized WhatsApp Chat Preview
                  </span>

                  {/* Recipient switcher */}
                  {parsedContacts.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-400">Previewing Contact:</span>
                      <select
                        value={previewContactIdx}
                        onChange={(e) => setPreviewContactIdx(Number(e.target.value))}
                        className="bg-[#070b13] border border-[#1a2b47] rounded px-2 py-1 text-[11px] text-emerald-300 focus:outline-none"
                      >
                        {parsedContacts.slice(0, 10).map((c, i) => (
                          <option key={i} value={i}>
                            #{i + 1} {c.name} ({c.phone})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* WhatsApp Chat Bubble Mockup */}
                <div className="bg-[#0b141a] border border-emerald-950 rounded-2xl p-4 shadow-inner max-w-lg mx-auto">
                  {/* WhatsApp Chat Header */}
                  <div className="flex items-center gap-3 pb-3 border-b border-gray-800/80 mb-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-700 flex items-center justify-center text-white font-bold text-xs">
                      {currentPreviewContact?.name ? currentPreviewContact.name.charAt(0).toUpperCase() : 'W'}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        {currentPreviewContact?.name || 'Contact Name'}
                      </h4>
                      <p className="text-[10px] text-emerald-400 font-mono">
                        {currentPreviewContact?.phone || defaultCountryCode}
                      </p>
                    </div>
                  </div>

                  {/* Bubble Message */}
                  <div className="bg-[#005c4b] text-emerald-50 rounded-2xl rounded-tr-none p-3.5 shadow-md space-y-2 ml-auto max-w-md">
                    {/* Media in bubble if attached */}
                    {mediaFile && (
                      <div className="rounded-lg overflow-hidden border border-emerald-800/60 bg-black">
                        {mediaFile.type === 'video' ? (
                          <video src={mediaFile.url} controls className="w-full max-h-48 object-cover" />
                        ) : mediaFile.type === 'document' ? (
                          <div className="p-3 bg-emerald-900/60 flex items-center gap-2 text-white">
                            <FileText className="w-6 h-6 text-amber-300" />
                            <span className="text-xs font-semibold">{mediaFile.name || 'Flyer.pdf'}</span>
                          </div>
                        ) : (
                          <img src={mediaFile.url} alt="Flyer" className="w-full max-h-48 object-cover" />
                        )}
                      </div>
                    )}

                    <div className="text-xs whitespace-pre-line leading-relaxed font-sans">
                      {formatMessageForContact(currentPreviewContact)}
                    </div>
                    <div className="text-[9px] text-emerald-300/80 text-right mt-1 flex items-center justify-end gap-1">
                      <span>10:45 AM</span>
                      <span>✓✓</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 4: ZERO-BAN SEQUENCE SHOOTER */}
              <div className="bg-[#0b1220] border border-[#182842] rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#141e33]">
                  <div>
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-emerald-400" />
                      Sequence Shooter ({sentCount}/{totalCount} Dispatched)
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      1-Click direct dispatch via WhatsApp Web with anti-spam safe delay.
                    </p>
                  </div>

                  {/* Auto-Shooter Delay & Trigger */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-[#070b13] border border-[#1a2b47] px-2.5 py-1.5 rounded-lg text-xs">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <select
                        value={shootDelaySec}
                        onChange={(e) => setShootDelaySec(Number(e.target.value))}
                        className="bg-transparent text-white text-xs focus:outline-none"
                      >
                        <option value={4}>4s delay</option>
                        <option value={6}>6s delay (Safe)</option>
                        <option value={10}>10s delay (Ultra-Safe)</option>
                        <option value={15}>15s delay</option>
                      </select>
                    </div>

                    <button
                      onClick={autoShootRunning ? () => setAutoShootRunning(false) : handleStartAutoShoot}
                      className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-lg ${
                        autoShootRunning
                          ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/25'
                      }`}
                    >
                      {autoShootRunning ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          <span>Pause Auto-Shoot</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>Start Auto-Shoot Sequence</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-gray-300">Campaign Dispatch Progress</span>
                    <span className="text-emerald-400">{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-[#070b13] h-2.5 rounded-full overflow-hidden border border-gray-800">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Contacts Queue Table */}
                <div className="overflow-x-auto max-h-72 overflow-y-auto border border-[#182842] rounded-xl bg-[#070b13]">
                  <table className="w-full text-left text-xs text-gray-300">
                    <thead className="bg-[#0b1424] text-gray-400 uppercase text-[10px] font-bold sticky top-0 border-b border-gray-800">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">Recipient</th>
                        <th className="p-3">Phone</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60 font-sans">
                      {parsedContacts.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-gray-500 text-xs">
                            No contacts added yet. Enter numbers on the left.
                          </td>
                        </tr>
                      ) : (
                        parsedContacts.map((contact, idx) => {
                          const isSent = contact.status === 'SENT';
                          const isCurrent = currentShootingIdx === idx && autoShootRunning;

                          return (
                            <tr
                              key={contact.id || idx}
                              className={`hover:bg-[#0e1b30] transition-colors ${
                                isCurrent ? 'bg-emerald-950/40 border-l-4 border-emerald-400' : ''
                              }`}
                            >
                              <td className="p-3 font-mono text-gray-500">{idx + 1}</td>
                              <td className="p-3 font-bold text-white">{contact.name || 'Friend'}</td>
                              <td className="p-3 font-mono text-emerald-400/90">{contact.phone}</td>
                              <td className="p-3">
                                {isSent ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                                    SENT ✓
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-900 text-gray-400 border border-gray-800">
                                    PENDING
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => handleShootContact(contact, idx)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ml-auto ${
                                    isSent
                                      ? 'bg-[#0e1b30] text-gray-400 hover:text-white border border-gray-800'
                                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                                  }`}
                                >
                                  <Send className="w-3 h-3" />
                                  <span>{isSent ? 'Re-Shoot' : 'Shoot'}</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Controls */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={handleExportCSV}
                    className="text-xs text-gray-400 hover:text-white font-semibold flex items-center gap-1.5 p-2 rounded-lg bg-[#070b13] border border-gray-800 hover:border-gray-600 transition-all"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Download Report (CSV)</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-500 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Zero-Ban 1-Click Protocol
                    </span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            TAB 2: SAVED CAMPAIGNS & HISTORY
        ════════════════════════════════════════════════════════════ */}
        {viewTab === 'CAMPAIGNS' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-400" />
                  Your Saved WhatsApp Campaigns ({campaignsList.length})
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Resume past broadcasts or export campaign dispatch performance.
                </p>
              </div>

              <button
                onClick={() => setViewTab('BUILDER')}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-emerald-500/20"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create New Campaign</span>
              </button>
            </div>

            {campaignsList.length === 0 ? (
              <div className="bg-[#0b1220] border border-[#182842] rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4 shadow-xl">
                <div className="w-14 h-14 rounded-2xl bg-emerald-950/60 border border-emerald-700/40 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                  <WhatsAppIcon className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">No Saved Campaigns Yet</h4>
                  <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                    Create your first personalized WhatsApp broadcast and save your campaign progress.
                  </p>
                </div>
                <button
                  onClick={() => setViewTab('BUILDER')}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold shadow-lg transition-transform active:scale-95"
                >
                  Start Your First Campaign
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {campaignsList.map((c) => {
                  const percent = c.totalContacts > 0 ? Math.round((c.sentCount / c.totalContacts) * 100) : 0;
                  return (
                    <div
                      key={c.id}
                      className="bg-[#0b1220] border border-[#182842] hover:border-emerald-500/40 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4 relative overflow-hidden group transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50 uppercase">
                            {c.status}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <h4 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors mb-1">
                          {c.title}
                        </h4>

                        <p className="text-xs text-gray-400 line-clamp-2 bg-[#070b13] p-2 rounded-lg border border-gray-900 font-sans mb-3">
                          {c.messageTemplate}
                        </p>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-gray-400">
                            <span>Dispatched:</span>
                            <span className="font-bold text-emerald-400">
                              {c.sentCount} / {c.totalContacts} ({percent}%)
                            </span>
                          </div>
                          <div className="w-full bg-[#070b13] h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-[#141e33]">
                        <button
                          onClick={async () => {
                            await deleteWhatsAppCampaign(c.id);
                            loadCampaigns();
                            showToast('🗑️ Campaign deleted.');
                          }}
                          className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>

                        <button
                          onClick={() => {
                            setCampaignId(c.id);
                            setCampaignTitle(c.title);
                            setMessageTemplate(c.messageTemplate);
                            setParsedContacts(c.contactsData || []);
                            if (c.mediaUrl) {
                              setMediaFile({
                                url: c.mediaUrl,
                                type: (c.mediaType as any) || 'image',
                                name: 'Attached Media',
                              });
                            }
                            setViewTab('BUILDER');
                            showToast(`📋 Loaded campaign "${c.title}" into builder!`);
                          }}
                          className="text-xs text-emerald-300 font-bold px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-800/40 hover:border-emerald-500 flex items-center gap-1"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Resume Shoot</span>
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
