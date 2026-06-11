'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Compass, Film, MessageCircle, Menu, User, Settings, Globe, Store, LogOut } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { getSidebarData } from '@/actions/user';
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
  const isAuthenticated = status === 'authenticated';

  React.useEffect(() => {
    if (session?.user) {
      getSidebarData().then(res => {
        if (res.success) {
          setUnreadChats(res.unreadMessages || 0);
        }
      });
      const interval = setInterval(() => {
        getSidebarData().then(res => {
          if (res.success) {
            setUnreadChats(res.unreadMessages || 0);
          }
        });
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [session, pathname]);

  if (!isAuthenticated) return null;

  const navItems = [
    { name: 'Feed', href: '/feed', icon: Home },
    { name: 'Discover', href: '/discover', icon: Compass },
    { name: 'Reels', href: '/reels', icon: Film },
    { name: 'Chats', href: '/chat', icon: MessageCircle, badge: unreadChats > 0 ? String(unreadChats) : undefined },
    // User Profile DP on the bottom right like Instagram opens menu
    { name: 'Profile', href: '/u/me', isAvatar: true },
  ];

  return (
    <div className={`fixed bottom-0 left-0 right-0 w-full h-[calc(4.2rem+env(safe-area-inset-bottom))] flex items-center justify-around z-50 lg:hidden border-t px-3 pb-[env(safe-area-inset-bottom)] transition-all duration-300 backdrop-blur-md ${pathname === '/reels' ? 'bg-black/95 border-zinc-800/50 shadow-black/40' : 'bg-white/95 dark:bg-zinc-950/95 border-zinc-150/80 dark:border-zinc-900 shadow-zinc-200/40 dark:shadow-black/60'}`}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (pathname.startsWith('/t/') && item.name === 'Feed');
        const activeColor = pathname === '/reels' ? 'text-white' : 'text-[#0a7c85] dark:text-white';
        const inactiveColor = pathname === '/reels' ? 'text-zinc-500 hover:text-white' : 'text-zinc-400 hover:text-[#0a7c85] dark:hover:text-white';

        if (item.isAvatar) {
          return (
            <DropdownMenu key={item.name}>
              <DropdownMenuTrigger className="relative w-full h-full flex flex-col items-center justify-center focus:outline-none select-none">
                <div className={`flex flex-col items-center justify-center w-full h-full relative pb-1.5 transition-colors duration-200 ${isActive ? activeColor : inactiveColor}`}>
                  <div className="relative">
                    <div className={`w-7 h-7 rounded-full overflow-hidden border transition-all duration-300 ${isActive ? (pathname === '/reels' ? 'border-white border-2' : 'border-[#0a7c85] dark:border-white border-2 scale-105') : 'border-zinc-250 dark:border-zinc-800'}`}>
                      <img src={(!session?.user?.image || session.user.image === 'null' || session.user.image === 'undefined' || session.user.image.trim() === '') ? '/default-user-avatar.svg' : session.user.image} alt="Profile" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <span className="text-[10px] mt-[4px] font-semibold leading-none">{item.name}</span>
                  {isActive && (
                    <span className={`absolute bottom-0 w-1 h-1 rounded-full animate-in fade-in zoom-in duration-300 ${pathname === '/reels' ? 'bg-white' : 'bg-[#0a7c85] dark:bg-white'}`} />
                  )}
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" side="top" sideOffset={10}>
                <div className="px-2 py-1.5 text-xs font-normal text-muted-foreground">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-foreground">{session?.user?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground truncate">
                      {session?.user?.email}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/u/me')} className="cursor-pointer flex w-full items-center">
                  <User className="mr-2 h-4 w-4" />
                  <span>My Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer flex w-full items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/my-tolees')} className="cursor-pointer flex w-full items-center">
                  <Globe className="mr-2 h-4 w-4" />
                  <span>My Tolees</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/marketplace')} className="cursor-pointer flex w-full items-center">
                  <Store className="mr-2 h-4 w-4" />
                  <span>Marketplace</span>
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
          <Link key={item.name} href={item.href} className="relative w-full h-full flex flex-col items-center justify-center">
            <div className={`flex flex-col items-center justify-center w-full h-full relative pb-1.5 transition-colors duration-200 ${isActive ? activeColor : inactiveColor}`}>
              <div className="relative">
                {Icon && (
                  <Icon 
                    strokeWidth={1.5}
                    className={`w-[22px] h-[22px] transition-all duration-300 ${isActive ? 'scale-105' : 'hover:scale-105'}`} 
                  />
                )}
                {item.badge && (
                  <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold border border-white dark:border-black">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-[4px] font-semibold leading-none">{item.name}</span>
              {isActive && (
                <span className={`absolute bottom-0 w-1 h-1 rounded-full animate-in fade-in zoom-in duration-300 ${pathname === '/reels' ? 'bg-white' : 'bg-[#0a7c85] dark:bg-white'}`} />
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
