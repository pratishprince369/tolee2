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

    const { imageUrl } = await request.json();

    const isDataUri = imageUrl && (
      imageUrl.startsWith('data:image/jpeg;base64,') ||
      imageUrl.startsWith('data:image/png;base64,') ||
      imageUrl.startsWith('data:image/webp;base64,')
    );

    // Verify URL origin or data URI type to prevent arbitrary uploads or SSRF
    if (!imageUrl || (!isDataUri && !imageUrl.startsWith('https://image.pollinations.ai/') && !imageUrl.startsWith('https://images.unsplash.com/'))) {
      return NextResponse.json({ success: false, error: 'Invalid or unauthorized image URL origin' }, { status: 400 });
    }

    console.log('CLOUDINARY UPLOAD: Starting upload for generated AI image (isDataUri:', !!isDataUri, ')');

    // Direct Cloudinary upload from external URL or base64 Data URI
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: 'tolee_uploads',
      resource_type: 'image'
    });

    let optimizedUrl = result.secure_url;
    if (optimizedUrl.includes('/upload/')) {
      // Auto-formatting and auto-quality
      optimizedUrl = optimizedUrl.replace('/upload/', '/upload/q_auto,f_auto/');
    }

    console.log('CLOUDINARY UPLOAD: Success! Optimized URL:', optimizedUrl, 'Public ID:', result.public_id, 'Resource Type:', result.resource_type);
    return NextResponse.json({ 
      success: true, 
      url: optimizedUrl,
      publicId: result.public_id,
      resourceType: result.resource_type
    });
  } catch (error: any) {
    console.error('Error saving image to Cloudinary:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to upload generated image to Cloudinary',
      details: error.message 
    });
  }
}
