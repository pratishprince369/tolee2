import React from 'react';
import type { Metadata } from 'next';
import SignupPage from '@/app/auth/signup/page';
import { buildPageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildPageMetadata({
  title: 'Create New Account | Sign Up on Tolee',
  description: 'Create a free Tolee account to join local interest communities, share video reels, discover breaking local news, and shop on Tolee Marketplace.',
  canonicalPath: '/signup',
  keywords: ['Tolee sign up', 'Create Tolee account', 'Tolee registration', 'Join Tolee', 'Tolee new user'],
});

export default function RegisterPage() {
  return <SignupPage />;
}
