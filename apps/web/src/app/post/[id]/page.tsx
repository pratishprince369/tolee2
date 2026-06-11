import { redirect } from 'next/navigation';

interface PostPageProps {
  params: Promise<{ id: string }> | { id: string };
}

export default async function PostPage({ params }: PostPageProps) {
  // Resolve params if it's a promise (standard Next.js 15 behavior) or access it directly
  const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
  const { id } = resolvedParams;

  redirect(`/feed?postId=${id}`);
}
