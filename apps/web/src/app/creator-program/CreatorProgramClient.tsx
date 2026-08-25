'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  Star, Zap, TrendingUp, Award, Gift, Users, ArrowRight, CheckCircle2,
  Instagram, Youtube, Share2, ChevronRight, Sparkles, Crown, Shield,
  DollarSign, Rocket, Heart, Globe, Play, Video
} from 'lucide-react';

const CREATOR_BENEFITS = [
  { icon: '🏆', title: 'Lifetime VIP Golden Card', desc: 'Exclusive Golden Creator Card with lifetime privileges on Tolee', color: 'from-yellow-500 to-amber-600' },
  { icon: '✅', title: 'Verified Blue Tick', desc: 'Get the coveted verification badge across your entire Tolee profile', color: 'from-blue-500 to-indigo-600' },
  { icon: '💰', title: '₹20,000 Ads Wallet Credit', desc: 'Instant ₹20,000 credited to your Tolee Ads Wallet for promotions', color: 'from-green-500 to-emerald-600' },
  { icon: '🎉', title: 'VIP Event Access', desc: 'Exclusive access to Tolee creator events, meetups & launches', color: 'from-purple-500 to-pink-600' },
  { icon: '🎁', title: 'Gifts & Promotions', desc: 'Special gifts, merchandise and promotional deals just for creators', color: 'from-pink-500 to-rose-600' },
  { icon: '🔥', title: 'Viral Push Opportunities', desc: 'Your reels & content get priority boost across India via Tolee AI', color: 'from-orange-500 to-red-600' },
];

const CREATOR_TIERS = [
  { tier: 'Creator', emoji: '🌱', color: '#22c55e', bg: '#052e16', followers: '1K–10K', perks: ['Creator Badge', 'Ads Wallet Access', 'Early Features'] },
  { tier: 'Influencer', emoji: '⭐', color: '#3b82f6', bg: '#172554', followers: '10K–100K', perks: ['Influencer Badge', 'Priority Support', 'Collaboration Ops'] },
  { tier: 'VIP Creator', emoji: '💎', color: '#a855f7', bg: '#3b0764', followers: '100K+', perks: ['VIP Badge', '₹20K Wallet', 'Viral Boost'] },
  { tier: 'Verified Creator', emoji: '✅', color: '#06b6d4', bg: '#083344', followers: '500K+', perks: ['Blue Tick', 'Golden Card', 'Premium Events'] },
  { tier: 'Premium Partner', emoji: '👑', color: '#f59e0b', bg: '#451a03', followers: '1M+', perks: ['Partner Program', 'Revenue Share', 'Dedicated Manager'] },
];

const NICHES = ['Comedy', 'Real Estate', 'Fashion', 'Makeup & Beauty', 'Tech', 'Business', 'Gaming', 'Motivation', 'Food', 'News', 'Education', 'Music', 'Dance', 'Sports', 'Travel', 'Finance'];

const STATS = [
  { value: '50,000+', label: 'Creators Joined', icon: '👨‍🎤' },
  { value: '2M+', label: 'Reels Boosted', icon: '🚀' },
  { value: '₹5Cr+', label: 'Wallet Credits Given', icon: '💰' },
  { value: '10M+', label: 'Impressions Served', icon: '📈' },
];

