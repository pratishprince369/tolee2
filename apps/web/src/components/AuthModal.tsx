'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { startGoogleLogin, setupNativeGoogleCallbacks } from '@/lib/google-native';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Globe, UserPlus, LogIn, ArrowRight } from 'lucide-react';

interface AuthModalState {
  isOpen: boolean;
  message: string;
}

export function triggerAuthModal(message?: string) {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('open-auth-modal', {
      detail: { message: message || 'Sign up or log in to continue enjoying Tolee.' }
    });
    window.dispatchEvent(event);
  }
}

export function AuthModal() {
  const router = useRouter();
  const [state, setState] = useState<AuthModalState>({
    isOpen: false,
    message: 'Sign up or log in to continue enjoying Tolee.'
  });

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{ message?: string }>;
      setState({
        isOpen: true,
        message: customEvent.detail?.message || 'Sign up or log in to continue enjoying Tolee.'
      });
    };

    window.addEventListener('open-auth-modal', handleOpen);
    return () => {
      window.removeEventListener('open-auth-modal', handleOpen);
    };
  }, []);

  useEffect(() => {
    const cleanup = setupNativeGoogleCallbacks();
    return cleanup;
  }, []);

  const handleClose = (open: boolean) => {
    setState(prev => ({ ...prev, isOpen: open }));
  };

  const getCallbackUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.pathname + window.location.search;
    }
    return '/feed';
  };

  const handleGoogleLogin = () => {
    startGoogleLogin(getCallbackUrl());
  };

  const handleSignUp = () => {
    handleClose(false);
    router.push(`/auth/signup?callbackUrl=${encodeURIComponent(getCallbackUrl())}`);
  };

  const handleSignIn = () => {
    handleClose(false);
    router.push(`/auth/signin?callbackUrl=${encodeURIComponent(getCallbackUrl())}`);
  };

  return (
    <Dialog open={state.isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md border-0 shadow-2xl p-0 overflow-hidden bg-white dark:bg-[#121212] rounded-3xl animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Decorative Top Accent */}
        <div className="h-2 w-full bg-gradient-to-r from-[#0a7c85] via-[#0ea5e9] to-[#10b981]" />
        
        <div className="p-8 text-center flex flex-col items-center">
          {/* Logo Brand Icon */}
          <div className="w-16 h-16 bg-gradient-to-br from-[#0a7c85] to-[#10b981] text-white rounded-2xl flex items-center justify-center font-bold text-3xl shadow-lg shadow-[#0a7c85]/20 mb-5 relative group transition-all duration-300 hover:scale-105">
            t
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-[9px] font-black text-white animate-bounce border-2 border-white dark:border-[#121212]">
              ✨
            </span>
          </div>

          <DialogHeader className="w-full text-center flex flex-col items-center">
            <DialogTitle className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              Join the Conversation <Sparkles className="w-5 h-5 text-emerald-500 animate-pulse" />
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400 text-sm sm:text-base mt-2 max-w-sm leading-relaxed px-1">
              {state.message}
            </DialogDescription>
          </DialogHeader>

          {/* Social Sign-In options */}
          <div className="mt-8 w-full flex flex-col gap-3.5">
            {/* Google Authentication */}
            <Button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-200 py-6 rounded-2xl font-bold hover:bg-gray-50 dark:hover:bg-zinc-800/80 active:scale-[0.98] transition-all duration-200 shadow-sm"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Continue with Google</span>
            </Button>

            {/* Separator Divider */}
            <div className="relative my-2 py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-150 dark:border-zinc-800"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-wider">
                <span className="px-3 bg-white dark:bg-[#121212] text-gray-400 dark:text-zinc-500 font-bold">
                  or
                </span>
              </div>
            </div>

            {/* Register/Signup button */}
            <Button
              onClick={handleSignUp}
              className="w-full bg-gradient-to-r from-[#0a7c85] to-[#10b981] hover:from-[#08666e] hover:to-[#0ea5e9] text-white py-6 rounded-2xl font-black text-base shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 group"
            >
              <UserPlus className="w-4.5 h-4.5" />
              <span>Create a Free Account</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Button>

            {/* Log in with credentials */}
            <Button
              variant="outline"
              onClick={handleSignIn}
              className="w-full border-gray-250 hover:border-gray-350 dark:border-zinc-800 dark:hover:border-zinc-700 hover:bg-gray-50/50 dark:hover:bg-zinc-900/50 text-gray-700 dark:text-zinc-300 py-6 rounded-2xl font-extrabold text-sm active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4 text-gray-400" />
              <span>Log in with Email</span>
            </Button>
          </div>

          <p className="mt-8 text-[11px] text-gray-400 dark:text-zinc-500 max-w-[280px] leading-normal font-medium">
            By signing up, you agree to our{' '}
            <a href="/terms" className="text-primary hover:underline font-semibold">Terms</a>
            {' '}and{' '}
            <a href="/privacy" className="text-primary hover:underline font-semibold">Privacy Policy</a>.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
