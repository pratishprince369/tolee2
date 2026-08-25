import { prisma } from '@/lib/prisma';
import type { Metadata } from 'next';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }> | { id: string };
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { id } = params instanceof Promise ? await params : params;

  try {
    const video = await prisma.screenVideo.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, username: true, avatar: true } }
      }
    });

    if (video) {
      const creatorName = video.user?.name || video.user?.username || 'Creator';
      const title = `${video.title} | ${creatorName} on Tolee Screen`;
      const description = video.description?.slice(0, 160) || `Watch "${video.title}" by ${creatorName} on Tolee Screen.`;
      const thumbnail = video.thumbnailUrl || (video.muxPlaybackId ? `https://image.mux.com/${video.muxPlaybackId}/thumbnail.png` : 'https://tolee.in/logo.png');

      return {
        title,
        description,
        alternates: {
          canonical: `https://tolee.in/screen/watch/${id}`,
        },
        openGraph: {
          title,
          description,
          url: `https://tolee.in/screen/watch/${id}`,
          siteName: 'Tolee Screen',
          type: 'video.other',
          images: [{ url: thumbnail, width: 1280, height: 720, alt: video.title }],
        },
        twitter: {
          card: 'summary_large_image',
          title,
          description,
          images: [thumbnail],
        },
        robots: {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        },
      };
    }
  } catch (e) {
    console.error('[ScreenWatchLayout] Metadata error:', e);
  }

  return {
    title: 'Watch Video | Tolee Screen',
  };
}

export default async function ScreenWatchLayout({ children, params }: LayoutProps) {
  const { id } = params instanceof Promise ? await params : params;

  let jsonLdVideo = null;
  try {
    const video = await prisma.screenVideo.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, username: true, avatar: true } }
      }
    });

    if (video) {
      const creatorName = video.user?.name || video.user?.username || 'Creator';
      const thumbnail = video.thumbnailUrl || (video.muxPlaybackId ? `https://image.mux.com/${video.muxPlaybackId}/thumbnail.png` : 'https://tolee.in/logo.png');

      jsonLdVideo = {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        "name": video.title,
        "description": video.description || `Watch ${video.title} on Tolee Screen`,
        "thumbnailUrl": thumbnail,
        "uploadDate": video.createdAt ? new Date(video.createdAt).toISOString() : new Date().toISOString(),
        "duration": video.duration ? `PT${Math.floor(video.duration)}S` : undefined,
        "embedUrl": `https://tolee.in/screen/watch/${id}`,
        "author": {
          "@type": "Person",
          "name": creatorName,
          "url": video.user?.username ? `https://tolee.in/u/${video.user.username}` : `https://tolee.in`
        },
        "interactionStatistic": {
          "@type": "InteractionCounter",
          "interactionType": "https://schema.org/WatchAction",
          "userInteractionCount": video.viewsCount || 0
        }
      };
    }
  } catch (e) {}

  const jsonLdBreadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://tolee.in"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Tolee Screen",
        "item": "https://tolee.in/screen"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": "Watch",
        "item": `https://tolee.in/screen/watch/${id}`
      }
    ]
  };

  return (
    <>
      {jsonLdVideo && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdVideo) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumbs) }}
      />
      {children}
    </>
  );
}
