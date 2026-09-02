import React from 'react';
import { prisma } from '@/lib/prisma';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Hash, Users, FileText, ArrowRight, Video } from 'lucide-react';
import { buildPageMetadata, generateCollectionSchema } from '@/lib/seo';
import { JsonLd, Breadcrumbs, AeoAnswerSection } from '@/components/seo';

export const dynamic = 'force-dynamic';

interface TopicPageProps {
  params: Promise<{ slug: string }> | { slug: string };
}

export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  const resolvedParams = params instanceof Promise ? await params : params;
  const rawSlug = (resolvedParams?.slug || '').toLowerCase();
  const topicTitle = rawSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return buildPageMetadata({
    title: `${topicTitle} - Trending Topic & Community Hub | Tolee`,
    description: `Explore trending posts, discussions, video reels, and communities about ${topicTitle} on Tolee India.`,
    canonicalPath: `/topic/${rawSlug}`,
    keywords: [topicTitle, `${topicTitle} topic`, `${topicTitle} news`, 'Tolee India', 'trending discussions'],
  });
}

export default async function TopicLandingPage({ params }: TopicPageProps) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const rawSlug = (resolvedParams?.slug || '').toLowerCase();
  const topicTitle = rawSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const searchKeywords = rawSlug.split('-');

  // Fetch relevant posts
  const posts = await prisma.post.findMany({
    where: {
      visibility: 'public',
      status: 'published',
      isAnonymous: false,
      author: { isPrivate: false },
      OR: searchKeywords.map((kw) => ({
        caption: { contains: kw, mode: 'insensitive' as const },
      })),
    },
    select: {
      id: true,
      caption: true,
      createdAt: true,
      postType: true,
      author: { select: { name: true, username: true, avatar: true } },
      _count: { select: { likes: true, comments: true } },
    },
    take: 10,
    orderBy: { createdAt: 'desc' },
  });

  // Fetch matching communities
  const tolees = await prisma.tolee.findMany({
    where: {
      isPrivate: false,
      isPublicVisible: true,
      OR: searchKeywords.map((kw) => ({
        OR: [
          { name: { contains: kw, mode: 'insensitive' as const } },
          { description: { contains: kw, mode: 'insensitive' as const } },
          { category: { contains: kw, mode: 'insensitive' as const } },
        ],
      })),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      avatar: true,
      _count: { select: { members: true } },
    },
    take: 6,
    orderBy: { createdAt: 'desc' },
  });

  const collectionSchema = generateCollectionSchema({
    title: `${topicTitle} Topic Hub on Tolee`,
    description: `Discussions and updates on ${topicTitle}`,
    url: `/topic/${rawSlug}`,
    items: [
      ...tolees.map((t) => ({ name: t.name, url: `/t/${t.slug}`, description: t.description || undefined })),
      ...posts.map((p) => ({ name: (p.caption || 'Discussion').slice(0, 60), url: `/post/${p.id}` })),
    ],
  });

  const faqs = [
    {
      question: `What is ${topicTitle} on Tolee?`,
      answer: `${topicTitle} is a curated community topic hub on Tolee aggregating user discussions, expert posts, video reels, and related interest groups.`,
    },
    {
      question: `How can I contribute to ${topicTitle}?`,
      answer: `Post updates with relevant hashtags or join dedicated groups on Tolee to have your content featured in this topic hub.`,
    },
  ];

  return (
    <main className="min-h-screen bg-[#060b13] text-gray-100 p-4 sm:p-6 lg:p-8 font-sans">
      <JsonLd data={collectionSchema} />

      <div className="max-w-6xl mx-auto space-y-8">
        <Breadcrumbs
          items={[
            { name: 'Topics', url: '/discover' },
            { name: topicTitle, url: `/topic/${rawSlug}` },
          ]}
        />

        {/* Hero Banner */}
        <header className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-[#0c1322] via-[#091120] to-[#060b13] border border-[#16253c] text-left relative overflow-hidden shadow-2xl">
          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Hash className="w-3.5 h-3.5" />
              <span>Curated Topic</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              #{topicTitle}
            </h1>
            <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
              Explore live conversations, creator reels, and dedicated community groups discussing {topicTitle} across India.
            </p>
          </div>
        </header>

        {/* Related Groups */}
        {tolees.length > 0 && (
          <section className="space-y-4 text-left">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-[#141f33] pb-3">
              <Users className="w-5 h-5 text-emerald-400" />
              <span>Related Communities</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tolees.map((group) => (
                <Link
                  key={group.id}
                  href={`/t/${group.slug}`}
                  className="group p-5 rounded-2xl bg-[#091120] border border-[#16253c] hover:border-emerald-500/60 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={group.avatar || 'https://tolee.in/logo.png'}
                      alt={group.name}
                      className="w-12 h-12 rounded-xl object-cover border border-[#1e3454] bg-[#070b13]"
                    />
                    <div className="overflow-hidden">
                      <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                        {group.name}
                      </h3>
                      <p className="text-xs text-gray-400">
                        {group._count.members} Members
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Posts & Discussions */}
        <section className="space-y-4 text-left">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-[#141f33] pb-3">
            <FileText className="w-5 h-5 text-teal-400" />
            <span>Trending #{topicTitle} Discussions</span>
          </h2>

          {posts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={post.postType === 'reel' ? `/reel/${post.id}` : `/post/${post.id}`}
                  className="p-5 rounded-2xl bg-[#091120] border border-[#16253c] hover:border-teal-500/50 transition-all space-y-2.5 block"
                >
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="font-bold text-gray-200">
                      {post.author?.name || post.author?.username || 'Creator'}
                    </span>
                    <span>•</span>
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-gray-200 line-clamp-3 leading-relaxed">
                    {post.caption}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-400 pt-1">
                    <span>❤️ {post._count.likes} Likes</span>
                    <span>💬 {post._count.comments} Comments</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 p-6 rounded-2xl bg-[#091120] border border-[#141f33]">
              No posts tagged with #{topicTitle} yet. Create the first post today!
            </p>
          )}
        </section>

        {/* AEO Section */}
        <AeoAnswerSection
          title={`Frequently Asked Questions about ${topicTitle}`}
          items={faqs}
        />
      </div>
    </main>
  );
}
