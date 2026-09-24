'use client';

import dynamic from 'next/dynamic';

// ponytail: Asynchronously code-split heavy global modals and listeners so initial page load bundle is lean
const OfflineSmartPocketBanner = dynamic(() => import('@/components/OfflineSmartPocketBanner').then(m => m.OfflineSmartPocketBanner), { ssr: false });
const GlobalAlarmListener = dynamic(() => import('@/components/GlobalAlarmListener').then(m => m.GlobalAlarmListener), { ssr: false });
const CallInterface = dynamic(() => import('@/components/CallInterface').then(m => m.CallInterface), { ssr: false });
const OnboardingModal = dynamic(() => import('@/components/OnboardingModal').then(m => m.OnboardingModal), { ssr: false });
const OnboardingReminder = dynamic(() => import('@/components/OnboardingReminder').then(m => m.OnboardingReminder), { ssr: false });
const AdsWalletWelcomeModal = dynamic(() => import('@/components/AdsWalletWelcomeModal').then(m => m.AdsWalletWelcomeModal), { ssr: false });
const UsernameSetupModal = dynamic(() => import('@/components/UsernameSetupModal').then(m => m.UsernameSetupModal), { ssr: false });
const AuthModal = dynamic(() => import('@/components/AuthModal').then(m => m.AuthModal), { ssr: false });
const PushNotificationManager = dynamic(() => import('@/components/PushNotificationManager').then(m => m.PushNotificationManager), { ssr: false });
const ApkPromoManager = dynamic(() => import('@/components/ApkPromoManager').then(m => m.ApkPromoManager), { ssr: false });
const PwaManager = dynamic(() => import('@/components/PwaManager').then(m => m.PwaManager), { ssr: false });
const MediaPickerModal = dynamic(() => import('@/components/MediaPickerModal').then(m => m.MediaPickerModal), { ssr: false });
const DraftsReminderBanner = dynamic(() => import('@/components/DraftsReminderBanner').then(m => m.DraftsReminderBanner), { ssr: false });

export function ClientModals() {
  return (
    <>
      <OfflineSmartPocketBanner />
      <GlobalAlarmListener />
      <CallInterface />
      <OnboardingModal />
      <OnboardingReminder />
      <AdsWalletWelcomeModal />
      <UsernameSetupModal />
      <AuthModal />
      <PushNotificationManager />
      <ApkPromoManager />
      <PwaManager />
      <MediaPickerModal />
      <DraftsReminderBanner />
    </>
  );
}
