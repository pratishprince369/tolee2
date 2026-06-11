"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, CheckCircle2, XCircle, Loader2, Link2 } from 'lucide-react';
import { getOnboardingStatus, checkUsernameAvailability, saveUsername } from '@/actions/user';

export function UsernameSetupModal() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    checked: boolean;
    available: boolean;
    reason?: string;
  }>({ checked: false, available: false });
  
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Check if setup is needed
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) return;

    // Check sessionStorage to see if they skipped this session
    const hasSkipped = sessionStorage.getItem('tolee_username_skipped') === 'true';
    if (hasSkipped) return;

    const checkStatus = async () => {
      const res = await getOnboardingStatus();
      if (res.success) {
        // If basic onboarding (location/phone) is complete, but they have no username:
        if (!res.onboardingRequired && !res.username) {
          // Wait 3 seconds before displaying as required
          const timer = setTimeout(() => {
            setIsOpen(true);
          }, 3000);
          return () => clearTimeout(timer);
        }
      }
    };

    checkStatus();
  }, [session, status]);

  // Debounced real-time availability check
  useEffect(() => {
    if (!username.trim()) {
      setValidationResult({ checked: false, available: false });
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    
    // Quick local checks to avoid excessive API requests
    if (cleanUsername.length < 3) {
      setValidationResult({ checked: true, available: false, reason: 'Username must be at least 3 characters long.' });
      return;
    }
    if (cleanUsername.length > 30) {
      setValidationResult({ checked: true, available: false, reason: 'Username cannot exceed 30 characters.' });
      return;
    }
    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      setValidationResult({ checked: true, available: false, reason: 'Username can only contain letters, numbers, and underscores.' });
      return;
    }

    setIsValidating(true);
    setErrorMsg('');

    const delayDebounce = setTimeout(async () => {
      try {
        const res = await checkUsernameAvailability(cleanUsername);
        if (res.success) {
          setValidationResult({
            checked: true,
            available: res.available || false,
            reason: res.reason
          });
        } else {
          setValidationResult({
            checked: true,
            available: false,
            reason: 'Error checking availability.'
          });
        }
      } catch (err) {
        setValidationResult({
          checked: true,
          available: false,
          reason: 'Network error checking availability.'
        });
      } finally {
        setIsValidating(false);
      }
    }, 450); // 450ms debounce delay

    return () => clearTimeout(delayDebounce);
  }, [username]);

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validationResult.available || isSaving) return;

    setIsSaving(true);
    setErrorMsg('');

    try {
      const cleanUsername = username.trim().toLowerCase();
      const res = await saveUsername(cleanUsername);
      if (res.success) {
        // Update NextAuth Session with the new username
        await update({ username: cleanUsername });
        
        setIsOpen(false);
        // Direct push to their new shiny public page!
        router.push(`/u/${cleanUsername}`);
        router.refresh();
      } else {
        setErrorMsg(res.error || 'Failed to save username. Please try again.');
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Skip (Later)
  const handleSkip = () => {
    sessionStorage.setItem('tolee_username_skipped', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-md bg-white/95 dark:bg-[#121212]/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/50 shadow-2xl rounded-2xl overflow-hidden p-6 gap-0 animate-in fade-in zoom-in-95 duration-200 z-[9999]"
      >
        <DialogHeader className="mb-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
            <User className="w-6 h-6 animate-pulse" />
          </div>
          <DialogTitle className="text-xl font-extrabold text-center text-gray-900 dark:text-gray-50 tracking-tight">
            Choose Your Unique Username
          </DialogTitle>
          <DialogDescription className="text-sm text-center text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
            Your username will become your permanent, professional Tolee profile link.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400 text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Username</label>
            <div className="relative">
              <Input
                type="text"
                placeholder="e.g. janesmith, mumbai_expert"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ''))}
                required
                className="w-full h-11 pr-10 bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-primary rounded-xl font-medium"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isValidating && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                {!isValidating && validationResult.checked && validationResult.available && (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                )}
                {!isValidating && validationResult.checked && !validationResult.available && (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
              </div>
            </div>

            {/* Validation Feedback */}
            {validationResult.checked && (
              <div className="text-xs font-semibold mt-1">
                {validationResult.available ? (
                  <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                    ✅ Available
                  </span>
                ) : (
                  <span className="text-red-500 flex items-center gap-1">
                    ❌ {validationResult.reason}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Dynamic Link Preview */}
          <div className="p-3.5 bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-900/80 rounded-xl flex items-start gap-2.5">
            <Link2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <span className="font-semibold block text-[11px] text-gray-400 uppercase tracking-wider mb-0.5">Your Profile Link Preview</span>
              <span className="break-all font-mono font-medium text-gray-600 dark:text-gray-300">
                tolee.in/u/{username ? username.trim().toLowerCase() : 'yourname'}
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleSkip}
              className="flex-1 h-11 border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition-all duration-200"
            >
              Later
            </Button>
            <Button
              type="submit"
              disabled={!validationResult.available || isValidating || isSaving}
              className="flex-grow h-11 bg-primary hover:bg-primary/95 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all duration-200"
            >
              {isSaving ? 'Saving...' : 'Save Username'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
