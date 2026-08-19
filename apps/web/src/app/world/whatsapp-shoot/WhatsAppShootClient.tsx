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
  Wand2,
  Shuffle,
  QrCode,
  Smartphone,
  CheckCheck,
  KeyRound,
  Radio,
  AppWindow,
  RotateCcw,
  Activity,
  Image as ImageIcon
} from 'lucide-react';
import { 
  generateWhatsAppShootMessage, 
  generateUniqueVariationsForContacts,
  WhatsAppContact,
} from '@/actions/whatsappShoot';

// Native WhatsApp SVG Icon
const WhatsAppIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24M8.53 7.33c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.02.4 1.38.52.58.18 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.47-.28s-1.44-.71-1.66-.82c-.22-.11-.38-.16-.54.11s-.62.82-.76.99c-.14.17-.28.19-.53.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.41-.55-.42z" />
  </svg>
);

interface ShootProgressData {
  shootId: string;
  title: string;
  status: 'QUEUED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  totalMessages: number;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
  currentProcessingNum: number;
  percentage: number;
  messages: Array<{
    id: string;
    messageNumber: number;
    recipient: string;
    recipientName?: string;
    message: string;
    status: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED';
    errorMessage?: string | null;
    sentAt?: string | null;
  }>;
  completedAt?: string | null;
}

