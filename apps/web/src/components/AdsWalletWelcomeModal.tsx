'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { checkAndInitializeWallet } from '@/actions/ads';

export function AdsWalletWelcomeModal() {
  const { data: session } = useSession();

  useEffect(() => {
    // 1. Capture referral code from URL if present
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get('ref');
      if (ref) {
        localStorage.setItem('tolee_referred_by', ref);
      }
    }
  }, []);

  useEffect(() => {
    // 2. If user is logged in, attempt background wallet initialization & notification dispatch
    if (session?.user) {
      const userId = (session.user as any).id;
      if (!userId) return;

      const welcomeShownKey = `tolee_ads_welcome_shown_${userId}`;
      const hasShown = localStorage.getItem(welcomeShownKey);

      if (!hasShown) {
        const referredBy = localStorage.getItem('tolee_referred_by') || localStorage.getItem('tolee_referral_code') || undefined;
        
        checkAndInitializeWallet(referredBy).then((res) => {
          if (res.success) {
            localStorage.setItem(welcomeShownKey, 'true');
            localStorage.removeItem('tolee_referred_by');
            localStorage.removeItem('tolee_referral_code');
            try {
              document.cookie = 'tolee_referral_code=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
            } catch (cookieErr) {}
          }
        });
      }
    }
  }, [session]);

  // NEVER DISPLAY POPUP MODAL ON SCREEN AGAIN (User requested notification drawer / bell icon only)
  return null;
}
