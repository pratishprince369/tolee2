import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

const fontSans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  metadataBase: new URL("https://www.tolee.in"),
  title: {
    default: "Tolee | Discover Local Communities, Reels & Marketplace",
    template: "%s | Tolee"
  },
  description: "Tolee is India's leading group social network and community platform. Connect with local Tolee groups, watch vertical video reels, shop on Tolee Marketplace, stream Tolee Screen videos, and build micro-websites.",
  keywords: [
    "Tolee",
    "Tolee App",
    "Tolee India",
    "Tolee Communities",
    "Tolee Marketplace",
    "Tolee Reels",
    "Tolee Screen",
    "Tolee AI",
    "Tolee Groups",
    "Tolee World"
  ],
  authors: [{ name: "Tolee" }],
  creator: "Tolee",
  publisher: "Tolee",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.tolee.in",
    siteName: "Tolee",
    title: "Tolee | Discover Local Communities, Reels & Marketplace",
    description: "Connect with local Tolee groups, watch vertical video reels, shop on Tolee Marketplace, stream Tolee Screen videos, and build micro-websites.",
    images: [
      {
        url: "https://www.tolee.in/logo.png",
        width: 1200,
        height: 630,
        alt: "Tolee Group Social Network"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Tolee | Discover Local Communities, Reels & Marketplace",
    description: "Connect with local Tolee groups, watch vertical video reels, shop on Tolee Marketplace, stream Tolee Screen videos, and build micro-websites.",
    images: ["https://www.tolee.in/logo.png"]
  }
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
import { GlobalAlarmListener } from "@/components/GlobalAlarmListener";
import { DraftsReminderBanner } from "@/components/DraftsReminderBanner";
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

  const jsonLdOrganization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Tolee",
    "alternateName": ["Tolee Social Network", "Tolee App", "Tolee India"],
    "url": "https://www.tolee.in",
    "logo": "https://www.tolee.in/logo.png",
    "sameAs": [
      "https://play.google.com/store/apps/details?id=in.tolee.app"
    ]
  };

  const jsonLdWebSite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Tolee",
    "url": "https://www.tolee.in",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://www.tolee.in/discover?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  const jsonLdSiteNavigation = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": [
      {
        "@type": "SiteNavigationElement",
        "position": 1,
        "name": "Tolee Home",
        "description": "Discover & connect with local interest communities and groups on Tolee.",
        "url": "https://www.tolee.in"
      },
      {
        "@type": "SiteNavigationElement",
        "position": 2,
        "name": "Tolee Reels",
        "description": "Watch trending short vertical video reels and viral content on Tolee Reels.",
        "url": "https://www.tolee.in/reels"
      },
      {
        "@type": "SiteNavigationElement",
        "position": 3,
        "name": "Tolee Marketplace",
        "description": "Buy and sell local products, services, and real estate with 0% commission on Tolee Marketplace.",
        "url": "https://www.tolee.in/marketplace"
      },
      {
        "@type": "SiteNavigationElement",
        "position": 4,
        "name": "Tolee Screen",
        "description": "Stream high-quality long form videos, live stages, and masterclasses on Tolee Screen.",
        "url": "https://www.tolee.in/screen"
      },
      {
        "@type": "SiteNavigationElement",
        "position": 5,
        "name": "Tolee Discover Groups",
        "description": "Find and join verified local community groups and private interest Tolees.",
        "url": "https://www.tolee.in/discover"
      },
      {
        "@type": "SiteNavigationElement",
        "position": 6,
        "name": "Tolee World",
        "description": "Create AI micro-websites, online stores, blogs, and restaurants on Tolee World.",
        "url": "https://www.tolee.in/world"
      },
      {
        "@type": "SiteNavigationElement",
        "position": 7,
        "name": "Tolee Creator Program",
        "description": "Monetize your content, build subscription groups, and earn with Tolee Creator Program.",
        "url": "https://www.tolee.in/creator-program"
      }
    ]
  };

  const activeFavicon = settings?.faviconUrl || settings?.mobileLogoUrl || settings?.headerLogoUrl || '/logo.png';

  return (
    <html lang="en" className={cn("font-sans", fontSans.variable)}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Tolee" />
        <meta name="google-site-verification" content="24ZTpDCR3sByCo7jqJUtr78KevMb3PQO7IGSDRl-g4A" />
        <link rel="icon" href={activeFavicon} />
        <link rel="shortcut icon" href={activeFavicon} />
        <link rel="apple-touch-icon" href={activeFavicon} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrganization) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebSite) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSiteNavigation) }}
        />
      </head>
      <body className="antialiased min-h-screen bg-background flex flex-col">
        <Providers>
          <RoutePrefetcher />
          <GlobalAlarmListener />
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
          
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