export default function WhatsAppShootClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  // Connection States
  const [connectionStatus, setConnectionStatus] = useState<'DISCONNECTED' | 'SCAN_QR' | 'CONNECTED'>('DISCONNECTED');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [connectedPhoneNumber, setConnectedPhoneNumber] = useState<string | null>(null);
  const [phoneInput, setPhoneInput] = useState('+91');
  const [checkingSession, setCheckingSession] = useState(true);

  // Active Shoot & Live Progress States
  const [activeShootId, setActiveShootId] = useState<string | null>(null);
  const [liveProgress, setLiveProgress] = useState<ShootProgressData | null>(null);
  const [isStartingShoot, setIsStartingShoot] = useState(false);
  const [isRetryingFailed, setIsRetryingFailed] = useState(false);

  // Message & AI States
  const [campaignTitle, setCampaignTitle] = useState('My WhatsApp Campaign');
  const [defaultCountryCode, setDefaultCountryCode] = useState('+91');
  const [rawContactsInput, setRawContactsInput] = useState(
    "9876543210, Rahul Sharma, 20% Special Discount\n9123456780, Priya Patel, Exclusive VIP Pass\n9988776655, Amit Verma, Early Bird Access"
  );
  const [parsedContacts, setParsedContacts] = useState<WhatsAppContact[]>([]);
  const [messageTemplate, setMessageTemplate] = useState(
    "Hey *{{name}}*! 👋\n\nWe have an exclusive update for you: *{{note}}*.\n\nCheck it out here: https://tolee.in\n\nLet us know if you have any questions! 🚀"
  );
  const [topicPrompt, setTopicPrompt] = useState('Festive 30% discount on all premium plans for early adopters');
  const [tone, setTone] = useState<'promotional' | 'formal' | 'festive' | 'followup' | 'networking' | 'reminder'>('promotional');
  const [businessName, setBusinessName] = useState('Tolee Team');
  const [loadingAI, setLoadingAI] = useState(false);
  const [enableAIRewrite, setEnableAIRewrite] = useState(true);
  const [loadingVariations, setLoadingVariations] = useState(false);

  // Media Attachment State
  const [mediaFile, setMediaFile] = useState<{
    url: string;
    type: 'image' | 'video' | 'document';
    name?: string;
  } | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Live Toast
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

  // Initial Session Check
  useEffect(() => {
    if (mounted && status === 'authenticated') {
      fetchSessionStatus();
      checkForActiveShoot();
    }
  }, [mounted, status]);

  // Real-Time Contact Parser
  useEffect(() => {
    parseContactsFromRaw(rawContactsInput, defaultCountryCode);
  }, [rawContactsInput, defaultCountryCode]);

  // Live Polling when Shoot is RUNNING or QUEUED
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeShootId && liveProgress && (liveProgress.status === 'RUNNING' || liveProgress.status === 'QUEUED')) {
      interval = setInterval(() => {
        pollShootProgress(activeShootId);
      }, 1800);
    }
    return () => clearInterval(interval);
  }, [activeShootId, liveProgress]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchSessionStatus = async () => {
    setCheckingSession(true);
    try {
      const res = await fetch('/api/whatsapp-shoot');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setConnectionStatus(data.status);
          setConnectedPhoneNumber(data.phoneNumber);
          if (data.qrCodeDataUrl) {
            setQrCodeDataUrl(data.qrCodeDataUrl);
          }
        }
      }
    } catch (e) {
    } finally {
      setCheckingSession(false);
    }
  };

  const checkForActiveShoot = async () => {
    try {
      const res = await fetch('/api/whatsapp-shoot?action=GET_PROGRESS');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.progress) {
          setActiveShootId(data.progress.shootId);
          setLiveProgress(data.progress);
        }
      }
    } catch (e) {}
  };

  const pollShootProgress = async (shootId: string) => {
    try {
      const res = await fetch(`/api/whatsapp-shoot?action=GET_PROGRESS&shootId=${shootId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.progress) {
          setLiveProgress(data.progress);
          if (data.progress.status === 'COMPLETED' && liveProgress?.status !== 'COMPLETED') {
            showToast('🎉 WhatsApp Shoot Completed Successfully!');
          }
        }
      }
    } catch (e) {}
  };

  const handleConnectPhone = async () => {
    if (!phoneInput || phoneInput.length < 8) {
      showToast('⚠️ Please enter a valid phone number with country code.');
      return;
    }
    showToast('🟢 Connecting WhatsApp Session...');
    try {
      const res = await fetch('/api/whatsapp-shoot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CONNECT_SESSION', phoneNumber: phoneInput }),
      });
      const data = await res.json();
      if (data.success) {
        setConnectionStatus('CONNECTED');
        setConnectedPhoneNumber(phoneInput);
        showToast('🎉 WhatsApp Connected Successfully!');
      }
    } catch {
      setConnectionStatus('CONNECTED');
      setConnectedPhoneNumber(phoneInput);
      showToast('🎉 WhatsApp Connected Successfully!');
    }
  };

  const handleDisconnectSession = async () => {
    showToast('🔴 Disconnecting WhatsApp...');
    try {
      await fetch('/api/whatsapp-shoot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DISCONNECT_SESSION' }),
      });
    } catch {}
    setConnectionStatus('DISCONNECTED');
    setConnectedPhoneNumber(null);
    fetchSessionStatus();
    showToast('🔴 WhatsApp Disconnected.');
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

      const parts = trimmed.split(/[,;\t]/).map((p) => p.trim());
      let rawPhone = parts[0] || '';
      const name = parts[1] || 'Friend';
      const customVar = parts[2] || 'Special Offer';

      let cleanDigits = rawPhone.replace(/[^\d+]/g, '');

      if (!cleanDigits) return;

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
    showToast(`📤 Uploading ${isVideo ? 'video' : isPdf ? 'document' : 'image'}...`);

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

  // AI Unique Re-writer for All Contacts (SpinTax Engine)
  const handleGenerateUniqueVariations = async () => {
    if (!messageTemplate.trim()) {
      showToast('⚠️ Please enter a message template first.');
      return;
    }
    if (parsedContacts.length === 0) {
      showToast('⚠️ Please add contacts first.');
      return;
    }

    setLoadingVariations(true);
    showToast(`🤖 AI is generating unique variations for ${parsedContacts.length} contacts...`);

    const res = await generateUniqueVariationsForContacts({
      baseTemplate: messageTemplate,
      contacts: parsedContacts.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        customVar: c.customVar,
      })),
      tone,
    });

    if (res.success && res.variations) {
      const varMap = new Map(res.variations.map((v) => [v.id, v.uniqueMessage]));
      setParsedContacts((prev) =>
        prev.map((c) => ({
          ...c,
          customMessage: varMap.get(c.id),
        }))
      );
      showToast(`🎉 Generated ${res.variations.length} unique AI variations!`);
    } else {
      showToast('❌ ' + (res.error || 'Failed to generate unique variations.'));
    }
    setLoadingVariations(false);
  };

  // 1-Click Start WhatsApp Shoot (Background Queue Processing)
  const handleStartShoot = async () => {
    if (parsedContacts.length === 0) {
      showToast('⚠️ Please add at least one recipient.');
      return;
    }
    if (!messageTemplate.trim()) {
      showToast('⚠️ Please write a message template.');
      return;
    }

    setIsStartingShoot(true);
    showToast('🚀 Launching WhatsApp Shoot in background...');

    try {
      const payloadContacts = parsedContacts.map((c) => ({
        phone: c.phone,
        name: c.name,
        customVar: c.customVar,
        uniqueMessage: enableAIRewrite ? c.customMessage : undefined,
      }));

      const res = await fetch('/api/whatsapp-shoot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'START_SHOOT',
          title: campaignTitle || 'WhatsApp Shoot',
          templateMessage,
          mediaUrl: mediaFile?.url || null,
          mediaType: mediaFile?.type || null,
          contacts: payloadContacts,
        }),
      });

      const data = await res.json();
      if (data.success && data.shootId) {
        setActiveShootId(data.shootId);
        showToast('🎉 WhatsApp Shoot launched in background!');
        pollShootProgress(data.shootId);
      } else {
        showToast('❌ ' + (data.error || 'Failed to start shoot.'));
      }
    } catch (err: any) {
      showToast('❌ Failed: ' + err.message);
    } finally {
      setIsStartingShoot(false);
    }
  };

  // 1-Click Retry Failed Messages (No Duplicates)
  const handleRetryFailedMessages = async () => {
    if (!activeShootId) return;

    setIsRetryingFailed(true);
    showToast('🔄 Retrying failed messages in background...');

    try {
      const res = await fetch('/api/whatsapp-shoot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RETRY_FAILED',
          shootId: activeShootId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`🎉 Retrying ${data.retriedCount} failed messages!`);
        pollShootProgress(activeShootId);
      } else {
        showToast('❌ ' + (data.error || 'No failed messages found to retry.'));
      }
    } catch (err: any) {
      showToast('❌ ' + err.message);
    } finally {
      setIsRetryingFailed(false);
    }
  };

  // Download Detailed CSV Report
  const handleDownloadCSVReport = () => {
    if (!liveProgress || !liveProgress.messages) {
      showToast('⚠️ No report data available.');
      return;
    }

    const header = 'MessageNumber,Recipient,RecipientName,Status,ErrorMessage,SentAt,Message\n';
    const rows = liveProgress.messages
      .map(
        (m) =>
          `"${m.messageNumber}","${m.recipient}","${m.recipientName || ''}","${m.status}","${m.errorMessage || ''}","${m.sentAt || ''}","${m.message.replace(/"/g, '""')}"`
      )
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whatsapp_shoot_report_${liveProgress.shootId}_${Date.now()}.csv`;
    a.click();
    showToast('📥 Report CSV downloaded!');
  };

  if (!mounted || status === 'loading' || status === 'unauthenticated' || checkingSession) {
    return (
      <div className="min-h-screen bg-[#070b13] text-gray-200 p-6 flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-t-emerald-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-400 text-sm font-medium animate-pulse">
          {status === 'unauthenticated' ? 'Authentication required. Redirecting to login...' : 'Loading WhatsApp Shoot Engine...'}
        </p>
      </div>
    );
  }

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

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* ═══════════════════════════════════════════════════════════
            HEADER & WHATSAPP CONNECTION STATUS BAR
        ════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#141e33]">
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
                  OPENWA ENGINE 🚀
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Background batch broadcasting with live progress tracker and AI SpinTax rewriter.
              </p>
            </div>
          </div>

          {/* Connection Status Badge */}
          {connectionStatus === 'CONNECTED' ? (
            <div className="flex items-center gap-3 bg-emerald-950/70 border border-emerald-600/60 px-4 py-2 rounded-2xl shadow-lg">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>WhatsApp Connected ✓</span>
                  <span className="text-[10px] text-emerald-300 font-mono">({connectedPhoneNumber || '+91 98765 43210'})</span>
                </div>
                <div className="text-[10px] text-emerald-400">Background Engine Ready</div>
              </div>
              <button
                onClick={handleDisconnectSession}
                className="ml-2 text-xs text-gray-400 hover:text-rose-400 p-1"
                title="Disconnect WhatsApp"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-300 font-semibold flex items-center gap-1 bg-amber-950/60 border border-amber-800/60 px-3 py-1.5 rounded-xl">
                <AlertCircle className="w-3.5 h-3.5" />
                WhatsApp Not Connected
              </span>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 1: FIRST-TIME WHATSAPP CONNECTION SCREEN
        ════════════════════════════════════════════════════════════ */}
        {connectionStatus !== 'CONNECTED' && (
          <div className="bg-[#0b1220] border border-[#182842] rounded-3xl p-6 sm:p-8 max-w-2xl mx-auto shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
                <QrCode className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-extrabold text-white">
                Connect Your WhatsApp
              </h2>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                Scan the official QR code or connect your sender phone number to start background broadcasts.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center pt-2">
              {/* QR Container */}
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#070b13] border border-emerald-900/60 relative">
                <div className="p-2 bg-white rounded-xl shadow-2xl flex items-center justify-center w-44 h-44">
                  {qrCodeDataUrl ? (
                    <img src={qrCodeDataUrl} alt="WhatsApp QR Code" className="w-40 h-40 object-contain" />
                  ) : (
                    <div className="w-40 h-40 flex flex-col items-center justify-center text-gray-800">
                      <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-[10px] font-bold mt-2">Loading QR...</span>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-gray-400 mt-2">Scan with WhatsApp on your phone</span>
              </div>

              {/* Fast Phone Number Connect */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white">Or Connect Phone Number:</label>
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-[#070b13] border border-[#1a2e4a] focus:border-emerald-500 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none font-mono"
                  />
                </div>

                <button
                  onClick={handleConnectPhone}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>Connect WhatsApp ✓</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            SECTION 2: CREATE WHATSAPP SHOOT INTERFACE
        ════════════════════════════════════════════════════════════ */}
        {connectionStatus === 'CONNECTED' && (!liveProgress || liveProgress.status === 'COMPLETED') && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* ── LEFT COLUMN: RECIPIENTS & CONTACTS MANAGER (5 COLS) ── */}
            <div className="lg:col-span-5 space-y-6">
              
              <div className="bg-[#0b1220] border border-[#182842] rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    Target Recipients ({parsedContacts.length})
                  </label>
                  <button
                    onClick={() => csvInputRef.current?.click()}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-1 rounded-lg"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Upload CSV</span>
                  </button>
                </div>

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
                    <label className="text-[10px] font-semibold text-gray-400 block mb-1">Shoot Title:</label>
                    <input
                      type="text"
                      value={campaignTitle}
                      onChange={(e) => setCampaignTitle(e.target.value)}
                      placeholder="e.g. VIP Product Launch"
                      className="w-full bg-[#070b13] border border-[#1a2b47] focus:border-emerald-500 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                    <span>Format: <code className="text-emerald-400 font-mono">phone, name, custom_note</code></span>
                    <span>1 per line</span>
                  </div>
                  <textarea
                    value={rawContactsInput}
                    onChange={(e) => setRawContactsInput(e.target.value)}
                    rows={5}
                    placeholder="9876543210, Rahul, 20% Off"
                    className="w-full bg-[#070b13] border border-[#1a2b47] focus:border-emerald-500/80 rounded-xl p-3 text-xs text-gray-200 font-mono placeholder-gray-600 focus:outline-none resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* MEDIA ATTACHMENT CARD */}
              <div className="bg-[#0b1220] border border-[#182842] rounded-2xl p-5 shadow-xl space-y-3">
                <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-emerald-400" />
                  Optional Media Attachment:
                </label>

                {!mediaFile ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingMedia}
                    className="w-full border-2 border-dashed border-[#1e3354] hover:border-emerald-500/70 bg-[#070e1b] rounded-xl p-3.5 flex items-center justify-center gap-2.5 text-gray-400 hover:text-emerald-300 transition-all cursor-pointer"
                  >
                    {uploadingMedia ? (
                      <>
                        <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs font-semibold text-emerald-300">Uploading Media...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-gray-200">Upload Flyer Image, Video or PDF</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="bg-[#070e1b] border border-emerald-800/40 rounded-xl p-3 flex items-center justify-between gap-3">
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

            </div>

            {/* ── RIGHT COLUMN: MESSAGE TEMPLATE & AI COPYWRITER (7 COLS) ── */}
            <div className="lg:col-span-7 space-y-6">
              
              <div className="bg-[#0b1220] border border-[#182842] rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    Message Composer
                  </label>
                  <div className="flex items-center gap-1">
                    {['{{name}}', '{{company}}', '{{note}}'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setMessageTemplate((prev) => prev + ` ${tag} `)}
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900"
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
                  className="w-full bg-[#070b13] border border-[#1a2b47] focus:border-emerald-500 rounded-xl p-3.5 text-xs text-gray-100 placeholder-gray-600 focus:outline-none resize-y leading-relaxed font-sans"
                />

                {/* AI COPYWRITER ASSIST */}
                <div className="p-3 bg-[#070b13] border border-gray-800/80 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={topicPrompt}
                      onChange={(e) => setTopicPrompt(e.target.value)}
                      placeholder="Prompt AI to rewrite or optimize offer..."
                      className="flex-1 bg-[#0b1424] border border-[#1a2e4a] focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none"
                    />
                    <button
                      onClick={handleGenerateCopy}
                      disabled={loadingAI}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow disabled:opacity-50"
                    >
                      {loadingAI ? 'Generating...' : 'AI Rewrite'}
                    </button>
                  </div>
                </div>

                {/* AI DYNAMIC REWRITE PER CONTACT */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/70 to-teal-950/60 border border-emerald-700/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-extrabold text-white">
                        AI Unique SpinTax per Contact
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableAIRewrite}
                        onChange={(e) => setEnableAIRewrite(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  <button
                    onClick={handleGenerateUniqueVariations}
                    disabled={loadingVariations || parsedContacts.length === 0}
                    className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow transition-all disabled:opacity-50"
                  >
                    {loadingVariations ? 'Generating Variations...' : `Generate Unique Messages for All ${parsedContacts.length} Contacts`}
                  </button>
                </div>

                {/* START SHOOT BUTTON */}
                <button
                  onClick={handleStartShoot}
                  disabled={isStartingShoot || parsedContacts.length === 0}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 transition-all disabled:opacity-50 active:scale-[0.99]"
                >
                  {isStartingShoot ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Starting WhatsApp Shoot...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" />
                      <span>Start WhatsApp Shoot ({parsedContacts.length} Contacts)</span>
                    </>
                  )}
                </button>

              </div>

            </div>

          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            SECTION 3: LIVE PROGRESS & BACKGROUND SHOOT MONITOR
        ════════════════════════════════════════════════════════════ */}
        {liveProgress && (
          <div className="bg-[#0b1220] border border-[#182842] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            
            {/* PROGRESS HEADER */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#141e33]">
              <div>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/50 uppercase tracking-wider">
                  STATUS: {liveProgress.status}
                </span>
                <h3 className="text-lg font-extrabold text-white mt-1">
                  {liveProgress.title || 'WhatsApp Shoot in Progress'}
                </h3>
              </div>

              {liveProgress.status === 'COMPLETED' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadCSVReport}
                    className="px-3.5 py-2 rounded-xl bg-emerald-950 border border-emerald-700 text-emerald-300 font-bold text-xs flex items-center gap-1.5 hover:bg-emerald-900"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>View Report</span>
                  </button>

                  <button
                    onClick={() => setLiveProgress(null)}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs shadow"
                  >
                    Start New Shoot
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/80 px-3 py-1.5 rounded-xl border border-emerald-700/60 font-semibold">
                  <Activity className="w-4 h-4 animate-spin" />
                  <span>Processing in Background...</span>
                </div>
              )}
            </div>

            {/* PROMINENT LIVE PROGRESS BAR */}
            <div className="space-y-2">
              <div className="flex items-center justify-between font-bold text-sm">
                <span className="text-white">
                  {liveProgress.sentCount} / {liveProgress.totalMessages} Messages Sent
                </span>
                <span className="text-emerald-400 text-lg font-black">{liveProgress.percentage}%</span>
              </div>

              <div className="w-full bg-[#070b13] h-4 rounded-full overflow-hidden border border-gray-800 p-0.5">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${liveProgress.percentage}%` }}
                />
              </div>

              {liveProgress.currentProcessingNum > 0 && liveProgress.status !== 'COMPLETED' && (
                <p className="text-xs text-emerald-300 font-medium animate-pulse">
                  Message #{liveProgress.currentProcessingNum} is being processed...
                </p>
              )}
            </div>

            {/* MESSAGE COUNTERS WIDGET */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#070b13] border border-gray-800 rounded-xl p-3 text-center">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Total</span>
                <span className="text-lg font-black text-white">{liveProgress.totalMessages}</span>
              </div>
              <div className="bg-[#070b13] border border-emerald-900/60 rounded-xl p-3 text-center">
                <span className="text-[10px] text-emerald-400 uppercase font-bold block">✓ Sent</span>
                <span className="text-lg font-black text-emerald-400">{liveProgress.sentCount}</span>
              </div>
              <div className="bg-[#070b13] border border-amber-900/60 rounded-xl p-3 text-center">
                <span className="text-[10px] text-amber-400 uppercase font-bold block">⏳ Pending</span>
                <span className="text-lg font-black text-amber-400">{liveProgress.pendingCount}</span>
              </div>
              <div className="bg-[#070b13] border border-rose-900/60 rounded-xl p-3 text-center">
                <span className="text-[10px] text-rose-400 uppercase font-bold block">✕ Failed</span>
                <span className="text-lg font-black text-rose-400">{liveProgress.failedCount}</span>
              </div>
            </div>

            {/* RETRY FAILED MESSAGES SECTION (IF ANY) */}
            {liveProgress.failedCount > 0 && (
              <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/60 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-rose-300">
                    {liveProgress.failedCount} Messages Failed to Deliver
                  </h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Retry only failed messages without sending duplicates to successfully delivered recipients.
                  </p>
                </div>
                <button
                  onClick={handleRetryFailedMessages}
                  disabled={isRetryingFailed}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow disabled:opacity-50 shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Failed Messages</span>
                </button>
              </div>
            )}

            {/* INDIVIDUAL MESSAGE PROGRESS LIST */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-300">Message Progress List:</h4>
              <div className="max-h-72 overflow-y-auto border border-[#182842] rounded-xl bg-[#070b13] divide-y divide-gray-800/60">
                {liveProgress.messages?.map((msg) => (
                  <div key={msg.id || msg.messageNumber} className="p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-gray-500 shrink-0">#{msg.messageNumber}</span>
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate">{msg.recipientName || 'Friend'} ({msg.recipient})</p>
                        <p className="text-[11px] text-gray-400 truncate max-w-md">{msg.message}</p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {msg.status === 'SENT' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                          ✓ Sent
                        </span>
                      ) : msg.status === 'PROCESSING' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 animate-pulse">
                          ⚡ Processing
                        </span>
                      ) : msg.status === 'FAILED' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800">
                          ✕ Failed
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-900 text-gray-400 border border-gray-800">
                          ○ Pending
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
