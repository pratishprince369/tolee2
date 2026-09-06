import { NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getActiveCloudinaryAccount } from '@/lib/cloudinary-fallback';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const timestamp = Math.round((new Date).getTime() / 1000);
    
    // Signature parameters
    const paramsToSign: Record<string, any> = { 
      timestamp, 
      folder: 'tolee_uploads' 
    };

    const { account, index } = await getActiveCloudinaryAccount();

    if (!account || !account.apiSecret || !account.apiKey) {
      return NextResponse.json({ success: false, error: 'No active Cloudinary account configured' }, { status: 500 });
    }

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      account.apiSecret
    );
    
    return NextResponse.json({ 
      success: true,
      timestamp, 
      signature, 
      eager: paramsToSign.eager,
      eager_async: paramsToSign.eager_async,
      cloudName: account.cloudName,
      apiKey: account.apiKey,
      index
    });
  } catch (error: any) {
    console.error("Signature error:", error);
    return NextResponse.json({ success: false, error: 'Could not generate signature' }, { status: 500 });
  }
}
