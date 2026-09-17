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
    pathname.startsWith('/live/meeting')
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
  const hideMobileHeader = isMobileHeaderHiddenRoute(pathname);

  const isChat = pathname?.startsWith('/chat');

  return (
    <div className={cn(
      "flex flex-1 w-full relative",
      isChat ? "pb-0" : "pb-16 lg:pb-0",
      hideMobileHeader ? "pt-0 md:pt-16" : "pt-16"
    )}>
      {sidebar}
      <div className={cn("flex-grow w-full min-w-0 overflow-x-clip", isAuthenticated && "lg:pl-64")}>
        {children}
      </div>
    </div>
  );
}
