"use client";

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { triggerOnboardingNotificationIfNeeded } from '@/actions/user';

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

  return null;
}
