'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const router = useRouter();

  // Cooldown timer for resending OTP
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to request reset OTP.');
        setLoading(false);
        return;
      }

      setSuccess('A 6-digit OTP has been sent to your email.');
      setCooldown(60);
      
      // If mock test mode, print verification code to console
      if (data.otp) {
        console.log(`[TEST OTP] Forgot Password OTP: ${data.otp}`);
      }

      setTimeout(() => {
        setSuccess('');
        setStep(2);
        setLoading(false);
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter a 6-digit OTP.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'OTP verification failed.');
        setLoading(false);
        return;
      }

      setSuccess('OTP verified successfully!');
      setTimeout(() => {
        setSuccess('');
        setStep(3);
        setLoading(false);
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, password, confirmPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to reset password.');
        setLoading(false);
        return;
      }

      setSuccess('Password updated successfully.');
      setTimeout(() => {
        router.push(`/auth/signin?email=${encodeURIComponent(email)}`);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
      setLoading(false);
    }
  };

  const triggerResend = async () => {
    if (cooldown > 0) return;
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to resend code.');
        setLoading(false);
        return;
      }

      setSuccess('OTP resent successfully.');
      setCooldown(60);
      
      // If mock test mode, print verification code to console
      if (data.otp) {
        console.log(`[TEST OTP] Resent Forgot Password OTP: ${data.otp}`);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] flex items-center justify-center font-sans px-4">
      <div className="bg-white dark:bg-[#121212] p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 w-full max-w-md">
        
        {/* Step Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 text-primary rounded-xl mb-3 text-2xl">
            🔒
          </div>
          <h1 className="text-2xl font-bold">Reset Password</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {step === 1 && 'Enter your email to request a reset code.'}
            {step === 2 && `Enter the 6-digit OTP code sent to ${email}.`}
            {step === 3 && 'Create a new secure password for your account.'}
          </p>
        </div>

        {error && <div className="mb-4 text-red-500 text-sm text-center font-medium bg-red-500/10 py-2.5 rounded-lg border border-red-500/20">{error}</div>}
        {success && <div className="mb-4 text-green-500 text-sm text-center font-medium bg-green-500/10 py-2.5 rounded-lg border border-green-500/20">{success}</div>}

        {/* Step 1: Email Form */}
        {step === 1 && (
          <form onSubmit={handleRequestOTP} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-lg dark:bg-gray-900 focus:border-primary outline-none transition-colors"
                placeholder="you@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-2.5 rounded-lg font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Requesting Code...
                </>
              ) : (
                'Send Verification OTP'
              )}
            </button>
          </form>
        )}

        {/* Step 2: OTP Entry Form */}
        {step === 2 && (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-center font-sans">Enter 6-Digit OTP</label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                required
                disabled={loading}
                className="w-full text-center tracking-[12px] text-2xl font-bold py-3 border border-gray-200 dark:border-gray-800 rounded-xl dark:bg-gray-900 focus:border-primary outline-none transition-colors"
                placeholder="123456"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-2.5 rounded-lg font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Verifying OTP...
                </>
              ) : (
                'Verify Reset OTP'
              )}
            </button>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={triggerResend}
                disabled={cooldown > 0 || loading}
                className="text-sm text-primary font-bold hover:underline disabled:opacity-50 disabled:no-underline"
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Code'}
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Reset Password Form */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">New Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-lg dark:bg-gray-900 focus:border-primary outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-lg dark:bg-gray-900 focus:border-primary outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-2.5 rounded-lg font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Updating Password...
                </>
              ) : (
                'Update Password'
              )}
            </button>
          </form>
        )}

        <div className="mt-6 text-center border-t border-gray-100 dark:border-gray-800 pt-4">
          <a href="/auth/signin" className="text-gray-500 dark:text-gray-400 text-sm hover:underline">
            Back to Sign In
          </a>
        </div>

      </div>
    </div>
  );
}
