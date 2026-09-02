import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Users, FileText, ShoppingBag, ArrowRight, Sparkles, Compass } from 'lucide-react';
import { buildPageMetadata, generateCollectionSchema, getCanonicalUrl } from '@/lib/seo';
import { JsonLd, Breadcrumbs, AeoAnswerSection } from '@/components/seo';

export const dynamic = 'force-dynamic';

interface CategoryPageProps {
  params: Promise<{ slug: string }> | { slug: string };
}

const CATEGORY_NAMES: Record<string, { name: string; description: string; faqs: Array<{ question: string; answer: string }> }> = {
  business: {
    name: 'Business & Startups',
    description: 'Connect with entrepreneurs, business owners, and startup founders. Discover funding discussions, networking opportunities, and business growth strategies on Tolee.',
    faqs: [
      {
        question: 'What kind of business discussions happen on Tolee?',
        answer: 'Tolee business communities discuss startup funding, local business promotion, B2B partnerships, marketing tactics, hiring, and entrepreneurial growth in India.',
      },
      {
        question: 'How can I promote my business or startup on Tolee?',
        answer: 'You can create a dedicated Tolee community, share valuable posts, publish products on Tolee Marketplace, and broadcast updates to your local community followers.',
      },
    ],
  },
  technology: {
    name: 'Technology & AI',
    description: 'Explore cutting-edge software development, artificial intelligence, gadget reviews, coding tutorials, and tech community hubs across India on Tolee.',
    faqs: [
      {
        question: 'How do I join tech and AI groups on Tolee?',
        answer: 'Browse the technology category to find public developer groups, AI communities, open-source discussions, and connect directly with fellow tech creators.',
      },
    ],
  },
  'real-estate': {
    name: 'Real Estate & Properties',
    description: 'Browse local real estate communities, rental listings, commercial properties, and housing discussions across top Indian cities on Tolee.',
    faqs: [
      {
        question: 'Can I find rental properties or buy homes on Tolee?',
        answer: 'Yes, Tolee hosts city-specific real estate communities and marketplace listings where verified owners and agents post flats, plots, and commercial properties.',
      },
    ],
  },
  entertainment: {
    name: 'Entertainment & Cinema',
    description: 'Catch trending movie discussions, celebrity updates, vertical video reels, comedy clips, and entertainment fandoms on Tolee.',
    faqs: [
      {
        question: 'Where can I watch short video reels on Tolee?',
        answer: 'Visit the Tolee Reels section or individual creator profiles to stream high-definition vertical video reels with instant comments and sharing.',
      },
    ],
  },
  music: {
    name: 'Music & Audio',
    description: 'Discover indie artists, Bollywood tracks, regional music creators, instrumentalists, and live audio communities on Tolee.',
    faqs: [
      {
        question: 'How do musicians share their music on Tolee?',
        answer: 'Musicians post video reels, launch Tolee audio rooms, share album snippets, and build direct subscriber communities on Tolee.',
      },
    ],
  },
  sports: {
    name: 'Sports & Fitness',
    description: 'Follow cricket updates, football leagues, workout routines, gym advice, and local sports tournament groups on Tolee.',
    faqs: [
      {
        question: 'Are there local turf and sports matching groups on Tolee?',
        answer: 'Yes! Local sports lovers create Tolee groups to organize weekend cricket matches, football games, marathon training, and badminton tournaments.',
      },
    ],
  },
  health: {
    name: 'Health & Wellness',
    description: 'Join discussions on mental wellness, nutrition, yoga, holistic health, fitness workouts, and medical lifestyle tips on Tolee.',
    faqs: [
      {
        question: 'Are health tips on Tolee community-verified?',
        answer: 'Health groups feature certified wellness coaches, nutritionists, and peer discussion where members share real experiences and healthy habits.',
      },
    ],
  },
  lifestyle: {
    name: 'Lifestyle & Fashion',
    description: 'Explore trendy fashion styles, travel guides, beauty tips, home decor inspiration, and culinary recipes shared by local Indian creators on Tolee.',
    faqs: [
      {
        question: 'How can lifestyle creators monetize on Tolee?',
        answer: 'Creators can launch verified shops, monetize exclusive content via Tolee Credits, and accept direct brand sponsorships.',
      },
    ],
  },
};

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const resolvedParams = params instanceof Promise ? await params : params;
  const rawSlug = (resolvedParams?.slug || '').toLowerCase();
  const info = CATEGORY_NAMES[rawSlug] || {
    name: rawSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    description: `Discover top ${rawSlug} communities, posts, video reels, and discussions on Tolee India.`,
    faqs: [],
  };

  return buildPageMetadata({
    title: `${info.name} Communities, Posts & Discussions | Tolee`,
    description: info.description,
    canonicalPath: `/category/${rawSlug}`,
    keywords: [info.name, `${info.name} India`, `${rawSlug} groups`, 'Tolee Category', 'local communities'],
  });
}

