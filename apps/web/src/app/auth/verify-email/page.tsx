'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') || '';
  
  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const router = useRouter();

  // Load email query param on mount
  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  // Handle countdown cooldown for resend button
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit code.');
      return;
    }
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Verification failed');
        setLoading(false);
        return;
      }

      setMessage('Email verified successfully! Logging you in...');
      
      // Auto-login if password is cached in sessionStorage
      let password = '';
      try {
        password = sessionStorage.getItem('temp_reg_pass') || '';
      } catch (err) {
        console.warn('sessionStorage is not accessible', err);
      }

      if (password) {
        const signInRes = await signIn('credentials', {
          redirect: false,
          email,
          password,
        });
        
        try {
          sessionStorage.removeItem('temp_reg_pass');
        } catch (e) {}

        if (!signInRes?.error) {
          window.location.href = '/feed';
          return;
        }
      }

      // Redirect to sign in page if auto-login fails or password was not cached
      setTimeout(() => {
        router.push(`/auth/signin?verified=true&email=${encodeURIComponent(email)}`);
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError('');
    setMessage('');
    setResending(true);

    try {
      const res = await fetch('/api/auth/verify-email/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to resend code');
        setResending(false);
        return;
      }

      setMessage('A new 6-digit verification code has been sent to your email.');
      setCooldown(60); // 60s cooldown limit
      
      // If mock test mode, output verification code for testing simplicity
      if (data.otp) {
        console.log(`[TEST OTP] Resent OTP: ${data.otp}`);
      }

    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] flex items-center justify-center font-sans px-4">
      <div className="bg-white dark:bg-[#121212] p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 text-primary rounded-xl mb-3 text-2xl">
            ✉️
          </div>
          <h1 className="text-2xl font-bold">Verify Your Email</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            We sent a verification code to <span className="font-semibold text-gray-800 dark:text-gray-200">{email}</span>
          </p>
        </div>

        {error && <div className="mb-4 text-red-500 text-sm text-center font-medium bg-red-500/10 py-2.5 rounded-lg border border-red-500/20">{error}</div>}
        {message && <div className="mb-4 text-green-500 text-sm text-center font-medium bg-green-500/10 py-2.5 rounded-lg border border-green-500/20">{message}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-center">Enter 6-Digit Code</label>
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              required
              disabled={loading}
              placeholder="123456"
              className="w-full text-center tracking-[12px] text-2xl font-bold py-3 border border-gray-200 dark:border-gray-800 rounded-xl dark:bg-gray-900 focus:border-primary outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Verifying...
              </>
            ) : (
              'Verify Account'
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-gray-100 dark:border-gray-800 pt-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Didn't receive the code?{' '}
            <button
              onClick={handleResend}
              disabled={cooldown > 0 || resending}
              className="text-primary font-bold hover:underline disabled:opacity-50 disabled:no-underline"
            >
              {cooldown > 0 ? `Resend OTP in ${cooldown}s` : resending ? 'Resending...' : 'Resend Code'}
            </button>
          </p>
          <p className="mt-4">
            <a href="/auth/signin" className="text-gray-500 dark:text-gray-400 text-xs hover:underline">
              Back to Sign In
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    }>
      <VerifyEmailForm />
    </Suspense>
  );
}
