'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { startGoogleLogin, setupNativeGoogleCallbacks } from '@/lib/google-native';
import { useSearchParams } from 'next/navigation';
import { checkBotStatus } from '@/lib/botDetection';

// Inner component that uses useSearchParams — must be inside Suspense
function SignupForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [website, setWebsite] = useState('');
  const [isBot, setIsBot] = useState(false);
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
      if (ref && ref.startsWith('FRN')) {
        localStorage.setItem('tolee_referral_code', ref);
        document.cookie = `tolee_referral_code=${ref}; max-age=${30 * 24 * 60 * 60}; path=/; SameSite=Lax;`;
      } else {
        const storedRef = localStorage.getItem('tolee_referral_code');
        if (storedRef && storedRef.startsWith('FRN')) {
          document.cookie = `tolee_referral_code=${storedRef}; max-age=${30 * 24 * 60 * 60}; path=/; SameSite=Lax;`;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (website || isBot || checkBotStatus(email, name)) {
      setError('Bot user detected or invalid name formatting. Please use a proper name.');
      return;
    }

    try {
      const ref = searchParams.get('ref') || '';
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, website, ref })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Registration failed');
        return;
      }
      try {
        sessionStorage.setItem('temp_reg_pass', password);
      } catch (e) {
        console.warn("sessionStorage is not accessible", e);
      }
      router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] flex items-center justify-center font-sans px-4">
      <div className="bg-white dark:bg-[#121212] p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 w-full max-w-md">

        <h1 className="text-2xl font-bold text-center mb-6">
          Sign Up for Tolee
        </h1>

        {error && <div className="mb-4 text-red-500 text-sm text-center">{error}</div>}

        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Honeypot field */}
          <div className="hidden" aria-hidden="true">
            <input
              type="text"
              name="website"
              value={website}
              onChange={e => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text" value={name} onChange={e => handleNameChange(e.target.value)} required
              className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-900 ${isBot ? 'border-red-500 ring-1 ring-red-500' : ''}`}
              placeholder="Your Name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email" value={email} onChange={e => handleEmailChange(e.target.value)} required
              className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-900 ${isBot ? 'border-red-500 ring-1 ring-red-500' : ''}`}
              placeholder="you@example.com"
            />
            {isBot && <p className="text-red-500 text-xs mt-1 font-semibold">⚠️ Bot pattern or invalid name detected. Please use a proper name and email.</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-900"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={isBot}
            className="w-full bg-primary text-white py-2.5 rounded-lg font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Account
          </button>
        </form>

        {/* Google signup */}
        <div className="mt-6">
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-800" /></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-white dark:bg-[#121212] text-gray-500 font-medium">Or continue with</span></div>
          </div>
          <button
            type="button"
            onClick={() => startGoogleLogin('/feed')}
            className="w-full flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign up with Google
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
          Already have an account?{' '}
          <a href="/auth/signin" className="text-primary font-bold hover:underline">Sign In</a>
        </p>
      </div>
    </div>
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