export default async function CategoryLandingPage({ params }: CategoryPageProps) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const rawSlug = (resolvedParams?.slug || '').toLowerCase();

  const info = CATEGORY_NAMES[rawSlug] || {
    name: rawSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    description: `Discover active ${rawSlug} communities, discussions, and local updates on Tolee.`,
    faqs: [
      {
        question: `How do I participate in ${rawSlug} discussions?`,
        answer: `Join public ${rawSlug} communities on Tolee to share posts, interact with members, and stay informed with real-time updates.`,
      },
    ],
  };

  // Fetch real matching Tolee Communities
  const tolees = await prisma.tolee.findMany({
    where: {
      isPrivate: false,
      isPublicVisible: true,
      OR: [
        { category: { contains: rawSlug, mode: 'insensitive' } },
        { description: { contains: rawSlug, mode: 'insensitive' } },
        { name: { contains: rawSlug, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      avatar: true,
      coverImage: true,
      category: true,
      _count: { select: { members: true, posts: true } },
    },
    take: 12,
    orderBy: { createdAt: 'desc' },
  });

  // Fetch recent public posts for this category
  const posts = await prisma.post.findMany({
    where: {
      visibility: 'public',
      status: 'published',
      isAnonymous: false,
      author: { isPrivate: false },
      OR: [
        { caption: { contains: rawSlug, mode: 'insensitive' } },
        {
          tolees: {
            some: {
              tolee: {
                category: { contains: rawSlug, mode: 'insensitive' },
              },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      caption: true,
      mediaUrls: true,
      createdAt: true,
      author: { select: { name: true, username: true, avatar: true } },
      _count: { select: { likes: true, comments: true } },
    },
    take: 8,
    orderBy: { createdAt: 'desc' },
  });

  // Fetch active marketplace listings for this category
  const listings = await prisma.listing.findMany({
    where: {
      status: 'active',
      OR: [
        { category: { contains: rawSlug, mode: 'insensitive' } },
        { title: { contains: rawSlug, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      title: true,
      price: true,
      images: true,
      location: true,
    },
    take: 6,
    orderBy: { createdAt: 'desc' },
  });

  const collectionSchema = generateCollectionSchema({
    title: `${info.name} on Tolee`,
    description: info.description,
    url: `/category/${rawSlug}`,
    items: [
      ...tolees.map((t) => ({ name: t.name, url: `/t/${t.slug}`, description: t.description || undefined })),
      ...posts.map((p) => ({ name: (p.caption || 'Community Post').slice(0, 60), url: `/post/${p.id}` })),
    ],
  });

  return (
    <main className="min-h-screen bg-[#060b13] text-gray-100 p-4 sm:p-6 lg:p-8 font-sans">
      <JsonLd data={collectionSchema} />

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Breadcrumb Navigation */}
        <Breadcrumbs
          items={[
            { name: 'Categories', url: '/discover' },
            { name: info.name, url: `/category/${rawSlug}` },
          ]}
        />

        {/* Hero Banner Header */}
        <header className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-[#0c182b] via-[#091120] to-[#060b13] border border-[#1a2d48] text-left relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Compass className="w-3.5 h-3.5" />
              <span>Category Hub</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              {info.name} Communities & Discussions
            </h1>
            <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
              {info.description}
            </p>
          </div>
        </header>

        {/* Communities Section */}
        <section className="space-y-4 text-left">
          <div className="flex items-center justify-between border-b border-[#141f33] pb-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              <span>Top {info.name} Groups</span>
            </h2>
            <Link
              href="/discover"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <span>Explore All Groups</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {tolees.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tolees.map((group) => (
                <Link
                  key={group.id}
                  href={`/t/${group.slug}`}
                  className="group p-5 rounded-2xl bg-[#091120] border border-[#16253c] hover:border-emerald-500/60 transition-all hover:-translate-y-0.5 duration-200 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={group.avatar || 'https://tolee.in/logo.png'}
                        alt={`${group.name} Avatar`}
                        className="w-12 h-12 rounded-xl object-cover border border-[#1e3454] bg-[#070b13]"
                      />
                      <div className="overflow-hidden">
                        <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                          {group.name}
                        </h3>
                        <p className="text-xs text-gray-400">
                          {group._count.members} Members • {group._count.posts} Posts
                        </p>
                      </div>
                    </div>
                    {group.description && (
                      <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed">
                        {group.description}
                      </p>
                    )}
                  </div>
                  <div className="pt-3 mt-3 border-t border-[#121c2e] flex items-center justify-between text-xs text-emerald-400 font-semibold">
                    <span>Join Community</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 p-6 rounded-2xl bg-[#091120] border border-[#141f33]">
              Be the first to create a community in {info.name}!
            </p>
          )}
        </section>

        {/* Recent Discussions / Posts */}
        {posts.length > 0 && (
          <section className="space-y-4 text-left">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-[#141f33] pb-3">
              <FileText className="w-5 h-5 text-teal-400" />
              <span>Trending Discussions in {info.name}</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/post/${post.id}`}
                  className="p-4 rounded-2xl bg-[#091120] border border-[#16253c] hover:border-teal-500/50 transition-all space-y-2.5 block"
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
          </section>
        )}

        {/* Marketplace Section */}
        {listings.length > 0 && (
          <section className="space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-[#141f33] pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-400" />
                <span>Marketplace Deals in {info.name}</span>
              </h2>
              <Link
                href="/marketplace"
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
              >
                View Marketplace
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {listings.map((item) => (
                <Link
                  key={item.id}
                  href={`/marketplace/listing/${item.id}`}
                  className="p-3 rounded-2xl bg-[#091120] border border-[#16253c] hover:border-emerald-500/60 transition-all space-y-2 block"
                >
                  <div className="aspect-square bg-[#060b13] rounded-xl overflow-hidden">
                    <img
                      src={
                        (typeof item.images === 'string'
                          ? item.images.split(',')[0]
                          : Array.isArray(item.images)
                          ? item.images[0]
                          : null) || 'https://tolee.in/logo.png'
                      }
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="text-xs font-bold text-white truncate">{item.title}</h3>
                  <p className="text-xs font-extrabold text-emerald-400 font-mono">
                    ₹{item.price}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* AEO Q&A Section for Answer Engine Discoverability */}
        <AeoAnswerSection
          title={`Frequently Asked Questions about ${info.name}`}
          items={info.faqs}
        />
      </div>
    </main>
  );
}
