import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

const fontSans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: "Tolee - The Group Social Network",
  description: "Every post belongs to a Tolee. Join Tolees and share moments.",
};

import { Providers } from "@/components/Providers";
import { BottomNav } from "@/components/BottomNav";
import { OnboardingModal } from "@/components/OnboardingModal";
import { OnboardingReminder } from "@/components/OnboardingReminder";
import { AdsWalletWelcomeModal } from "@/components/AdsWalletWelcomeModal";
import { UsernameSetupModal } from "@/components/UsernameSetupModal";
import { AuthModal } from "@/components/AuthModal";
import { PushNotificationManager } from "@/components/PushNotificationManager";
import { ApkPromoManager } from "@/components/ApkPromoManager";
import { PwaManager } from "@/components/PwaManager";
import { MediaPickerModal } from "@/components/MediaPickerModal";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import { RoutePrefetcher } from "@/components/RoutePrefetcher";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  const isAuthenticated = !!session?.user;
  
  const settings = await prisma.siteSettings.findUnique({ where: { id: 'global' } }).catch(() => null);
  const initialBranding = {
    siteName: settings?.siteName || 'tolee',
    headerLogoUrl: settings?.headerLogoUrl || null,
    faviconUrl: settings?.faviconUrl || null,
    mobileLogoUrl: settings?.mobileLogoUrl || null,
  };

  return (
    <html lang="en" className={cn("font-sans", fontSans.variable)}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Tolee" />
        <meta name="google-site-verification" content="24ZTpDCR3sByCo7jqJUtr78KevMb3PQO7IGSDRl-g4A" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body className="antialiased min-h-screen bg-background flex flex-col">
        <Providers>
          <RoutePrefetcher />
          <OnboardingModal />
          <OnboardingReminder />
          <AdsWalletWelcomeModal />
          <UsernameSetupModal />
          <AuthModal />
          <PushNotificationManager />
          <ApkPromoManager />
          <PwaManager />
          <MediaPickerModal />
          <Suspense fallback={null}>
            <AnalyticsTracker />
          </Suspense>
          {/* Global Top Navbar */}
          <Header initialBranding={initialBranding} />
          
          <div className="flex flex-1 w-full relative pb-16 lg:pb-0 pt-16">
            {/* Global Sidebar - hidden on small screens, fixed on left for large */}
            {isAuthenticated && <Sidebar />}
            
            {/* Main Content Area - padded left on large screens to accommodate fixed sidebar */}
            <div className={cn("flex-grow w-full min-w-0 overflow-x-hidden", isAuthenticated && "lg:pl-64")}>
              {children}
            </div>
          </div>
          
          {/* Global Bottom Navigation - visible only on small screens */}
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
