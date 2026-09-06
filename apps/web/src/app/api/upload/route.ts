import { NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { uploadLimiter, getClientIp, createRateLimitResponse } from '@/lib/rate-limit';
import { validateFileUpload, sanitizeFilename } from '@/lib/sanitize';
import { createSafeErrorResponse } from '@/lib/error-handler';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Rate Limiting Protection (per IP + per User ID)
    const ip = getClientIp();
    const userId = (session.user as any)?.id || 'anon';
    if (uploadLimiter.isRateLimited(`${ip}:${userId}`)) {
      return createRateLimitResponse(60);
    }

    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Deep server-side file validation (Extension, MIME, Max Size, and Magic Bytes)
    const validation = validateFileUpload(file.name, file.size, file.type, buffer);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error || 'Invalid or unsupported file format.' },
        { status: 400 }
      );
    }

    const sanitizedName = sanitizeFilename(file.name);
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
    const isDoc = isPdf || /\.(doc|docx|xls|xlsx|ppt|pptx|txt|rtf|csv|zip|rar|7z|tar|gz)$/i.test(file.name);
    const resourceType = isVideo ? 'video' : (isPdf ? 'auto' : (isDoc ? 'raw' : (isImage ? 'image' : 'auto')));

    // Upload to Cloudinary using isolated storage folder
    try {
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: 'tolee_uploads',
            resource_type: resourceType,
            filename_override: sanitizedName,
            use_filename: true,
            unique_filename: true,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(buffer);
      }) as any;

      return NextResponse.json({ 
        success: true, 
        url: result.secure_url,
        publicId: result.public_id,
        resourceType: result.resource_type
      });
    } catch (uploadError: any) {
      console.error("[Upload] Cloudinary stream upload failure:", uploadError.message);
      return NextResponse.json({ 
        success: false, 
        error: 'Upload to storage provider failed. Please try again later.'
      }, { status: 502 });
    }
  } catch (error: any) {
    return createSafeErrorResponse(error, 500, 'Failed to process file upload.', 'API_UPLOAD');
  }
}
