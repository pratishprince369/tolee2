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
  return {
    title: `${post.author} on Tolee – ${post.caption?.slice(0, 60) || 'View post'}`,
    description: post.caption?.slice(0, 160) || 'View this post on Tolee',
    openGraph: {
      title: `${post.author} on Tolee`,
      description: post.caption?.slice(0, 160) || '',
      images: post.image ? [{ url: post.image }] : [],
    },
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
