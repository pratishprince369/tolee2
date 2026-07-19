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
  
  const activeIndex = mainNav.findIndex(item => pathname === item.href || (pathname.startsWith('/t/') && item.name === 'Feed'));

  return (
    <aside className="w-64 fixed left-0 top-16 h-[calc(100vh-4rem)] border-r border-[#E5E7EB] dark:border-zinc-900 bg-white dark:bg-zinc-950 overflow-hidden hidden lg:flex flex-col z-40">
      <ScrollArea className="flex-1 py-6 px-4">
        
        {/* Main Nav */}
        <div className="relative space-y-1.5 mb-8">
          {activeIndex !== -1 && (
            <div 
              className="absolute left-0 right-0 h-11 bg-gradient-to-r from-[#0E9F9A] to-[#087A76] rounded-xl transition-all duration-[250ms] ease-in-out shadow-sm shadow-[#0E9F9A]/15"
              style={{
                top: `${activeIndex * 50}px`,
                pointerEvents: 'none',
              }}
            />
          )}
          {mainNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (pathname.startsWith('/t/') && item.name === 'Feed');
            
            return (
              <Link key={item.name} href={item.href} className="relative block z-10">
                <Button 
                  variant="ghost" 
                  className={`w-full justify-start rounded-xl h-11 text-[14px] font-semibold transition-all duration-[250ms] ease-in-out group hover:scale-[1.01] active:scale-[0.99] ${
                    isActive 
                      ? 'bg-transparent text-white font-bold' 
                      : (item as any).isCreator
                      ? 'text-[#0E9F9A] dark:text-purple-400 hover:bg-[#EAF9F8] dark:hover:bg-[#0E9F9A]/10 hover:text-[#0E9F9A]'
                      : 'text-[#1F2937] dark:text-zinc-200 hover:bg-[#EAF9F8] dark:hover:bg-[#0E9F9A]/10 hover:text-[#0E9F9A]'
                  }`}
                >
                  <Icon className={`w-4 h-4 mr-3 flex-shrink-0 transition-colors duration-[250ms] ${
                    isActive 
                      ? 'text-white' 
                      : 'text-[#6B7280] group-hover:text-[#0E9F9A]'
                  }`} />
                  {item.name}
                  {item.name === 'AI Manager' && !isActive && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse mr-1 border border-white dark:border-zinc-900" />
                  )}
                  {(item as any).isCreator && !isActive && (
                    <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full font-extrabold bg-[#0E9F9A] text-white shadow-sm">NEW</span>
                  )}
                  {item.badge && (
                    <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold transition-all duration-[250ms] ${
                      isActive ? 'bg-white text-[#087A76]' : 'bg-[#0E9F9A] text-white'
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
              <h3 className="text-[11px] font-bold text-[#6B7280] dark:text-zinc-500 uppercase tracking-wider">Tolees You Manage</h3>
              <Link href="/create-tolee">
                <Button variant="ghost" size="icon" className="w-7 h-7 rounded-lg border border-[#E5E7EB] dark:border-zinc-800 text-[#6B7280] hover:text-[#0E9F9A] hover:border-[#0E9F9A] bg-white dark:bg-zinc-900/50 shadow-sm hover:shadow hover:rotate-90 transition-all duration-300 flex items-center justify-center">
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
            <div className="space-y-1.5">
              {managedTolees.map((tolee) => (
                <Link key={tolee.id} href={`/t/${tolee.slug}`}>
                  <Button variant="ghost" className="w-full justify-start rounded-xl h-11 px-2.5 text-sm font-semibold text-[#1F2937] dark:text-zinc-300 bg-white dark:bg-zinc-900/20 hover:bg-[#EAF9F8] dark:hover:bg-[#0E9F9A]/10 border border-[#E5E7EB] dark:border-zinc-900/40 hover:border-[#E5E7EB] dark:hover:border-zinc-800 hover:text-[#0E9F9A] transition-all duration-[250ms] overflow-hidden group shadow-sm hover:shadow">
                    <div className="w-8 h-8 mr-3 rounded-full overflow-hidden flex-shrink-0 border border-zinc-200 dark:border-zinc-800 group-hover:border-[#0E9F9A]/30 transition-all duration-200 shadow-sm relative">
                      <img src={tolee.avatar || `https://i.pravatar.cc/150?u=${tolee.id}`} alt={tolee.name} className="w-full h-full object-cover" />
                    </div>
                    <span className="truncate group-hover:text-[#0E9F9A] transition-colors">{tolee.name}</span>
                    <div className="ml-auto bg-amber-500/10 text-[#F59E0B] p-1 rounded-md shadow-sm border border-amber-500/15 flex items-center justify-center transition-transform duration-200 group-hover:scale-105" title="Owner">
                      <Crown className="w-3.5 h-3.5 fill-amber-500/10 text-[#F59E0B]" />
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
              <h3 className="text-[11px] font-bold text-[#6B7280] dark:text-zinc-500 uppercase tracking-wider">Your Tolees</h3>
            </div>
            <div className="space-y-1.5">
              {joinedTolees.map((tolee) => (
                <Link key={tolee.id} href={`/t/${tolee.slug}`}>
                  <Button variant="ghost" className="w-full justify-start rounded-xl h-11 px-2.5 text-sm font-semibold text-[#1F2937] dark:text-zinc-300 bg-white dark:bg-zinc-900/20 hover:bg-[#EAF9F8] dark:hover:bg-[#0E9F9A]/10 border border-[#E5E7EB] dark:border-zinc-900/40 hover:border-[#E5E7EB] dark:hover:border-zinc-800 hover:text-[#0E9F9A] transition-all duration-[250ms] overflow-hidden group shadow-sm hover:shadow">
                    <div className="w-8 h-8 mr-3 rounded-full overflow-hidden flex-shrink-0 border border-zinc-200 dark:border-zinc-800 group-hover:border-[#0E9F9A]/30 transition-all duration-200 shadow-sm">
                      <img src={tolee.avatar || `https://i.pravatar.cc/150?u=${tolee.id}`} alt={tolee.name} className="w-full h-full object-cover" />
                    </div>
                    <span className="truncate group-hover:text-[#0E9F9A] transition-colors">{tolee.name}</span>
                    <div className="ml-auto bg-[#EAF9F8] text-[#0E9F9A] dark:bg-[#0E9F9A]/10 dark:text-[#0E9F9A] px-1.5 py-0.5 rounded text-[9px] font-extrabold border border-[#0E9F9A]/10 shadow-sm transition-transform duration-200 group-hover:scale-105">
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
      <div className="mt-auto p-4 border-t border-[#E5E7EB] dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-950/50">
        {isAuthenticated && (
          <>
            <Link href="/settings" className="w-full block mb-2">
              <Button variant="ghost" className="w-full justify-start rounded-xl h-10 text-sm font-semibold text-[#1F2937] dark:text-zinc-300 hover:bg-[#EAF9F8] dark:hover:bg-[#0E9F9A]/10 hover:text-[#0E9F9A] transition-all duration-[250ms]">
                <Settings className="w-4 h-4 mr-3 flex-shrink-0" />
                Settings & Privacy
              </Button>
            </Link>
            <Link href="/feedback" className="w-full block mb-2">
              <Button variant="ghost" className="w-full justify-start rounded-xl h-10 text-sm font-semibold text-[#1F2937] dark:text-zinc-300 hover:bg-[#EAF9F8] dark:hover:bg-[#0E9F9A]/10 hover:text-[#0E9F9A] transition-all duration-[250ms]">
                <MessageSquare className="w-4 h-4 mr-3 flex-shrink-0" />
                Send Feedback
              </Button>
            </Link>
          </>
        )}
        <div className="px-3 py-1 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[#6B7280] dark:text-zinc-500 font-medium">
          <Link href="/about" className="hover:text-[#0E9F9A] dark:hover:text-[#0E9F9A] transition-colors">About Us</Link>
          <Link href="/privacy" className="hover:text-[#0E9F9A] dark:hover:text-[#0E9F9A] transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-[#0E9F9A] dark:hover:text-[#0E9F9A] transition-colors">Terms & Conditions</Link>
          <Link href="/contact" className="hover:text-[#0E9F9A] dark:hover:text-[#0E9F9A] transition-colors">Contact Us</Link>
          <span>© 2026 Tolee</span>
        </div>
      </div>
    </aside>
  );
}
