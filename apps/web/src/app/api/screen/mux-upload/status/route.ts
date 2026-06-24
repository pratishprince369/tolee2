import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import Mux from '@mux/mux-node';

export const dynamic = 'force-dynamic';

const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID || '0f358a94-4bdf-403e-bb8a-02ee17b68b66';
const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET || 'GiZ6iyNUthNh1Kt1BEYph8zVv24R4CINmTl64k7l0lyRzdvehcZlHCcndb0Gcn8KdsVnv5n3XBc';

const mux = new Mux({
  tokenId: MUX_TOKEN_ID,
  tokenSecret: MUX_TOKEN_SECRET,
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get('uploadId');
    if (!uploadId) {
      return NextResponse.json({ success: false, error: 'Missing uploadId parameter' }, { status: 400 });
    }

    const upload = await mux.video.uploads.retrieve(uploadId);
    return NextResponse.json({
      success: true,
      status: upload.status,
      assetId: upload.asset_id || null
    });
  } catch (error: any) {
    console.error('Error retrieving Mux status in API:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to check upload status' 
    }, { status: 500 });
  }
}
