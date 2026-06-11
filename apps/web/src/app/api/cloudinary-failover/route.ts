import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getActiveCloudinaryAccount, rotateToNextCloudinaryAccount } from '@/lib/cloudinary-fallback';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { failedIndex, failedCloudName } = body;
    
    if (typeof failedIndex !== 'number') {
      return NextResponse.json({ success: false, error: 'Invalid parameters: failedIndex is required' }, { status: 400 });
    }

    const { account, index } = await getActiveCloudinaryAccount();

    // Idempotent rotation: only rotate if the DB index matches the failed index.
    // If they differ, another user/request has already rotated the account.
    if (index === failedIndex) {
      const result = await rotateToNextCloudinaryAccount(index);
      return NextResponse.json({ 
        success: true, 
        rotated: true, 
        newIndex: result.newIndex 
      });
    }

    return NextResponse.json({ 
      success: true, 
      rotated: false, 
      message: 'Already rotated by another request', 
      currentIndex: index 
    });
  } catch (error: any) {
    console.error('Cloudinary failover error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failover failed' }, { status: 500 });
  }
}
