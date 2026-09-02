import React from 'react';
import type { Metadata } from 'next';
import SigninPage from '@/app/auth/signin/page';
import { buildPageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildPageMetadata({
  title: 'Log in to Tolee | Connect with Communities, Reels & Marketplace',
  description: 'Log into your Tolee account to connect with local interest communities, watch trending reels, chat in group rooms, and buy or sell on Tolee Marketplace.',
  canonicalPath: '/login',
  keywords: ['Tolee login', 'Log into Tolee', 'Tolee sign in', 'Tolee app login', 'Tolee account'],
});

export default function LoginPage() {
  return <SigninPage />;
}
