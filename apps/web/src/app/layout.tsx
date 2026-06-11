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
import { UsernameSetupModal } from "@/components/UsernameSetupModal";
import { AuthModal } from "@/components/AuthModal";
import { PushNotificationManager } from "@/components/PushNotificationManager";
import { ApkPromoManager } from "@/components/ApkPromoManager";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
          <OnboardingModal />
          <UsernameSetupModal />
          <AuthModal />
          <PushNotificationManager />
          <ApkPromoManager />
          <Suspense fallback={null}>
            <AnalyticsTracker />
          </Suspense>
          {/* Global Top Navbar */}
          <Header initialBranding={initialBranding} />
          
          <div className="flex flex-1 w-full relative pb-16 lg:pb-0 pt-16">
            {/* Global Sidebar - hidden on small screens, fixed on left for large */}
            <Sidebar />
            
            {/* Main Content Area - padded left on large screens to accommodate fixed sidebar */}
            <div className="flex-grow w-full lg:pl-64 min-w-0 overflow-x-hidden">
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
