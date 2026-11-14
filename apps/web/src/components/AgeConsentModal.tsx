"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Shield, AlertTriangle, CheckCircle2, Calendar, Loader2, X } from 'lucide-react';
import { calculateAge, MINIMUM_REGISTRATION_AGE, ADULT_AGE, UNDERAGE_ERROR_MESSAGE } from '@/lib/ageValidation';

export function AgeConsentModal() {
  const { data: session, status, update } = useSession();

  const [isOpen, setIsOpen] = useState(false);
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);
  const [parentalConsentChecked, setParentalConsentChecked] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Days, Months, Years helpers
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = [
    { num: 1, name: 'Jan' }, { num: 2, name: 'Feb' }, { num: 3, name: 'Mar' },
    { num: 4, name: 'Apr' }, { num: 5, name: 'May' }, { num: 6, name: 'Jun' },
    { num: 7, name: 'Jul' }, { num: 8, name: 'Aug' }, { num: 9, name: 'Sep' },
    { num: 10, name: 'Oct' }, { num: 11, name: 'Nov' }, { num: 12, name: 'Dec' },
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

  // Compute Age dynamically
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

  // Form validity check
  const isFormValid = useMemo(() => {
    if (!isDobComplete || isUnderage || !consentChecked) return false;
    if (isMinor && !parentalConsentChecked) return false;
    return true;
  }, [isDobComplete, isUnderage, consentChecked, isMinor, parentalConsentChecked]);

  // 2-Minute Timer for logged-in users who need age verification
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) return;

    // Check if user is already verified
    const isVerified = (session.user as any)?.ageVerified === true;
    if (isVerified) return;

    // Check if dismissed in this session
    const dismissed = sessionStorage.getItem('tolee_age_consent_dismissed') === 'true';
    if (dismissed) return;

    // Track login time to trigger modal after 2 minutes (120,000 ms)
    const loginTimeKey = 'tolee_session_login_time';
    let loginTime = sessionStorage.getItem(loginTimeKey);
    if (!loginTime) {
      loginTime = Date.now().toString();
      sessionStorage.setItem(loginTimeKey, loginTime);
    }

    const elapsed = Date.now() - parseInt(loginTime, 10);
    const delay = Math.max(0, 120000 - elapsed); // 2 minutes

    const timer = setTimeout(async () => {
      try {
        // Double check with server in case session token is stale
        const res = await fetch('/api/auth/consent');
        if (res.ok) {
          const data = await res.json();
          if (data.hasConsent) return;
        }
      } catch (e) {
        // Ignore network errors and proceed with prompt
      }
      setIsOpen(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [session, status]);

  const handleDismiss = () => {
    sessionStorage.setItem('tolee_age_consent_dismissed', 'true');
    setIsOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !dobDate) return;

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

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
          signupMethod: 'PostLoginModal'
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to confirm age and consent. Please try again.');
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg('Thank you! Your age and legal consent have been recorded.');
      sessionStorage.removeItem('tolee_age_consent_dismissed');
      
      // Update next-auth session
      if (update) {
        await update({ ageVerified: true });
      }

      setTimeout(() => {
        setIsOpen(false);
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md w-[95vw] max-w-lg p-0 overflow-hidden bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl">
        {/* Header banner */}
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-5 text-white relative">
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/20 transition-colors text-white"
            title="Remind me later"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white">
                Confirm Your Date of Birth
              </DialogTitle>
              <DialogDescription className="text-teal-100 text-xs mt-0.5">
                Help keep Tolee safe & compliant (13+ Community)
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Date of Birth Selection */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                Date of Birth * [ DD / MM / YYYY ]
              </label>

              <div className="grid grid-cols-3 gap-2">
                <select
                  value={day}
                  onChange={e => setDay(e.target.value)}
                  required
                  className="w-full px-2.5 py-2.5 text-xs bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Day</option>
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
                  className="w-full px-2.5 py-2.5 text-xs bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Month</option>
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
                  className="w-full px-2.5 py-2.5 text-xs bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Year</option>
                  {years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Dynamic Age Feedback */}
              {isDobComplete && (
                <div className="pt-2">
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

            {/* Parental Consent Checkbox for Minors (13-17) */}
            {isMinor && (
              <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 p-3 rounded-xl">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700 dark:text-zinc-300 select-none">
                  <input
                    type="checkbox"
                    checked={parentalConsentChecked}
                    onChange={e => setParentalConsentChecked(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-gray-300 dark:border-zinc-700 cursor-pointer"
                  />
                  <span className="leading-relaxed">
                    <strong>Parental / Guardian Consent:</strong> I confirm that my parent or legal guardian has permitted me to join and use Tolee.
                  </span>
                </label>
              </div>
            )}

            {/* Mandatory Confirmation Checkbox */}
            <div className="bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 p-3 rounded-xl">
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

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleDismiss}
                className="w-1/3 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              >
                Remind Later
              </button>

              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="flex-1 text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-105"
                style={{
                  background: isFormValid
                    ? 'linear-gradient(135deg, #0E9F9A, #0d9488)'
                    : '#94a3b8'
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Confirm & Continue'
                )}
              </button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
