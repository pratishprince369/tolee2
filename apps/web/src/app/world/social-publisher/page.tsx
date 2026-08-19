import dynamic from 'next/dynamic';

export const metadata = {
  title: 'AI Multi-Platform Social Publisher | Tolee World',
  description: 'Write once, optimize with AI, and 1-click publish across LinkedIn, Instagram, Twitter/X, Facebook & WhatsApp.',
};

const SocialPublisherClient = dynamic(
  () => import('./SocialPublisherClient'),
  { ssr: false }
);

export default function SocialPublisherPage() {
  return <SocialPublisherClient />;
}
