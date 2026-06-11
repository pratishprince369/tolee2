'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import {
  ArrowRight, CheckCircle2, Sparkles, Crown, DollarSign,
  Rocket, Globe, ChevronDown, Loader2, Phone, User, Mail,
  MapPin, TrendingUp, Gift, Star, Zap, Lock, Eye, EyeOff
} from 'lucide-react';

// ─── Static Data ─────────────────────────────────────────────────
const BENEFITS = [
  { icon: '🏆', title: 'Lifetime VIP Golden Card', desc: 'Exclusive lifetime privileges on the Tolee platform', color: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)', text: '#fcd34d' },
  { icon: '✅', title: 'Verified Tick Mark', desc: 'Verified badge across your entire Tolee profile', color: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.4)', text: '#93c5fd' },
  { icon: '💰', title: '₹20,000 Ads Wallet Credit', desc: 'Instant credit added to your Tolee Ads Wallet', color: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.4)', text: '#86efac' },
  { icon: '🎉', title: 'VIP Event Access', desc: 'Exclusive creator events & special treatment', color: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.4)', text: '#d8b4fe' },
  { icon: '🎁', title: 'Gifts & Promotions', desc: 'Special gifts, merchandise & exclusive creator rewards', color: 'rgba(236,72,153,0.15)', border: 'rgba(236,72,153,0.4)', text: '#f9a8d4' },
  { icon: '📈', title: 'Pan-India Viral Push', desc: 'Every video gets Tolee\'s nationwide boost', color: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.4)', text: '#fed7aa' },
];

const WALLET_USES = [
  'Run ads on your own account',
  'Sell wallet balance to an ads agency',
  'Transfer or sell to other Tolee users',
  'Use for brand promotions & collaborations',
];

const GROWTH_PERKS = [
  { icon: '📈', label: 'More Reach' },
  { icon: '🚀', label: 'Viral Push' },
  { icon: '👥', label: 'More Followers' },
  { icon: '💎', label: 'Brand Value' },
  { icon: '👑', label: 'VIP Benefits' },
  { icon: '💰', label: 'Wallet Earnings' },
];

const NICHES = [
  'Comedy', 'Real Estate', 'Fashion', 'Makeup & Beauty', 'Tech', 'Business',
  'Gaming', 'Motivation', 'Food', 'News', 'Education', 'Music',
  'Dance', 'Sports', 'Travel', 'Finance',
];

const FOLLOWER_RANGES = ['Under 1K', '1K–10K', '10K–50K', '50K–100K', '100K–500K', '500K+'];

// ─── Animated Counter ─────────────────────────────────────────────
function AnimatedNumber({ target, suffix = '' }: { target: string; suffix?: string }) {
  const [display, setDisplay] = useState('0');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const num = parseInt(target.replace(/\D/g, ''));
      if (isNaN(num)) { setDisplay(target); return; }
      let start = 0;
      const step = Math.ceil(num / 50);
      const timer = setInterval(() => {
        start = Math.min(start + step, num);
        setDisplay(target.replace(/[\d,]+/, start.toLocaleString('en-IN')));
        if (start >= num) clearInterval(timer);
      }, 30);
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{display}{suffix}</span>;
}

