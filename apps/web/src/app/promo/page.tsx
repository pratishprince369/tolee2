'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Wallet, Download, Globe, Share2, Copy, Send, 
  MessageSquare, Gift, ShieldAlert, Award, ArrowUpRight, CheckCircle2, Lock 
} from 'lucide-react';

export default function PromoPage() {
  const { data: session } = useSession();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'invite' | 'details'>('invite');

  const apkLink = 'https://tolee.in/apk';
  const webLink = 'https://tolee.in';

  const shareText = `🚀 Join Tolee - The powerful new social network for Communities, Creators & Businesses!\n\n🔥 Early growth opportunity to build your brand, grow organic followers & promote your products.\n\n🎁 Download Tolee Mobile App now and get ₹2,500 promotional wallet credits!\n\n📱 Mobile App:\n${apkLink}\n\n🌐 Website:\n${webLink}\n\nInvite your friends and start growing on Tolee today!`;

  // Log page visit
  useEffect(() => {
    const logVisit = async () => {
      try {
        await fetch('/api/promo/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'promo_website_visit',
            details: { referrer: document.referrer || 'direct' }
          }),
        });
      } catch (err) {
        console.error('Failed to log promo visit:', err);
      }
    };
    logVisit();
  }, []);

  const trackAction = async (actionType: string) => {
    try {
      await fetch('/api/promo/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionType }),
      });
    } catch (err) {
      console.error(`Failed to track action ${actionType}:`, err);
    }
  };

  const handleDownload = () => {
    trackAction('promo_apk_download');
    window.location.href = apkLink;
  };

  const handleWebsiteVisit = () => {
    trackAction('promo_website_visit_click');
    window.open(webLink, '_blank');
  };

  const shareWhatsApp = () => {
    trackAction('promo_whatsapp_share');
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const shareTelegram = () => {
    trackAction('promo_telegram_share');
    const url = `https://t.me/share/url?url=${encodeURIComponent(webLink)}&text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const shareMessenger = () => {
    trackAction('promo_messenger_share');
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(webLink)}`;
    window.open(url, '_blank');
  };

  const shareInstagram = () => {
    trackAction('promo_instagram_share');
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
    alert("Share message copied! Open Instagram and paste it in your DMs.");
  };

  const copyToClipboard = () => {
    trackAction('promo_copy_link');
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col items-center justify-start px-4 py-8 relative">
      
      <div className="w-full max-w-lg space-y-6 z-10">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="h-16 w-16 rounded-2xl bg-[#0f766e] shadow-md border border-slate-100 flex items-center justify-center relative select-none">
            <span className="text-white font-black text-2xl lowercase border-2 border-white rounded-full w-8 h-8 flex items-center justify-center font-sans">
              t
            </span>
          </div>
          <h1 className="text-xs font-black text-[#0f172a] uppercase tracking-[0.15em]">
            TOLEE GROWTH REWARDS
          </h1>
        </div>

        {/* Main Wallet Reward Card */}
        <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-extrabold uppercase tracking-wider">
              <Gift className="w-3.5 h-3.5" />
              Promo Balance Active
            </div>
            
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
              <Lock className="w-3 h-3 text-slate-400" />
              LOCKED
            </div>
          </div>

          <div className="space-y-0.5 pt-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">YOU GOT</p>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-[#0d9488] leading-none">
                ₹2,500
              </span>
              <span className="text-[#0d9488] font-black text-xs">Credits</span>
            </div>
          </div>

          <p className="text-[11.5px] leading-relaxed text-slate-500 font-medium">
            Download the <strong className="text-slate-800">Tolee Mobile App</strong> and log in to instantly unlock your promo wallet credits. Invite friends to multiply your earnings!
          </p>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-400 font-bold mt-2">
            <div className="flex items-center gap-1.5 text-slate-500 font-bold">
              <Wallet className="w-4 h-4 text-slate-400" />
              Promo Wallet 1.0
            </div>
            <div className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> App-Exclusive
            </div>
          </div>
        </div>

        {/* Tab Navigation Wrapper */}
        <div className="flex rounded-xl bg-white border border-slate-100 p-1 shadow-sm">
          <button 
            onClick={() => setActiveTab('invite')}
            className={`flex-grow py-2 text-xs font-black rounded-lg flex items-center justify-center gap-1.5 transition-all duration-300 ${activeTab === 'invite' ? 'bg-[#0f766e] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            🚀 Share & Invite
          </button>
          <button 
            onClick={() => setActiveTab('details')}
            className={`flex-grow py-2 text-xs font-black rounded-lg flex items-center justify-center gap-1.5 transition-all duration-300 ${activeTab === 'details' ? 'bg-[#0f766e] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            📋 Offer Details
          </button>
        </div>

        {/* Tab Content 1: Share options */}
        {activeTab === 'invite' && (
          <div className="space-y-4">
            
            {/* Quick Cards Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div 
                onClick={handleDownload}
                className="p-4 rounded-2xl bg-white border border-slate-100 hover:border-teal-500/20 cursor-pointer shadow-sm transition-all duration-300 group flex flex-col justify-between h-24"
              >
                <div className="flex justify-between items-start">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                    <Download className="w-4 h-4" />
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 transition-colors" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800">Mobile App</h4>
                  <p className="text-[10px] text-blue-500 mt-0.5 font-bold">tolee.in/apk</p>
                </div>
              </div>

              <div 
                onClick={handleWebsiteVisit}
                className="p-4 rounded-2xl bg-white border border-slate-100 hover:border-teal-500/20 cursor-pointer shadow-sm transition-all duration-300 group flex flex-col justify-between h-24"
              >
                <div className="flex justify-between items-start">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                    <Globe className="w-4 h-4" />
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 transition-colors" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800">Tolee Web</h4>
                  <p className="text-[10px] text-blue-500 mt-0.5 font-bold">tolee.in</p>
                </div>
              </div>
            </div>

            {/* Premium WhatsApp Button */}
            <button 
              onClick={shareWhatsApp}
              className="w-full py-3.5 px-6 rounded-2xl bg-[#0d9488] hover:bg-[#0f766e] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(13,148,136,0.1)] hover:scale-[1.005] active:scale-[0.995] transition-all duration-300"
            >
              <MessageSquare className="w-4.5 h-4.5 fill-current" />
              Share on WhatsApp
            </button>

            {/* Social Share Grid */}
            <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-3 shadow-[0_4px_16px_rgba(0,0,0,0.01)]">
              <p className="text-[9.5px] text-slate-400 font-extrabold uppercase tracking-widest text-center">OR INVITE FRIENDS VIA</p>
              
              <div className="grid grid-cols-4 gap-2">
                <button 
                  onClick={shareTelegram}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-slate-100 hover:border-teal-500/20 hover:bg-slate-50/50 transition-all duration-200 gap-1.5"
                >
                  <Send className="w-4 h-4 text-sky-500" />
                  <span className="text-[9px] font-black text-slate-500">Telegram</span>
                </button>

                <button 
                  onClick={shareInstagram}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-slate-100 hover:border-teal-500/20 hover:bg-slate-50/50 transition-all duration-200 gap-1.5"
                >
                  <Gift className="w-4 h-4 text-pink-500" />
                  <span className="text-[9px] font-black text-slate-500">Insta DM</span>
                </button>

                <button 
                  onClick={shareMessenger}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-slate-100 hover:border-teal-500/20 hover:bg-slate-50/50 transition-all duration-200 gap-1.5"
                >
                  <Share2 className="w-4 h-4 text-indigo-500" />
                  <span className="text-[9px] font-black text-slate-500">Messenger</span>
                </button>

                <button 
                  onClick={copyToClipboard}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-slate-100 hover:border-teal-500/20 hover:bg-slate-50/50 transition-all duration-200 gap-1.5"
                >
                  <Copy className="w-4 h-4 text-emerald-500" />
                  <span className="text-[9px] font-black text-slate-500">{copied ? 'Copied!' : 'Copy Info'}</span>
                </button>
              </div>
            </div>

            {/* Dotted Preview Card */}
            <div className="rounded-2xl border border-dashed border-slate-200 p-4 bg-white/50 text-[11px] leading-relaxed text-slate-500 relative shadow-sm">
              <span className="absolute -top-2.5 left-4 bg-[#f8fafc] px-2 text-[8px] font-black tracking-widest text-[#0d9488] uppercase">
                SHARE PREVIEW MESSAGE
              </span>
              <pre className="font-sans whitespace-pre-wrap select-all bg-slate-50/40 p-2.5 rounded-xl border border-slate-100 text-slate-600 text-xs mt-1">
                {shareText}
              </pre>
            </div>

          </div>
        )}

        {/* Tab Content 2: Offer details */}
        {activeTab === 'details' && (
          <div className="rounded-2xl border border-slate-100 bg-white p-5 space-y-4 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <Award className="w-4 h-4 text-teal-600" />
              Promotion & Rewards Guidelines
            </h3>
            
            <div className="space-y-3.5 text-xs text-slate-500 font-medium">
              <div className="flex gap-2.5">
                <span className="text-[#0d9488] font-black">01.</span>
                <p><strong className="text-slate-800">App Download:</strong> Instantly unlock your ₹2,500 locked promotional wallet balance by downloading and logging in on the Tolee Android Application.</p>
              </div>
              <div className="flex gap-2.5">
                <span className="text-[#0d9488] font-black">02.</span>
                <p><strong className="text-slate-800">Viral Referral System:</strong> Share the APK/Website link. When a friend downloads the app using your links, both get bonus wallet credits.</p>
              </div>
              <div className="flex gap-2.5">
                <span className="text-[#0d9488] font-black">03.</span>
                <p><strong className="text-slate-800">Security Protocols:</strong> Fake installs, emulator farms, or duplicate account claims are monitored by our security logs. Abuse results in immediate account and wallet restriction.</p>
              </div>
            </div>

            <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-3 flex gap-2 text-[10px] text-amber-600 leading-normal mt-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Anti-Fraud Protection:</strong> Locked rewards must be active within 30 days of registration. Limit one active promotional code per mobile device.
              </span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
