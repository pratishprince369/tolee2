import { NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { videoUrl } = await request.json();

    const isDataUri = videoUrl && (
      videoUrl.startsWith('data:video/mp4;base64,') ||
      videoUrl.startsWith('data:video/quicktime;base64,')
    );

    const isAuthorizedOrigin = videoUrl && (
      isDataUri ||
      videoUrl.startsWith('https://assets.mixkit.co/') ||
      videoUrl.startsWith('https://res.cloudinary.com/')
    );

    if (!videoUrl || !isAuthorizedOrigin) {
      return NextResponse.json({ success: false, error: 'Invalid or unauthorized video source origin' }, { status: 400 });
    }

    console.log('CLOUDINARY UPLOAD: Starting upload for generated AI video (isDataUri:', !!isDataUri, ')');

    // Direct Cloudinary upload from external URL or base64 Data URI
    const result = await cloudinary.uploader.upload(videoUrl, {
      folder: 'tolee_uploads',
      resource_type: 'video',
    });

    let optimizedUrl = result.secure_url;
    
    // Auto-transcode if eager transformation or public secure URL is returned
    if (result.eager && result.eager.length > 0) {
      optimizedUrl = result.eager[0].secure_url;
    }

    console.log('CLOUDINARY UPLOAD: Video Success! Optimized URL:', optimizedUrl, 'Public ID:', result.public_id, 'Resource Type:', result.resource_type);
    return NextResponse.json({ 
      success: true, 
      url: optimizedUrl,
      publicId: result.public_id,
      resourceType: result.resource_type
    });
  } catch (error: any) {
    console.error('Error saving video to Cloudinary:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to upload generated video to Cloudinary',
      details: error.message 
    });
  }
}
