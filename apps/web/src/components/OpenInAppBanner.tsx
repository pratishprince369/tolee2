'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OpenInAppBannerProps {
  slug: string;
  title: string;
}

export function OpenInAppBanner({ slug, title }: OpenInAppBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isInsideNativeApp, setIsInsideNativeApp] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if user is already browsing inside the native Tolee mobile app
    const isNative = Boolean(
      (window as any).ToleeNative ||
      (window as any).AndroidBridge ||
      (window as any).AndroidGoogleAuth ||
      navigator.userAgent.includes('wv') ||
      navigator.userAgent.includes('ToleeApp')
    );
    setIsInsideNativeApp(isNative);

    // Check if mobile device
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    setIsMobileDevice(mobileRegex.test(navigator.userAgent));

    // Check if previously dismissed in this session
    const dismissed = sessionStorage.getItem(`tolee_app_banner_dismissed_${slug}`);
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, [slug]);

  if (isDismissed || isInsideNativeApp || !isMobileDevice) {
    return null;
  }

  const handleOpenInApp = () => {
    if (typeof window === 'undefined') return;

    const currentUrl = window.location.href;
    const isAndroid = /Android/i.test(navigator.userAgent);

    if (isAndroid) {
      // Official Android Intent URI for in.tolee.app
      // Automatically opens the installed Tolee App or falls back to web/store
      const intentUrl = `intent://news/${slug}#Intent;scheme=tolee;package=in.tolee.app;S.browser_fallback_url=${encodeURIComponent(currentUrl)};end`;
      window.location.href = intentUrl;
    } else {
      // iOS / other fallback
      const customSchemeUrl = `tolee://news/${slug}`;
      window.location.href = customSchemeUrl;
      setTimeout(() => {
        // If app not installed, keep on current page
      }, 1500);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem(`tolee_app_banner_dismissed_${slug}`, 'true');
    } catch (_) {}
  };

  return (
    <div className="w-full bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-700 text-white px-3.5 py-2.5 shadow-md flex items-center justify-between gap-3 text-xs animate-in fade-in transition-all">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shrink-0">
          <Smartphone className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="font-bold truncate text-[13px] leading-tight">Open in Tolee App</p>
          <p className="text-[11px] text-teal-100 truncate">Read with full interactive experience</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          size="sm"
          onClick={handleOpenInApp}
          className="bg-white hover:bg-white/90 text-teal-800 font-extrabold text-xs h-7 px-3 rounded-full shadow-sm flex items-center gap-1 border-0"
        >
          <span>Open</span>
          <ExternalLink className="w-3 h-3" />
        </Button>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 text-teal-200 hover:text-white rounded-full transition-colors cursor-pointer"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
