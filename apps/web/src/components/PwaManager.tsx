'use client';

import React, { useState, useEffect } from 'react';
import { X, ArrowUpFromLine, PlusSquare, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PwaManager() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // Helper to send installation track log to DB and set localStorage
  const trackInstallClick = async (platform: string) => {
    try {
      await fetch('/api/promo/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'app_installed_click',
          details: {
            platform,
            userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
            screen: 'pwa_banner'
          }
        })
      });
    } catch (err) {
      console.error('Failed to track install click:', err);
    }
    // Store in localStorage that user has installed, so we don't show the banner anymore!
    localStorage.setItem('tolee_app_installed', 'true');
  };

  useEffect(() => {
    // 1. Detect if already installed/running in standalone mode or Capacitor app
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true ||
        (typeof window !== 'undefined' && !!(window as any).Capacitor);
      
      const isAlreadyInstalled = localStorage.getItem('tolee_app_installed') === 'true';
      const shouldHide = isStandaloneMode || isAlreadyInstalled;
      
      setIsStandalone(shouldHide);
      return shouldHide;
    };

    const standalone = checkStandalone();

    // 2. Register Service Worker in production/development
    if ('serviceWorker' in navigator && !standalone) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('[PWA SW] Registered successfully: ', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA SW] Registration failed: ', err);
        });
    }

    // 3. Listen for standard PWA install prompt event (Android & Chrome Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Check if dismissed permanently
      const dismissed = localStorage.getItem('tolee_pwa_dismissed');
      if (!dismissed && !checkStandalone()) {
        // Delay showing banner by 3 seconds for better UX
        const timer = setTimeout(() => {
          setShowBanner(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. Detect iOS devices for custom install guides
    const detectIos = () => {
      const userAgent = window.navigator.userAgent;
      const isIosDevice = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
      const isSafari = userAgent.includes('Safari') && !userAgent.includes('Chrome') && !userAgent.includes('CriOS');
      
      setIsIos(isIosDevice);

      // Show iOS help prompt if they are on iOS Safari and not standalone
      const dismissed = localStorage.getItem('tolee_pwa_dismissed');
      if (isIosDevice && isSafari && !dismissed && !checkStandalone()) {
        const timer = setTimeout(() => {
          setShowBanner(true);
        }, 4000);
        return () => clearTimeout(timer);
      }
    };

    detectIos();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Track click on PWA install
    await trackInstallClick('android_chrome');

    // Show native browser install dialog
    deferredPrompt.prompt();

    // Await user's decision
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA Prompt] User decision: ${outcome}`);

    // Clean up
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleIosInstallClick = async () => {
    await trackInstallClick('ios');
  };

  const handleDismiss = () => {
    localStorage.setItem('tolee_pwa_dismissed', 'true');
    setShowBanner(false);
  };

  if (!showBanner || isStandalone) return null;

  return (
    <div className="fixed top-[4.5rem] left-4 right-4 md:top-auto md:bottom-6 md:right-6 md:left-auto md:w-96 z-[9999] animate-in fade-in slide-in-from-top-4 md:slide-in-from-bottom-4 duration-300">
      <div className="bg-zinc-950/95 dark:bg-zinc-950/95 backdrop-blur-md border border-zinc-800 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4">
        
        {/* Left: App Logo Icon */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-white flex-shrink-0 border border-zinc-800 flex items-center justify-center">
            <img src="/logo.png" alt="Tolee" className="w-10 h-10 object-contain" />
          </div>
          <div className="flex flex-col min-w-0">
            <h4 className="text-sm font-bold truncate">Install Tolee</h4>
            <p className="text-xs text-zinc-400 truncate">tolee.in</p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {isIos ? (
            /* iOS Custom Instruction Trigger */
            <div className="relative group">
              <Button
                onClick={handleIosInstallClick}
                size="sm"
                className="bg-[#0a7c85] hover:bg-[#08636a] text-white text-xs font-bold rounded-xl h-9 px-3 flex items-center gap-1.5"
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>How to Install</span>
              </Button>
              {/* Tooltip containing iOS share + add instructions */}
              <div className="absolute right-0 bottom-full mb-2 w-64 bg-zinc-900 border border-zinc-850 p-3 rounded-xl shadow-xl text-xs text-zinc-300 hidden group-hover:block animate-in fade-in zoom-in-95 duration-150 z-[10000]">
                <div className="space-y-2">
                  <p className="font-semibold text-white">To install Tolee on iPhone:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Tap the <span className="inline-flex items-center align-middle bg-zinc-800 p-0.5 rounded text-white"><ArrowUpFromLine className="h-3 w-3" /></span> <strong>Share</strong> button at browser bottom.</li>
                    <li>Scroll down and select <span className="inline-flex items-center align-middle bg-zinc-800 p-0.5 rounded text-white"><PlusSquare className="h-3 w-3" /></span> <strong>Add to Home Screen</strong>.</li>
                    <li>Tap <strong>Add</strong> in the top right to install.</li>
                  </ol>
                </div>
                <div className="w-3 h-3 bg-zinc-900 border-r border-b border-zinc-850 absolute right-8 top-full -mt-1.5 rotate-45"></div>
              </div>
            </div>
          ) : (
            /* Standard Android / Chrome Install Button */
            <Button
              onClick={handleInstallClick}
              size="sm"
              className="bg-[#0a7c85] hover:bg-[#08636a] text-white text-xs font-bold rounded-xl h-9 px-4 active:scale-95 transition-all"
            >
              Install
            </Button>
          )}

          {/* Dismiss Icon */}
          <button
            onClick={handleDismiss}
            className="p-1.5 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
