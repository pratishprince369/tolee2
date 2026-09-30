'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Gamepad2,
  Search,
  ExternalLink,
  Star,
  Users,
  Code,
  ShieldCheck,
  Flame,
  Trophy,
  Filter,
  CheckCircle,
  Play,
  RotateCw,
} from 'lucide-react';
import {
  getAllGames,
  getMultiplayerRepos,
  GAME_CATEGORIES,
  ToleeGame,
  MultiplayerRepo,
} from '@/lib/gamesData';
import { GamePlayerModal } from '@/components/GamePlayerModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function SuperAdminGamesPage() {
  const allGames = useMemo(() => getAllGames(), []);
  const multiplayerRepos = useMemo(() => getMultiplayerRepos(), []);

  const [activeTab, setActiveTab] = useState<'all' | 'multiplayer' | 'featured' | 'licenses'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLicense, setSelectedLicense] = useState('All');

  // Interactive local states for toggles (persisted in session)
  const [featuredOverrides, setFeaturedOverrides] = useState<Record<string, boolean>>({});
  const [trendingOverrides, setTrendingOverrides] = useState<Record<string, boolean>>({});
  const [testPlayGame, setTestPlayGame] = useState<ToleeGame | null>(null);

  const toggleFeatured = (id: string, current: boolean) => {
    setFeaturedOverrides((prev) => ({
      ...prev,
      [id]: prev[id] !== undefined ? !prev[id] : !current,
    }));
  };

  const toggleTrending = (id: string, current: boolean) => {
    setTrendingOverrides((prev) => ({
      ...prev,
      [id]: prev[id] !== undefined ? !prev[id] : !current,
    }));
  };

  const filteredGames = useMemo(() => {
    let list = [...allGames];

    if (activeTab === 'featured') {
      list = list.filter((g) => {
        const isF = featuredOverrides[g.id] !== undefined ? featuredOverrides[g.id] : g.featured;
        return isF;
      });
    }

    if (selectedCategory !== 'All') {
      const catLower = selectedCategory.toLowerCase();
      list = list.filter(
        (g) =>
          (g.category && g.category.toLowerCase() === catLower) ||
          g.genre.toLowerCase().includes(catLower)
      );
    }

    if (selectedLicense !== 'All') {
      list = list.filter((g) => (g.license || 'MIT').toUpperCase().includes(selectedLicense.toUpperCase()));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          g.description.toLowerCase().includes(q) ||
          g.genre.toLowerCase().includes(q) ||
          g.technology.some((t) => t.toLowerCase().includes(q))
      );
    }

    return list;
  }, [allGames, activeTab, selectedCategory, selectedLicense, searchQuery, featuredOverrides]);

  const totalPlays = useMemo(() => {
    return allGames.reduce((acc, g) => acc + g.playsCount, 0);
  }, [allGames]);

  return (
    <div className="min-h-screen bg-[#09090b] text-white p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-zinc-100">
                Tolee Games Management
              </h1>
              <p className="text-xs text-zinc-400">
                Manage 240+ HTML5 games, multiplayer repositories, licenses & catalog status
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/games"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700 transition-colors"
          >
            <span>Live Games Page</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-1">
          <span className="text-xs text-zinc-500 font-medium">Total Games</span>
          <p className="text-2xl font-black text-white">{allGames.length}</p>
          <span className="text-[10px] text-emerald-400">Instant browser playable</span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-1">
          <span className="text-xs text-zinc-500 font-medium">Multiplayer Repos</span>
          <p className="text-2xl font-black text-teal-400">{multiplayerRepos.length}</p>
          <span className="text-[10px] text-teal-300">Ready open-source repos</span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-1">
          <span className="text-xs text-zinc-500 font-medium">Total Plays</span>
          <p className="text-2xl font-black text-amber-400">{(totalPlays / 1000000).toFixed(1)}M</p>
          <span className="text-[10px] text-zinc-400">Across web & mobile sessions</span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-1">
          <span className="text-xs text-zinc-500 font-medium">Open Source Compliance</span>
          <p className="text-2xl font-black text-emerald-400">100%</p>
          <span className="text-[10px] text-zinc-400">MIT, GPL-3.0, MPL-2.0</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'all'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          All Games ({allGames.length})
        </button>

        <button
          onClick={() => setActiveTab('multiplayer')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'multiplayer'
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          🎮 Ready Multiplayer Repos ({multiplayerRepos.length})
        </button>

        <button
          onClick={() => setActiveTab('featured')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'featured'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          ⭐ Featured Games
        </button>

        <button
          onClick={() => setActiveTab('licenses')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'licenses'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          📜 License Directory
        </button>
      </div>

      {/* TAB 1 & 3: Games List & Controls */}
      {(activeTab === 'all' || activeTab === 'featured') && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-900/40 border border-zinc-800 p-3 rounded-2xl">
            <div className="relative w-full sm:max-w-xs">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search games by title, tech..."
                className="w-full h-9 pl-9 pr-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {/* Category selector */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-9 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none"
              >
                <option value="All">All Categories</option>
                {GAME_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>

              {/* License selector */}
              <select
                value={selectedLicense}
                onChange={(e) => setSelectedLicense(e.target.value)}
                className="h-9 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none"
              >
                <option value="All">All Licenses</option>
                <option value="MIT">MIT License</option>
                <option value="GPL">GPL-3.0 License</option>
                <option value="MPL">MPL-2.0 License</option>
              </select>
            </div>
          </div>

          {/* Games Table */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-900/90 text-zinc-400 uppercase tracking-wider text-[10px] border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Game</th>
                    <th className="py-3 px-3">Genre</th>
                    <th className="py-3 px-3">Mode</th>
                    <th className="py-3 px-3">License</th>
                    <th className="py-3 px-3">Plays</th>
                    <th className="py-3 px-3">Featured</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {filteredGames.slice(0, 50).map((game) => {
                    const isF =
                      featuredOverrides[game.id] !== undefined
                        ? featuredOverrides[game.id]
                        : game.featured;
                    const isT =
                      trendingOverrides[game.id] !== undefined
                        ? trendingOverrides[game.id]
                        : game.trending;

                    return (
                      <tr key={game.id} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-black shrink-0 border border-zinc-800">
                              <img
                                src={game.coverImage}
                                alt={game.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-zinc-100 truncate max-w-[200px]">
                                {game.title}
                              </div>
                              <div className="text-[10px] text-zinc-500 truncate max-w-[200px]">
                                {game.developer || game.modelAttribution}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <Badge variant="outline" className="text-[10px] border-zinc-700 bg-zinc-800/50">
                            {game.genre}
                          </Badge>
                        </td>

                        <td className="py-3 px-3">
                          <span className="text-[11px] text-teal-400 font-medium">
                            {game.multiplayer || 'Single Player'}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                            {game.license || 'MIT'}
                          </span>
                        </td>

                        <td className="py-3 px-3 font-mono text-zinc-300">
                          {game.playsCount.toLocaleString()}
                        </td>

                        <td className="py-3 px-3">
                          <button
                            onClick={() => toggleFeatured(game.id, game.featured)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                              isF
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            {isF ? '★ Featured' : 'Standard'}
                          </button>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setTestPlayGame(game)}
                              className="h-7 px-2 text-xs text-emerald-400 hover:bg-emerald-500/10"
                              title="Test Play Game"
                            >
                              <Play className="w-3.5 h-3.5 mr-1" />
                              Test
                            </Button>

                            {game.githubUrl && (
                              <a
                                href={game.githubUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-7 w-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-colors"
                                title="Open GitHub"
                              >
                                <Code className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredGames.length > 50 && (
              <div className="p-3 text-center text-xs text-zinc-500 bg-zinc-900/80 border-t border-zinc-800">
                Showing top 50 of {filteredGames.length} games. Refine search to filter down.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Ready Multiplayer Repositories Showcase */}
      {activeTab === 'multiplayer' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-xs text-teal-200">
            <strong>Production Multiplayer Repositories:</strong> These 10 repositories provide scalable WebSocket networking, room matchmaking, player synchronization, and turn-based / realtime engines that can be directly inspected or deployed.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {multiplayerRepos.map((repo) => (
              <div
                key={repo.id}
                className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-5 space-y-3.5 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-extrabold text-base text-zinc-100">{repo.name}</h3>
                      <span className="text-xs text-teal-400 font-semibold">{repo.multiplayerType}</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {repo.license}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed">{repo.description}</p>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-400">
                      {repo.compatibility}
                    </span>
                    {repo.technology.map((tech) => (
                      <span
                        key={tech}
                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
                  <span className="text-xs text-zinc-500">
                    GitHub Stars: <strong className="text-zinc-200">{repo.stars || 'Active'}</strong>
                  </span>

                  <a
                    href={repo.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors"
                  >
                    <span>View Repository</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: License Directory */}
      {activeTab === 'licenses' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2 text-xs">
            <h4 className="font-bold text-sm text-zinc-200">Open-Source License Policy & Compliance</h4>
            <p className="text-zinc-400 leading-relaxed">
              All integrated games and repositories in Tolee Games use permissible open-source software licenses:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-zinc-300">
              <li><strong>MIT License:</strong> Permissive free software license permitting browser execution, linking, and redistribution with original copyright notice.</li>
              <li><strong>GPL-3.0 License:</strong> Copyleft license ensuring open source rights are preserved with source repository links provided.</li>
              <li><strong>MPL-2.0 (Mozilla Public License):</strong> File-level copyleft license used by BrowserQuest with source code attribution.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Interactive Test Play Modal */}
      <GamePlayerModal
        game={testPlayGame}
        isOpen={!!testPlayGame}
        onClose={() => setTestPlayGame(null)}
      />
    </div>
  );
}
