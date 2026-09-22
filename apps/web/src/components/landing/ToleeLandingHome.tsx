'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { 
  Eye, 
  EyeOff, 
  Loader2, 
  Sparkles, 
  Radio, 
  Film, 
  Users, 
  Bot, 
  ShieldCheck, 
  Compass,
  ArrowRight
} from 'lucide-react';
import { startGoogleLogin, setupNativeGoogleCallbacks } from '@/lib/google-native';

export function ToleeLandingHome() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isBot, setIsBot] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Handle URL errors and verification status
  useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError) {
      if (urlError === 'suspended') {
        setError('Your account has been suspended. You cannot log in.');
      } else if (urlError === 'banned') {
        setError('Your account has been permanently blocked. You cannot log in.');
      } else if (urlError === 'bot_detected') {
        setError('Automated or bot logins are restricted on this platform.');
      } else {
        setError(`Authentication error: ${urlError}`);
      }
    }
    if (searchParams.get('verified') === 'true') {
      setSuccessMessage('Email verified successfully! Please log in.');
    }
  }, [searchParams]);

  // Track referral codes
  useEffect(() => {
    try {
      const ref = searchParams.get('ref');
      if (ref && ref.startsWith('FRN')) {
        localStorage.setItem('tolee_referral_code', ref);
        document.cookie = `tolee_referral_code=${ref}; max-age=${30 * 24 * 60 * 60}; path=/; SameSite=Lax;`;
      }
    } catch (e) {
      console.warn('Unable to save referral code', e);
    }
  }, [searchParams]);

  // Redirect if user logs in
  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/feed');
    }
  }, [status, router]);

  // Setup Google native callbacks
  useEffect(() => {
    const cleanup = setupNativeGoogleCallbacks();
    return cleanup;
  }, []);

  const checkIsBot = (val: string) => {
    const clean = val.toLowerCase().trim();
    const prefix = clean.split('@')[0] || '';
    const botKeywords = process.env.NODE_ENV === 'production'
      ? ['bot', 'temp', 'fake', 'spam', 'qa-', 'qa_', 'test-', 'test_']
      : ['bot', 'temp', 'fake', 'spam'];
    return botKeywords.some((keyword) => prefix.includes(keyword));
  };

  const handleIdentifierChange = (val: string) => {
    setIdentifier(val);
    setIsBot(checkIsBot(val));
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isBot || checkIsBot(identifier)) {
      setError('Bot user detected. Access restricted.');
      return;
    }

    if (!identifier.trim() || !password) {
      setError('Please enter your email/username and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await signIn('credentials', {
        redirect: false,
        email: identifier.trim(),
        password,
      });

      if (res?.error) {
        setIsSubmitting(false);
        if (res.error === 'suspended') {
          setError('Your account has been suspended. You cannot log in.');
        } else if (res.error === 'banned') {
          setError('Your account has been permanently blocked.');
        } else if (res.error === 'unverified_email') {
          router.push(`/auth/verify-email?email=${encodeURIComponent(identifier.trim())}`);
        } else {
          setError('Invalid login details. Please check email/username and password.');
        }
      } else {
        window.location.href = '/feed';
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err?.message || 'Login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-[calc(100dvh-4rem)] w-full flex flex-col justify-between bg-[#FAFAF9] dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 transition-colors">
      
      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center w-full">
          
          {/* ========================================================================= */}
          {/* LEFT COLUMN (Desktop Showcase / Mobile Header + Graphic)                 */}
          {/* ========================================================================= */}
          <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left">
            
            {/* Tolee Brand Logo */}
            <div className="flex items-center gap-2.5 mb-4 sm:mb-6">
              <Link href="/" className="inline-block group">
                <span className="text-4xl sm:text-5xl font-black tracking-tight text-[#0E9F9A] group-hover:opacity-90 transition-opacity">
                  tolee
                </span>
              </Link>
              <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/80 text-[#0E9F9A] border border-teal-200/60 dark:border-teal-800/60">
                Community
              </span>
            </div>

            {/* Headline with highlight styling (Referencing Instagram landing style) */}
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white leading-[1.15] tracking-tight max-w-xl">
              See everyday moments from your{' '}
              <span className="bg-gradient-to-r from-[#0E9F9A] via-teal-500 to-emerald-500 bg-clip-text text-transparent">
                local neighborhood.
              </span>
            </h1>

            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-zinc-400 max-w-lg font-medium">
              Connect with nearby interest communities, watch local reels, drop radar alerts, and discover what’s happening around you.
            </p>

            {/* Feature Pills Preview */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mt-4 mb-6">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 shadow-xs">
                <Radio className="w-3.5 h-3.5 text-[#0E9F9A]" />
                <span>Radar Alerts</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 shadow-xs">
                <Film className="w-3.5 h-3.5 text-purple-500" />
                <span>Reels</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 shadow-xs">
                <Users className="w-3.5 h-3.5 text-blue-500" />
                <span>Groups</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 shadow-xs">
                <Bot className="w-3.5 h-3.5 text-emerald-500" />
                <span>Tolee AI</span>
              </div>
            </div>

            {/* Visual Mixing Graphic (Hero Artwork) */}
            <div className="relative w-full max-w-md sm:max-w-lg lg:max-w-xl mt-2 group">
              {/* Ambient Glow */}
              <div className="absolute -inset-2 bg-gradient-to-r from-teal-500/20 via-emerald-500/20 to-[#0E9F9A]/20 rounded-3xl blur-2xl opacity-60 group-hover:opacity-80 transition duration-500 pointer-events-none" />
              
              <div className="relative rounded-3xl overflow-hidden border border-slate-200/90 dark:border-zinc-800/90 shadow-2xl bg-white dark:bg-zinc-950 aspect-square sm:aspect-square flex items-center justify-center">
                <Image
                  src="/tolee-hero-collage.jpg"
                  alt="Tolee Social Network: Radar, Reels, Communities & AI"
                  width={640}
                  height={640}
                  priority
                  className="w-full h-full object-cover transform transition-transform duration-700 hover:scale-[1.02]"
                />

                {/* Floating Interactive Badge (Bottom Left) */}
                <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-black/80 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/40 dark:border-zinc-800 shadow-lg flex items-center gap-2.5 animate-in fade-in-50">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#0E9F9A] animate-ping" />
                  <span className="text-xs font-black text-slate-800 dark:text-zinc-100">
                    Live Neighborhood Radar
                  </span>
                </div>

                {/* Floating AI Badge (Top Right) */}
                <div className="absolute top-4 right-4 bg-white/90 dark:bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/40 dark:border-zinc-800 shadow-lg flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-200">
                    Powered by Tolee AI
                  </span>
                </div>
              </div>
            </div>

          </div>


          {/* ========================================================================= */}
          {/* RIGHT COLUMN (Direct Login Form)                                          */}
          {/* ========================================================================= */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto">
            
            <div className="bg-white dark:bg-[#121212] rounded-3xl border border-slate-200/90 dark:border-zinc-800 shadow-xl shadow-slate-200/40 dark:shadow-none p-6 sm:p-8">
              
              <div className="mb-6">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Log into Tolee
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  Welcome back! Enter your details to continue.
                </p>
              </div>

              {/* Alert Messages */}
              {successMessage && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  {successMessage}
                </div>
              )}
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs font-semibold text-rose-700 dark:text-rose-300">
                  {error}
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                    Email, username or phone
                  </label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => handleIdentifierChange(e.target.value)}
                    required
                    placeholder="Mobile number, username or email"
                    className={`w-full px-4 py-3 text-sm rounded-xl border bg-slate-50/50 dark:bg-zinc-900/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] focus:border-transparent transition-all ${
                      isBot ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-200 dark:border-zinc-800'
                    }`}
                  />
                  {isBot && (
                    <p className="text-rose-500 text-[11px] mt-1 font-semibold">
                      ⚠️ Bot pattern detected. Access restricted.
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                      Password
                    </label>
                    <Link
                      href="/auth/forgot-password"
                      className="text-xs font-bold text-[#0E9F9A] hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Password"
                      className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#0E9F9A] focus:border-transparent transition-all pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 cursor-pointer transition-colors"
                      tabIndex={-1}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Primary Log in Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || isBot}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#0E9F9A] to-[#0a7c85] hover:opacity-95 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md shadow-teal-500/20 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Logging in...</span>
                    </>
                  ) : (
                    <span>Log in</span>
                  )}
                </button>
              </form>

              {/* Divider: OR */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-zinc-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase font-extrabold">
                  <span className="px-3 bg-white dark:bg-[#121212] text-slate-400 dark:text-zinc-500">
                    OR
                  </span>
                </div>
              </div>

              {/* Continue with Google */}
              <button
                type="button"
                onClick={() => startGoogleLogin('/feed')}
                className="w-full py-3 px-4 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-bold text-sm flex items-center justify-center gap-3 transition-colors shadow-xs cursor-pointer"
              >
                <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Create New Account Button */}
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800/80">
                <Link
                  href="/signup"
                  className="w-full py-3 px-4 rounded-xl border border-teal-500/40 text-[#0E9F9A] dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30 font-extrabold text-sm flex items-center justify-center gap-1.5 transition-all"
                >
                  <span>Create new account</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </Link>
              </div>

              {/* Explore Public Feed Link */}
              <div className="mt-4 text-center">
                <Link
                  href="/discover"
                  className="text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-[#0E9F9A] transition-colors inline-flex items-center gap-1"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Explore public communities without login</span>
                </Link>
              </div>

            </div>

            {/* Trust badge note */}
            <div className="mt-4 text-center text-[11px] text-slate-400 dark:text-zinc-500 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Verified local communities & secure encrypted accounts</span>
            </div>

          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* FOOTER (Similar to Instagram Landing Footer)                              */}
      {/* ========================================================================= */}
      <footer className="py-6 px-4 border-t border-slate-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          
          {/* Footer Navigation Links */}
          <div className="flex flex-wrap justify-center sm:justify-start gap-x-5 gap-y-2 text-xs font-medium text-slate-500 dark:text-zinc-400">
            <Link href="/about" className="hover:text-[#0E9F9A] transition-colors">About</Link>
            <Link href="/radar" className="hover:text-[#0E9F9A] transition-colors">Radar</Link>
            <Link href="/reels" className="hover:text-[#0E9F9A] transition-colors">Reels</Link>
            <Link href="/discover" className="hover:text-[#0E9F9A] transition-colors">Communities</Link>
            <Link href="/marketplace" className="hover:text-[#0E9F9A] transition-colors">Marketplace</Link>
            <Link href="/privacy" className="hover:text-[#0E9F9A] transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-[#0E9F9A] transition-colors">Terms</Link>
            <Link href="/contact" className="hover:text-[#0E9F9A] transition-colors">Help</Link>
          </div>

          {/* Copyright Branding */}
          <div className="text-xs font-semibold text-slate-400 dark:text-zinc-500">
            <span>© 2026 Tolee India</span>
          </div>

        </div>
      </footer>

    </div>
  );
}
