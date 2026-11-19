'use client';

import React, { useState } from 'react';
import {
  FileCode,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
  Sparkles,
  Globe2,
} from 'lucide-react';

interface GenerationData {
  totalUrls: number;
  breakdown: {
    static: number;
    categories: number;
    locations: number;
    topics: number;
    tolees: number;
    news: number;
    listings: number;
    reels: number;
    posts: number;
    screenVideos: number;
    users: number;
    projects: number;
  };
  generatedAt: string;
  durationMs: number;
  pingResults?: Record<string, boolean>;
}

export default function SitemapGeneratorCard({
  initialUrlCount,
  compact = false,
}: {
  initialUrlCount?: number;
  compact?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateSitemap = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/super-admin/sitemap/generate', {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate sitemap.xml');
      }

      setResult(data);
    } catch (err: any) {
      console.error('Sitemap generation error:', err);
      setError(err.message || 'Error communicating with sitemap generator API');
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleGenerateSitemap}
          disabled={loading}
          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          title="Regenerate and replace https://www.tolee.in/sitemap.xml immediately"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Generating...' : '⚡ Generate Sitemap.xml'}</span>
        </button>

        {result && (
          <span className="text-[11px] text-emerald-400 font-medium">
            ✅ {result.totalUrls.toLocaleString()} URLs
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 rounded-3xl bg-[#091120] border border-[#16253c] text-left space-y-5">
      {/* Title & Trigger Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#16253c] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <FileCode className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Live Sitemap.xml Controller</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                Production File
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Regenerate, update and replace <code className="text-emerald-400 font-mono">https://www.tolee.in/sitemap.xml</code> with 1-click.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://www.tolee.in/sitemap.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl bg-[#060b13] border border-[#1a2d48] hover:border-emerald-500/60 text-xs font-semibold text-gray-300 hover:text-emerald-400 flex items-center gap-1.5 transition-all"
          >
            <span>View Live File</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={handleGenerateSitemap}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md hover:shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Building XML & Syncing...' : '⚡ Generate & Replace Sitemap.xml'}</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Details Box */}
      {result && (
        <div className="p-4 rounded-2xl bg-[#060b13] border border-emerald-900/50 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Sitemap successfully generated and replaced on same file!</span>
            </div>
            <span className="text-[11px] text-gray-400">
              Generated in <strong className="text-white">{result.durationMs}ms</strong> •{' '}
              {new Date(result.generatedAt).toLocaleTimeString()}
            </span>
          </div>

          {/* Breakdown Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-[11px]">
            <div className="p-2 rounded-xl bg-[#0c1626] border border-[#1b2b42]">
              <span className="text-gray-400 block">Total Indexable URLs</span>
              <strong className="text-emerald-400 font-mono text-sm">
                {result.totalUrls.toLocaleString()}
              </strong>
            </div>
            <div className="p-2 rounded-xl bg-[#0c1626] border border-[#1b2b42]">
              <span className="text-gray-400 block">News Articles</span>
              <strong className="text-white font-mono text-sm">{result.breakdown.news}</strong>
            </div>
            <div className="p-2 rounded-xl bg-[#0c1626] border border-[#1b2b42]">
              <span className="text-gray-400 block">Public Reels</span>
              <strong className="text-white font-mono text-sm">{result.breakdown.reels}</strong>
            </div>
            <div className="p-2 rounded-xl bg-[#0c1626] border border-[#1b2b42]">
              <span className="text-gray-400 block">Feed Posts</span>
              <strong className="text-white font-mono text-sm">{result.breakdown.posts}</strong>
            </div>
            <div className="p-2 rounded-xl bg-[#0c1626] border border-[#1b2b42]">
              <span className="text-gray-400 block">Tolee Groups</span>
              <strong className="text-white font-mono text-sm">{result.breakdown.tolees}</strong>
            </div>
            <div className="p-2 rounded-xl bg-[#0c1626] border border-[#1b2b42]">
              <span className="text-gray-400 block">Marketplace</span>
              <strong className="text-white font-mono text-sm">{result.breakdown.listings}</strong>
            </div>
            <div className="p-2 rounded-xl bg-[#0c1626] border border-[#1b2b42]">
              <span className="text-gray-400 block">Screen Videos</span>
              <strong className="text-white font-mono text-sm">{result.breakdown.screenVideos}</strong>
            </div>
            <div className="p-2 rounded-xl bg-[#0c1626] border border-[#1b2b42]">
              <span className="text-gray-400 block">User Profiles</span>
              <strong className="text-white font-mono text-sm">{result.breakdown.users}</strong>
            </div>
            <div className="p-2 rounded-xl bg-[#0c1626] border border-[#1b2b42]">
              <span className="text-gray-400 block">World Projects</span>
              <strong className="text-white font-mono text-sm">{result.breakdown.projects}</strong>
            </div>
            <div className="p-2 rounded-xl bg-[#0c1626] border border-[#1b2b42]">
              <span className="text-gray-400 block">Topics & Hubs</span>
              <strong className="text-white font-mono text-sm">
                {result.breakdown.topics + result.breakdown.categories + result.breakdown.locations}
              </strong>
            </div>
            <div className="p-2 rounded-xl bg-[#0c1626] border border-[#1b2b42]">
              <span className="text-gray-400 block">Static Hubs</span>
              <strong className="text-white font-mono text-sm">{result.breakdown.static}</strong>
            </div>
            <div className="p-2 rounded-xl bg-[#0c1626] border border-[#1b2b42]">
              <span className="text-gray-400 block">Google & Bing Ping</span>
              <strong className="text-emerald-400 font-mono text-sm">Sent (Active)</strong>
            </div>
          </div>
        </div>
      )}

      {/* Target Destination & Details */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-gray-400 pt-1">
        <div className="flex items-center gap-2">
          <Globe2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            Output URL Target:{' '}
            <a
              href="https://www.tolee.in/sitemap.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 underline font-mono font-bold hover:text-emerald-300"
            >
              https://www.tolee.in/sitemap.xml
            </a>
          </span>
        </div>
        <div className="text-[11px] text-gray-500">
          Replaces same file • Next.js Cache Auto-Purged • 24/7 Live
        </div>
      </div>
    </div>
  );
}
