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

const categories = [
  { name: 'All', icon: <LayoutGrid className="w-4 h-4" /> },
  { name: 'Buy and Sell', icon: <ShoppingBag className="w-4 h-4" /> },
  { name: 'Business', icon: <Briefcase className="w-4 h-4" /> },
  { name: 'Education', icon: <GraduationCap className="w-4 h-4" /> },
  { name: 'Jobs', icon: <Briefcase className="w-4 h-4" /> },
  { name: 'Real Estate', icon: <Home className="w-4 h-4" /> },
  { name: 'Community', icon: <Users className="w-4 h-4" /> }
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
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] font-sans text-gray-900 dark:text-gray-100">

      {/* ─── GUEST HERO BANNER ─── */}
      {!isAuthenticated && (
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0a7c85] via-[#0e8a94] to-[#1299a3] text-white">
          {/* Decorative blobs */}
          <div className="absolute -top-20 -left-20 w-72 h-72 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#1299a3]/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative container mx-auto px-4 py-12 md:py-16 max-w-5xl text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider mb-6 text-emerald-300 animate-in fade-in slide-in-from-bottom-3 duration-500">
              <Zap className="w-3.5 h-3.5" />
              India&apos;s #1 Community Platform
            </div>

            {/* Heading */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-75 leading-tight">
              Find Your{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-cyan-300">
                Community
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 leading-relaxed">
              Join thousands of communities on Tolee — discover groups, connect with people, and share moments that matter.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
              <Link href="/auth/signup">
                <Button className="bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 text-[#0a7c85] font-black px-7 py-6 rounded-2xl text-base shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 active:scale-95 transition-all duration-200 flex items-center gap-2 group">
                  <UserPlus className="w-5 h-5" />
                  Join Tolee Free
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => {
                  const el = document.getElementById('discover-grid-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="border-white/30 text-white hover:bg-white/10 bg-white/5 backdrop-blur-sm font-bold px-7 py-6 rounded-2xl text-base active:scale-95 transition-all duration-200 flex items-center gap-2"
              >
                <Globe className="w-4 h-4" />
                Explore Communities
              </Button>
            </div>

            {/* Stats Row */}
            <div className="mt-10 flex flex-col sm:flex-row gap-6 sm:gap-12 justify-center items-center animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
              <div className="flex flex-col items-center">
                <span className="text-2xl sm:text-3xl font-black text-white">{tolees.length}+</span>
                <span className="text-xs text-white/50 font-semibold uppercase tracking-wider mt-0.5">Communities</span>
              </div>
              <div className="hidden sm:block w-px h-8 bg-white/10" />
              <div className="flex flex-col items-center">
                <span className="text-2xl sm:text-3xl font-black text-white">{totalMembers.toLocaleString()}+</span>
                <span className="text-xs text-white/50 font-semibold uppercase tracking-wider mt-0.5">Members</span>
              </div>
              <div className="hidden sm:block w-px h-8 bg-white/10" />
              <div className="flex flex-col items-center">
                <span className="text-2xl sm:text-3xl font-black text-white">Free</span>
                <span className="text-xs text-white/50 font-semibold uppercase tracking-wider mt-0.5">To Join</span>
              </div>
            </div>
          </div>

          {/* Bottom wave separator */}
          <div className="relative h-10 mt-2">
            <svg viewBox="0 0 1440 40" className="absolute bottom-0 w-full" preserveAspectRatio="none">
              <path
                d="M0,40 L0,20 C360,0 720,40 1080,20 C1260,10 1380,25 1440,20 L1440,40 Z"
                className="fill-[#fafafa] dark:fill-[#0a0a0a]"
              />
            </svg>
          </div>
        </div>
      )}

      <main id="discover-grid-section" className="container mx-auto px-4 pt-10 pb-24 max-w-6xl">

        {/* Header Section — only for logged-in users (guests see the hero above) */}
        {isAuthenticated && (
          <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3 text-slate-900 dark:text-white flex items-center justify-center gap-2 select-none">
              Discover Tolees <Sparkles className="w-8 h-8 text-[#0a7c85] animate-pulse" />
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 font-medium">
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
        )}

        {/* Guest Section Heading */}
        {!isAuthenticated && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#0a7c85]" />
                Trending Communities
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {tolees.length} communities · Browse freely, join with an account
              </p>
            </div>
            <Link href="/create-tolee" onClick={handleCreateToleeClick}>
              <Button variant="outline" className="rounded-xl font-bold text-sm border-gray-200 dark:border-zinc-800 hover:border-[#0a7c85] hover:text-[#0a7c85] transition-all gap-1.5">
                + Create Tolee
              </Button>
            </Link>
          </div>
        )}

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-8 animate-in fade-in slide-in-from-bottom-6 duration-500 delay-100">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0a7c85] transition-colors w-5 h-5" />
            <Input
              type="text"
              placeholder="Search by group name, location or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-6 text-lg rounded-full bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm focus-visible:ring-[#0a7c85]/20 focus-visible:border-[#0a7c85] transition-all placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="mb-10 flex justify-center animate-in fade-in slide-in-from-bottom-8 duration-500 delay-200">
          <ScrollArea className="w-full max-w-4xl whitespace-nowrap">
            <div className="flex w-max space-x-2 p-1 mx-auto">
              {categories.map((category) => (
                <button
                  key={category.name}
                  onClick={() => setSelectedCategory(category.name)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === category.name
                      ? 'bg-[#0a7c85] text-white shadow-md shadow-[#0a7c85]/10 scale-105'
                      : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 hover:border-slate-350 hover:shadow-sm'
                  }`}
                >
                  <span>{category.icon}</span>
                  {category.name}
                </button>
              ))}
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 hover:border-slate-350 hover:shadow-sm"
              >
                <MoreHorizontal className="w-4 h-4" />
                More
              </button>
            </div>
            <ScrollBar orientation="horizontal" className="hidden" />
          </ScrollArea>
        </div>

        {/* Empty State */}
        {filteredTolees.length === 0 ? (
          <div className="text-center py-20 px-6 bg-white dark:bg-[#121212] rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-10 duration-700">
            <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3">
              No Tolee Groups Found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8 text-base max-w-md mx-auto">
              {searchQuery || selectedCategory !== 'All'
                ? "We couldn't find any groups matching your filters. Try clearing your search!"
                : 'No communities have been created yet.'}
            </p>
            <Link href="/create-tolee" onClick={handleCreateToleeClick}>
              <Button className="rounded-full font-black px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all">
                Create a Tolee Group
              </Button>
            </Link>
          </div>
        ) : (
          /* Tolees Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
            {filteredTolees.map((tolee: any) => (
              <Link
                href={`/t/${tolee.slug}`}
                key={tolee.id}
                className="block h-full"
                onClick={(e) => handleCardClick(e, tolee.slug)}
              >
                <Card className="p-0 overflow-hidden border border-slate-100 dark:border-zinc-900 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1.5 cursor-pointer group bg-white dark:bg-[#121212] flex flex-col h-full rounded-3xl relative shadow-md">
                  {/* Banner */}
                  <div className="relative h-36 w-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                    <img
                      src={tolee.banner || '/default-tolee-cover.svg'}
                      alt={tolee.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                    {/* Category Badge */}
                    <div className="absolute top-3.5 right-3.5 bg-white text-[#0a7c85] text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-full border border-slate-100 dark:border-zinc-800 shadow-sm z-10">
                      {tolee.category}
                    </div>

                    {/* Guest Lock Overlay — subtle hint */}
                    {!isAuthenticated && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="bg-white/95 dark:bg-black/80 backdrop-blur-sm rounded-2xl px-4 py-2.5 flex items-center gap-2 shadow-xl text-sm font-bold text-gray-900 dark:text-white transform -translate-y-1 group-hover:translate-y-0 transition-transform duration-300">
                          <Lock className="w-4 h-4 text-[#0a7c85]" />
                          Login to explore
                        </div>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-5 flex-grow flex flex-col relative pt-12">
                    {/* Avatar Overlay */}
                    <div className="absolute -top-10 left-5 border-4 border-white dark:border-[#121212] rounded-full overflow-hidden shadow-md bg-white dark:bg-gray-900">
                      <Avatar className="w-16 h-16 rounded-full">
                        <AvatarImage src={tolee.avatar || '/default-tolee-avatar.svg'} alt={tolee.name} className="object-cover" />
                        <AvatarFallback className="rounded-full font-bold bg-[#0a7c85] text-white flex items-center justify-center">
                          <Users className="w-6 h-6 text-white" />
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    <div className="flex-grow">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <h3 className="font-extrabold text-xl text-slate-800 dark:text-zinc-100 line-clamp-1 group-hover:text-[#0a7c85] transition-colors">
                          {tolee.name}
                        </h3>
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4 leading-relaxed h-10">
                        {tolee.description}
                      </p>

                      {/* Location Badge */}
                      {tolee.location && (
                        <div className="inline-flex items-center gap-1.5 bg-slate-50 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 text-xs font-semibold px-3 py-1 rounded-full border border-slate-150/50 dark:border-zinc-800/85 mb-4">
                          <MapPin className="w-3.5 h-3.5 text-[#0a7c85]" />
                          <span>{tolee.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Metadata Footer */}
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-zinc-400 mt-auto pt-4 border-t border-slate-100 dark:border-zinc-800/80 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <span className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-medium"><strong className="text-slate-700 dark:text-zinc-200 font-bold">{tolee.members}</strong> Members</span>
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400">
                          <Shield className="w-3.5 h-3.5 text-slate-400" />
                          By{' '}
                          <strong className="text-[#0a7c85] hover:underline cursor-pointer truncate max-w-[80px] font-bold">
                            {tolee.creatorName}
                          </strong>
                        </span>
                      </div>

                      {/* Join Button */}
                      <div>
                        {tolee.isJoinedByMe ? (
                          <Button
                            variant="secondary"
                            disabled
                            className="bg-[#e6f4f6] text-[#0a7c85] font-extrabold rounded-full px-4 h-9 flex items-center gap-1 opacity-100 border-none text-xs"
                          >
                            <Check className="w-4 h-4 stroke-[3]" /> Joined
                          </Button>
                        ) : tolee.isPendingByMe ? (
                          <Button
                            variant="secondary"
                            disabled
                            className="bg-amber-500/10 text-amber-600 font-extrabold rounded-full px-4 h-9 opacity-100 border-none text-xs"
                          >
                            Requested
                          </Button>
                        ) : (
                          <Button
                            onClick={(e) => handleJoin(e, tolee.id, tolee.isPrivate)}
                            disabled={joiningIds[tolee.id]}
                            className="rounded-full px-5 h-9 font-extrabold shadow-sm hover:shadow transition-all bg-[#0a7c85] hover:bg-[#08666e] text-white flex items-center justify-center min-w-[75px] text-xs"
                          >
                            {joiningIds[tolee.id] ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
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

        {/* ─── GUEST FOOTER CTA BANNER ─── */}
        {!isAuthenticated && filteredTolees.length > 0 && (
          <div className="mt-16 relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a7c85] via-[#0e8a94] to-[#1299a3] p-8 md:p-12 text-center text-white animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* Decorative blobs */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />

            <div className="relative">
              <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
                <Sparkles className="w-7 h-7 text-emerald-300" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-black mb-2 tracking-tight">
                Ready to join the conversation?
              </h3>
              <p className="text-white/60 text-sm sm:text-base mb-8 max-w-md mx-auto leading-relaxed">
                Create your free account in seconds. Connect with communities, share posts, and discover what&apos;s happening around you.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                <Link href="/auth/signup">
                  <Button className="bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 text-[#0a7c85] font-black px-8 py-6 rounded-2xl text-base shadow-xl shadow-emerald-500/20 active:scale-95 transition-all duration-200 flex items-center gap-2 group">
                    <UserPlus className="w-5 h-5" />
                    Create Free Account
                    <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link href="/auth/signin">
                  <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 bg-white/5 font-bold px-8 py-6 rounded-2xl text-base active:scale-95 transition-all duration-200 flex items-center gap-2">
                    <LogIn className="w-4 h-4" />
                    Log In
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
