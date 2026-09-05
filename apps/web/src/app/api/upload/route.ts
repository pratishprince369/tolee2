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

    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' });
    }

    // MIME Type Validation - allow images, videos, audio, PDFs, and common documents
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    const isDoc = file.type.startsWith('application/') || file.type.startsWith('text/') || 
      file.name.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|rtf|csv|zip|rar|7z|tar|gz)$/i);

    const isValidType = isImage || isVideo || isAudio || Boolean(isDoc);
    if (!isValidType) {
      return NextResponse.json({ success: false, error: 'Invalid file type. Unsupported format.' }, { status: 400 });
    }

    // Size limits (50MB for videos, 25MB for audio/documents/images)
    const maxSize = isVideo ? 50 * 1024 * 1024 : 25 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ success: false, error: `File size exceeds limit (${isVideo ? '50MB' : '25MB'}).` }, { status: 413 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Cloudinary using a Promise wrapper for the stream upload
    try {
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: 'tolee_uploads',
            resource_type: 'auto',
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(buffer);
      }) as any;

      console.log('UPLOAD: SUCCESS! URL:', result.secure_url, 'Public ID:', result.public_id, 'Resource Type:', result.resource_type);
      return NextResponse.json({ 
        success: true, 
        url: result.secure_url,
        publicId: result.public_id,
        resourceType: result.resource_type
      });
    } catch (uploadError: any) {
      console.error("Cloudinary upload failed:", uploadError.message);
      return NextResponse.json({ 
        success: false, 
        error: 'Upload to Cloudinary failed',
        details: uploadError.message 
      });
    }
  } catch (error: any) {
    console.error("Critical error in upload route:", error);
    return NextResponse.json({ success: false, error: 'Internal server error' });
  }
}
