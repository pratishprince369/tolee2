'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, Trophy, Clock, MapPin, Shield, Flame, 
  Calendar, RefreshCw, Award, Activity, AlertCircle, Share2
} from 'lucide-react';
import { SportsEventData, CricketScoreDetails, FootballScoreDetails } from '@/lib/sports/types';

export default function MatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params?.id as string;

  const [match, setMatch] = useState<SportsEventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'scorecard' | 'timeline' | 'info'>('scorecard');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchMatch = async (showRefreshing = false) => {
    if (!matchId) return;
    if (showRefreshing) setIsRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch(`/api/sports/match/${matchId}`);
      const data = await res.json();
      if (data.success && data.match) {
        setMatch(data.match);
      }
    } catch (err) {
      console.error('Error fetching match details:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMatch();
  }, [matchId]);

  // Real-time live polling every 15s if match is LIVE
  useEffect(() => {
    if (match?.status === 'LIVE') {
      const interval = setInterval(() => {
        if (typeof document !== 'undefined' && !document.hidden) {
          fetchMatch(true);
        }
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [match?.status, matchId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-zinc-400">Loading match scorecard...</p>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-zinc-200">Match Not Found</h2>
          <p className="text-xs text-zinc-500 mt-1 mb-4">
            The match you are looking for does not exist or has been removed.
          </p>
          <Link
            href="/sports"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-zinc-950 text-xs font-bold transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Tolee Sports
          </Link>
        </div>
      </div>
    );
  }

  const isLive = match.status === 'LIVE';
  const isCompleted = match.status === 'COMPLETED';
  const isCricket = match.category?.slug === 'cricket';
  const cricketScores: CricketScoreDetails | undefined = isCricket ? (match.scoreDetails as CricketScoreDetails) : undefined;
  const footballScores: FootballScoreDetails | undefined = !isCricket ? (match.scoreDetails as FootballScoreDetails) : undefined;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-24">

      {/* ── Top Bar ── */}
      <div className="bg-zinc-900/80 border-b border-zinc-800/80 px-4 py-3 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link
            href="/sports"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Matches</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchMatch(true)}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
              title="Refresh match"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: match.title, url: window.location.href });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Match link copied to clipboard!');
                }
              }}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
              title="Share match"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Scoreboard Header ── */}
      <div className="bg-gradient-to-b from-zinc-900 via-zinc-900/60 to-zinc-950 border-b border-zinc-800/80 px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">

          {/* Tournament Poster Display (if present) */}
          {(match.scoreDetails as any)?.posterUrl && (
            <div className="mb-6 max-w-sm mx-auto rounded-2xl overflow-hidden border border-amber-500/40 shadow-2xl bg-zinc-950">
              <img
                src={(match.scoreDetails as any).posterUrl}
                alt={match.title}
                className="w-full h-auto object-cover"
              />
            </div>
          )}

          {/* Tournament & Status Tags */}
          <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-xs font-semibold">
              {match.category?.name || 'Sports'}
            </span>
            {match.tournament?.name && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                {match.tournament.name}
              </span>
            )}
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
              isLive ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
              isCompleted ? 'bg-zinc-800 text-zinc-400' :
              'bg-sky-500/20 text-sky-400'
            }`}>
              {isLive ? '• LIVE IN PLAY' : match.status}
            </span>
          </div>

          {/* Teams and Big Scores */}
          <div className="grid grid-cols-3 items-center gap-2 sm:gap-4 my-6">

            {/* Team 1 */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-zinc-800 border border-zinc-700/80 p-2 flex items-center justify-center shadow-lg mb-2.5 overflow-hidden">
                {match.team1Logo ? (
                  <img src={match.team1Logo} alt={match.team1Name} className="w-full h-full object-contain" />
                ) : (
                  <Shield className="w-8 h-8 text-zinc-500" />
                )}
              </div>
              <h2 className="text-sm sm:text-base font-black text-white text-center leading-tight">
                {match.team1Name}
              </h2>
              <div className="font-mono text-2xl sm:text-3xl font-black text-emerald-400 mt-1">
                {match.homeScore ?? (isCompleted ? '0' : '-')}
              </div>
            </div>

            {/* VS Separator & Status text */}
            <div className="flex flex-col items-center justify-center">
              <span className="text-xs sm:text-sm font-black text-zinc-600 uppercase tracking-widest mb-1">
                VS
              </span>
              {match.currentStatusText ? (
                <div className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold max-w-[180px] text-center">
                  {match.currentStatusText}
                </div>
              ) : (
                <div className="text-xs text-zinc-500 font-medium">
                  {new Date(match.eventDate).toLocaleDateString()}
                </div>
              )}
            </div>

            {/* Team 2 */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-zinc-800 border border-zinc-700/80 p-2 flex items-center justify-center shadow-lg mb-2.5 overflow-hidden">
                {match.team2Logo ? (
                  <img src={match.team2Logo} alt={match.team2Name} className="w-full h-full object-contain" />
                ) : (
                  <Shield className="w-8 h-8 text-zinc-500" />
                )}
              </div>
              <h2 className="text-sm sm:text-base font-black text-white text-center leading-tight">
                {match.team2Name}
              </h2>
              <div className="font-mono text-2xl sm:text-3xl font-black text-emerald-400 mt-1">
                {match.awayScore ?? (isCompleted ? '0' : '-')}
              </div>
            </div>

          </div>

          {/* Venue & Date Info Line */}
          <div className="flex items-center justify-center gap-4 text-xs text-zinc-400 mt-2 flex-wrap">
            {match.venue && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                {match.venue}{match.city ? `, ${match.city}` : ''}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
              {new Date(match.eventDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              {match.startTime ? ` at ${match.startTime}` : ''}
            </span>
          </div>

        </div>
      </div>

      {/* ── Content Navigation Tabs ── */}
      <div className="max-w-4xl mx-auto px-4 mt-6">
        <div className="flex items-center gap-2 border-b border-zinc-800 mb-6 text-sm font-semibold">
          {[
            { id: 'scorecard', label: 'Scorecard' },
            { id: 'timeline', label: 'Match Timeline' },
            { id: 'info', label: 'Match Details' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-400 font-bold'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB 1: SCORECARD ── */}
        {activeTab === 'scorecard' && (
          <div className="space-y-6">

            {/* Cricket Detailed Scorecard View */}
            {isCricket && cricketScores?.innings && cricketScores.innings.length > 0 ? (
              cricketScores.innings.map((inn, idx) => (
                <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-zinc-850 px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
                    <span className="font-bold text-sm text-white">
                      {inn.teamName} Innings
                    </span>
                    <span className="font-mono font-black text-emerald-400 text-base">
                      {inn.runs}/{inn.wickets} <span className="text-xs text-zinc-400 font-normal">({inn.overs} ov)</span>
                    </span>
                  </div>

                  {/* Batsmen Table */}
                  {inn.batsmen && inn.batsmen.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b border-zinc-800 text-zinc-400 font-semibold bg-zinc-900/50">
                            <th className="py-2.5 px-4">Batter</th>
                            <th className="py-2.5 px-3 text-right">R</th>
                            <th className="py-2.5 px-3 text-right">B</th>
                            <th className="py-2.5 px-3 text-right">4s</th>
                            <th className="py-2.5 px-3 text-right">6s</th>
                            <th className="py-2.5 px-4 text-right">SR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inn.batsmen.map((b, bIdx) => (
                            <tr key={bIdx} className="border-b border-zinc-800/50 hover:bg-zinc-850/50">
                              <td className="py-2.5 px-4 font-semibold text-zinc-200">
                                <div>{b.name}</div>
                                {b.dismissalInfo && (
                                  <div className="text-[10px] text-zinc-500 font-normal">{b.dismissalInfo}</div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-white font-mono">{b.runs}</td>
                              <td className="py-2.5 px-3 text-right text-zinc-400 font-mono">{b.balls}</td>
                              <td className="py-2.5 px-3 text-right text-zinc-400 font-mono">{b.fours}</td>
                              <td className="py-2.5 px-3 text-right text-zinc-400 font-mono">{b.sixes}</td>
                              <td className="py-2.5 px-4 text-right text-zinc-400 font-mono">{b.strikeRate.toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Bowlers Table */}
                  {inn.bowlers && inn.bowlers.length > 0 && (
                    <div className="overflow-x-auto border-t border-zinc-800">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b border-zinc-800 text-zinc-400 font-semibold bg-zinc-900/50">
                            <th className="py-2 px-4">Bowler</th>
                            <th className="py-2 px-3 text-right">O</th>
                            <th className="py-2 px-3 text-right">M</th>
                            <th className="py-2 px-3 text-right">R</th>
                            <th className="py-2 px-3 text-right">W</th>
                            <th className="py-2 px-4 text-right">ECO</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inn.bowlers.map((bw, bwIdx) => (
                            <tr key={bwIdx} className="border-b border-zinc-800/50">
                              <td className="py-2 px-4 font-semibold text-zinc-200">{bw.name}</td>
                              <td className="py-2 px-3 text-right font-mono text-zinc-300">{bw.overs}</td>
                              <td className="py-2 px-3 text-right font-mono text-zinc-400">{bw.maidens}</td>
                              <td className="py-2 px-3 text-right font-mono text-zinc-300">{bw.runs}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">{bw.wickets}</td>
                              <td className="py-2 px-4 text-right font-mono text-zinc-400">{bw.economy.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))
            ) : null}

            {/* General Scorecard Summary Box */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <h3 className="font-bold text-sm text-white mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Score Summary
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-zinc-800">
                  <span className="text-zinc-400">{match.team1Name}</span>
                  <span className="font-mono font-bold text-white text-sm">{match.homeScore || '0'}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-zinc-800">
                  <span className="text-zinc-400">{match.team2Name}</span>
                  <span className="font-mono font-bold text-white text-sm">{match.awayScore || '0'}</span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-zinc-400">Match Status</span>
                  <span className="font-bold text-amber-400">{match.currentStatusText || match.status}</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ── TAB 2: TIMELINE ── */}
        {activeTab === 'timeline' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="font-bold text-sm text-white mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              Live Match Updates & Milestones
            </h3>

            {match.timeline && Array.isArray(match.timeline) && match.timeline.length > 0 ? (
              <div className="relative border-l border-zinc-800 ml-3 space-y-6 pl-6 my-2">
                {match.timeline.map((item, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-zinc-900" />
                    <div className="text-xs font-bold text-emerald-400 font-mono">{item.minute || '•'}</div>
                    <div className="font-bold text-sm text-zinc-100">{item.title}</div>
                    {item.description && (
                      <div className="text-xs text-zinc-400 mt-0.5">{item.description}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-zinc-500 text-xs">
                {isLive ? 'No live commentary events recorded yet.' : 'Timeline events will appear once the match commences.'}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: MATCH INFO ── */}
        {activeTab === 'info' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-sm text-white mb-3">Fixture Information</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800/80">
                <span className="text-zinc-500 block mb-1">Sport Category</span>
                <span className="font-bold text-zinc-200">{match.category?.name}</span>
              </div>

              <div className="bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800/80">
                <span className="text-zinc-500 block mb-1">Tournament / Competition</span>
                <span className="font-bold text-zinc-200">{match.tournament?.name || 'Friendly / Series'}</span>
              </div>

              <div className="bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800/80">
                <span className="text-zinc-500 block mb-1">Date & Time</span>
                <span className="font-bold text-zinc-200">
                  {new Date(match.eventDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  {match.startTime ? ` • ${match.startTime}` : ''}
                </span>
              </div>

              <div className="bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800/80">
                <span className="text-zinc-500 block mb-1">Venue</span>
                <span className="font-bold text-zinc-200">
                  {match.venue || 'TBA'} {match.city ? `(${match.city})` : ''}
                </span>
              </div>
            </div>

            {match.description && (
              <div className="mt-4 pt-4 border-t border-zinc-800 text-xs text-zinc-400">
                <span className="text-zinc-300 font-bold block mb-1">Overview:</span>
                {match.description}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
