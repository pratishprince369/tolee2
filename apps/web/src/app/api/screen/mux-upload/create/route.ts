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

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const upload = await mux.video.uploads.create({
      new_asset_settings: { 
        playback_policy: ['public'],
        mp4_support: 'capped-1080p'
      },
      cors_origin: '*',
    });

    return NextResponse.json({
      success: true,
      uploadId: upload.id,
      url: upload.url,
    });
  } catch (error: any) {
    console.error('Error creating Mux direct upload in API:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to initiate video upload on Mux' 
    }, { status: 500 });
  }
}
