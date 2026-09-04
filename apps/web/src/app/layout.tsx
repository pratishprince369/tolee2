import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

const fontSans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  metadataBase: new URL("https://tolee.in"),
  title: {
    default: "Tolee | Discover Local Communities, Reels & Marketplace",
    template: "%s | Tolee"
  },
  description: "Tolee is India's leading community social network. Connect with local Tolee groups, watch vertical video reels, discover breaking local news, shop on Tolee Marketplace, stream videos, and explore AI tools.",
  keywords: [
    "Tolee",
    "Tolee App",
    "Tolee India",
    "Tolee Communities",
    "Tolee Marketplace",
    "Tolee Reels",
    "Tolee News",
    "Tolee Screen",
    "Tolee AI",
    "Tolee Groups",
    "Tolee World",
    "Tolee Radar"
  ],
  authors: [{ name: "Tolee", url: "https://tolee.in" }],
  creator: "Tolee",
  publisher: "Tolee",
  alternates: {
    canonical: "https://tolee.in"
  },
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
    url: "https://tolee.in",
    siteName: "Tolee",
    title: "Tolee | Discover Local Communities, Reels & Marketplace",
    description: "Connect with local Tolee groups, watch vertical video reels, discover breaking local news, shop on Tolee Marketplace, stream videos, and explore AI tools.",
    images: [
      {
        url: "https://tolee.in/logo.png",
        width: 1200,
        height: 630,
        alt: "Tolee Community Social Network"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Tolee | Discover Local Communities, Reels & Marketplace",
    description: "Connect with local Tolee groups, watch vertical video reels, discover breaking local news, shop on Tolee Marketplace, stream videos, and explore AI tools.",
    images: ["https://tolee.in/logo.png"]
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
import { OfflineSmartPocketBanner } from "@/components/OfflineSmartPocketBanner";
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
    "alternateName": [
      "Tolee App",
      "Tolee.in",
      "Tolee Social Network",
      "Tolee Social Media",
      "Tolee India",
      "Tolee Communities"
    ],
    "url": "https://tolee.in",
    "logo": "https://tolee.in/logo.png",
    "description": "Tolee is India's leading community social network. Connect with local Tolee groups, watch vertical video reels, discover breaking local news, shop on Tolee Marketplace, stream videos, and explore AI tools.",
    "foundingDate": "2024",
    "sameAs": [
      "https://play.google.com/store/apps/details?id=in.tolee.app",
      "https://www.instagram.com/tolee.in",
      "https://twitter.com/tolee_in",
      "https://www.linkedin.com/company/tolee"
    ]
  };

  const jsonLdWebSite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Tolee",
    "alternateName": "Tolee Social Network",
    "url": "https://tolee.in",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://tolee.in/discover?q={search_term_string}"
      },
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
        "url": "https://tolee.in"
      },
      {
        "@type": "SiteNavigationElement",
        "position": 2,
        "name": "Tolee Reels",
        "description": "Watch trending short vertical video reels and viral content on Tolee Reels.",
        "url": "https://tolee.in/reels"
      },
      {
        "@type": "SiteNavigationElement",
        "position": 3,
        "name": "Tolee News",
        "description": "Read verified breaking local news, science, world affairs and stories on Tolee News.",
        "url": "https://tolee.in/news"
      },
      {
        "@type": "SiteNavigationElement",
        "position": 4,
        "name": "Tolee Marketplace",
        "description": "Buy and sell local products, services, vehicles, and real estate with 0% commission on Tolee Marketplace.",
        "url": "https://tolee.in/marketplace"
      },
      {
        "@type": "SiteNavigationElement",
        "position": 5,
        "name": "Tolee Discover Groups",
        "description": "Find and join verified local community groups and private interest Tolees.",
        "url": "https://tolee.in/discover"
      },
      {
        "@type": "SiteNavigationElement",
        "position": 6,
        "name": "Log into Tolee",
        "description": "Sign in to your Tolee account to connect with communities and manage your profile.",
        "url": "https://tolee.in/login"
      },
      {
        "@type": "SiteNavigationElement",
        "position": 7,
        "name": "Create New Account",
        "description": "Sign up for a free Tolee account to join groups, share reels, and connect with creators.",
        "url": "https://tolee.in/signup"
      },
      {
        "@type": "SiteNavigationElement",
        "position": 8,
        "name": "Tolee Screen",
        "description": "Stream high-quality long form videos, live stages, and masterclasses on Tolee Screen.",
        "url": "https://tolee.in/screen"
      },
      {
        "@type": "SiteNavigationElement",
        "position": 9,
        "name": "Tolee World",
        "description": "Explore digital books, AI micro-websites, online stores, blogs, and tools on Tolee World.",
        "url": "https://tolee.in/world"
      },
      {
        "@type": "SiteNavigationElement",
        "position": 10,
        "name": "Tolee Live Map",
        "description": "Explore hyper-local neighborhood communities and city hubs on Tolee Map.",
        "url": "https://tolee.in/map"
      },
      {
        "@type": "SiteNavigationElement",
        "position": 11,
        "name": "Tolee Creator Program",
        "description": "Monetize your content, build subscription groups, and earn with Tolee Creator Program.",
        "url": "https://tolee.in/creator-program"
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
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#09090b" media="(prefers-color-scheme: dark)" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="google-site-verification" content="24ZTpDCR3sByCo7jqJUtr78KevMb3PQO7IGSDRl-g4A" />
        {/* Performance preconnects */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.youtube-nocookie.com" />
        <link rel="dns-prefetch" href="https://img.youtube.com" />
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
          <OfflineSmartPocketBanner />
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
            <div className={cn("flex-grow w-full min-w-0 overflow-x-clip", isAuthenticated && "lg:pl-64")}>
              {children}
            </div>
          </div>
          
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
