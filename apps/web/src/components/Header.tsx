'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Bell, MessageCircle, LogOut, User, Settings, Compass, Store, Globe, Heart, Bot, Zap, MessageSquare, Briefcase, Award, FileText, Radio } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSession, signOut } from 'next-auth/react';
import { getSidebarData } from '@/actions/user';
import { SearchInput } from './SearchInput';
import { cn } from '@/lib/utils';
import { getDrafts } from '@/lib/draftManager';
import { MyDraftsModal } from '@/components/MyDraftsModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';

import { useUpload } from './UploadContext';

export interface BrandingData {
  siteName: string;
  headerLogoUrl: string | null;
  faviconUrl: string | null;
  mobileLogoUrl: string | null;
}

export function Header({ initialBranding }: { initialBranding?: BrandingData }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [counts, setCounts] = React.useState({ notifications: 0, messages: 0 });
  const [isRestricted, setIsRestricted] = React.useState(false);
  const [franchiseStatus, setFranchiseStatus] = React.useState<string | null>(null);
  const [branding, setBranding] = React.useState<BrandingData>(initialBranding || {
    siteName: 'tolee',
    headerLogoUrl: null,
    faviconUrl: null,
    mobileLogoUrl: null,
  });

  React.useEffect(() => {
    if (!session?.user) return;

    const fetchCounts = () => {
      getSidebarData().then(res => {
        if (res.success) {
          setCounts({ 
            notifications: res.unreadNotifications || 0, 
            messages: res.unreadMessages || 0 
          });
          setFranchiseStatus((res as any).franchiseStatus || null);
          const mod = (res as any).moderation;
          if (mod) {
            const hasRest = mod.postingRestricted || 
                           mod.messagingRestricted || 
                           mod.groupCreationRestricted || 
                           mod.commentRestricted || 
                           mod.reelsRestricted || 
                           mod.marketplaceRestricted;
            setIsRestricted(!!hasRest);
          }
        }
      });
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 5000); // 5s realtime notification polling
    window.addEventListener('tolee_notification_refresh', fetchCounts);

    return () => {
      clearInterval(interval);
      window.removeEventListener('tolee_notification_refresh', fetchCounts);
    };
  }, [session, pathname]);

  const [draftsCount, setDraftsCount] = React.useState(0);
  const [isDraftsModalOpen, setIsDraftsModalOpen] = React.useState(false);

  React.useEffect(() => {
    if (session?.user) {
      const uId = (session.user as any).id;
      setDraftsCount(getDrafts(uId).length);
    }
  }, [session]);

  React.useEffect(() => {
    const handleUpdate = () => {
      if (session?.user) {
        const uId = (session.user as any).id;
        setDraftsCount(getDrafts(uId).length);
      }
    };
    window.addEventListener('tolee_drafts_updated', handleUpdate);
    return () => window.removeEventListener('tolee_drafts_updated', handleUpdate);
  }, [session]);

  const { task, retryUpload, cancelUpload } = useUpload();

  // Fetch dynamic branding (logo, favicon, site name)
  React.useEffect(() => {
    fetch('/api/branding')
      .then(r => r.json())
      .then(d => {
        setBranding({
          siteName: d.siteName || 'tolee',
          headerLogoUrl: d.headerLogoUrl || null,
          faviconUrl: d.faviconUrl || null,
          mobileLogoUrl: d.mobileLogoUrl || null,
        });
        // Dynamically update favicon in browser tab (faviconUrl -> mobileLogoUrl -> headerLogoUrl -> /logo.png)
        const activeFav = d.faviconUrl || d.mobileLogoUrl || d.headerLogoUrl || '/logo.png';
        if (activeFav) {
          const existingLinks = document.querySelectorAll<HTMLLinkElement>('link[rel*="icon"]');
          if (existingLinks.length > 0) {
            existingLinks.forEach(link => { link.href = activeFav; });
          } else {
            const link = document.createElement('link');
            link.rel = 'icon';
            link.href = activeFav;
            document.head.appendChild(link);
          }
        }
      })
      .catch(() => {});
  }, []);

  const isReels = pathname === '/reels' || pathname?.endsWith('/reels');
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 0);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={cn("fixed top-0 left-0 right-0 z-50 w-full flex flex-col transition-all duration-300", isReels && "hidden lg:flex")}>
      <GlobalUploadProgress
        task={task}
        retryUpload={retryUpload}
        cancelUpload={cancelUpload}
      />
      {isRestricted && (
        <div className="bg-amber-600 dark:bg-amber-800 text-white text-center py-2 px-4 text-xs md:text-sm font-medium flex items-center justify-center gap-2 shadow-sm">
          <span>⚠️</span>
          <span>Your account has restricted access. Some actions are currently disabled.</span>
        </div>
      )}
      <header className={cn(
        "w-full h-16 flex items-center justify-between px-3 sm:px-4 lg:px-6 gap-2 sm:gap-4 select-none transition-all duration-300 border-b",
        "bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md",
        scrolled
          ? "border-zinc-200/80 dark:border-zinc-800/80 shadow-md shadow-zinc-100/10 dark:shadow-black/25"
          : "border-zinc-100 dark:border-zinc-900 shadow-none"
      )}>
      
      {/* Left: Compact Logo */}
      <div className="flex items-center flex-shrink-0">
        <Link href={session?.user ? "/feed" : "/"} className="flex items-center gap-2 sm:gap-3 hover:opacity-90 active:scale-95 transition-all duration-200">
          {branding.mobileLogoUrl && branding.headerLogoUrl ? (
            <>
              {/* Mobile compact logo */}
              <img
                src={branding.mobileLogoUrl}
                alt={branding.siteName}
                className="h-8 w-auto max-w-[80px] object-contain sm:hidden"
              />
              {/* Desktop header logo */}
              <img
                src={branding.headerLogoUrl}
                alt={branding.siteName}
                className="h-9 max-w-[140px] object-contain hidden sm:block"
              />
            </>
          ) : branding.headerLogoUrl ? (
            <img
              src={branding.headerLogoUrl}
              alt={branding.siteName}
              className="h-8 sm:h-9 max-w-[80px] xs:max-w-[100px] sm:max-w-[140px] object-contain"
            />
          ) : branding.mobileLogoUrl ? (
            <img
              src={branding.mobileLogoUrl}
              alt={branding.siteName}
              className="h-8 sm:h-9 max-w-[80px] xs:max-w-[100px] sm:max-w-[140px] object-contain"
            />
          ) : (
            <>
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-primary text-primary-foreground rounded-xl flex items-center justify-center font-bold text-base sm:text-lg shadow-sm flex-shrink-0">
                {branding.siteName?.[0]?.toLowerCase() || 't'}
              </div>
              <span className="text-base sm:text-xl font-extrabold tracking-tight text-primary dark:text-white hidden sm:inline-block">
                {branding.siteName || 'tolee'}
              </span>
            </>
          )}
        </Link>
      </div>

      {/* Middle: Embedded Search Bar (Fully Responsive & Dynamic) */}
      {pathname !== '/discover' && pathname !== '/' && (
        <div className="flex-1 min-w-[90px] sm:min-w-[180px] max-w-[160px] sm:max-w-sm md:max-w-md mx-1 sm:mx-2 flex items-center gap-1.5">
          <div className="flex-1">
            <SearchInput />
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push('/radar')}
            className={cn(
              "rounded-xl md:hidden flex items-center justify-center h-8 w-8 xs:h-9 xs:w-9 flex-shrink-0 transition-all active:scale-95 border border-zinc-200 dark:border-zinc-800",
              pathname.startsWith('/radar') 
                ? 'text-[#0E9F9A] bg-[#0E9F9A]/5 border-[#0E9F9A]/20' 
                : 'text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-900/50'
            )}
            title="Tolee Radar"
          >
            <Radio className="w-4 h-4 xs:w-[18px] xs:h-[18px]" />
          </Button>
        </div>
      )}

      {/* Right: User Profile & Actions */}
      <div className="flex items-center justify-end gap-1 sm:gap-2 md:gap-3 flex-shrink-0">
        
        {status === 'loading' ? (
          <div className="w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
        ) : session?.user ? (
          <>
            {/* Mobile Marketplace Shortcut */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => router.push('/marketplace')}
              className={`rounded-full md:hidden flex items-center justify-center h-8 w-8 xs:h-9 xs:w-9 sm:h-10 sm:w-10 flex-shrink-0 transition-all active:scale-95 ${
                pathname.startsWith('/marketplace') 
                  ? 'text-primary bg-primary/5 border border-primary/10' 
                  : 'text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-900/50'
              }`}
              title="Marketplace"
            >
              <Store className="w-4 h-4 xs:w-5 xs:h-5 sm:w-5 sm:h-5" />
            </Button>

            {/* Mobile Tolee World Shortcut (Responsive display based on screen width) */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => router.push('/world')}
              className={`rounded-full md:hidden flex items-center justify-center h-8 w-8 xs:h-9 xs:w-9 sm:h-10 sm:w-10 flex-shrink-0 transition-all active:scale-95 hidden xs:flex ${
                pathname.startsWith('/world') 
                  ? 'text-primary bg-primary/5 border border-primary/10' 
                  : 'text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-900/50'
              }`}
              title="Tolee World"
            >
              <Globe className="w-4 h-4 xs:w-5 xs:h-5 sm:w-5 sm:h-5" />
            </Button>

            {/* Mobile AI Manager Shortcut */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => router.push('/ai-manager')}
              className={`rounded-full md:hidden flex items-center justify-center h-8 w-8 xs:h-9 xs:w-9 sm:h-10 sm:w-10 flex-shrink-0 transition-all active:scale-95 relative ${
                pathname.startsWith('/ai-manager') 
                  ? 'text-primary bg-primary/5 border border-primary/10' 
                  : 'text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-900/50'
              }`}
              title="AI Tolee Manager"
            >
              <span className="text-[11px] font-extrabold tracking-wider leading-none">AI</span>
              {!pathname.startsWith('/ai-manager') && (
                <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse border border-white dark:border-black"></span>
              )}
            </Button>

            {/* Mobile Creator Program Shortcut */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => router.push('/creator-program')}
              className={`rounded-full md:hidden flex items-center justify-center h-8 w-8 xs:h-9 xs:w-9 sm:h-10 sm:w-10 flex-shrink-0 transition-all active:scale-95 relative ${
                pathname.startsWith('/creator-program') 
                  ? 'bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800' 
                  : 'hover:bg-purple-50 dark:hover:bg-purple-950/30'
              }`}
              title="Creator Program"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="bolt-grad" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
                <path d="M13 2L4.5 13.5H11.5L11 22L19.5 10.5H12.5L13 2Z" fill="url(#bolt-grad)" stroke="url(#bolt-grad)" strokeWidth="0.5" strokeLinejoin="round"/>
              </svg>
            </Button>

            {/* Inline Upload Status Component in Header */}
            {task.state !== 'idle' && (
              <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-zinc-300 bg-gray-50 dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 px-3 py-1.5 rounded-full mr-2 select-none shadow-sm animate-pulse">
                {task.state === 'uploading' && (
                  <>
                    <span className="animate-spin text-[#0a7c85]">⬆</span>
                    <span>Uploading... {task.totalProgress}%</span>
                    {task.filesCount > 1 && (
                      <span className="text-[10px] text-gray-500">
                        (File {task.currentFileIndex + 1} of {task.filesCount})
                      </span>
                    )}
                  </>
                )}
                {task.state === 'processing' && (
                  <div className="flex items-center gap-1.5 max-w-[200px] sm:max-w-[320px] truncate">
                    <span className="animate-spin text-amber-500 shrink-0">⚙</span>
                    <span className="truncate text-[11px] font-semibold text-gray-700 dark:text-zinc-300">
                      {task.stepMessage || 'Processing Media...'}
                    </span>
                  </div>
                )}
                {task.state === 'success' && (
                  <>
                    <span className="text-emerald-500">✅</span>
                    <span>Published</span>
                  </>
                )}
                {task.state === 'error' && (
                  <>
                    <span className="text-red-500">❌</span>
                    <span>Failed</span>
                  </>
                )}
              </div>
            )}

            {/* Desktop Premium Icons (mockup aligned) */}
            <div className="hidden md:flex items-center gap-2.5 mr-2">
              <Link href="/chat">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-gray-700 dark:text-zinc-300 hover:text-primary dark:hover:text-primary rounded-xl w-10 h-10 relative hover:bg-gray-50 dark:hover:bg-zinc-900/50"
                  title="Chats"
                >
                  <MessageCircle className="w-5 h-5 stroke-[1.5]" />
                  {counts.messages > 0 && (
                    <span className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-bold border border-white dark:border-zinc-950">
                      {counts.messages}
                    </span>
                  )}
                </Button>
              </Link>
              <Link href="/marketplace">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-gray-700 dark:text-zinc-300 hover:text-primary dark:hover:text-primary rounded-xl w-10 h-10 hover:bg-gray-50 dark:hover:bg-zinc-900/50"
                  title="Marketplace"
                >
                  <Heart className="w-5 h-5 stroke-[1.5]" />
                </Button>
              </Link>
              <Link href="/notifications">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-gray-700 dark:text-zinc-300 hover:text-primary dark:hover:text-primary rounded-xl w-10 h-10 relative hover:bg-gray-50 dark:hover:bg-zinc-900/50"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5 stroke-[1.5]" />
                  {counts.notifications > 0 && (
                    <span className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-bold border border-white dark:border-zinc-950">
                      {counts.notifications}
                    </span>
                  )}
                </Button>
              </Link>
            </div>

            {/* Mobile Notification Bell */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/notifications')}
              className={`rounded-full md:hidden flex items-center justify-center h-8 w-8 xs:h-9 xs:w-9 sm:h-10 sm:w-10 flex-shrink-0 transition-all active:scale-95 relative ${
                pathname.startsWith('/notifications')
                  ? 'text-primary bg-primary/5 border border-primary/10'
                  : 'text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-900/50'
              }`}
              title="Notifications"
            >
              <Bell className="w-4 h-4 xs:w-5 xs:h-5 sm:w-5 sm:h-5" />
              {counts.notifications > 0 && (
                <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-primary text-primary-foreground text-[8px] font-bold flex items-center justify-center rounded-full border border-white dark:border-black">
                  {counts.notifications}
                </span>
              )}
            </Button>

            {/* Unified Avatar Dropdown (Shown on Desktop only, hidden on Mobile) */}
            <div className="hidden md:flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger className="relative h-8 w-8 xs:h-9 xs:w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors focus:outline-none">
                  <Avatar className="h-7 w-7 xs:h-8 xs:w-8 sm:h-9 sm:w-9 border border-gray-200 dark:border-zinc-800 hover:border-primary transition-colors cursor-pointer">
                    <AvatarImage src={(!session.user.image || session.user.image === 'null' || session.user.image === 'undefined' || session.user.image.trim() === '') ? '/default-user-avatar.svg' : session.user.image} alt="User" />
                    <AvatarFallback>{session.user.name?.[0] || "ME"}</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{session.user.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {session.user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/u/me')} className="cursor-pointer flex w-full items-center">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsDraftsModalOpen(true)} className="cursor-pointer flex w-full items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="mr-2 h-4 w-4 text-amber-500" />
                      <span>My Drafts</span>
                    </div>
                    {draftsCount > 0 && (
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-amber-500 text-white">
                        {draftsCount}
                      </span>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer flex w-full items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/feedback')} className="cursor-pointer flex w-full items-center">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    <span>Send Feedback</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/my-tolees')} className="cursor-pointer flex w-full items-center">
                    <Globe className="mr-2 h-4 w-4" />
                    <span>My Tolees</span>
                  </DropdownMenuItem>
                  {(franchiseStatus === 'active' || franchiseStatus === 'suspended') && (
                    <DropdownMenuItem onClick={() => router.push('/franchise/dashboard')} className="cursor-pointer flex w-full items-center">
                      <Briefcase className="mr-2 h-4 w-4 text-zinc-700 dark:text-zinc-300" />
                      <span>My Franchise</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-1.5 sm:gap-3">
            <Link href="/auth/signin">
              <Button 
                variant="outline" 
                className="rounded-full border-gray-300 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 font-extrabold px-3.5 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm h-8 sm:h-10 hover:bg-gray-50 dark:hover:bg-zinc-900 active:scale-95 transition-all duration-200"
              >
                Log In
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button 
                className="bg-primary hover:bg-primary/95 text-primary-foreground rounded-full font-black px-4 sm:px-7 py-1.5 sm:py-2 text-xs sm:text-sm h-8 sm:h-10 shadow-md hover:shadow-lg active:scale-95 transition-all duration-200 border-0"
              >
                Sign Up
              </Button>
            </Link>
          </div>
        )}
      </div>

    </header>
    <MyDraftsModal isOpen={isDraftsModalOpen} onClose={() => setIsDraftsModalOpen(false)} />
    </div>
  );
}

function GlobalUploadProgress({ task, retryUpload, cancelUpload }: { task: any, retryUpload: () => void, cancelUpload: () => void }) {
  if (task.state === 'idle') return null;

  const showProgressBar = task.state === 'uploading' || task.state === 'processing';
  const progressPercent = task.state === 'processing' ? (task.processingProgress || 95) : task.totalProgress;

  return (
    <>
      {/* 1. Global Top-of-viewport Progress Bar */}
      {showProgressBar && (
        <div className="fixed top-0 left-0 right-0 h-1.5 bg-zinc-100 dark:bg-zinc-800 z-[9999] overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-[#0a7c85] via-[#0ea5e9] to-[#10b981] transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* 1b. Live AI Processing Step Banner */}
      {task.state === 'processing' && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-zinc-900/95 dark:bg-zinc-950/95 text-white border border-zinc-700/80 px-4 py-2.5 rounded-full shadow-2xl z-[9999] flex items-center gap-3 text-xs font-semibold animate-in fade-in-0 zoom-in-95 duration-200 backdrop-blur-md max-w-[90vw]">
          <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />
          <span className="truncate">{task.stepMessage || '⚡ AI processing & generating metadata...'}</span>
          <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/50 px-2 py-0.5 rounded-full border border-indigo-500/20 shrink-0">
            {progressPercent}%
          </span>
        </div>
      )}

      {/* 2. Global Error Banner */}
      {task.state === 'error' && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 dark:bg-red-800 text-white py-3 px-4 z-[9999] shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 text-sm font-semibold animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <span>❌</span>
            <span>{task.errorMessage || 'Unable to publish. Please try again.'}</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button 
              type="button"
              onClick={retryUpload}
              className="bg-white text-red-600 dark:text-red-800 px-4 py-1.5 rounded-lg hover:bg-zinc-50 active:scale-95 transition-all font-bold text-xs"
            >
              Retry
            </button>
            <button 
              type="button"
              onClick={cancelUpload}
              className="bg-red-700 dark:bg-red-900 text-white border border-red-500/30 px-4 py-1.5 rounded-lg hover:bg-red-850 active:scale-95 transition-all font-bold text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 3. Global Success Banner (For pages where header is hidden, e.g. Reels) */}
      {task.state === 'success' && (
        <div className="fixed top-4 right-4 bg-emerald-500 text-white py-3 px-5 rounded-2xl z-[9999] shadow-2xl flex items-center gap-2.5 text-sm font-bold animate-in fade-in-0 zoom-in-95 duration-200">
          <span>{task.successMessage || '✅ Published successfully'}</span>
        </div>
      )}
    </>
  );
}
