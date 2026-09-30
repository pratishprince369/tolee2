import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getGameById, getRelatedGames, ToleeGame } from '@/lib/gamesData';
import { Gamepad2, ArrowLeft, Star, ExternalLink, Share2, Sparkles, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GameDetailFrame } from '@/components/GameDetailFrame';

interface GameDetailPageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: GameDetailPageProps): Promise<Metadata> {
  const game = getGameById(params.id);
  if (!game) {
    return {
      title: 'Game Not Found – Tolee Games',
    };
  }

  return {
    title: `Play ${game.title} Online Free – Tolee Games`,
    description: `${game.description} Play free in your browser on Tolee Games.`,
    alternates: {
      canonical: `https://tolee.in/games/${game.id}`,
    },
    openGraph: {
      title: `${game.title} – Tolee Games`,
      description: game.description,
      url: `https://tolee.in/games/${game.id}`,
      siteName: 'Tolee Games',
      images: [{ url: game.coverImage, width: 1200, height: 630, alt: game.title }],
      type: 'website',
    },
  };
}

export default function GameDetailPage({ params }: GameDetailPageProps) {
  const game = getGameById(params.id);

  if (!game) {
    notFound();
  }

  const relatedGames = getRelatedGames(game.id, 6);

  return (
    <div className="min-h-screen bg-[#070B11] text-white pb-24 font-sans">
      {/* Top Breadcrumb & Controls */}
      <div className="border-b border-[#182332] bg-[#0B1019]/90 backdrop-blur-md px-4 sm:px-6 py-3 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            href="/games"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-zinc-400 hover:text-[#00D2C4] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Tolee Games</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 hidden sm:inline">
              Category: <strong className="text-zinc-200">{game.genre}</strong>
            </span>
            <a
              href={game.playUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#111A27] hover:bg-[#182436] border border-[#202E42] text-zinc-200"
            >
              <span>Open in Window</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Game Player Viewport */}
        <GameDetailFrame game={game} />

        {/* Game Information & Meta Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#00D2C4]/20 text-[#00D2C4] border border-[#00D2C4]/30 flex items-center gap-1.5">
                <Gamepad2 className="w-3.5 h-3.5" />
                {game.genre}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-300" />
                {game.rating.toFixed(1)} Rating
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                Instant Play
              </span>
              {game.badge && (
                <span className="px-2 py-0.5 rounded-full text-xs font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {game.badge}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-zinc-100 tracking-tight">
              {game.title}
            </h1>

            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
              {game.description}
            </p>
          </div>

          {/* Sidebar / Quick Stats */}
          <div className="rounded-2xl bg-[#0D1522] border border-[#1A2636] p-5 space-y-4 h-fit">
            <h3 className="font-extrabold text-sm text-zinc-200">Game Information</h3>
            <div className="divide-y divide-[#1C283B] text-xs">
              <div className="py-2.5 flex justify-between">
                <span className="text-zinc-500">Total Plays</span>
                <span className="text-zinc-200 font-semibold">{game.playsCount.toLocaleString()}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-zinc-500">Mode</span>
                <span className="text-teal-400 font-semibold">{game.multiplayer || 'Single Player'}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-zinc-500">Installation</span>
                <span className="text-emerald-400 font-semibold">Instant Web (0 MB)</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-zinc-500">Controls</span>
                <span className="text-zinc-200 font-semibold">{game.controls || 'Touch / Keyboard / Mouse'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* More Games You May Like (6 Cards) */}
        {relatedGames.length > 0 && (
          <div className="space-y-4 pt-6 border-t border-[#182332]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-lg text-zinc-100">
                  More Games You May Like
                </h3>
                <p className="text-xs text-zinc-400">Recommended similar HTML5 and browser games</p>
              </div>
              <Link href="/games" className="text-xs font-bold text-[#00D2C4] hover:underline">
                View All Games →
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5">
              {relatedGames.map((rg: ToleeGame) => (
                <Link
                  key={rg.id}
                  href={`/games/${rg.id}`}
                  className="rounded-2xl bg-[#0D1522] border border-[#1A2636] hover:border-[#00D2C4]/60 p-2.5 flex flex-col space-y-2 group transition-all"
                >
                  <div className="aspect-16/10 rounded-xl overflow-hidden bg-black">
                    <img
                      src={rg.coverImage}
                      alt={rg.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <h4 className="font-bold text-xs text-zinc-200 group-hover:text-[#00D2C4] transition-colors truncate">
                    {rg.title}
                  </h4>
                  <div className="flex items-center justify-between text-[10px] text-zinc-500">
                    <span>⭐ {rg.rating.toFixed(1)}</span>
                    <span>{(rg.playsCount / 1000).toFixed(0)}k</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
