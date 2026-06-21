'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { MapPin, Users, Shield, Loader2, Check, Search, Sparkles, Lock, ArrowRight, Globe, Zap, TrendingUp, UserPlus, LogIn, LayoutGrid, ShoppingBag, Briefcase, GraduationCap, Home, MoreHorizontal } from 'lucide-react';
import { joinTolee } from '@/actions/tolee';
import { triggerAuthModal } from '@/components/AuthModal';
import { formatViewCount } from '@/lib/utils';

const categories = [
  { name: 'All', icon: '🌐' },
  { name: 'Trending', icon: '🔥' },
  { name: 'Hobbies', icon: '🎨' },
  { name: 'Music', icon: '🎵' },
  { name: 'Money', icon: '💰' },
  { name: 'Spirituality', icon: '🧘' },
  { name: 'Tech', icon: '💻' },
  { name: 'Health', icon: '❤️' },
  { name: 'Sports', icon: '⚽' },
  { name: 'Self-Improvement', icon: '💡' }
];

export function DiscoverGrid({ initialTolees, tolees: propTolees, isAuthenticated }: { initialTolees?: any[], tolees?: any[], isAuthenticated: boolean }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [tolees, setTolees] = useState(initialTolees || propTolees || []);
  const [joiningIds, setJoiningIds] = useState<Record<string, boolean>>({});

  const totalMembers = tolees.reduce((acc: number, t: any) => acc + (t.members || 0), 0);

  const handleCreateToleeClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault();
      triggerAuthModal('Login or create an account to create your own Tolee community.');
    }
  };

  const handleCardClick = (e: React.MouseEvent, slug: string) => {
    if (!isAuthenticated) {
      e.preventDefault();
      triggerAuthModal('Login or create an account to explore this Tolee community.');
    }
  };

  const handleJoin = async (e: React.MouseEvent, toleeId: string, isPrivate: boolean) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      triggerAuthModal('Login or create an account to join this Tolee community.');
      return;
    }

    setJoiningIds(prev => ({ ...prev, [toleeId]: true }));

    try {
      const res = await joinTolee(toleeId);
      if (res.success) {
        setTolees((current: any[]) =>
          current.map(t => {
            if (t.id === toleeId) {
              return {
                ...t,
                isJoinedByMe: !isPrivate,
                isPendingByMe: isPrivate,
                members: isPrivate ? t.members : t.members + 1
              };
            }
            return t;
          })
        );
      } else {
        console.error(res.error);
      }
    } catch (err) {
      console.error('Error joining Tolee:', err);
    } finally {
      setJoiningIds(prev => ({ ...prev, [toleeId]: false }));
    }
  };

  const filteredTolees = tolees.filter((tolee: any) => {
    const matchesSearch =
      tolee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tolee.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tolee.location || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'All' || tolee.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#0a0a0a] font-sans text-gray-900 dark:text-gray-100 py-10 md:py-16">
      
      {/* Centered Discover Header (Skool style) */}
      <div className="text-center mb-8 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2.5 text-gray-900 dark:text-white flex items-center justify-center gap-2 select-none">
          Discover communities
        </h1>
        <p className="text-[15px] sm:text-base text-gray-500 dark:text-gray-400 font-medium">
          or{' '}
          <Link
            href="/create-tolee"
            onClick={handleCreateToleeClick}
            className="text-[#0a7c85] hover:text-[#08666e] transition-colors hover:underline font-bold"
          >
            create your own
          </Link>
        </p>
      </div>

      {/* Centered Search Bar */}
      <div className="max-w-xl mx-auto mb-8 px-4 animate-in fade-in slide-in-from-bottom-6 duration-500 delay-100">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0a7c85] transition-colors w-5 h-5" />
          <Input
            type="text"
            placeholder="Search for anything"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-5 text-[15px] sm:text-base rounded-lg bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 shadow-sm focus-visible:ring-[#0a7c85]/20 focus-visible:border-[#0a7c85] transition-all placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Category Pills (Centered & Horizontal Scroll) */}
      <div className="mb-8 flex justify-center px-4 animate-in fade-in slide-in-from-bottom-8 duration-500 delay-200">
        <ScrollArea className="w-full max-w-4xl whitespace-nowrap">
          <div className="flex w-max space-x-2.5 p-1 mx-auto">
            {categories.map((category) => (
              <button
                key={category.name}
                onClick={() => setSelectedCategory(category.name)}
                className={`flex items-center gap-1.5 px-4.5 py-2 rounded-full text-xs font-semibold tracking-wide transition-all ${
                  selectedCategory === category.name
                    ? 'bg-[#0a7c85] text-white shadow-sm scale-105'
                    : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800'
                }`}
              >
                <span>{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>
      </div>

      {/* Main Content Area */}
      <main className="container mx-auto px-4 max-w-5xl">
        {/* Empty State */}
        {filteredTolees.length === 0 ? (
          <div className="text-center py-20 px-6 bg-white dark:bg-[#121212] rounded-3xl border border-gray-200/50 dark:border-gray-800 shadow-xl max-w-md mx-auto animate-in fade-in slide-in-from-bottom-10 duration-700">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-5">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2">
              No Tolee Groups Found
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 max-w-xs mx-auto">
              {searchQuery || selectedCategory !== 'All'
                ? "We couldn't find any groups matching your filters. Try clearing your search!"
                : 'No communities have been created yet.'}
            </p>
            <Link href="/create-tolee" onClick={handleCreateToleeClick}>
              <Button className="rounded-full font-black px-6 py-5 text-sm shadow-md transition-all">
                Create a Tolee Group
              </Button>
            </Link>
          </div>
        ) : (
          /* Premium Skool-style Tolees Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
            {filteredTolees.map((tolee: any) => (
              <Link
                href={`/t/${tolee.slug}`}
                key={tolee.id}
                className="block h-full"
                onClick={(e) => handleCardClick(e, tolee.slug)}
              >
                <Card className="p-0 overflow-hidden border border-gray-200/50 dark:border-zinc-800/80 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1.5 cursor-pointer group bg-white dark:bg-[#18191a] flex flex-col h-full rounded-[18px] relative shadow-sm">
                  {/* Banner */}
                  <div className="relative h-40 w-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                    <img
                      src={tolee.banner || '/default-tolee-cover.svg'}
                      alt={tolee.name}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    />
                    
                    {/* Category Badge overlay */}
                    <div className="absolute top-3 right-3 bg-white/95 dark:bg-black/90 text-[#0a7c85] text-[9.5px] font-black uppercase tracking-wider px-2 py-1 rounded border border-gray-200/40 dark:border-zinc-800/55 shadow-sm z-10">
                      {tolee.category}
                    </div>

                    {/* Guest Lock Overlay */}
                    {!isAuthenticated && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="bg-white/95 dark:bg-black/85 backdrop-blur-sm rounded-xl px-3 py-1.5 flex items-center gap-1.5 shadow-lg text-[13px] font-bold text-gray-900 dark:text-white transform -translate-y-1 group-hover:translate-y-0 transition-transform duration-300">
                          <Lock className="w-3.5 h-3.5 text-[#0a7c85]" />
                          Login to explore
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <CardContent className="p-4 pt-0 flex-grow flex flex-col">
                    {/* Round Avatar and Title Row (Skool Style - Overlapping Banner) */}
                    <div className="flex items-center gap-3 mb-3 shrink-0 -mt-7 relative z-20">
                      <Avatar className="w-14 h-14 border-4 border-white dark:border-[#18191a] shadow-md shrink-0 rounded-full">
                        <AvatarImage src={tolee.avatar || '/default-tolee-avatar.svg'} alt={tolee.name} className="object-cover" />
                        <AvatarFallback className="font-extrabold bg-[#0a7c85] text-white text-base">
                          {tolee.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-extrabold text-sm sm:text-[15px] text-gray-900 dark:text-white line-clamp-1 group-hover:text-[#0a7c85] transition-colors leading-snug">
                          {tolee.name}
                        </h3>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs sm:text-[13px] text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed mb-4 flex-grow h-[54px] overflow-hidden">
                      {tolee.description}
                    </p>

                    {/* Stats & Join Footer Row */}
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100 dark:border-zinc-800/80 w-full gap-2">
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-bold truncate flex items-center gap-1 select-none">
                        <span>{formatViewCount(tolee.members)} Members</span>
                        <span className="text-gray-300 dark:text-zinc-750">•</span>
                        <span className="text-[#0a7c85] dark:text-[#1299a3]">{tolee.price === 'Free' ? 'Free' : tolee.price}</span>
                      </div>

                      {/* Join Action button */}
                      <div className="flex-shrink-0">
                        {tolee.isJoinedByMe ? (
                          <Button
                            variant="secondary"
                            disabled
                            className="bg-[#e6f4f6] text-[#0a7c85] font-extrabold rounded-full px-3 h-8 flex items-center gap-1 opacity-100 border-none text-xs"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" /> Joined
                          </Button>
                        ) : tolee.isPendingByMe ? (
                          <Button
                            variant="secondary"
                            disabled
                            className="bg-amber-500/10 text-amber-600 font-extrabold rounded-full px-3 h-8 opacity-100 border-none text-xs"
                          >
                            Requested
                          </Button>
                        ) : (
                          <Button
                            onClick={(e) => handleJoin(e, tolee.id, tolee.isPrivate)}
                            disabled={joiningIds[tolee.id]}
                            className="rounded-full px-3.5 h-8 font-extrabold shadow-sm hover:shadow transition-all bg-[#0a7c85] hover:bg-[#08666e] text-white flex items-center justify-center min-w-[65px] text-xs"
                          >
                            {joiningIds[tolee.id] ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              'Join'
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
