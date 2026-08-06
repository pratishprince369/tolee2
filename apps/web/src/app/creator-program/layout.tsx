import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tolee Creator Program | Monetize Content & Earn',
  description: 'Join the Tolee Creator Program to monetize your video reels, build paid subscription groups, and earn from your audience.',
  openGraph: {
    title: 'Tolee Creator Program | Monetize Content & Earn',
    description: 'Join the Tolee Creator Program to monetize your video reels, build paid subscription groups, and earn from your audience.',
    url: 'https://www.tolee.in/creator-program',
    siteName: 'Tolee',
    type: 'website',
  },
};

export default function CreatorProgramLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
