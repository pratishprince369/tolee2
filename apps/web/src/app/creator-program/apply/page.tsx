'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  User, Mail, Phone, MapPin, Send,
  ArrowRight, ArrowLeft, CheckCircle2, Loader2, Sparkles, Star,
  Crown, Gift, Rocket, Globe, ExternalLink, ChevronDown,
  Lock, Eye, EyeOff
} from 'lucide-react';
import Link from 'next/link';

// Custom high-performance SVG icons because modern lucide-react does not include brand icons
const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const YoutubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.41 19c1.71.46 8.59.46 8.59.46s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path>
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
  </svg>
);

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
  </svg>
);

const STEPS = ['Basic Details', 'Social & Stats', 'Review & Submit'];

const NICHES = [
  'Comedy', 'Real Estate', 'Fashion', 'Makeup & Beauty', 'Tech', 'Business',
  'Gaming', 'Motivation', 'Food & Cooking', 'News', 'Education', 'Music',
  'Dance', 'Sports', 'Travel', 'Finance & Investment', 'Health & Fitness',
  'Parenting', 'Astrology', 'Politics', 'Entertainment', 'Vlogs'
];

const FOLLOWER_RANGES = ['1K–10K', '10K–50K', '50K–100K', '100K–500K', '500K–1M', '1M+'];

const CONTENT_TYPES = [
  'Short Videos / Reels', 'Long Form Videos', 'Live Streaming',
  'Photo Posts', 'Stories', 'Blogs & Articles', 'Podcasts'
];

const COUNTRY_OPTIONS = ['India', 'USA', 'UK', 'UAE', 'Canada', 'Australia', 'Singapore', 'Other'];

interface FormData {
  fullName: string; username: string; email: string; mobile: string; city: string; country: string;
  instagramLink: string; youtubeLink: string; facebookLink: string; telegramLink: string; otherLink: string;
  followersRange: string; monthlyReach: string; niche: string[]; avgReelViews: string; contentType: string[];
  password?: string;
}

const INITIAL: FormData = {
  fullName: '', username: '', email: '', mobile: '', city: '', country: 'India',
  instagramLink: '', youtubeLink: '', facebookLink: '', telegramLink: '', otherLink: '',
  followersRange: '', monthlyReach: '', niche: [], avgReelViews: '', contentType: [],
  password: '',
};

