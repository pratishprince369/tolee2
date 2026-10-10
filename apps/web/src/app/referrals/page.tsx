import React from 'react';
import type { Metadata } from 'next';
import { ReferralsDashboardClient } from './ReferralsDashboardClient';
import { buildPageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildPageMetadata({
  title: 'Referral & 10% Ad Revenue Sharing | Tolee',
  description: 'Earn 10% sharing when users who joined through your referral link run eligible ads on Tolee. Track your network, eligible ad spend, and live earnings.',
  canonicalPath: '/referrals',
});

export default function ReferralsPage() {
  return <ReferralsDashboardClient />;
}
