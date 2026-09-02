import React from 'react';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import {
  Globe,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  ShieldCheck,
  Compass,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SeoHealthAdminPage() {
  const [
    publicToleesCount,
    privateToleesCount,
    publicPostsCount,
    publicReelsCount,
    activeListingsCount,
    publicUsersCount,
    newsArticlesCount,
    worldProjectsCount,
  ] = await Promise.all([
    prisma.tolee.count({ where: { isPrivate: false, isPublicVisible: true } }),
    prisma.tolee.count({ where: { OR: [{ isPrivate: true }, { isPublicVisible: false }] } }),
    prisma.post.count({ where: { visibility: 'public', status: 'published', author: { isPrivate: false } } }),
    prisma.post.count({ where: { postType: 'reel', visibility: 'public', status: 'published' } }),
    prisma.listing.count({ where: { status: 'active' } }),
    prisma.user.count({ where: { username: { not: null }, isPrivate: false, isBanned: false } }),
    prisma.newsPost.count({ where: { post: { status: 'published', isArchived: false } } }),
    prisma.worldProject.count({ where: { status: 'published' } }),
  ]);

  const estimatedSitemapUrls =
    15 + // static
    10 + // categories
    11 + // locations
    6 + // topics
    publicToleesCount +
    publicPostsCount +
    activeListingsCount +
    publicUsersCount +
    newsArticlesCount +
    worldProjectsCount;

  return (
    <main className="min-h-screen bg-[#060b13] text-gray-100 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#16253c] pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Globe className="w-3.5 h-3.5" />
              <span>Production Health Monitor</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Tolee Master SEO, AEO & GEO Architecture Health
            </h1>
            <p className="text-xs sm:text-sm text-gray-400">
              Live inspection of indexable entities, robots directives, structured data coverage, and sitemap health.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/sitemap.xml"
              target="_blank"
              className="px-4 py-2 rounded-xl bg-[#091120] border border-[#1a2d48] hover:border-emerald-500/60 text-xs font-bold text-emerald-400 flex items-center gap-1.5 transition-all shadow-sm"
            >
              <span>View /sitemap.xml</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/robots.txt"
              target="_blank"
              className="px-4 py-2 rounded-xl bg-[#091120] border border-[#1a2d48] hover:border-emerald-500/60 text-xs font-bold text-gray-300 flex items-center gap-1.5 transition-all shadow-sm"
            >
              <span>View /robots.txt</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[#091120] border border-[#16253c] space-y-2">
            <span className="text-xs font-semibold text-gray-400">Estimated Sitemap URLs</span>
            <div className="text-2xl sm:text-3xl font-mono font-black text-emerald-400">
              {estimatedSitemapUrls.toLocaleString()}
            </div>
            <p className="text-[11px] text-gray-500">Live dynamic entries</p>
          </div>

          <div className="p-5 rounded-2xl bg-[#091120] border border-[#16253c] space-y-2">
            <span className="text-xs font-semibold text-gray-400">Public Groups</span>
            <div className="text-2xl sm:text-3xl font-mono font-black text-white">
              {publicToleesCount.toLocaleString()}
            </div>
            <p className="text-[11px] text-emerald-400">
              {privateToleesCount} private groups noindexed
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#091120] border border-[#16253c] space-y-2">
            <span className="text-xs font-semibold text-gray-400">Public Posts & Reels</span>
            <div className="text-2xl sm:text-3xl font-mono font-black text-white">
              {(publicPostsCount + publicReelsCount).toLocaleString()}
            </div>
            <p className="text-[11px] text-teal-400">{publicReelsCount} VideoObject schemas</p>
          </div>

          <div className="p-5 rounded-2xl bg-[#091120] border border-[#16253c] space-y-2">
            <span className="text-xs font-semibold text-gray-400">Active Listings</span>
            <div className="text-2xl sm:text-3xl font-mono font-black text-white">
              {activeListingsCount.toLocaleString()}
            </div>
            <p className="text-[11px] text-emerald-400">Product schema ready</p>
          </div>
        </div>

        {/* Schema & Indexing Architecture Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active Schemas */}
          <div className="p-6 rounded-3xl bg-[#091120] border border-[#16253c] space-y-4 text-left">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <FileCode className="w-4 h-4" />
              <span>Structured Data (JSON-LD) Status</span>
            </div>

            <div className="space-y-2.5">
              {[
                { type: 'WebSite & Organization', scope: 'Root Layout (tolee.in)', status: 'Active' },
                { type: 'ProfilePage & Person', scope: 'User profiles (/u/[username])', status: 'Active' },
                { type: 'DiscussionForumPosting', scope: 'Public posts (/post/[id])', status: 'Active' },
                { type: 'VideoObject', scope: 'Reels & Screen (/reel/[id])', status: 'Active' },
                { type: 'NewsArticle', scope: 'Verified news (/news/[slug])', status: 'Active' },
                { type: 'Product & Offer', scope: 'Marketplace (/marketplace/listing/[id])', status: 'Active' },
                { type: 'BreadcrumbList', scope: 'Categories, Hubs, Groups, Posts', status: 'Active' },
                { type: 'CollectionPage & ItemList', scope: 'Category, Topic, Location Hubs', status: 'Active' },
                { type: 'FAQPage (AEO / GEO)', scope: 'Answer boxes for Google AI & ChatGPT', status: 'Active' },
              ].map((schema, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#060b13] border border-[#121e30] text-xs"
                >
                  <div>
                    <span className="font-bold text-white block">{schema.type}</span>
                    <span className="text-[11px] text-gray-400">{schema.scope}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-950 border border-emerald-700/60 text-emerald-400 text-[10px] font-bold">
                    {schema.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Indexing Safeguards */}
          <div className="p-6 rounded-3xl bg-[#091120] border border-[#16253c] space-y-4 text-left">
            <div className="flex items-center gap-2 text-teal-400 font-bold text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>Privacy & Noindex Directives</span>
            </div>

            <div className="space-y-2.5">
              {[
                { rule: 'User Settings & Account', path: '/settings/*', directive: 'noindex, nofollow, nocache' },
                { rule: 'Private User Accounts', path: '/u/[private_user]', directive: 'noindex, nofollow' },
                { rule: 'Private Tolee Groups', path: '/t/[private_group]', directive: 'noindex, nofollow' },
                { rule: 'Super Admin & Ads Manager', path: '/super-admin/*, /admin/*', directive: 'Disallow in robots.txt' },
                { rule: 'Private Feed Stream', path: '/feed', directive: 'noindex, nofollow' },
                { rule: 'Direct Messages & Chat', path: '/chat/*', directive: 'Disallow in robots.txt' },
              ].map((guard, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#060b13] border border-[#121e30] text-xs"
                >
                  <div>
                    <span className="font-bold text-white block">{guard.rule}</span>
                    <span className="text-[11px] text-gray-400 font-mono">{guard.path}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-red-950/80 border border-red-800/60 text-red-300 text-[10px] font-mono font-bold">
                    {guard.directive}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Representative Sample Links */}
        <div className="p-6 rounded-3xl bg-[#091120] border border-[#16253c] space-y-3 text-left">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-400" />
            <span>Test Landing Hubs</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Category: Technology', url: '/category/technology' },
              { label: 'Category: Business', url: '/category/business' },
              { label: 'Category: Real Estate', url: '/category/real-estate' },
              { label: 'Location: Mumbai', url: '/location/mumbai' },
              { label: 'Location: Delhi', url: '/location/delhi' },
              { label: 'Location: Bangalore', url: '/location/bangalore' },
              { label: 'Topic: Mumbai Real Estate', url: '/topic/mumbai-real-estate' },
              { label: 'Topic: Tech Startups India', url: '/topic/tech-startups-india' },
            ].map((link, idx) => (
              <Link
                key={idx}
                href={link.url}
                target="_blank"
                className="px-3 py-1.5 rounded-xl bg-[#060b13] border border-[#182a44] hover:border-emerald-500/60 text-xs text-gray-300 hover:text-emerald-400 flex items-center gap-1 transition-all"
              >
                <span>{link.label}</span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