// ─── Inner page component ─────────────────────────────────────────
function JoinCreatorInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const utmSource = searchParams.get('utm_source') || '';
  const utmCampaign = searchParams.get('utm_campaign') || '';

  const [mounted, setMounted] = useState(false);
  const [animIdx, setAnimIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [followersRange, setFollowersRange] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<'info' | 'account'>('info');

  const [form, setForm] = useState({
    fullName: '',
    mobile: '',
    email: '',
    password: '',
    city: '',
    instagramLink: '',
    youtubeLink: '',
  });

  useEffect(() => {
    setMounted(true);
    const t = setInterval(() => setAnimIdx(i => (i + 1) % NICHES.length), 1800);
    return () => clearInterval(t);
  }, []);

  if (!mounted) {
    return (
      <div style={{ minHeight:'100vh', background:'#020209', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ width:40, height:40, border:'3px solid rgba(168,85,247,0.3)', borderTopColor:'#a855f7', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const toggleNiche = (n: string) => {
    setSelectedNiches(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]);
  };

  const scrollToForm = () => {
    setTimeout(() => document.getElementById('join-form')?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleSubmit = async () => {
    // Validate
    if (!form.fullName.trim()) { setError('Please enter your full name'); return; }
    if (!form.mobile.trim() || form.mobile.replace(/\D/g,'').length < 10) { setError('Please enter a valid mobile number'); return; }
    if (!form.email.trim() || !form.email.includes('@')) { setError('Please enter a valid email address'); return; }
    if (!form.password.trim() || form.password.length < 6) { setError('Password must be at least 6 characters'); return; }

    setError('');
    setSubmitting(true);

    try {
      // Step 1: Create Tolee account
      const registerRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.fullName,
          email: form.email,
          password: form.password,
        }),
      });
      const registerData = await registerRes.json();
      if (!registerRes.ok) {
        throw new Error(registerData.message || 'Account creation failed');
      }

      // Step 2: Save creator lead data
      await fetch('/api/creator/public-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName,
          mobile: form.mobile,
          email: form.email,
          city: form.city,
          instagramLink: form.instagramLink,
          youtubeLink: form.youtubeLink,
          niche: selectedNiches,
          followersRange,
          utmSource,
          utmCampaign,
          referrerUrl: typeof window !== 'undefined' ? document.referrer : '',
        }),
      }).catch(() => {}); // Non-critical

      // Step 3: Auto sign in
      const signInResult = await signIn('credentials', {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      setSubmitted(true);

      // Redirect to feed after 3 seconds
      if (signInResult?.ok) {
        setTimeout(() => router.push('/feed'), 3000);
      }

    } catch (e: any) {
      setError(e.message || 'Something went wrong, please try again');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all";
  const labelCls = "block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5";

  return (
    <div className="min-h-screen bg-[#020209] text-white overflow-x-hidden">

      {/* ── CSS ───────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        * { font-family: 'Inter', sans-serif; box-sizing: border-box; }
        @keyframes blobFloat { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-30px) scale(1.05)} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulseGlow { 0%,100%{box-shadow:0 0 25px rgba(168,85,247,0.4)} 50%{box-shadow:0 0 70px rgba(168,85,247,0.8)} }
        @keyframes ticker { 0%{opacity:0;transform:translateY(10px)} 20%,80%{opacity:1;transform:translateY(0)} 100%{opacity:0;transform:translateY(-10px)} }
        @keyframes slideIn { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes successPop { 0%{transform:scale(0.8);opacity:0} 100%{transform:scale(1);opacity:1} }
        .shimmer-text {
          background: linear-gradient(90deg, #a855f7, #3b82f6, #06b6d4, #22c55e, #f59e0b, #a855f7);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s linear infinite;
        }
        .glass { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); backdrop-filter:blur(16px); }
        .cta-btn {
          background: linear-gradient(135deg, #7c3aed, #4f46e5, #2563eb);
          animation: pulseGlow 3s ease-in-out infinite;
          transition: all 0.2s ease;
        }
        .cta-btn:hover { filter:brightness(1.15); transform:translateY(-3px); }
        .benefit-card { transition: all 0.25s ease; }
        .benefit-card:hover { transform:translateY(-5px); }
        .niche-pill { transition: all 0.15s ease; cursor:pointer; }
        .niche-pill:hover { transform:scale(1.05); }
        .range-btn { transition: all 0.15s ease; }
        .form-slide { animation: slideIn 0.5s ease forwards; }
        .float-emoji { animation: float 3s ease-in-out infinite; }
        .ticker-anim { animation: ticker 1.8s ease-in-out infinite; }
        .success-pop { animation: successPop 0.6s cubic-bezier(0.175,0.885,0.32,1.275) forwards; }
        ::-webkit-scrollbar { width:6px; }
        ::-webkit-scrollbar-track { background:#0a0a14; }
        ::-webkit-scrollbar-thumb { background:#3b0764; border-radius:3px; }
      `}</style>

      {/* ── Animated BG blobs ─────────────────────────── */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', overflow:'hidden', zIndex:0 }}>
        <div style={{ position:'absolute', top:'-10%', left:'-5%', width:700, height:700, borderRadius:'50%', background:'radial-gradient(circle, rgba(168,85,247,0.18) 0%, transparent 70%)', filter:'blur(60px)', animation:'blobFloat 8s ease-in-out infinite' }} />
        <div style={{ position:'absolute', top:'45%', right:'-10%', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)', filter:'blur(60px)', animation:'blobFloat 10s ease-in-out infinite reverse' }} />
        <div style={{ position:'absolute', bottom:'5%', left:'25%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(34,197,94,0.1) 0%, transparent 70%)', filter:'blur(60px)', animation:'blobFloat 12s ease-in-out infinite' }} />
      </div>

      <div style={{ position:'relative', zIndex:10 }}>

        {/* ═══════════════════════════════════════════════
            SECTION 1 — HERO
        ═══════════════════════════════════════════════ */}
        <section style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'80px 16px 60px', animation:'fadeUp 0.8s ease forwards' }}>

          {/* Badge */}
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'8px 18px', borderRadius:999, background:'rgba(168,85,247,0.15)', border:'1px solid rgba(168,85,247,0.4)', color:'#d8b4fe', fontSize:12, fontWeight:800, marginBottom:28, letterSpacing:'0.05em' }}>
            <Sparkles style={{ width:14, height:14 }} />
            India's Next-Gen Creator Platform
            <Sparkles style={{ width:14, height:14 }} />
          </div>

          {/* Emoji float */}
          <div className="float-emoji" style={{ fontSize:64, marginBottom:16 }}>🚀</div>

          {/* Headline */}
          <h1 style={{ fontSize:'clamp(2.2rem, 7vw, 5rem)', fontWeight:900, lineHeight:1.1, marginBottom:20, maxWidth:800 }}>
            Hey Creator <span style={{ display:'inline-block', animation:'float 2s ease-in-out infinite' }}>👋</span>
            <br />
            A <span className="shimmer-text">Huge Opportunity</span> Awaits You! 🔥
          </h1>

          {/* Sub headline */}
          <p style={{ color:'#9ca3af', fontSize:'clamp(1rem, 2.5vw, 1.2rem)', maxWidth:600, marginBottom:16, lineHeight:1.8 }}>
            We are launching <strong style={{ color:'#fff' }}>tolee</strong> — India's next-generation community social platform ❤️
          </p>

          {/* Platform features */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:10, justifyContent:'center', marginBottom:24, maxWidth:600 }}>
            {['🎬 Reels', '📹 Long Videos', '💬 Chats & Groups', '🤖 AI Tools', '🏪 Business Promotion'].map(f => (
              <span key={f} style={{ padding:'6px 14px', borderRadius:999, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#d1d5db', fontSize:13, fontWeight:600 }}>{f}</span>
            ))}
          </div>

          <p style={{ color:'#a855f7', fontWeight:800, fontSize:16, marginBottom:32 }}>All in one platform! 🎯</p>

          {/* Niche ticker */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:36 }}>
            <span style={{ color:'#6b7280', fontSize:14 }}>Best for:</span>
            <div style={{ overflow:'hidden', height:24 }}>
              <span key={animIdx} className="ticker-anim" style={{ display:'inline-block', color:'#a855f7', fontWeight:800, fontSize:15 }}>
                {NICHES[animIdx]}
              </span>
            </div>
            <span style={{ color:'#6b7280', fontSize:14 }}>Creators</span>
          </div>

          {/* Main CTA */}
          <button
            onClick={() => { scrollToForm(); }}
            className="cta-btn"
            style={{ color:'#fff', fontWeight:900, fontSize:18, padding:'16px 40px', borderRadius:16, border:'none', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:12, marginBottom:12 }}
          >
            <Rocket style={{ width:20, height:20 }} />
            Apply Now — It's Free!
            <ArrowRight style={{ width:20, height:20 }} />
          </button>
          <p style={{ color:'#4b5563', fontSize:12 }}>Free to join • 2 minutes • Create your account instantly</p>

          {/* Scroll hint */}
          <div style={{ marginTop:50, animation:'float 2s ease-in-out infinite', color:'#4b5563' }}>
            <ChevronDown style={{ width:28, height:28 }} />
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            SECTION 2 — BENEFITS
        ═══════════════════════════════════════════════ */}
        <section id="benefits" style={{ padding:'80px 16px' }}>
          <div style={{ maxWidth:1100, margin:'0 auto' }}>
            <div style={{ textAlign:'center', marginBottom:56 }}>
              <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'8px 18px', borderRadius:999, background:'rgba(34,197,94,0.12)', border:'1px solid rgba(34,197,94,0.3)', color:'#86efac', fontSize:12, fontWeight:800, marginBottom:16 }}>
                <Gift style={{ width:14, height:14 }} /> When You Promote Tolee
              </div>
              <h2 style={{ fontSize:'clamp(1.8rem, 5vw, 3.2rem)', fontWeight:900, marginBottom:12 }}>You Will Receive: 👑</h2>
              <p style={{ color:'#6b7280', fontSize:16 }}>Guaranteed benefits — exclusively for early creators</p>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:20 }}>
              {BENEFITS.map((b, i) => (
                <div key={i} className="benefit-card glass" style={{ borderRadius:20, padding:24, borderColor:b.border }}>
                  <div style={{ fontSize:40, marginBottom:16 }}>{b.icon}</div>
                  <h3 style={{ fontWeight:900, color:'#fff', fontSize:17, marginBottom:8 }}>{b.title}</h3>
                  <p style={{ color:'#9ca3af', fontSize:14, lineHeight:1.7 }}>{b.desc}</p>
                  <div style={{ marginTop:12, display:'inline-block', padding:'4px 12px', borderRadius:999, background:b.color, border:`1px solid ${b.border}`, color:b.text, fontSize:11, fontWeight:700 }}>Guaranteed ✓</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            SECTION 3 — VIRAL BOOST
        ═══════════════════════════════════════════════ */}
        <section style={{ padding:'80px 16px' }}>
          <div style={{ maxWidth:900, margin:'0 auto', textAlign:'center' }}>
            <div className="glass" style={{ borderRadius:28, padding:'48px 32px', border:'1px solid rgba(59,130,246,0.3)', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', inset:0, background:'radial-gradient(circle at 50% 0%, rgba(59,130,246,0.1) 0%, transparent 60%)', pointerEvents:'none' }} />
              <div style={{ position:'relative' }}>
                <div style={{ fontSize:48, marginBottom:16 }}>📈</div>
                <h2 style={{ fontSize:'clamp(1.6rem, 4vw, 2.8rem)', fontWeight:900, marginBottom:16 }}>
                  Tolee Will Boost <span style={{ color:'#60a5fa' }}>Every Single Video!</span>
                </h2>
                <p style={{ color:'#9ca3af', fontSize:16, marginBottom:32, lineHeight:1.8 }}>
                  Our most powerful feature — every video you post gets a <strong style={{ color:'#fff' }}>boost from Tolee</strong><br />
                  and your content can get an <strong style={{ color:'#a78bfa' }}>all-India viral push</strong> 🇮🇳
                </p>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:14, maxWidth:700, margin:'0 auto' }}>
                  {GROWTH_PERKS.map((p, i) => (
                    <div key={i} className="glass" style={{ borderRadius:14, padding:'14px 16px', textAlign:'center' }}>
                      <div style={{ fontSize:24, marginBottom:6 }}>{p.icon}</div>
                      <div style={{ color:'#e5e7eb', fontWeight:700, fontSize:13 }}>{p.label}</div>
                    </div>
                  ))}
                </div>
                <p style={{ color:'#6b7280', fontSize:13, marginTop:24 }}>
                  The more you promote → the more you gain 🚀
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            SECTION 4 — REFERRAL / ADS WALLET
        ═══════════════════════════════════════════════ */}
        <section style={{ padding:'80px 16px' }}>
          <div style={{ maxWidth:900, margin:'0 auto' }}>
            <div style={{ textAlign:'center', marginBottom:48 }}>
              <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'8px 18px', borderRadius:999, background:'rgba(34,197,94,0.12)', border:'1px solid rgba(34,197,94,0.3)', color:'#86efac', fontSize:12, fontWeight:800, marginBottom:16 }}>
                <DollarSign style={{ width:14, height:14 }} /> Referral Earning System
              </div>
              <h2 style={{ fontSize:'clamp(1.8rem, 5vw, 3.2rem)', fontWeight:900, marginBottom:16 }}>Refer & Earn 💸</h2>
              <p style={{ color:'#9ca3af', fontSize:17, lineHeight:1.8 }}>
                Every user who joins Tolee through <strong style={{ color:'#fff' }}>your referral link</strong>,<br />
                earns you <span style={{ color:'#4ade80', fontWeight:900, fontSize:22 }}>₹5</span> — directly credited to your Ads Wallet 💸
              </p>
            </div>

            {/* Referral steps */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:20, marginBottom:36 }}>
              {[
                { icon:'🔗', title:'Share Your Link', desc:'Share your unique referral link with your followers' },
                { icon:'👥', title:'People Join', desc:'Every join via your link is automatically tracked' },
                { icon:'💰', title:'₹5 Per Referral', desc:'₹5 is automatically credited to your Ads Wallet' },
              ].map((s, i) => (
                <div key={i} className="glass" style={{ borderRadius:20, padding:24, textAlign:'center' }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>{s.icon}</div>
                  <h3 style={{ fontWeight:900, color:'#fff', fontSize:15, marginBottom:8 }}>{s.title}</h3>
                  <p style={{ color:'#9ca3af', fontSize:13, lineHeight:1.7 }}>{s.desc}</p>
                </div>
              ))}
            </div>

            {/* Wallet uses */}
            <div className="glass" style={{ borderRadius:20, padding:24, border:'1px solid rgba(34,197,94,0.25)' }}>
              <h4 style={{ fontWeight:900, color:'#fff', marginBottom:16, fontSize:15 }}>💳 Your Ads Wallet Is Not Just For Ads...</h4>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:10 }}>
                {WALLET_USES.map((u, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 14px', borderRadius:12, background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.2)' }}>
                    <CheckCircle2 style={{ width:16, height:16, color:'#4ade80', flexShrink:0, marginTop:2 }} />
                    <span style={{ color:'#d1d5db', fontSize:13, lineHeight:1.6 }}>{u}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            SECTION 5 — STATS
        ═══════════════════════════════════════════════ */}
        <section style={{ padding:'60px 16px' }}>
          <div style={{ maxWidth:800, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:16 }}>
            {[
              { value:'50,000', suffix:'+', label:'Creators Joined', icon:'👨‍🎤' },
              { value:'2000000', suffix:'+', label:'Reels Boosted', icon:'🚀' },
              { value:'5', suffix:'Cr+ Wallet', label:'Credits Given', icon:'💰' },
              { value:'10000000', suffix:'+', label:'Impressions', icon:'📈' },
            ].map((s, i) => (
              <div key={i} className="glass" style={{ borderRadius:20, padding:20, textAlign:'center' }}>
                <div style={{ fontSize:28, marginBottom:8 }}>{s.icon}</div>
                <div style={{ fontSize:22, fontWeight:900, color:'#fff', marginBottom:4 }}>
                  <AnimatedNumber target={s.value} suffix={s.suffix} />
                </div>
                <div style={{ color:'#6b7280', fontSize:12 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            SECTION 6 — PRE-FORM CTA BANNER
        ═══════════════════════════════════════════════ */}
        <section style={{ padding:'60px 16px' }}>
          <div style={{ maxWidth:700, margin:'0 auto', textAlign:'center' }}>
            <div className="glass" style={{ borderRadius:28, padding:'48px 32px', border:'1px solid rgba(168,85,247,0.4)', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', inset:0, background:'radial-gradient(circle at 50% 100%, rgba(168,85,247,0.18) 0%, transparent 60%)', pointerEvents:'none' }} />
              <div style={{ position:'relative' }}>
                <div style={{ fontSize:52, marginBottom:16 }}>👀</div>
                <h2 style={{ fontSize:'clamp(1.5rem, 4vw, 2.5rem)', fontWeight:900, marginBottom:16 }}>
                  Interested? 🔥<br />
                  <span className="shimmer-text">Join Right Now!</span>
                </h2>
                <p style={{ color:'#9ca3af', fontSize:16, marginBottom:32, lineHeight:1.8 }}>
                  📲 Early creators get <strong style={{ color:'#fff' }}>special priority</strong>, verification and <strong style={{ color:'#fff' }}>high visibility</strong>.<br />
                  Fill out the form — it takes just 2 minutes!
                </p>
                <button
                  onClick={scrollToForm}
                  className="cta-btn"
                  style={{ color:'#fff', fontWeight:900, fontSize:17, padding:'14px 36px', borderRadius:14, border:'none', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:10 }}
                >
                  <Zap style={{ width:18, height:18 }} />
                  Yes, I Want To Join!
                  <ArrowRight style={{ width:18, height:18 }} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            SECTION 7 — THE FORM (with Signup)
        ═══════════════════════════════════════════════ */}
        <section id="join-form" style={{ padding:'60px 16px 100px' }}>
          <div style={{ maxWidth:620, margin:'0 auto' }}>
            <div style={{ textAlign:'center', marginBottom:40 }}>
              <div style={{ fontSize:48, marginBottom:12 }}>⚡</div>
              <h2 style={{ fontSize:'clamp(1.8rem, 5vw, 2.8rem)', fontWeight:900, marginBottom:12 }}>Creator Application</h2>
              <p style={{ color:'#6b7280', fontSize:15 }}>Create your free Tolee account and apply as a creator — all in one step!</p>
            </div>

            {submitted ? (
              /* ── Success Screen ── */
              <div className="glass success-pop" style={{ borderRadius:24, padding:40, textAlign:'center', border:'1px solid rgba(34,197,94,0.3)' }}>
                <div style={{ fontSize:72, marginBottom:20 }}>🎊</div>
                <h2 style={{ fontSize:28, fontWeight:900, color:'#fff', marginBottom:12 }}>Account Created & Application Submitted!</h2>
                <p style={{ color:'#9ca3af', fontSize:16, lineHeight:1.8, marginBottom:24 }}>
                  Welcome to Tolee! Our team will contact you within <strong style={{ color:'#fff' }}>24–48 hours</strong>.<br />
                  Get ready — your <strong style={{ color:'#a855f7' }}>VIP Creator life</strong> is about to begin! 🚀
                </p>
                <div style={{ padding:'14px 20px', borderRadius:14, background:'rgba(168,85,247,0.1)', border:'1px solid rgba(168,85,247,0.3)', color:'#c4b5fd', fontSize:14, fontWeight:600, marginBottom:20 }}>
                  ✓ You are now logged in — redirecting to your feed...
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:12 }}>
                  {['🏆 VIP Golden Card', '✅ Verified Tick', '💰 ₹20K Ads Wallet', '🔥 Viral Push'].map(b => (
                    <div key={b} style={{ padding:'10px 14px', borderRadius:12, background:'rgba(168,85,247,0.1)', border:'1px solid rgba(168,85,247,0.25)', color:'#d8b4fe', fontSize:13, fontWeight:700 }}>{b}</div>
                  ))}
                </div>
              </div>
            ) : (
              /* ── Form ── */
              <div className="glass form-slide" style={{ borderRadius:24, padding:'32px 28px', border:'1px solid rgba(255,255,255,0.08)' }}>

                {/* Account section header */}
                <div style={{ marginBottom:24, padding:'14px 18px', borderRadius:14, background:'rgba(168,85,247,0.08)', border:'1px solid rgba(168,85,247,0.2)' }}>
                  <p style={{ color:'#c084fc', fontWeight:800, fontSize:13, marginBottom:4 }}>🔐 Create Your Tolee Account</p>
                  <p style={{ color:'#6b7280', fontSize:12 }}>Your account details — used to log in to Tolee</p>
                </div>

                {error && (
                  <div style={{ marginBottom:20, padding:'12px 16px', borderRadius:12, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5', fontSize:14, fontWeight:600 }}>
                    ⚠️ {error}
                  </div>
                )}

                <div style={{ display:'grid', gap:20 }}>

                  {/* Full Name */}
                  <div>
                    <label className={labelCls}>Full Name *</label>
                    <div style={{ position:'relative' }}>
                      <User style={{ position:'absolute', left:14, top:14, width:16, height:16, color:'#4b5563' }} />
                      <input
                        className={inputCls}
                        style={{ paddingLeft:42 }}
                        placeholder="Your full name"
                        value={form.fullName}
                        onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className={labelCls}>Email Address * <span style={{ color:'#6b7280', fontWeight:400, textTransform:'none', letterSpacing:'normal' }}>(used to log in)</span></label>
                    <div style={{ position:'relative' }}>
                      <Mail style={{ position:'absolute', left:14, top:14, width:16, height:16, color:'#4b5563' }} />
                      <input
                        className={inputCls}
                        style={{ paddingLeft:42 }}
                        type="email"
                        placeholder="your@email.com"
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className={labelCls}>Create Password * <span style={{ color:'#6b7280', fontWeight:400, textTransform:'none', letterSpacing:'normal' }}>(min. 6 characters)</span></label>
                    <div style={{ position:'relative' }}>
                      <Lock style={{ position:'absolute', left:14, top:14, width:16, height:16, color:'#4b5563' }} />
                      <input
                        className={inputCls}
                        style={{ paddingLeft:42, paddingRight:44 }}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create a strong password"
                        value={form.password}
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(p => !p)}
                        style={{ position:'absolute', right:14, top:14, background:'none', border:'none', cursor:'pointer', color:'#4b5563', padding:0 }}
                      >
                        {showPassword ? <EyeOff style={{ width:16, height:16 }} /> : <Eye style={{ width:16, height:16 }} />}
                      </button>
                    </div>
                  </div>

                  {/* Divider */}
                  <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:20 }}>
                    <p style={{ color:'#6b7280', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:16 }}>📱 Creator Profile Info (Optional)</p>
                  </div>

                  {/* Mobile */}
                  <div>
                    <label className={labelCls}>WhatsApp / Mobile Number *</label>
                    <div style={{ position:'relative' }}>
                      <Phone style={{ position:'absolute', left:14, top:14, width:16, height:16, color:'#4b5563' }} />
                      <input
                        className={inputCls}
                        style={{ paddingLeft:42 }}
                        type="tel"
                        placeholder="+91 XXXXX XXXXX"
                        value={form.mobile}
                        onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* City */}
                  <div>
                    <label className={labelCls}>Your City (Optional)</label>
                    <div style={{ position:'relative' }}>
                      <MapPin style={{ position:'absolute', left:14, top:14, width:16, height:16, color:'#4b5563' }} />
                      <input
                        className={inputCls}
                        style={{ paddingLeft:42 }}
                        placeholder="Mumbai, Delhi, Pune..."
                        value={form.city}
                        onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Social Links */}
                  <div>
                    <label className={labelCls}>Instagram Link (Optional)</label>
                    <input
                      className={inputCls}
                      placeholder="https://instagram.com/yourprofile"
                      value={form.instagramLink}
                      onChange={e => setForm(f => ({ ...f, instagramLink: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>YouTube Link (Optional)</label>
                    <input
                      className={inputCls}
                      placeholder="https://youtube.com/@yourchannel"
                      value={form.youtubeLink}
                      onChange={e => setForm(f => ({ ...f, youtubeLink: e.target.value }))}
                    />
                  </div>

                  {/* Followers Range */}
                  <div>
                    <label className={labelCls}>How Many Followers Do You Have?</label>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
                      {FOLLOWER_RANGES.map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setFollowersRange(r)}
                          className="range-btn"
                          style={{
                            padding:'8px 16px', borderRadius:999, fontSize:13, fontWeight:700, cursor:'pointer',
                            background: followersRange === r ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : 'rgba(255,255,255,0.05)',
                            border: followersRange === r ? 'none' : '1px solid rgba(255,255,255,0.1)',
                            color: followersRange === r ? '#fff' : '#9ca3af',
                          }}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Content Niche */}
                  <div>
                    <label className={labelCls}>Your Content Niche (Select all that apply)</label>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                      {NICHES.map(n => {
                        const sel = selectedNiches.includes(n);
                        return (
                          <button
                            key={n}
                            type="button"
                            onClick={() => toggleNiche(n)}
                            className="niche-pill"
                            style={{
                              padding:'6px 14px', borderRadius:999, fontSize:12, fontWeight:700, cursor:'pointer',
                              background: sel ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.04)',
                              border: sel ? '1px solid rgba(168,85,247,0.5)' : '1px solid rgba(255,255,255,0.08)',
                              color: sel ? '#d8b4fe' : '#9ca3af',
                            }}
                          >
                            {sel ? '✓ ' : ''}{n}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Benefits reminder above submit */}
                <div style={{ marginTop:28, padding:'16px 20px', borderRadius:16, background:'rgba(168,85,247,0.08)', border:'1px solid rgba(168,85,247,0.2)' }}>
                  <p style={{ color:'#c084fc', fontWeight:800, fontSize:13, marginBottom:10 }}>🎁 What you get after joining:</p>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                    {['🏆 VIP Golden Card', '✅ Verified Tick', '💰 ₹20K Ads Wallet', '🚀 Viral Push'].map(b => (
                      <div key={b} style={{ color:'#a78bfa', fontSize:12, fontWeight:600 }}>{b}</div>
                    ))}
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="cta-btn"
                  style={{
                    width:'100%', marginTop:24, padding:'16px', borderRadius:14, border:'none', cursor: submitting ? 'not-allowed' : 'pointer',
                    color:'#fff', fontWeight:900, fontSize:17, display:'flex', alignItems:'center', justifyContent:'center', gap:10,
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? (
                    <><span style={{ display:'inline-block', width:18, height:18, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} /> Creating Your Account...</>
                  ) : (
                    <><Rocket style={{ width:18, height:18 }} /> Create Account & Apply Now <ArrowRight style={{ width:18, height:18 }} /></>
                  )}
                </button>

                <p style={{ textAlign:'center', color:'#374151', fontSize:11, marginTop:14 }}>
                  Already have an account? <a href="/auth/signin" style={{ color:'#6b7280', textDecoration:'underline' }}>Sign in here</a>
                  {' · '}By submitting you agree to Tolee's <a href="/terms" style={{ color:'#6b7280', textDecoration:'underline' }}>Terms</a>.
                  Your information is 100% safe 🔒
                </p>
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}

// ─── Exported Page (wrapped in Suspense for useSearchParams) ──────
export default function JoinCreatorPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:'100vh', background:'#020209', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ width:40, height:40, border:'3px solid rgba(168,85,247,0.3)', borderTopColor:'#a855f7', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      </div>
    }>
      <JoinCreatorInner />
    </Suspense>
  );
}
