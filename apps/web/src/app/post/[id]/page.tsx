import { getPostById } from '@/actions/post';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import PostViewer from '@/components/PostViewer';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface PostPageProps {
  params: Promise<{ id: string }> | { id: string };
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { id } = params instanceof Promise ? await params : params;
  const res = await getPostById(id);
  if (!res.success || !res.post) {
    return { title: 'Post Not Found | Tolee' };
  }
  const post = res.post;

  const isPrivateAuthor = post.authorIsPrivate || false;

  if (isPrivateAuthor || post.visibility === 'private') {
    return {
      title: 'Private Post | Tolee',
      description: 'This post is private.',
      robots: {
        index: false,
        follow: false,
        nocache: true,
        googleBot: {
          index: false,
          follow: false,
          noimageindex: true,
        }
      }
    };
  }

  const authorName = post.author?.name || post.author?.username || post.author || 'Tolee Creator';
  const captionSnippet = post.caption ? post.caption.replace(/(\r\n|\n|\r)/gm, " ").trim() : 'View post on Tolee';
  const title = `${captionSnippet.slice(0, 60)} | ${authorName} on Tolee`;
  const description = captionSnippet.slice(0, 160) || `View post by ${authorName} on Tolee community.`;
  const mediaUrl = post.image || post.mediaUrls?.split(',')[0] || 'https://tolee.in/logo.png';

  return {
    title,
    description,
    alternates: {
      canonical: `https://tolee.in/post/${id}`,
    },
    openGraph: {
      title,
      description,
      url: `https://tolee.in/post/${id}`,
      siteName: 'Tolee',
      images: [
        {
          url: mediaUrl,
          width: 1200,
          height: 630,
          alt: `${authorName}'s post on Tolee`,
        }
      ],
      type: 'article',
      publishedTime: post.createdAt ? new Date(post.createdAt).toISOString() : undefined,
      authors: [authorName],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [mediaUrl],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      }
    }
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user ? (session.user as any).id : null;

  const { id } = params instanceof Promise ? await params : params;
  const res = await getPostById(id);

  if (!res.success || !res.post) {
    notFound();
  }

  const post = res.post;

  // If private post and visitor is not the author, protect privacy
  if ((post.authorIsPrivate || post.visibility === 'private') && (!currentUserId || post.authorId !== currentUserId)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center p-8 bg-card border rounded-3xl space-y-4 shadow-lg">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto text-xl font-bold">🔒</div>
          <h2 className="text-xl font-bold">Private Post</h2>
          <p className="text-sm text-muted-foreground">This content has been marked as private by the creator and is only accessible to authorized members.</p>
        </div>
      </div>
    );
  }

  // If it's a reel, forward to the reel deep-link route
  if (post.postType === 'reel') {
    redirect(`/reel/${id}`);
  }

  const authorName = post.author?.name || post.author?.username || post.author || 'Tolee Creator';
  const mediaUrl = post.image || post.mediaUrls?.split(',')[0] || 'https://tolee.in/logo.png';

  const jsonLdPost = {
    "@context": "https://schema.org",
    "@type": "SocialMediaPosting",
    "headline": post.caption?.slice(0, 110) || `Post by ${authorName}`,
    "articleBody": post.caption || '',
    "url": `https://tolee.in/post/${id}`,
    "datePublished": post.createdAt ? new Date(post.createdAt).toISOString() : new Date().toISOString(),
    "author": {
      "@type": "Person",
      "name": authorName,
      "url": post.author?.username ? `https://tolee.in/u/${post.author.username}` : `https://tolee.in`
    },
    "image": mediaUrl,
    "interactionStatistic": [
      {
        "@type": "InteractionCounter",
        "interactionType": "https://schema.org/LikeAction",
        "userInteractionCount": post.likes || 0
      },
      {
        "@type": "InteractionCounter",
        "interactionType": "https://schema.org/CommentAction",
        "userInteractionCount": post.comments || 0
      }
    ]
  };

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
        "name": "Feed",
        "item": "https://tolee.in"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": post.caption ? `${post.caption.slice(0, 40)}...` : `Post #${id}`,
        "item": `https://tolee.in/post/${id}`
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdPost) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumbs) }}
      />
      <PostViewer post={post} />
    </>
  );
}
