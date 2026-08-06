import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tolee World | Create AI Micro-Websites, Stores & Blogs',
  description: 'Build micro-websites, online stores, blogs, and restaurant menus instantly on Tolee World with AI.',
  openGraph: {
    title: 'Tolee World | Create AI Micro-Websites, Stores & Blogs',
    description: 'Build micro-websites, online stores, blogs, and restaurant menus instantly on Tolee World with AI.',
    url: 'https://www.tolee.in/world',
    siteName: 'Tolee',
    type: 'website',
  },
};

export default function WorldLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
