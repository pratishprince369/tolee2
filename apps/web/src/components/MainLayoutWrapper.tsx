'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * Routes where the main top branding header should NOT appear on mobile
 * (Aligned with modern social UI/UX paradigms like Instagram, Messenger & WhatsApp)
 */
export function isMobileHeaderHiddenRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith('/chat') ||
    pathname.startsWith('/u/') ||
    pathname === '/profile' ||
    pathname.startsWith('/reels') ||
    pathname.startsWith('/live/broadcast') ||
    pathname.startsWith('/live/meeting') ||
    pathname === '/' ||
    pathname === '/login'
  );
}

interface MainLayoutWrapperProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  isAuthenticated: boolean;
}

export function MainLayoutWrapper({
  children,
  sidebar,
  isAuthenticated,
}: MainLayoutWrapperProps) {
  const pathname = usePathname();
  const isReels = pathname?.startsWith('/reels') || pathname?.startsWith('/reel');
  const isAIManager = pathname?.startsWith('/ai-manager');
  const isWorkspace = isReels || isAIManager;
  const hideMobileHeader = isMobileHeaderHiddenRoute(pathname);

  const isChat = pathname?.startsWith('/chat');

  return (
    <div className={cn(
      "flex flex-1 w-full relative",
      isWorkspace ? "p-0 m-0 h-[100dvh] overflow-hidden" : (isChat || !isAuthenticated ? "pb-0" : "pb-16 lg:pb-0"),
      isWorkspace ? "pt-0" : (hideMobileHeader ? "pt-0 md:pt-16" : "pt-14 sm:pt-16")
    )}>
      {!isWorkspace && sidebar}
      <div className={cn("flex-grow w-full min-w-0 overflow-x-clip", !isWorkspace && isAuthenticated && "lg:pl-64")}>
        {children}
      </div>
    </div>
  );
}
