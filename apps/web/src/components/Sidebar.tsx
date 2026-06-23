'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, Film, MessageCircle, Bell, PlusCircle, Settings, ShieldCheck, Store, Bot, Globe, Megaphone, Zap, MessageSquare, Map, Tv } from 'lucide-react';
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
    { name: 'Tolee Screen', href: '/screen', icon: Tv },
    { name: 'Discover', href: '/discover', icon: Compass },
    { name: 'Reels', href: '/reels', icon: Film },
    { name: 'Chats', href: '/chat', icon: MessageCircle, badge: data.unreadMessages > 0 ? String(data.unreadMessages) : null },
    { name: 'AI Manager', href: '/ai-manager', icon: Bot },
    { name: 'Notifications', href: '/notifications', icon: Bell, badge: data.unreadNotifications > 0 ? String(data.unreadNotifications) : null },
    { name: 'Marketplace', href: '/marketplace', icon: Store },
    { name: 'Tolee World', href: '/world', icon: Globe },
    { name: 'Live Map', href: '/map', icon: Map },
    { name: 'Ads Manager', href: '/ads-manager', icon: Megaphone },
    { name: 'Creator Program', href: '/creator-program', icon: Zap, isCreator: true },
  ] : [
    { name: 'Discover', href: '/discover', icon: Compass },
    { name: 'Tolee Screen', href: '/screen', icon: Tv },
    { name: 'Live Map', href: '/map', icon: Map },
    { name: 'Creator Program', href: '/creator-program', icon: Zap, isCreator: true },
  ];

  const managedTolees = data.managedTolees;
  const joinedTolees = data.joinedTolees;

  return (
    <aside className="w-64 fixed left-0 top-16 h-[calc(100vh-4rem)] border-r border-zinc-100 dark:border-zinc-900 bg-white dark:bg-zinc-950 overflow-hidden hidden lg:flex flex-col z-40">
      <ScrollArea className="flex-1 py-6 px-4">
        
        {/* Main Nav */}
        <div className="space-y-1.5 mb-8">
          {mainNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (pathname.startsWith('/t/') && item.name === 'Feed');
            
            return (
              <Link key={item.name} href={item.href}>
                <Button 
                  variant="ghost" 
                  className={`w-full justify-start rounded-2xl h-11 text-[14px] font-semibold transition-all duration-200 ${
                    isActive 
                      ? 'bg-[#0a7c85] text-white dark:bg-[#0a7c85] dark:text-white shadow-sm' 
                      : (item as any).isCreator
                      ? 'text-purple-600 dark:text-purple-400 hover:bg-purple-50/80 dark:hover:bg-purple-950/30 hover:text-purple-700'
                      : 'text-[#5c6e80] dark:text-zinc-400 hover:bg-gray-50/80 dark:hover:bg-zinc-900/50 hover:text-gray-900 dark:hover:text-zinc-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 mr-3 flex-shrink-0 ${
                    isActive 
                      ? 'text-white' 
                      : (item as any).isCreator ? 'text-purple-500' : 'text-gray-400 dark:text-zinc-500'
                  }`} />
                  {item.name}
                  {item.name === 'AI Manager' && !isActive && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-red-500 animate-pulse mr-1 border border-white dark:border-zinc-900" />
                  )}
                  {(item as any).isCreator && !isActive && (
                    <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full font-black bg-[#0a7c85] text-white">NEW</span>
                  )}
                  {item.badge && (
                    <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-white text-[#0a7c85]' : 'bg-[#0a7c85] text-white'
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
            <div className="flex items-center justify-between px-3 mb-2">
              <h3 className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Tolees You Manage</h3>
              <Link href="/create-tolee">
                <Button variant="ghost" size="icon" className="w-6 h-6 rounded-full text-gray-400 hover:text-[#0a7c85] dark:hover:text-[#0a7c85]"><PlusCircle className="w-4 h-4" /></Button>
              </Link>
            </div>
            <div className="space-y-1">
              {managedTolees.map((tolee) => (
                <Link key={tolee.id} href={`/t/${tolee.slug}`}>
                  <Button variant="ghost" className="w-full justify-start rounded-2xl h-10 px-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-900/50 overflow-hidden">
                    <div className="w-7 h-7 mr-3 rounded-full overflow-hidden flex-shrink-0 border border-gray-150 dark:border-zinc-700">
                      <img src={tolee.avatar || `https://i.pravatar.cc/150?u=${tolee.id}`} alt={tolee.name} className="w-full h-full object-cover" />
                    </div>
                    <span className="truncate">{tolee.name}</span>
                    <ShieldCheck className="w-3.5 h-3.5 ml-auto text-gray-400 dark:text-zinc-500 flex-shrink-0" />
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Your Tolees */}
        {isAuthenticated && joinedTolees.length > 0 && (
          <div className="mb-6">
            <h3 className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider px-3 mb-2">Your Tolees</h3>
            <div className="space-y-1">
              {joinedTolees.map((tolee) => (
                <Link key={tolee.id} href={`/t/${tolee.slug}`}>
                  <Button variant="ghost" className="w-full justify-start rounded-2xl h-10 px-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-900/50 overflow-hidden">
                    <div className="w-7 h-7 mr-3 rounded-full overflow-hidden flex-shrink-0 border border-gray-150 dark:border-zinc-700">
                      <img src={tolee.avatar || `https://i.pravatar.cc/150?u=${tolee.id}`} alt={tolee.name} className="w-full h-full object-cover" />
                    </div>
                    <span className="truncate">{tolee.name}</span>
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
      <div className="mt-auto p-4 border-t border-zinc-100 dark:border-zinc-900">
        {isAuthenticated && (
          <>
            <Link href="/settings" className="w-full block mb-2">
              <Button variant="ghost" className="w-full justify-start rounded-2xl h-10 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-900/50">
                <Settings className="w-4 h-4 mr-3 flex-shrink-0" />
                Settings & Privacy
              </Button>
            </Link>
            <Link href="/feedback" className="w-full block mb-2">
              <Button variant="ghost" className="w-full justify-start rounded-2xl h-10 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-900/50">
                <MessageSquare className="w-4 h-4 mr-3 flex-shrink-0" />
                Send Feedback
              </Button>
            </Link>
          </>
        )}
        <div className="px-3 py-1 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-400 font-medium">
          <Link href="/about" className="hover:text-[#0a7c85] dark:hover:text-[#0a7c85] transition-colors">About Us</Link>
          <Link href="/privacy" className="hover:text-[#0a7c85] dark:hover:text-[#0a7c85] transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-[#0a7c85] dark:hover:text-[#0a7c85] transition-colors">Terms & Conditions</Link>
          <Link href="/contact" className="hover:text-[#0a7c85] dark:hover:text-[#0a7c85] transition-colors">Contact Us</Link>
          <span>© 2026 Tolee</span>
        </div>
      </div>
    </aside>
  );
}
