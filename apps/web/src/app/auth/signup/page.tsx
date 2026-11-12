'use client';
import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { startGoogleLogin, setupNativeGoogleCallbacks } from '@/lib/google-native';
import { checkBotStatus } from '@/lib/botDetection';
import { BeforeLoginFooter } from '@/components/landing/BeforeLoginFooter';
import { calculateAge, MINIMUM_REGISTRATION_AGE, ADULT_AGE, UNDERAGE_ERROR_MESSAGE } from '@/lib/ageValidation';
import { Shield, AlertTriangle, CheckCircle2, Lock } from 'lucide-react';

// Inner component that uses useSearchParams — must be inside Suspense
function SignupForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');

  // Date of Birth fields
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  // Consent Checkboxes (strictly unchecked by default)
  const [consentChecked, setConsentChecked] = useState(false);
  const [parentalConsentChecked, setParentalConsentChecked] = useState(false);

  const [honeypotValue, setHoneypotValue] = useState('');
  const [isBot, setIsBot] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchParams = useSearchParams();
  const urlError = searchParams.get('error');
  const [error, setError] = useState(urlError ? `Authentication error: ${urlError}` : '');
  const router = useRouter();

  const handleEmailChange = (val: string) => {
    setEmail(val);
    setIsBot(checkBotStatus(val, name));
  };

  const handleNameChange = (val: string) => {
    setName(val);
    setIsBot(checkBotStatus(email, val));
  };

  useEffect(() => {
    try {
      const ref = searchParams.get('ref');
      if (ref) {
        localStorage.setItem('tolee_referral_code', ref);
        document.cookie = `tolee_referral_code=${encodeURIComponent(ref)}; max-age=${30 * 24 * 60 * 60}; path=/; SameSite=Lax;`;
      } else {
        const storedRef = localStorage.getItem('tolee_referral_code');
        if (storedRef) {
          document.cookie = `tolee_referral_code=${encodeURIComponent(storedRef)}; max-age=${30 * 24 * 60 * 60}; path=/; SameSite=Lax;`;
        }
      }
    } catch (e) {
      console.warn("localStorage or document.cookie not accessible", e);
    }
  }, [searchParams]);

  useEffect(() => {
    try {
      const cleanup = setupNativeGoogleCallbacks();
      return cleanup;
    } catch (e) {
      // Gracefully ignore if native callbacks not available (web browser)
    }
  }, []);

  // Combined ISO Date and Age Calculation
  const { dobDate, calculatedAge, isUnderage, isMinor, isDobComplete } = useMemo(() => {
    if (!day || !month || !year) {
      return { dobDate: null, calculatedAge: null, isUnderage: false, isMinor: false, isDobComplete: false };
    }

    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    const date = new Date(y, m - 1, d);

    if (
      date.getFullYear() !== y ||
      date.getMonth() !== m - 1 ||
      date.getDate() !== d
    ) {
      return { dobDate: null, calculatedAge: null, isUnderage: false, isMinor: false, isDobComplete: false };
    }

    const age = calculateAge(date);
    return {
      dobDate: date,
      calculatedAge: age,
      isUnderage: age < MINIMUM_REGISTRATION_AGE,
      isMinor: age >= MINIMUM_REGISTRATION_AGE && age < ADULT_AGE,
      isDobComplete: true,
    };
  }, [day, month, year]);

  // Mandatory requirements check for enabling button
  const isFormValid = useMemo(() => {
    if (!name.trim() || !email.trim() || !password || password.length < 6) return false;
    if (!isDobComplete || isUnderage || calculatedAge === null) return false;
    if (!consentChecked) return false;
    if (isMinor && !parentalConsentChecked) return false;
    if (isBot) return false;
    return true;
  }, [name, email, password, isDobComplete, isUnderage, calculatedAge, consentChecked, isMinor, parentalConsentChecked, isBot]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isFormValid || !dobDate) {
      if (isUnderage) {
        setError(UNDERAGE_ERROR_MESSAGE);
      } else if (!consentChecked) {
        setError('You must confirm that you are at least 13 years old and agree to Tolee’s Terms, Privacy Policy, and Community Guidelines.');
      } else if (isMinor && !parentalConsentChecked) {
        setError('Parental or guardian permission is required for users under 18 years old.');
      }
      return;
    }

    if (honeypotValue || isBot || checkBotStatus(email, name)) {
      setError('Bot user detected or invalid name formatting. Please use a proper name.');
      return;
    }

    setIsSubmitting(true);
    try {
      const storedRef = typeof window !== 'undefined' ? localStorage.getItem('tolee_referral_code') : null;
      const ref = searchParams.get('ref') || storedRef || '';
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          mobile: mobile.trim() || undefined,
          dateOfBirth: dobDate.toISOString(),
          termsAccepted: true,
          privacyPolicyAccepted: true,
          communityGuidelinesAccepted: true,
          consentAccepted: true,
          parentalConsentGranted: isMinor ? parentalConsentChecked : false,
          signupMethod: mobile.trim() ? 'Mobile' : 'Email',
          website: honeypotValue,
          ref
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Registration failed');
        setIsSubmitting(false);
        return;
      }
      try {
        sessionStorage.setItem('temp_reg_pass', password);
      } catch (e) {
        console.warn("sessionStorage is not accessible", e);
      }
      router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = [
    { num: 1, name: 'Jan' }, { num: 2, name: 'Feb' }, { num: 3, name: 'Mar' },
    { num: 4, name: 'Apr' }, { num: 5, name: 'May' }, { num: 6, name: 'Jun' },
    { num: 7, name: 'Jul' }, { num: 8, name: 'Aug' }, { num: 9, name: 'Sep' },
    { num: 10, name: 'Oct' }, { num: 11, name: 'Nov' }, { num: 12, name: 'Dec' },
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] flex flex-col justify-between font-sans">
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="bg-white dark:bg-[#121212] p-8 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 w-full max-w-md">

          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Create Your Tolee Account
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Join our community and connect with people, creators & groups
            </p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-semibold p-3 rounded-xl text-center">
              ⚠️ {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Honeypot field */}
            <div className="hidden" aria-hidden="true">
              <input
                type="text"
                name="honeypot_field"
                value={honeypotValue}
                onChange={e => setHoneypotValue(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-1">Full Name *</label>
              <input
                type="text" value={name} onChange={e => handleNameChange(e.target.value)} required
                className={`w-full px-3 py-2 text-sm border rounded-xl dark:bg-gray-900 ${isBot ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300 dark:border-zinc-700'}`}
                placeholder="Your Name"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-1">Email *</label>
              <input
                type="email" value={email} onChange={e => handleEmailChange(e.target.value)} required
                className={`w-full px-3 py-2 text-sm border rounded-xl dark:bg-gray-900 ${isBot ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300 dark:border-zinc-700'}`}
                placeholder="you@example.com"
              />
              {isBot && <p className="text-red-500 text-xs mt-1 font-semibold">⚠️ Bot pattern detected. Please use a proper name and email.</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-1">Mobile Number (Optional)</label>
              <input
                type="tel" value={mobile} onChange={e => setMobile(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-zinc-700 rounded-xl dark:bg-gray-900"
                placeholder="+91 XXXXX XXXXX"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-1">Password * (Min 6 chars)</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-zinc-700 rounded-xl dark:bg-gray-900"
                placeholder="••••••••"
              />
            </div>

            {/* Mandatory Date of Birth (13+ Requirement) */}
            <div className="pt-1 space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
                Date of Birth * [ DD / MM / YYYY ]
              </label>

              <div className="grid grid-cols-3 gap-2">
                <select
                  value={day}
                  onChange={e => setDay(e.target.value)}
                  required
                  className="w-full px-2.5 py-2 text-xs bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-white"
                >
                  <option value="">DD</option>
                  {days.map(d => (
                    <option key={d} value={d < 10 ? `0${d}` : `${d}`}>
                      {d < 10 ? `0${d}` : d}
                    </option>
                  ))}
                </select>

                <select
                  value={month}
                  onChange={e => setMonth(e.target.value)}
                  required
                  className="w-full px-2.5 py-2 text-xs bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-white"
                >
                  <option value="">MM</option>
                  {months.map(m => (
                    <option key={m.num} value={m.num < 10 ? `0${m.num}` : `${m.num}`}>
                      {m.num < 10 ? `0${m.num}` : m.num} - {m.name}
                    </option>
                  ))}
                </select>

                <select
                  value={year}
                  onChange={e => setYear(e.target.value)}
                  required
                  className="w-full px-2.5 py-2 text-xs bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-white"
                >
                  <option value="">YYYY</option>
                  {years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Dynamic Age Feedback */}
              {isDobComplete && (
                <div className="pt-1">
                  {isUnderage ? (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 p-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{UNDERAGE_ERROR_MESSAGE}</span>
                    </div>
                  ) : isMinor ? (
                    <div className="text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" />
                      <span>Age: {calculatedAge} years old (Under 18 — Parental consent required below)</span>
                    </div>
                  ) : (
                    <div className="text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Age: {calculatedAge} years old (13+ Verified)</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Minor: Parental Consent Checkbox */}
            {isMinor && (
              <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/60 dark:border-amber-900/30 p-3 rounded-xl">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700 dark:text-zinc-300 select-none">
                  <input
                    type="checkbox"
                    checked={parentalConsentChecked}
                    onChange={e => setParentalConsentChecked(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-gray-300 dark:border-zinc-700 cursor-pointer"
                  />
                  <span className="leading-relaxed">
                    <strong>Parental / Guardian Consent:</strong> I confirm that my parent or legal guardian has permitted me to join Tolee.
                  </span>
                </label>
              </div>
            )}

            {/* Mandatory Legal Consent Checkbox (Strictly Unchecked by Default) */}
            <div className="bg-gray-50/80 dark:bg-zinc-900/40 border border-gray-200/80 dark:border-zinc-800 p-3 rounded-xl">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700 dark:text-zinc-300 select-none">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={e => setConsentChecked(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-gray-300 dark:border-zinc-700 cursor-pointer"
                />
                <span className="leading-relaxed font-medium">
                  I confirm that I am at least 13 years old and agree to Tolee's{' '}
                  <Link href="/terms" target="_blank" className="text-teal-600 dark:text-teal-400 font-bold underline">
                    Terms & Conditions
                  </Link>
                  ,{' '}
                  <Link href="/privacy" target="_blank" className="text-teal-600 dark:text-teal-400 font-bold underline">
                    Privacy Policy
                  </Link>
                  , and{' '}
                  <Link href="/community-guidelines" target="_blank" className="text-teal-600 dark:text-teal-400 font-bold underline">
                    Community Guidelines
                  </Link>
                  .
                </span>
              </label>
            </div>

            {/* Create Account Button (Strictly Disabled until Consent & 13+ met) */}
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="w-full text-white py-3 rounded-xl font-bold text-sm transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-105"
              style={{
                background: isFormValid
                  ? 'linear-gradient(135deg, #0E9F9A, #0d9488)'
                  : '#94a3b8'
              }}
            >
              {isSubmitting ? 'Creating Account...' : 'Create My Account'}
            </button>
          </form>

          {/* Social signup options */}
          <div className="mt-6">
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-800" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="px-2 bg-white dark:bg-[#121212] text-gray-500 font-semibold">Or continue with</span></div>
            </div>

            <div className="space-y-2.5">
              {/* Google */}
              <button
                type="button"
                onClick={() => startGoogleLogin('/auth/consent')}
                className="w-full flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors shadow-xs"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              {/* Facebook */}
              <button
                type="button"
                onClick={() => signIn('facebook', { callbackUrl: '/auth/consent' })}
                className="w-full flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors shadow-xs"
              >
                <svg className="w-4 h-4 fill-[#1877F2]" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Continue with Facebook
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-teal-600 dark:text-teal-400 font-bold hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
      <BeforeLoginFooter />
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}


// Wrap in Suspense to fix "useSearchParams() should be wrapped in a suspense boundary" error
export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}
