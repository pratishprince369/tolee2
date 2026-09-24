import React from 'react';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Tolee – The Social Network for Communities, People & Businesses",
  description: "Join Tolee to connect with local interest communities (Tolees), watch video reels, discover breaking local news, buy and sell on marketplace, and explore AI tools.",
  keywords: ["Tolee", "social network", "local communities", "reels", "marketplace", "group chats", "creator economy", "micro websites", "local news", "Tolee India"],
  alternates: {
    canonical: "https://tolee.in"
  },
  openGraph: {
    title: "Tolee – The Social Network for Communities, People & Businesses",
    description: "Join Tolee to connect with local interest communities (Tolees), watch video reels, discover breaking local news, buy and sell on marketplace, and explore AI tools.",
    url: "https://tolee.in",
    siteName: "Tolee",
    images: [
      {
        url: "https://tolee.in/logo.png",
        width: 1200,
        height: 630,
        alt: "Tolee Social Network",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tolee – The Social Network for Communities, People & Businesses",
    description: "Join Tolee to connect with local interest communities (Tolees), watch video reels, discover breaking local news, buy and sell on marketplace, and explore AI tools.",
    images: ["https://tolee.in/logo.png"],
  },
};

import { redirect } from 'next/navigation';
import { ToleeLandingHome } from '@/components/landing/ToleeLandingHome';

export default async function Home() {
  const session = await getServerSession(authOptions);
  const isAuthenticated = !!session?.user;

  if (isAuthenticated) {
    redirect('/feed');
  }

  return <ToleeLandingHome />;
}