export default function CreatorApplyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [existing, setExisting] = useState<any>(null);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Pre-fill from session + check existing application
  useEffect(() => {
    if (session?.user) {
      setForm(f => ({
        ...INITIAL,
        ...f,
        fullName: session.user?.name || '',
        email: session.user?.email || '',
        username: (session.user as any)?.username || '',
      }));
      // Check if already applied
      fetch('/api/creator/apply')
        .then(r => r.json())
        .then(d => {
          if (d.application) setExisting(d.application);
        })
        .finally(() => setCheckingExisting(false));
    } else {
      setCheckingExisting(false);
    }
  }, [session]);

  const set = (field: keyof FormData, value: any) => setForm(f => ({ ...f, [field]: value }));

  const toggleArray = (field: 'niche' | 'contentType', val: string) => {
    setForm(f => {
      const arr = Array.isArray(f[field]) ? f[field] : [];
      return {
        ...f,
        [field]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]
      };
    });
  };

  const validateStep = () => {
    if (step === 0) {
      if (!(form.fullName || '').trim()) return 'Please enter your full name';
      if (!(form.username || '').trim()) return 'Please enter your username';
      if (!(form.email || '').trim()) return 'Please enter your email';
      if (!(form.mobile || '').trim()) return 'Please enter your mobile number';
      if (!(form.city || '').trim()) return 'Please enter your city';
      if (!session?.user) {
        if (!(form.password || '').trim()) return 'Please create a password';
        if ((form.password || '').length < 6) return 'Password must be at least 6 characters';
      }
    }
    if (step === 1) {
      if (!form.followersRange) return 'Please select your follower range';
      if (!Array.isArray(form.niche) || form.niche.length === 0) return 'Please select at least one content niche';
    }
    return null;
  };

  const next = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    setStep(s => s + 1);
  };

  const back = () => { setError(''); setStep(s => s - 1); };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/creator/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, niche: form.niche.join(','), contentType: form.contentType.join(',') })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      // Auto sign-in if unauthenticated
      if (!session?.user && form.password) {
        const signInResult = await signIn('credentials', {
          email: form.email,
          password: form.password,
          redirect: false,
        });
        if (signInResult?.error) {
          console.error('[Creator Apply Auto Signin Error]', signInResult.error);
        }
      }

      setSubmitted(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading' || checkingExisting) {
    return (
      <div className="min-h-screen bg-[#020209] py-12 px-4 animate-pulse">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="space-y-3 text-center">
            <div className="h-8 bg-zinc-800/60 rounded w-1/2 mx-auto" />
            <div className="h-4 bg-zinc-800/60 rounded w-2/3 mx-auto" />
          </div>
          <div className="space-y-4 p-6 bg-zinc-900/30 rounded-2xl border border-zinc-800/60">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-zinc-800/60 rounded w-24" />
                <div className="h-10 bg-zinc-800/60 rounded w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Already applied — show status
  if (existing) {
    const statusColor = existing.status === 'approved' ? '#22c55e' : existing.status === 'rejected' ? '#ef4444' : '#f59e0b';
    const statusEmoji = existing.status === 'approved' ? '🎉' : existing.status === 'rejected' ? '❌' : '⏳';
    return (
      <div className="min-h-screen bg-[#020209] flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center">
          <div className="text-6xl mb-4">{statusEmoji}</div>
          <h1 className="text-3xl font-black text-white mb-3">
            {existing.status === 'approved' ? 'Application Approved!' : existing.status === 'rejected' ? 'Not Approved' : 'Application Pending'}
          </h1>
          <p className="text-gray-400 mb-8">
            {existing.status === 'approved'
              ? `Congratulations! You are now a ${existing.creatorTier || 'Creator'} on Tolee. Check your Creator Dashboard!`
              : existing.status === 'rejected'
              ? `Your application was reviewed. ${existing.adminNotes ? `Reason: ${existing.adminNotes}` : 'Please try again later.'}`
              : 'Your application is under review. We will notify you soon!'}
          </p>
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold mb-6" style={{ background: `${statusColor}20`, border: `1px solid ${statusColor}50`, color: statusColor }}>
            Status: {existing.status.charAt(0).toUpperCase() + existing.status.slice(1)}
          </div>
          <br />
          {existing.status === 'approved' && (
            <Link href="/creator-dashboard" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white" style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
              <Crown className="w-4 h-4" /> Open Creator Dashboard
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Success screen
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#020209] flex items-center justify-center p-4">
        <div className="max-w-2xl w-full text-center">
          <div className="text-7xl mb-6">🎊</div>
          <h1 className="text-4xl font-black text-white mb-4">Application Submitted!</h1>
          <p className="text-gray-400 text-lg mb-8">
            Thank you for applying to the Tolee Creator Program! Our team will review your application within <strong className="text-white">24-48 hours</strong>.
          </p>
          {/* Benefits reminder */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10 text-left">
            {['🏆 Lifetime VIP Golden Card', '✅ Verified Blue Tick', '💰 ₹20,000 Ads Wallet', '🎉 VIP Event Access', '🎁 Gifts & Promotions', '🔥 Viral Push'].map(b => (
              <div key={b} className="text-xs text-gray-300 bg-white/5 border border-white/8 px-3 py-2.5 rounded-xl">{b}</div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/feed" className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white" style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
              <Rocket className="w-4 h-4" /> Go to Feed
            </Link>
            <Link href="/creator-program" className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-gray-300 bg-white/5 border border-white/10">
              <ArrowLeft className="w-4 h-4" /> Back to Creator Page
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const inputCls = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all";
  const labelCls = "block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5";

  return (
    <div className="min-h-screen bg-[#020209] py-8 px-4">
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .form-anim { animation: fadeUp 0.4s ease forwards; }
        .pill-btn { transition: all 0.15s ease; }
        .pill-btn:hover { transform: scale(1.02); }
      `}</style>

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/creator-program" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 mb-6 transition-colors">
            <ArrowLeft className="w-3 h-3" /> Back to Creator Program
          </Link>
          <div className="text-4xl mb-3">⚡</div>
          <h1 className="text-3xl font-black text-white mb-2">Creator Application</h1>
          <p className="text-gray-500 text-sm">Complete the form to join Tolee's Creator Program</p>
        </div>

        {/* Step Progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center flex-1 gap-2">
              <div className="flex-shrink-0 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300"
                  style={{
                    background: i < step ? '#22c55e' : i === step ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : 'rgba(255,255,255,0.05)',
                    color: i <= step ? '#fff' : '#71717a',
                    border: i === step ? 'none' : '1px solid rgba(255,255,255,0.1)'
                  }}>
                  {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className="text-xs font-semibold hidden sm:block" style={{ color: i === step ? '#fff' : '#71717a' }}>{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className="flex-1 h-px mx-2" style={{ background: i < step ? '#22c55e' : 'rgba(255,255,255,0.08)' }} />}
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div className="form-anim" key={step} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '32px 28px' }}>

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm font-semibold text-red-400" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              ⚠️ {error}
            </div>
          )}

          {/* ── STEP 0: Basic Details ── */}
          {step === 0 && (
            <div className="space-y-5">
              <h2 className="text-xl font-black text-white mb-6">📋 Basic Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3.5 w-4 h-4 text-gray-600" />
                    <input className={`${inputCls} pl-10`} placeholder="Your full name" value={form.fullName || ''} onChange={e => set('fullName', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Username *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-600 text-sm font-bold">@</span>
                    <input className={`${inputCls} pl-8`} placeholder="yourhandle" value={form.username || ''} onChange={e => set('username', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-600" />
                    <input type="email" className={`${inputCls} pl-10`} placeholder="you@email.com" value={form.email || ''} onChange={e => set('email', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Mobile Number *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3.5 w-4 h-4 text-gray-600" />
                    <input type="tel" className={`${inputCls} pl-10`} placeholder="+91 XXXXX XXXXX" value={form.mobile || ''} onChange={e => set('mobile', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>City *</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-gray-600" />
                    <input className={`${inputCls} pl-10`} placeholder="Mumbai, Delhi..." value={form.city || ''} onChange={e => set('city', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Country</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3.5 w-4 h-4 text-gray-600" />
                    <select className={`${inputCls} pl-10 appearance-none`} value={form.country} onChange={e => set('country', e.target.value)}>
                      {COUNTRY_OPTIONS.map(c => <option key={c} value={c} style={{ background: '#0a0a14' }}>{c}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-600 pointer-events-none" />
                  </div>
                </div>
                {!session?.user && (
                  <div>
                    <label className={labelCls}>Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-600" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className={`${inputCls} pl-10 pr-10`}
                        placeholder="Create a strong password"
                        value={form.password || ''}
                        onChange={e => set('password', e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(p => !p)}
                        className="absolute right-3 top-3.5 text-gray-600 hover:text-gray-400"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 1: Social & Stats ── */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-black text-white mb-6">📱 Social Media & Creator Stats</h2>

              {/* Social Links */}
              <div>
                <h3 className="text-sm font-bold text-gray-300 mb-3">Social Media Links</h3>
                <div className="space-y-3">
                  {[
                    { icon: InstagramIcon, label: 'Instagram', field: 'instagramLink', placeholder: 'https://instagram.com/yourprofile', color: '#e1306c' },
                    { icon: YoutubeIcon, label: 'YouTube', field: 'youtubeLink', placeholder: 'https://youtube.com/@yourchannel', color: '#ff0000' },
                    { icon: FacebookIcon, label: 'Facebook Page', field: 'facebookLink', placeholder: 'https://facebook.com/yourpage', color: '#1877f2' },
                    { icon: Send, label: 'Telegram Channel', field: 'telegramLink', placeholder: 'https://t.me/yourchannel', color: '#26a5e4' },
                    { icon: ExternalLink, label: 'Other Profile', field: 'otherLink', placeholder: 'Any other link', color: '#a855f7' },
                  ].map(({ icon: Icon, label, field, placeholder, color }) => (
                    <div key={field} className="relative">
                      <Icon className="absolute left-3 top-3.5 w-4 h-4" style={{ color }} />
                      <input className={`${inputCls} pl-10`} placeholder={placeholder} value={form[field as keyof FormData] || ''} onChange={e => set(field as keyof FormData, e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Follower Range */}
              <div>
                <label className={labelCls}>Followers Range *</label>
                <div className="flex flex-wrap gap-2">
                  {FOLLOWER_RANGES.map(r => (
                    <button key={r} type="button" onClick={() => set('followersRange', r)} className="pill-btn px-4 py-2 rounded-full text-sm font-bold transition-all"
                      style={{
                        background: form.followersRange === r ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : 'rgba(255,255,255,0.05)',
                        border: form.followersRange === r ? 'none' : '1px solid rgba(255,255,255,0.1)',
                        color: form.followersRange === r ? '#fff' : '#9ca3af'
                      }}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Monthly Reach & Avg Reel Views */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Monthly Reach</label>
                  <input className={inputCls} placeholder="e.g. 5 Lakh" value={form.monthlyReach} onChange={e => set('monthlyReach', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Avg Reel Views</label>
                  <input className={inputCls} placeholder="e.g. 50K per reel" value={form.avgReelViews} onChange={e => set('avgReelViews', e.target.value)} />
                </div>
              </div>

              {/* Content Niche */}
              <div>
                <label className={labelCls}>Content Niche * (select all that apply)</label>
                <div className="flex flex-wrap gap-2">
                  {NICHES.map(n => {
                    const isSelected = Array.isArray(form.niche) && form.niche.includes(n);
                    return (
                      <button key={n} type="button" onClick={() => toggleArray('niche', n)} className="pill-btn px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                        style={{
                          background: isSelected ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.04)',
                          border: isSelected ? '1px solid rgba(168,85,247,0.5)' : '1px solid rgba(255,255,255,0.08)',
                          color: isSelected ? '#d8b4fe' : '#9ca3af'
                        }}>
                        {isSelected ? '✓ ' : ''}{n}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Content Type */}
              <div>
                <label className={labelCls}>Content Type</label>
                <div className="flex flex-wrap gap-2">
                  {CONTENT_TYPES.map(t => {
                    const isSelected = Array.isArray(form.contentType) && form.contentType.includes(t);
                    return (
                      <button key={t} type="button" onClick={() => toggleArray('contentType', t)} className="pill-btn px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                        style={{
                          background: isSelected ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
                          border: isSelected ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(255,255,255,0.08)',
                          color: isSelected ? '#86efac' : '#9ca3af'
                        }}>
                        {isSelected ? '✓ ' : ''}{t}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Review & Submit ── */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-black text-white mb-2">🎯 Review & Submit</h2>
              <p className="text-gray-500 text-sm mb-6">Check your details before submitting</p>

              {/* Summary */}
              <div className="space-y-3">
                {[
                  { label: 'Name', val: form.fullName },
                  { label: 'Username', val: `@${form.username}` },
                  { label: 'Email', val: form.email },
                  { label: 'Mobile', val: form.mobile },
                  { label: 'Location', val: `${form.city}, ${form.country}` },
                  { label: 'Followers', val: form.followersRange },
                  { label: 'Niche', val: (Array.isArray(form.niche) ? form.niche : []).join(', ') || '—' },
                  { label: 'Instagram', val: form.instagramLink || '—' },
                  { label: 'YouTube', val: form.youtubeLink || '—' },
                ].map(({ label, val }) => (
                  <div key={label} className="flex items-start justify-between py-2.5 border-b border-white/5 text-sm">
                    <span className="text-gray-500 font-medium w-28 flex-shrink-0">{label}</span>
                    <span className="text-gray-200 text-right flex-1 ml-4 truncate">{val}</span>
                  </div>
                ))}
              </div>

              {/* Benefits reminder */}
              <div className="rounded-2xl p-5 mt-4" style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}>
                <p className="text-purple-300 font-bold text-sm mb-3">🎁 After Approval You'll Get:</p>
                <div className="grid grid-cols-2 gap-2">
                  {['🏆 Lifetime VIP Golden Card', '✅ Verified Blue Tick', '💰 ₹20,000 Ads Wallet', '🔥 Viral Push Access'].map(b => (
                    <div key={b} className="text-xs text-purple-200">{b}</div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/8">
            <button onClick={back} disabled={step === 0} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-gray-400 transition-all hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            {step < STEPS.length - 1 ? (
              <button onClick={next} className="flex items-center gap-2 px-7 py-2.5 rounded-xl text-sm font-black text-white transition-all hover:brightness-110"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
                Next Step <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting} className="flex items-center gap-2 px-7 py-2.5 rounded-xl text-sm font-black text-white transition-all hover:brightness-110 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <><Rocket className="w-4 h-4" /> Submit Application</>}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-gray-700 text-xs mt-6">
          By submitting, you agree to Tolee's <Link href="/terms" className="underline">Terms of Service</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
