import { getPostById } from '@/actions/post';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
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
    return { title: 'Post not found – Tolee' };
  }
  const post = res.post;

  const isPrivateAuthor = post.authorIsPrivate || false;

  if (isPrivateAuthor) {
    return {
      title: 'Private Post – Tolee',
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

  const title = `${post.author?.name || post.author || 'Creator'} on Tolee – ${post.caption?.slice(0, 60) || 'View post'}`;
  const description = post.caption?.slice(0, 160) || 'View this post on Tolee';
  const mediaUrl = post.image || 'https://www.tolee.in/default-post-preview.png';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://www.tolee.in/post/${id}`,
      siteName: 'Tolee',
      images: [{ url: mediaUrl }],
      type: 'article',
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
  if (!session?.user) {
    redirect('/');
  }

  const { id } = params instanceof Promise ? await params : params;
  const res = await getPostById(id);

  if (!res.success || !res.post) {
    // For reels shared via /post/[id], fall back gracefully
    notFound();
  }

  const post = res.post;

  // If it's a reel, forward to the reel deep-link route
  if (post.postType === 'reel') {
    redirect(`/reel/${id}`);
  }

  return <PostViewer post={post} />;
}
