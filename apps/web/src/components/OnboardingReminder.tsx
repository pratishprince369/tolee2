"use client";

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { triggerOnboardingNotificationIfNeeded, triggerReferralInviteNotification } from '@/actions/user';

export function OnboardingReminder() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) return;
    const userId = (session.user as any).id;
    if (!userId) return;

    // Check if session has already been counted in this browser session
    const sessionActive = sessionStorage.getItem('tolee_session_active');
    if (!sessionActive) {
      sessionStorage.setItem('tolee_session_active', 'true');

      // Increment user-specific session count in localStorage
      const storageKey = `tolee_session_count_${userId}`;
      const currentCount = parseInt(localStorage.getItem(storageKey) || '0', 10);
      const newCount = currentCount + 1;
      localStorage.setItem(storageKey, newCount.toString());

      // Trigger notification creation on the server if needed
      triggerOnboardingNotificationIfNeeded(newCount).catch((err) => {
        console.error('Failed to trigger onboarding notification:', err);
      });
    }
  }, [session, status]);

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) return;
    const userId = (session.user as any).id;
    if (!userId) return;

    const lastSentKey = `tolee_referral_invite_sent_${userId}`;
    const lastSent = localStorage.getItem(lastSentKey);
    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000; // 24 hours (once per day)

    if (!lastSent || now - parseInt(lastSent, 10) > cooldown) {
      const timer = setTimeout(() => {
        triggerReferralInviteNotification().then((res) => {
          if (res.success) {
            localStorage.setItem(lastSentKey, now.toString());
          }
        }).catch((err) => {
          console.error('Failed to trigger referral invite notification:', err);
        });
      }, 5000); // 5 seconds delay

      return () => clearTimeout(timer);
    }
  }, [session, status]);

  return null;
}
