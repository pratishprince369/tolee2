import { NextRequest, NextResponse } from 'next/server';
import { getPostById } from '@/actions/post';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Post ID is required' }, { status: 400 });
    }

    const res = await getPostById(id);
    if (!res.success || !res.post) {
      return NextResponse.json({ success: false, error: res.error || 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      post: res.post,
      permanentUrl: `${request.nextUrl.origin}/post/${res.post.id}`
    });
  } catch (error: any) {
    console.error('API /api/posts/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
