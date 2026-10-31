import { permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCanonicalUrl } from '@/lib/seo/canonical';

export const metadata: Metadata = {
  title: 'Tolee Groups — Explore Verified Hyperlocal Communities',
  description: 'Discover and join thousands of verified local communities, interest clubs, tech hubs, and neighborhood groups on Tolee.',
  alternates: {
    canonical: getCanonicalUrl('/discover'),
  },
};

export default function GroupDirectoryRedirectPage() {
  permanentRedirect('/discover');
}
