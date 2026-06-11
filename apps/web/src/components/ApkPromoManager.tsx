'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { createWalletRewardNotification } from '@/actions/user';

export function ApkPromoManager() {
  const { data: session } = useSession();
  const pathname = usePathname();

  useEffect(() => {
    // Only trigger promo notification for logged-in users
    if (!session?.user) return;

    // Skip trigger on the actual promo page
    if (pathname === '/promo') return;

    const triggerNotificationSilently = async () => {
      try {
        const lastNotif = localStorage.getItem('lastPromoNotifSent');
        const now = Date.now();
        const COOLDOWN = 30 * 60 * 1000; // 30 minutes cooldown in milliseconds

        if (!lastNotif || (now - Number(lastNotif) >= COOLDOWN)) {
          // Call server action to create a real system notification (shown in bell icon)
          const result = await createWalletRewardNotification();
          if (result.success) {
            localStorage.setItem('lastPromoNotifSent', now.toString());
          }
        }
      } catch (err) {
        console.error("Failed to create promo notification:", err);
      }
    };

    // 3-second delay to ensure smooth page load
    const timer = setTimeout(() => {
      triggerNotificationSilently();
    }, 3000);

    return () => clearTimeout(timer);
  }, [session, pathname]);

  return null;
}
