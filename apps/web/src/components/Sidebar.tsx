'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, Film, MessageCircle, Bell, PlusCircle, Settings, ShieldCheck, Store, Bot, Globe, Megaphone, Zap, MessageSquare, Map, Tv, Newspaper, Crown, Plus, Users } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';
import { getSidebarData } from '@/actions/user';

export function Sidebar() {
  const pathname = usePathname();
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';

  const [data, setData] = React.useState<{
    managedTolees: any[],
    joinedTolees: any[],
    unreadNotifications: number,
    unreadMessages: number,
    isVerifiedCreator: boolean,
  }>({
    managedTolees: [],
    joinedTolees: [],
    unreadNotifications: 0,
    unreadMessages: 0,
    isVerifiedCreator: false,
  });

  React.useEffect(() => {
    if (isAuthenticated) {
      getSidebarData().then((res: any) => {
        if (res.success) {
          setData({
            managedTolees: res.managedTolees || [],
            joinedTolees: res.joinedTolees || [],
            unreadNotifications: res.unreadNotifications || 0,
            unreadMessages: res.unreadMessages || 0,
            isVerifiedCreator: res.isVerifiedCreator || false,
          });
        }
      });
    }
  }, [isAuthenticated, pathname]);

  const mainNav = isAuthenticated ? [
    { name: 'Feed', href: '/feed', icon: Home },
    { name: 'Discover', href: '/discover', icon: Compass },
    { name: 'Reels', href: '/reels', icon: Film },
    { name: 'Chats', href: '/chat', icon: MessageCircle, badge: data.unreadMessages > 0 ? String(data.unreadMessages) : null },
    { name: 'Tolee News', href: '/news', icon: Newspaper },
    { name: 'Tolee Screen', href: '/screen', icon: Tv },
    { name: 'AI Manager', href: '/ai-manager', icon: Bot },
    { name: 'Notifications', href: '/notifications', icon: Bell, badge: data.unreadNotifications > 0 ? String(data.unreadNotifications) : null },
    { name: 'Marketplace', href: '/marketplace', icon: Store },
    { name: 'Tolee World', href: '/world', icon: Globe },
    { name: 'Live Map', href: '/map', icon: Map },
    { name: 'Ads Manager', href: '/ads-manager', icon: Megaphone },
    { name: 'Creator Program', href: '/creator-program', icon: Zap, isCreator: true },
  ] : [
    { name: 'Discover', href: '/discover', icon: Compass },
    { name: 'Tolee News', href: '/news', icon: Newspaper },
    { name: 'Tolee Screen', href: '/screen', icon: Tv },
    { name: 'Live Map', href: '/map', icon: Map },
    { name: 'Creator Program', href: '/creator-program', icon: Zap, isCreator: true },
  ];

  const managedTolees = data.managedTolees;
  const joinedTolees = data.joinedTolees;

  return (
    <aside className="w-64 fixed left-0 top-16 h-[calc(100vh-4rem)] border-r border-zinc-200/40 dark:border-zinc-800/40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md overflow-hidden hidden lg:flex flex-col z-40">
      <ScrollArea className="flex-1 py-6 px-4.5">
        
        {/* Main Nav */}
        <div className="space-y-1.5 mb-8">
          {mainNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (pathname.startsWith('/t/') && item.name === 'Feed');
            
            return (
              <Link key={item.name} href={item.href}>
                <Button 
                  variant="ghost" 
                  className={`w-full justify-start rounded-xl h-11 text-[14px] font-semibold transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] ${
                    isActive 
                      ? 'bg-gradient-to-r from-[#ec4899] to-[#8b5cf6] text-white shadow-md shadow-purple-500/10 dark:shadow-purple-950/20 font-bold' 
                      : (item as any).isCreator
                      ? 'text-purple-600 dark:text-purple-400 hover:bg-purple-50/80 dark:hover:bg-purple-950/30 hover:text-purple-700'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/50 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 mr-3 flex-shrink-0 transition-colors ${
                    isActive 
                      ? 'text-white' 
                      : (item as any).isCreator ? 'text-purple-500' : 'text-zinc-400 dark:text-zinc-500'
                  }`} />
                  {item.name}
                  {item.name === 'AI Manager' && !isActive && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-red-500 animate-pulse mr-1 border border-white dark:border-zinc-900" />
                  )}
                  {(item as any).isCreator && !isActive && (
                    <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full font-black bg-gradient-to-r from-[#ec4899] to-[#8b5cf6] text-white shadow-sm">NEW</span>
                  )}
                  {item.badge && (
                    <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-white text-[#8b5cf6]' : 'bg-[#ec4899] text-white'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </Button>
              </Link>
            );
          })}
        </div>

        {/* Tolees You Manage */}
        {isAuthenticated && managedTolees.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between px-3 mb-3">
              <h3 className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Tolees You Manage</h3>
              <Link href="/create-tolee">
                <Button variant="ghost" size="icon" className="w-7 h-7 rounded-lg border border-zinc-200/60 dark:border-zinc-800/60 text-zinc-400 hover:text-purple-600 hover:border-purple-200 dark:hover:text-purple-400 dark:hover:border-purple-800 bg-white/50 dark:bg-zinc-900/50 shadow-sm hover:shadow hover:rotate-90 transition-all duration-300 flex items-center justify-center">
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
            <div className="space-y-1.5">
              {managedTolees.map((tolee) => (
                <Link key={tolee.id} href={`/t/${tolee.slug}`}>
                  <Button variant="ghost" className="w-full justify-start rounded-xl h-11 px-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/50 border border-transparent hover:border-zinc-200/30 dark:hover:border-zinc-800/30 transition-all duration-200 overflow-hidden group">
                    <div className="w-8 h-8 mr-3 rounded-full overflow-hidden flex-shrink-0 border-2 border-purple-500/20 dark:border-purple-500/10 group-hover:border-purple-500/40 dark:group-hover:border-purple-500/30 transition-all duration-200 shadow-sm relative">
                      <img src={tolee.avatar || `https://i.pravatar.cc/150?u=${tolee.id}`} alt={tolee.name} className="w-full h-full object-cover" />
                    </div>
                    <span className="truncate group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">{tolee.name}</span>
                    <div className="ml-auto bg-amber-500/10 text-amber-600 dark:bg-amber-500/5 dark:text-amber-400 p-1 rounded-md shadow-sm border border-amber-500/10 flex items-center justify-center" title="Owner">
                      <Crown className="w-3 h-3 fill-amber-500/10" />
                    </div>
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Your Tolees */}
        {isAuthenticated && joinedTolees.length > 0 && (
          <div className="mb-6">
            <div className="px-3 mb-3">
              <h3 className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Your Tolees</h3>
            </div>
            <div className="space-y-1.5">
              {joinedTolees.map((tolee) => (
                <Link key={tolee.id} href={`/t/${tolee.slug}`}>
                  <Button variant="ghost" className="w-full justify-start rounded-xl h-11 px-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/50 border border-transparent hover:border-zinc-200/30 dark:hover:border-zinc-800/30 transition-all duration-200 overflow-hidden group">
                    <div className="w-8 h-8 mr-3 rounded-full overflow-hidden flex-shrink-0 border border-zinc-200/60 dark:border-zinc-800/60 group-hover:border-zinc-300 dark:group-hover:border-zinc-700 transition-all duration-200 shadow-sm">
                      <img src={tolee.avatar || `https://i.pravatar.cc/150?u=${tolee.id}`} alt={tolee.name} className="w-full h-full object-cover" />
                    </div>
                    <span className="truncate group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">{tolee.name}</span>
                    <div className="ml-auto bg-blue-500/10 text-blue-600 dark:bg-blue-500/5 dark:text-blue-400 px-1.5 py-0.5 rounded text-[9px] font-bold border border-blue-500/10">
                      Member
                    </div>
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        )}

        {isAuthenticated && managedTolees.length === 0 && joinedTolees.length === 0 && (
          <div className="px-3 py-4 text-center bg-gray-50 dark:bg-zinc-900/30 rounded-xl border border-dashed border-gray-200 dark:border-zinc-800">
            <p className="text-xs text-gray-500 mb-2">You haven't joined any Tolees yet.</p>
            <Link href="/">
              <Button size="sm" variant="outline" className="text-[10px] h-7 rounded-lg">Explore Tolees</Button>
            </Link>
          </div>
        )}

      </ScrollArea>
      
      {/* Settings / Bottom Footer */}
      <div className="mt-auto p-4 border-t border-zinc-200/40 dark:border-zinc-800/40 bg-white/40 dark:bg-zinc-950/40">
        {isAuthenticated && (
          <>
            <Link href="/settings" className="w-full block mb-2">
              <Button variant="ghost" className="w-full justify-start rounded-xl h-10 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/50">
                <Settings className="w-4 h-4 mr-3 flex-shrink-0" />
                Settings & Privacy
              </Button>
            </Link>
            <Link href="/feedback" className="w-full block mb-2">
              <Button variant="ghost" className="w-full justify-start rounded-xl h-10 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/50">
                <MessageSquare className="w-4 h-4 mr-3 flex-shrink-0" />
                Send Feedback
              </Button>
            </Link>
          </>
        )}
        <div className="px-3 py-1 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-zinc-400 font-medium">
          <Link href="/about" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">About Us</Link>
          <Link href="/privacy" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">Terms & Conditions</Link>
          <Link href="/contact" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">Contact Us</Link>
          <span>© 2026 Tolee</span>
        </div>
      </div>
    </aside>
  );
}
