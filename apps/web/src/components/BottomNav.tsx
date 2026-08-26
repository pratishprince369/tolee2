'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Compass, Film, MessageCircle, Menu, User, Settings, Globe, Store, LogOut, MessageSquare, Map, Radio, Briefcase, Award, Newspaper, Tv, Bot, Bell, Megaphone, Zap, HelpCircle, FileText, Wallet } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { getSidebarDataCached } from '@/lib/sidebar-data';
import { getDrafts } from '@/lib/draftManager';
import { MyDraftsModal } from '@/components/MyDraftsModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [unreadChats, setUnreadChats] = React.useState(0);
  const [unreadNotifications, setUnreadNotifications] = React.useState(0);
  const [franchiseStatus, setFranchiseStatus] = React.useState<string | null>(null);
  const isAuthenticated = status === 'authenticated';

  const [clickedPath, setClickedPath] = React.useState<string | null>(null);
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

  React.useEffect(() => {
    setClickedPath(null);
  }, [pathname]);

  const activePath = clickedPath || pathname;

  React.useEffect(() => {
    if (session?.user) {
      getSidebarDataCached().then(res => {
        if (res.success) {
          setUnreadChats(res.unreadMessages || 0);
          setUnreadNotifications(res.unreadNotifications || 0);
          setFranchiseStatus((res as any).franchiseStatus || null);
        }
      });
      const interval = setInterval(() => {
        getSidebarDataCached().then(res => {
          if (res.success) {
            setUnreadChats(res.unreadMessages || 0);
            setUnreadNotifications(res.unreadNotifications || 0);
            setFranchiseStatus((res as any).franchiseStatus || null);
          }
        });
      }, 30000); // 🛡️ Bandwidth Safeguard: 30s instead of 5s
      return () => clearInterval(interval);
    }
  }, [session, pathname]);

  if (!isAuthenticated) return null;

  const getDropdownItemClass = (href: string) => {
    const isActive = activePath === href;
    return `cursor-pointer flex w-full items-center px-3 py-2.5 rounded-lg transition-all duration-200 group focus:outline-none ${
      isActive 
        ? 'bg-gradient-to-r from-[#0E9F9A] to-[#087A76] text-white font-bold shadow-sm shadow-[#0E9F9A]/10 focus:bg-gradient-to-r focus:from-[#0E9F9A] focus:to-[#087A76] focus:text-white' 
        : 'text-[#1F2937] dark:text-zinc-200 hover:bg-[#EAF9F8] dark:hover:bg-[#0E9F9A]/10 hover:text-[#0E9F9A] focus:bg-[#EAF9F8] dark:focus:bg-[#0E9F9A]/10 focus:text-[#0E9F9A]'
    }`;
  };

  const getDropdownIconClass = (href: string, isCreator?: boolean) => {
    const isActive = activePath === href;
    return `mr-2.5 h-4 w-4 flex-shrink-0 transition-colors duration-200 ${
      isActive 
        ? 'text-white' 
        : isCreator ? 'text-purple-500' : 'text-[#6B7280] group-hover:text-[#0E9F9A] group-focus:text-[#0E9F9A]'
    }`;
  };

  const navItems = [
    { name: 'Feed', href: '/feed', icon: Home },
    { name: 'Discover', href: '/discover', icon: Compass },
    { name: 'Reels', href: '/reels', icon: Film },
    { name: 'Chats', href: '/chat', icon: MessageCircle, badge: unreadChats > 0 ? String(unreadChats) : undefined },
    { name: 'Profile', href: '/u/me', isAvatar: true },
  ];

  return (
    <>
    <div className={`fixed bottom-0 left-0 right-0 w-full h-[calc(4.2rem+env(safe-area-inset-bottom))] flex items-center justify-around z-50 lg:hidden border-t px-3 pb-[env(safe-area-inset-bottom)] transition-all duration-300 backdrop-blur-md ${activePath === '/reels' ? 'bg-black/95 border-zinc-800/50 shadow-black/40' : 'bg-white/95 dark:bg-zinc-950/95 border-zinc-200/80 dark:border-zinc-900 shadow-zinc-200/40 dark:shadow-black/60'}`}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activePath === item.href || (activePath.startsWith('/t/') && item.name === 'Feed');
        const activeColor = activePath === '/reels' ? 'text-white' : 'text-teal-600 dark:text-teal-400';
        const inactiveColor = activePath === '/reels' ? 'text-zinc-500 hover:text-white' : 'text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300';

        if (item.isAvatar) {
          return (
            <DropdownMenu key={item.name}>
              <DropdownMenuTrigger className="relative w-full h-full flex flex-col items-center justify-center focus:outline-none select-none">
                <div className={`flex flex-col items-center justify-center w-full h-full relative pb-1 transition-colors duration-200 ${isActive ? activeColor : inactiveColor}`}>
                  <div className="relative">
                    <div className={`w-7 h-7 rounded-full overflow-hidden border transition-all duration-300 ${isActive ? (activePath === '/reels' ? 'border-white border-2 scale-105' : 'border-teal-600 dark:border-teal-400 border-2 scale-105') : 'border-zinc-200 dark:border-zinc-800'}`}>
                      <img src={(!session?.user?.image || session.user.image === 'null' || session.user.image === 'undefined' || session.user.image.trim() === '') ? '/default-user-avatar.svg' : session.user.image} alt="Profile" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <span className={`text-[10px] mt-[3px] leading-none transition-all duration-200 ${isActive ? 'font-bold' : 'font-medium'}`}>{item.name}</span>
                  {isActive && (
                    <span className={`absolute bottom-0 w-6 h-[3px] rounded-full transition-all duration-300 ${activePath === '/reels' ? 'bg-white' : 'bg-teal-600 dark:bg-teal-400'}`} />
                  )}
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 max-h-[75vh] overflow-y-auto scrollbar-thin select-none" align="end" side="top" sideOffset={10}>
                <div className="px-2 py-1.5 text-xs font-normal text-muted-foreground">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-foreground">{session?.user?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground truncate">
                      {session?.user?.email}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                
                {/* ── Social Group ── */}
                <DropdownMenuItem onClick={() => { setClickedPath('/u/me'); router.push('/u/me'); }} className={getDropdownItemClass('/u/me')}>
                  <User className={getDropdownIconClass('/u/me')} />
                  <span>My Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsDraftsModalOpen(true)} className="cursor-pointer flex w-full items-center justify-between py-2 px-3">
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
                <DropdownMenuItem onClick={() => { setClickedPath('/settings'); router.push('/settings'); }} className={getDropdownItemClass('/settings')}>
                  <Settings className={getDropdownIconClass('/settings')} />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setClickedPath('/my-tolees'); router.push('/my-tolees'); }} className={getDropdownItemClass('/my-tolees')}>
                  <Globe className={getDropdownIconClass('/my-tolees')} />
                  <span>My Tolees</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setClickedPath('/news'); router.push('/news'); }} className={getDropdownItemClass('/news')}>
                  <Newspaper className={getDropdownIconClass('/news')} />
                  <span>Tolee News</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setClickedPath('/screen'); router.push('/screen'); }} className={getDropdownItemClass('/screen')}>
                  <Tv className={getDropdownIconClass('/screen')} />
                  <span>Tolee Screen</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setClickedPath('/ai-manager'); router.push('/ai-manager'); }} className={getDropdownItemClass('/ai-manager')}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center">
                      <Bot className={getDropdownIconClass('/ai-manager')} />
                      <span>AI Manager</span>
                    </div>
                    {activePath !== '/ai-manager' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse mr-1 border border-white dark:border-zinc-950" />
                    )}
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setClickedPath('/notifications'); router.push('/notifications'); }} className={getDropdownItemClass('/notifications')}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center">
                      <Bell className={getDropdownIconClass('/notifications')} />
                      <span>Notifications</span>
                    </div>
                    {unreadNotifications > 0 && (
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold transition-all duration-200 ${activePath === '/notifications' ? 'bg-white text-[#087A76]' : 'bg-[#0E9F9A] text-white'}`}>
                        {unreadNotifications}
                      </span>
                    )}
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setClickedPath('/chat'); router.push('/chat'); }} className={getDropdownItemClass('/chat')}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center">
                      <MessageCircle className={getDropdownIconClass('/chat')} />
                      <span>Chats</span>
                    </div>
                    {unreadChats > 0 && (
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold transition-all duration-200 ${activePath === '/chat' ? 'bg-white text-[#087A76]' : 'bg-[#0E9F9A] text-white'}`}>
                        {unreadChats}
                      </span>
                    )}
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setClickedPath('/marketplace'); router.push('/marketplace'); }} className={getDropdownItemClass('/marketplace')}>
                  <Store className={getDropdownIconClass('/marketplace')} />
                  <span>Marketplace</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setClickedPath('/world'); router.push('/world'); }} className={getDropdownItemClass('/world')}>
                  <Globe className={getDropdownIconClass('/world')} />
                  <span>Tolee World</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setClickedPath('/map'); router.push('/map'); }} className={getDropdownItemClass('/map')}>
                  <Map className={getDropdownIconClass('/map')} />
                  <span>Live Map</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setClickedPath('/radar'); router.push('/radar'); }} className={getDropdownItemClass('/radar')}>
                  <Radio className={getDropdownIconClass('/radar')} />
                  <span>Tolee Radar</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* ── Creator & Business Group ── */}
                <DropdownMenuItem onClick={() => { setClickedPath('/tolee-credit'); router.push('/tolee-credit'); }} className={getDropdownItemClass('/tolee-credit')}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center">
                      <Wallet className={getDropdownIconClass('/tolee-credit')} />
                      <span className="font-semibold">Tolee Credit</span>
                    </div>
                    <span className="text-[8px] font-extrabold uppercase text-white bg-teal-500 px-1.5 py-0.5 rounded shadow-xs">REVENUE</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setClickedPath('/ads-manager'); router.push('/ads-manager'); }} className={getDropdownItemClass('/ads-manager')}>
                  <Megaphone className={getDropdownIconClass('/ads-manager')} />
                  <span>Ads Manager</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setClickedPath('/creator-program'); router.push('/creator-program'); }} className={getDropdownItemClass('/creator-program')}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center">
                      <Zap className={getDropdownIconClass('/creator-program', true)} />
                      <span className="font-semibold">Creator Program</span>
                    </div>
                    {activePath !== '/creator-program' && (
                      <span className="text-[8px] font-extrabold uppercase text-white bg-[#0E9F9A] px-1.5 py-0.5 rounded shadow-sm">NEW</span>
                    )}
                  </div>
                </DropdownMenuItem>
                {(franchiseStatus === 'active' || franchiseStatus === 'suspended') && (
                  <DropdownMenuItem onClick={() => { setClickedPath('/franchise/dashboard'); router.push('/franchise/dashboard'); }} className={getDropdownItemClass('/franchise/dashboard')}>
                    <Briefcase className={getDropdownIconClass('/franchise/dashboard')} />
                    <span>My Franchise</span>
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                {/* ── Support & Feedback Group ── */}
                <DropdownMenuItem onClick={() => { setClickedPath('/contact'); router.push('/contact'); }} className={getDropdownItemClass('/contact')}>
                  <HelpCircle className={getDropdownIconClass('/contact')} />
                  <span>Help & Support</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setClickedPath('/feedback'); router.push('/feedback'); }} className={getDropdownItemClass('/feedback')}>
                  <MessageSquare className={getDropdownIconClass('/feedback')} />
                  <span>Send Feedback</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }

        return (
          <Link 
            key={item.name} 
            href={item.href} 
            onClick={() => setClickedPath(item.href)}
            className="relative w-full h-full flex flex-col items-center justify-center tap-feedback select-none"
          >
            <div className={`flex flex-col items-center justify-center w-full h-full relative pb-1 transition-all duration-200 ${isActive ? activeColor : inactiveColor}`}>
              <div className="relative">
                {Icon && (
                  <Icon 
                    strokeWidth={isActive ? 2.5 : 1.6}
                    className={`w-[22px] h-[22px] transition-all duration-200 ${isActive ? 'scale-110' : 'active:scale-90'}`} 
                  />
                )}
                {item.badge && (
                  <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[9px] min-w-[16px] h-4 flex items-center justify-center rounded-full font-bold border-2 border-white dark:border-black px-0.5">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-[3px] leading-none transition-all duration-200 ${isActive ? 'font-bold' : 'font-medium'}`}>{item.name}</span>
              {isActive && (
                <span className={`absolute bottom-0 w-6 h-[3px] rounded-full transition-all duration-300 ease-out ${activePath === '/reels' ? 'bg-white' : 'bg-teal-600 dark:bg-teal-400'}`} />
              )}
            </div>
          </Link>
        );
      })}
    </div>
    <MyDraftsModal isOpen={isDraftsModalOpen} onClose={() => setIsDraftsModalOpen(false)} />
    </>
  );
}
