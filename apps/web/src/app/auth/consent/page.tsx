'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar, Shield, CheckCircle2, AlertTriangle, ArrowRight,
  Lock, Loader2, Sparkles, User, ExternalLink
} from 'lucide-react';
import { calculateAge, MINIMUM_REGISTRATION_AGE, ADULT_AGE, UNDERAGE_ERROR_MESSAGE } from '@/lib/ageValidation';
import { BeforeLoginFooter } from '@/components/landing/BeforeLoginFooter';

function ConsentForm() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/feed';

  // Date of Birth fields
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  // Checkboxes (strictly unchecked by default)
  const [consentChecked, setConsentChecked] = useState(false);
  const [parentalConsentChecked, setParentalConsentChecked] = useState(false);

  const [loadingCheck, setLoadingCheck] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Check if current user already has consent
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(`/auth/signin?callbackUrl=${encodeURIComponent('/auth/consent')}`);
      return;
    }

    if (session?.user) {
      fetch('/api/auth/consent')
        .then(r => r.json())
        .then(data => {
          if (data.hasConsent) {
            // Already verified, forward to feed or callbackUrl
            router.replace(callbackUrl);
          } else {
            setLoadingCheck(false);
          }
        })
        .catch(() => setLoadingCheck(false));
    }
  }, [session, status, router, callbackUrl]);

  // Combined ISO Date and Age Calculation
  const { dobDate, calculatedAge, isUnderage, isMinor, isDobComplete } = useMemo(() => {
    if (!day || !month || !year) {
      return { dobDate: null, calculatedAge: null, isUnderage: false, isMinor: false, isDobComplete: false };
    }

    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    const date = new Date(y, m - 1, d);

    // Validate valid calendar day (e.g. not Feb 31)
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

  // Form validity
  const isFormValid = useMemo(() => {
    if (!isDobComplete || isUnderage || calculatedAge === null) return false;
    if (!consentChecked) return false;
    if (isMinor && !parentalConsentChecked) return false;
    return true;
  }, [isDobComplete, isUnderage, calculatedAge, consentChecked, isMinor, parentalConsentChecked]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !dobDate) return;

    setSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/auth/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateOfBirth: dobDate.toISOString(),
          termsAccepted: true,
          privacyPolicyAccepted: true,
          communityGuidelinesAccepted: true,
          consentAccepted: true,
          parentalConsentGranted: isMinor ? parentalConsentChecked : false,
          signupMethod: 'OAuth',
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete registration.');
      }

      // Hard redirect to refresh session and load feed
      window.location.href = data.redirectUrl || callbackUrl;
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred. Please try again.');
      setSubmitting(false);
    }
  };

  if (status === 'loading' || loadingCheck) {
    return (
      <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-teal-600 mx-auto" />
          <p className="text-xs text-gray-500 font-semibold tracking-wide">Checking verification status...</p>
        </div>
      </div>
    );
  }

  // Days (1 to 31)
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  // Months
  const months = [
    { num: 1, name: 'January' }, { num: 2, name: 'February' }, { num: 3, name: 'March' },
    { num: 4, name: 'April' }, { num: 5, name: 'May' }, { num: 6, name: 'June' },
    { num: 7, name: 'July' }, { num: 8, name: 'August' }, { num: 9, name: 'September' },
    { num: 10, name: 'October' }, { num: 11, name: 'November' }, { num: 12, name: 'December' },
  ];
  // Years (from current year down 100 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] flex flex-col justify-between font-sans">
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="bg-white dark:bg-[#121215] p-8 sm:p-10 rounded-3xl shadow-xl border border-gray-200/80 dark:border-zinc-800 w-full max-w-lg space-y-6">
          
          {/* Brand Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0E9F9A] to-teal-400 text-white shadow-md shadow-teal-500/20 mb-1">
              <span className="text-2xl font-black">T</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white">
              Welcome to Tolee!
            </h1>
            <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
              Join our community and connect with people, businesses, creators and groups.
            </p>
          </div>

          {/* Connected Profile Preview Card */}
          {session?.user && (
            <div className="bg-gray-50 dark:bg-zinc-900/60 border border-gray-200/60 dark:border-zinc-800 rounded-2xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-950/40 border border-teal-500/20 flex items-center justify-center overflow-hidden">
                  {session.user.image ? (
                    <img src={session.user.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  )}
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-gray-900 dark:text-white">{session.user.name || 'New Member'}</div>
                  <div className="text-[11px] text-gray-500 dark:text-zinc-400 truncate max-w-[200px]">{session.user.email}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                className="text-[11px] font-semibold text-gray-500 hover:text-red-500 transition-colors"
              >
                Switch Account
              </button>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-semibold p-3.5 rounded-xl text-center">
              ⚠️ {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Date of Birth Input Section */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
                Date of Birth <span className="text-red-500">*</span>
              </label>

              <div className="grid grid-cols-3 gap-2">
                {/* Day */}
                <div>
                  <select
                    value={day}
                    onChange={e => setDay(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">DD</option>
                    {days.map(d => (
                      <option key={d} value={d < 10 ? `0${d}` : `${d}`}>
                        {d < 10 ? `0${d}` : d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Month */}
                <div>
                  <select
                    value={month}
                    onChange={e => setMonth(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">MM</option>
                    {months.map(m => (
                      <option key={m.num} value={m.num < 10 ? `0${m.num}` : `${m.num}`}>
                        {m.num < 10 ? `0${m.num}` : m.num} - {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Year */}
                <div>
                  <select
                    value={year}
                    onChange={e => setYear(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">YYYY</option>
                    {years.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Age Feedback / Rejection State */}
              {isDobComplete && (
                <div className="pt-1">
                  {isUnderage ? (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{UNDERAGE_ERROR_MESSAGE}</span>
                    </div>
                  ) : isMinor ? (
                    <div className="bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 p-3 rounded-xl text-xs font-semibold space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Shield className="w-3.5 h-3.5 text-amber-500" />
                        <span>Age: {calculatedAge} years old (Under 18)</span>
                      </div>
                      <p className="text-[11px] leading-tight text-amber-600 dark:text-amber-300/80">
                        Please confirm parental or legal guardian consent below to proceed.
                      </p>
                    </div>
                  ) : (
                    <div className="text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Age: {calculatedAge} years old (Eligible to register)</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Minor: Parental Consent Checkbox */}
            {isMinor && (
              <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/60 dark:border-amber-900/30 p-3.5 rounded-2xl">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700 dark:text-zinc-300 select-none">
                  <input
                    type="checkbox"
                    checked={parentalConsentChecked}
                    onChange={e => setParentalConsentChecked(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-gray-300 dark:border-zinc-700 cursor-pointer"
                  />
                  <span className="leading-relaxed">
                    <strong>Parental / Guardian Consent:</strong> I confirm that my parent or legal guardian has reviewed and permitted my use of Tolee in accordance with applicable laws.
                  </span>
                </label>
              </div>
            )}

            {/* Mandatory Consent Checkbox (Strictly Unchecked by Default) */}
            <div className="bg-gray-50/80 dark:bg-zinc-900/40 border border-gray-200/80 dark:border-zinc-800 p-4 rounded-2xl">
              <label className="flex items-start gap-3 cursor-pointer text-xs text-slate-700 dark:text-zinc-300 select-none">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={e => setConsentChecked(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-gray-300 dark:border-zinc-700 cursor-pointer"
                />
                <span className="leading-relaxed font-medium">
                  I confirm that I am at least 13 years old and agree to Tolee's{' '}
                  <Link href="/terms" target="_blank" className="text-teal-600 dark:text-teal-400 font-bold hover:underline inline-flex items-center gap-0.5">
                    Terms & Conditions
                  </Link>
                  ,{' '}
                  <Link href="/privacy" target="_blank" className="text-teal-600 dark:text-teal-400 font-bold hover:underline inline-flex items-center gap-0.5">
                    Privacy Policy
                  </Link>
                  , and{' '}
                  <Link href="/community-guidelines" target="_blank" className="text-teal-600 dark:text-teal-400 font-bold hover:underline inline-flex items-center gap-0.5">
                    Community Guidelines
                  </Link>
                  .
                </span>
              </label>
            </div>

            {/* Submit Button (Strictly Disabled until all conditions met) */}
            <button
              type="submit"
              disabled={!isFormValid || submitting}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-105 active:scale-[0.99]"
              style={{
                background: isFormValid
                  ? 'linear-gradient(135deg, #0E9F9A, #0d9488)'
                  : '#94a3b8'
              }}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating Your Account...
                </>
              ) : (
                <>
                  Create My Account <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-[11px] text-gray-400 dark:text-zinc-500 text-center leading-relaxed">
            Your birth date is protected securely as private personal information and will not be displayed publicly on your profile.
          </p>
        </div>
      </div>
      <BeforeLoginFooter />
    </div>
  );
}

export default function ConsentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    }>
      <ConsentForm />
    </Suspense>
  );
}
