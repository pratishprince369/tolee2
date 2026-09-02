import React from 'react';
import { prisma } from '@/lib/prisma';
import type { Metadata } from 'next';
import Link from 'next/link';
import { MapPin, Users, ShoppingBag, ArrowRight, Video, Compass } from 'lucide-react';
import { buildPageMetadata, generateCollectionSchema } from '@/lib/seo';
import { JsonLd, Breadcrumbs, AeoAnswerSection } from '@/components/seo';

export const dynamic = 'force-dynamic';

interface LocationPageProps {
  params: Promise<{ slug: string }> | { slug: string };
}

export async function generateMetadata({ params }: LocationPageProps): Promise<Metadata> {
  const resolvedParams = params instanceof Promise ? await params : params;
  const rawSlug = (resolvedParams?.slug || '').toLowerCase();
  const cityName = rawSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return buildPageMetadata({
    title: `${cityName} Communities, Marketplace & Local Reels | Tolee`,
    description: `Discover top ${cityName} local groups, neighborhood discussions, marketplace deals, and trending video reels on Tolee India.`,
    canonicalPath: `/location/${rawSlug}`,
    keywords: [cityName, `${cityName} groups`, `${cityName} marketplace`, `${cityName} real estate`, 'local social network'],
  });
}

export default async function LocationLandingPage({ params }: LocationPageProps) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const rawSlug = (resolvedParams?.slug || '').toLowerCase();
  const cityName = rawSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  // Fetch local communities
  const tolees = await prisma.tolee.findMany({
    where: {
      isPrivate: false,
      isPublicVisible: true,
      OR: [
        { location: { contains: rawSlug, mode: 'insensitive' } },
        { name: { contains: rawSlug, mode: 'insensitive' } },
        { description: { contains: rawSlug, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      avatar: true,
      _count: { select: { members: true, posts: true } },
    },
    take: 9,
    orderBy: { createdAt: 'desc' },
  });

  // Fetch local marketplace listings
  const listings = await prisma.listing.findMany({
    where: {
      status: 'active',
      OR: [
        { location: { contains: rawSlug, mode: 'insensitive' } },
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

  // Fetch local video reels
  const reels = await prisma.post.findMany({
    where: {
      postType: 'reel',
      visibility: 'public',
      status: 'published',
      caption: { contains: rawSlug, mode: 'insensitive' },
    },
    select: {
      id: true,
      caption: true,
      mediaUrls: true,
      author: { select: { name: true, username: true } },
      _count: { select: { likes: true, views: true } },
    },
    take: 4,
    orderBy: { createdAt: 'desc' },
  });

  const collectionSchema = generateCollectionSchema({
    title: `${cityName} on Tolee`,
    description: `Local communities, reels, and marketplace listings in ${cityName}`,
    url: `/location/${rawSlug}`,
    items: [
      ...tolees.map((t) => ({ name: t.name, url: `/t/${t.slug}`, description: t.description || undefined })),
      ...listings.map((l) => ({ name: l.title, url: `/marketplace/listing/${l.id}` })),
    ],
  });

  const faqs = [
    {
      question: `How do I connect with local residents in ${cityName}?`,
      answer: `Join local ${cityName} Tolee communities to chat with neighbors, participate in local events, and share city updates.`,
    },
    {
      question: `Can I buy and sell items in ${cityName} on Tolee?`,
      answer: `Yes, post on Tolee Marketplace under ${cityName} to reach nearby verified buyers with zero listing fees.`,
    },
  ];

  return (
    <main className="min-h-screen bg-[#060b13] text-gray-100 p-4 sm:p-6 lg:p-8 font-sans">
      <JsonLd data={collectionSchema} />

      <div className="max-w-6xl mx-auto space-y-8">
        <Breadcrumbs
          items={[
            { name: 'Locations', url: '/map' },
            { name: cityName, url: `/location/${rawSlug}` },
          ]}
        />

        {/* Hero Header */}
        <header className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-[#071728] via-[#091120] to-[#060b13] border border-[#16253c] text-left relative overflow-hidden shadow-2xl">
          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-950/80 border border-teal-700/60 text-teal-400 text-xs font-bold uppercase tracking-wider">
              <MapPin className="w-3.5 h-3.5" />
              <span>Location Hub</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              {cityName} Local Communities & Marketplace
            </h1>
            <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
              Explore hyper-local neighborhood groups, property deals, classifieds, and trending video reels created by residents in {cityName}.
            </p>
          </div>
        </header>

        {/* Local Communities */}
        <section className="space-y-4 text-left">
          <div className="flex items-center justify-between border-b border-[#141f33] pb-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              <span>{cityName} Groups</span>
            </h2>
            <Link
              href="/discover"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <span>Explore All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {tolees.length > 0 ? (
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
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 p-6 rounded-2xl bg-[#091120] border border-[#141f33]">
              No public groups found in {cityName} yet. Start the first one today!
            </p>
          )}
        </section>

        {/* Local Marketplace */}
        {listings.length > 0 && (
          <section className="space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-[#141f33] pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-400" />
                <span>Marketplace Deals in {cityName}</span>
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

        {/* Local Reels */}
        {reels.length > 0 && (
          <section className="space-y-4 text-left">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-[#141f33] pb-3">
              <Video className="w-5 h-5 text-purple-400" />
              <span>Trending Reels in {cityName}</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {reels.map((reel) => (
                <Link
                  key={reel.id}
                  href={`/reel/${reel.id}`}
                  className="aspect-[9/16] bg-[#091120] border border-[#16253c] rounded-2xl overflow-hidden relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3">
                    <p className="text-xs font-bold text-white line-clamp-2">
                      {reel.caption}
                    </p>
                    <span className="text-[10px] text-gray-300">
                      @{reel.author?.username}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* AEO Section */}
        <AeoAnswerSection
          title={`Frequently Asked Questions about ${cityName} on Tolee`}
          items={faqs}
        />
      </div>
    </main>
  );
}