export default function CreatorProgramClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [animIdx, setAnimIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setAnimIdx(i => (i + 1) % NICHES.length), 1800);
    return () => clearInterval(t);
  }, []);

  const handleApply = () => {
    router.push('/creator-program/apply');
  };

  return (
    <div className="min-h-screen bg-[#020209] text-white overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)', filter: 'blur(40px)', animation: 'blobFloat 8s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', top: '40%', right: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)', filter: 'blur(40px)', animation: 'blobFloat 10s ease-in-out infinite reverse' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '30%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,0.1) 0%, transparent 70%)', filter: 'blur(40px)', animation: 'blobFloat 12s ease-in-out infinite' }} />
      </div>

      <style>{`
        @keyframes blobFloat { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-30px) scale(1.05)} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse-glow { 0%,100%{box-shadow:0 0 20px rgba(168,85,247,0.3)} 50%{box-shadow:0 0 60px rgba(168,85,247,0.7)} }
        @keyframes ticker { 0%{opacity:0;transform:translateY(10px)} 20%{opacity:1;transform:translateY(0)} 80%{opacity:1;transform:translateY(0)} 100%{opacity:0;transform:translateY(-10px)} }
        .shimmer-text {
          background: linear-gradient(90deg, #a855f7, #3b82f6, #06b6d4, #22c55e, #f59e0b, #a855f7);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s linear infinite;
        }
        .glass-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(16px);
        }
        .apply-btn {
          background: linear-gradient(135deg, #7c3aed, #4f46e5, #2563eb);
          animation: pulse-glow 3s ease-in-out infinite;
        }
        .apply-btn:hover { filter: brightness(1.15); transform: translateY(-2px); }
        .tier-card:hover { transform: translateY(-4px); border-color: var(--tier-color) !important; }
        .benefit-card:hover { transform: translateY(-4px); }
        .niche-ticker { animation: ticker 1.8s ease-in-out infinite; }
      `}</style>

      <div className="relative z-10">

        {/* HERO */}
        <section className="min-h-[95vh] flex flex-col items-center justify-center text-center px-4 pt-20 pb-16" style={{ animation: 'fadeUp 0.8s ease forwards' }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold mb-8" style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.35)', color: '#d8b4fe' }}>
            <Sparkles className="w-3.5 h-3.5" />
            India's #1 Creator Growth Platform
            <Sparkles className="w-3.5 h-3.5" />
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-tight mb-6 max-w-4xl mx-auto">
            India's <span className="shimmer-text">Creator Revolution</span>
            <br />Starts Here 🔥
          </h1>

          <p className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto mb-4 leading-relaxed">
            Join Tolee — India's next-gen community platform where you get <strong className="text-white">Reels, Videos, Chats, AI Tools</strong> and <strong className="text-white">Business Promotion</strong> all in one place.
          </p>

          <div className="flex items-center gap-2 mb-10">
            <span className="text-gray-500 text-sm">Best for:</span>
            <div className="relative h-6 overflow-hidden">
              <span key={animIdx} className="niche-ticker inline-block text-sm font-bold" style={{ color: '#a855f7' }}>
                {NICHES[animIdx]}
              </span>
            </div>
            <span className="text-gray-500 text-sm">Creators</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <button onClick={handleApply} className="apply-btn text-white font-black text-lg px-10 py-4 rounded-2xl transition-all duration-300 flex items-center gap-2">
              <Rocket className="w-5 h-5" />
              Join Creator Program
              <ArrowRight className="w-5 h-5" />
            </button>
            <Link href="#benefits" className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-gray-300 transition-all duration-200 hover:text-white glass-card">
              See Benefits <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto w-full">
            {STATS.map((s, i) => (
              <div key={i} className="glass-card rounded-2xl p-4 text-center">
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-xl font-black text-white">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* CREATOR MESSAGE */}
        <section className="py-20 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="glass-card rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden" style={{ border: '1px solid rgba(168,85,247,0.3)' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 0%, rgba(168,85,247,0.12) 0%, transparent 60%)', pointerEvents: 'none' }} />
              <div className="relative">
                <div className="text-4xl mb-4">🚀</div>
                <h2 className="text-2xl sm:text-3xl font-black text-white mb-6">Hey Creator 👋</h2>
                <p className="text-gray-300 text-lg leading-relaxed mb-6">
                  There is a <strong className="text-purple-400">huge opportunity</strong> for you 🔥
                </p>
                <p className="text-gray-300 leading-relaxed mb-6">
                  We are launching <strong className="text-white">Tolee</strong> — India's next-generation community social platform ❤️
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-left mb-8">
                  {['🎬 Reels & Short Videos', '📹 Long Videos', '💬 Chats & Groups', '🤖 AI Tools', '🏪 Business Promotion', '🌍 Global Reach'].map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-300 bg-white/5 px-3 py-2.5 rounded-xl">
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
                <p className="text-purple-300 font-bold text-lg">All on a single platform! 🎯</p>
              </div>
            </div>
          </div>
        </section>

        {/* BENEFITS */}
        <section id="benefits" className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold mb-4" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#86efac' }}>
                <Gift className="w-3.5 h-3.5" /> Exclusive Creator Benefits
              </div>
              <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">If You Promote Tolee</h2>
              <p className="text-gray-400 text-lg">Here is what you will get — guaranteed 🎁</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {CREATOR_BENEFITS.map((b, i) => (
                <div key={i} className="benefit-card glass-card rounded-2xl p-6 transition-all duration-300 cursor-default relative overflow-hidden group">
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br ${b.color}`} style={{ opacity: 0.05 }} />
                  <div className="text-4xl mb-4">{b.icon}</div>
                  <h3 className="font-black text-white text-lg mb-2">{b.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BOOST SYSTEM */}
        <section className="py-20 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="glass-card rounded-3xl p-8 sm:p-12 relative overflow-hidden" style={{ border: '1px solid rgba(59,130,246,0.3)' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 0% 50%, rgba(59,130,246,0.1) 0%, transparent 60%)', pointerEvents: 'none' }} />
              <div className="relative grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-6" style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#93c5fd' }}>
                    <TrendingUp className="w-3.5 h-3.5" /> Viral Boost System
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-black text-white mb-5">
                    📈 Tolee Boosts <span style={{ color: '#60a5fa' }}>Your Content</span>
                  </h2>
                  <div className="space-y-3">
                    {[
                      '📈 Creator videos are boosted across India',
                      '📈 Early creators get the highest visibility',
                      '🔥 Creator reels receive a viral push',
                      '🌍 Pan-India distribution system',
                      '🤖 AI-powered content amplification',
                    ].map((p, i) => (
                      <div key={i} className="flex items-start gap-3 text-gray-300 text-sm">
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    { label: 'Comedy Reels', reach: '2.4M', pct: 88 },
                    { label: 'Business Content', reach: '1.8M', pct: 72 },
                    { label: 'Fashion & Makeup', reach: '3.1M', pct: 95 },
                    { label: 'Tech & Gaming', reach: '1.2M', pct: 60 },
                  ].map((s, i) => (
                    <div key={i} className="glass-card rounded-xl p-4">
                      <div className="flex justify-between mb-2 text-sm font-semibold text-white">
                        <span>{s.label}</span>
                        <span style={{ color: '#60a5fa' }}>{s.reach} Reach</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', transition: 'width 1s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* REFERRAL SYSTEM */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold mb-6" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#86efac' }}>
              <DollarSign className="w-3.5 h-3.5" /> Referral Earning System
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">Refer & Earn 💸</h2>
            <p className="text-gray-400 text-lg mb-10">For every referral who joins, you get <strong className="text-green-400">₹5</strong> — credited directly to your Ads Wallet!</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
              {[
                { icon: '🔗', title: 'Share Link', desc: 'Share your unique referral link with your followers' },
                { icon: '👥', title: 'Friends Join', desc: 'Get tracked signups when people join using your link' },
                { icon: '💰', title: 'Earn ₹5 Each', desc: 'Get ₹5 automatically credited to your Ads Wallet for every referral' },
              ].map((s, i) => (
                <div key={i} className="glass-card rounded-2xl p-6">
                  <div className="text-4xl mb-3">{s.icon}</div>
                  <h3 className="text-white font-black mb-2">{s.title}</h3>
                  <p className="text-gray-400 text-sm">{s.desc}</p>
                </div>
              ))}
            </div>
            <div className="glass-card rounded-2xl p-6 text-left" style={{ border: '1px solid rgba(34,197,94,0.25)' }}>
              <h4 className="font-bold text-white mb-3">💳 Use your wallet for:</h4>
              <div className="flex flex-wrap gap-2">
                {['Running Ads', 'Paid Promotions', 'Share with Businesses', 'Agency Credits', 'Boost Posts'].map(u => (
                  <span key={u} className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#86efac' }}>✓ {u}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CREATOR TIERS */}
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold mb-4" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#fcd34d' }}>
                <Crown className="w-3.5 h-3.5" /> Creator Tier System
              </div>
              <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">Level Up Your Creator Status 👑</h2>
              <p className="text-gray-400">Grow and unlock exclusive perks at each tier</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {CREATOR_TIERS.map((t, i) => (
                <div key={i} className="tier-card glass-card rounded-2xl p-5 transition-all duration-300 cursor-default text-center" style={{ '--tier-color': t.color, borderColor: 'rgba(255,255,255,0.06)' } as any}>
                  <div className="text-3xl mb-3">{t.emoji}</div>
                  <div className="inline-block text-xs font-black px-3 py-1 rounded-full mb-3" style={{ background: t.bg, color: t.color }}>{t.tier}</div>
                  <p className="text-gray-500 text-xs mb-3">{t.followers} followers</p>
                  <div className="space-y-1.5">
                    {t.perks.map((p, j) => (
                      <div key={j} className="flex items-center gap-1.5 text-xs text-gray-300">
                        <CheckCircle2 className="w-3 h-3 flex-shrink-0" style={{ color: t.color }} />
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-24 px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="glass-card rounded-3xl p-10 sm:p-16 relative overflow-hidden" style={{ border: '1px solid rgba(168,85,247,0.3)' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 100%, rgba(168,85,247,0.15) 0%, transparent 60%)', pointerEvents: 'none' }} />
              <div className="relative">
                <div className="text-5xl mb-6">🚀</div>
                <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
                  Ready to Go <span className="shimmer-text">Viral?</span>
                </h2>
                <p className="text-gray-400 text-lg mb-8">Join thousands of creators already building their empire on Tolee. Early creators get maximum benefits!</p>
                <button onClick={handleApply} className="apply-btn text-white font-black text-xl px-12 py-5 rounded-2xl transition-all duration-300 flex items-center gap-3 mx-auto">
                  <Rocket className="w-6 h-6" />
                  Apply as Creator Now
                  <ArrowRight className="w-6 h-6" />
                </button>
                <p className="text-gray-600 text-xs mt-5">Free to join • Takes 2 minutes • Instant application</p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
