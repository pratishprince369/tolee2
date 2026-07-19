import React from 'react';
import { prisma } from '@/lib/prisma';
import { DiscoverGrid } from '@/components/DiscoverGrid';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Tolee | Discover Local Communities, Reels & Marketplace",
  description: "Join Tolee to connect with local interest groups (Tolees), post vertical video reels, buy and sell on local marketplace, and launch creator storefronts natively in your feeds.",
  keywords: ["Tolee", "social network", "local communities", "reels", "marketplace", "group chats", "creator economy", "micro websites", "local listings"],
  openGraph: {
    title: "Tolee | Discover Local Communities, Reels & Marketplace",
    description: "Join Tolee to connect with local interest groups (Tolees), post vertical video reels, buy and sell on local marketplace, and launch creator storefronts.",
    url: "https://tolee.in",
    siteName: "Tolee",
    images: [
      {
        url: "https://tolee.in/icon.png",
        width: 512,
        height: 512,
        alt: "Tolee Logo",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Tolee | Discover Local Communities, Reels & Marketplace",
    description: "Join Tolee to connect with local interest groups (Tolees), post vertical video reels, buy and sell on local marketplace, and launch creator storefronts.",
    images: ["https://tolee.in/icon.png"],
  },
};

import { ClientRedirect } from '@/components/ClientRedirect';

export default async function Home() {
  const session = await getServerSession(authOptions);
  const isAuthenticated = !!session?.user;

  if (isAuthenticated) {
    return <ClientRedirect to="/feed" />;
  }

  let tolees: any[] = [];

  try {
    const dbTolees = await prisma.tolee.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        avatar: true,
        coverImage: true,
        category: true,
        location: true,
        price: true,
        owner: {
          select: {
            name: true,
            username: true
          }
        },
        members: {
          select: {
            userId: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    tolees = dbTolees.map((t: any, index: number) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      description: t.description || 'No description available',
      members: t.members.filter((m: any) => m.status === 'approved').length,
      price: t.price === 0 ? 'Free' : `₹${t.price}`,
      category: t.category || 'General',
      location: t.location || '',
      rank: index + 1,
      banner: t.coverImage || '/default-tolee-cover.svg',
      avatar: t.avatar || '/default-tolee-avatar.svg',
      creatorName: t.owner?.name || t.owner?.username || 'Community',
      isJoinedByMe: false,
      isPendingByMe: false
    }));
  } catch (error) {
    console.error("Error loading homepage Tolees:", error);
    tolees = [];
  }

  return (
    <DiscoverGrid 
      initialTolees={tolees} 
      isAuthenticated={isAuthenticated} 
    />
  );
}
