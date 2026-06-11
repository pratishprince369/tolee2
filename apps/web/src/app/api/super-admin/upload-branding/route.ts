import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdminToken, SUPER_ADMIN_COOKIE } from '@/lib/superAdminAuth';
import cloudinary from '@/lib/cloudinary';

export const dynamic = 'force-dynamic';

// Super Admin only image upload — for branding assets (logo, favicon, etc.)
export async function POST(req: NextRequest) {
  const token = req.cookies.get(SUPER_ADMIN_COOKIE)?.value;
  if (!token || !verifySuperAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.formData();
    const file = data.get('file') as File | null;
    const assetType = (data.get('assetType') as string) || 'logo'; // 'logo' | 'favicon' | 'mobile_logo'

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ success: false, error: 'Invalid file type. Allowed: PNG, JPG, SVG, WEBP, ICO' }, { status: 400 });
    }

    // Max 2MB for branding assets
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'File too large. Max size: 2MB' }, { status: 413 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: `tolee_branding/${assetType}`,
          resource_type: 'image',
          overwrite: true,
          public_id: `tolee_${assetType}_main`,
          // Invalidate CDN cache for immediate update
          invalidate: true,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    return NextResponse.json({ success: true, url: result.secure_url });
  } catch (e: any) {
    console.error('Branding upload error:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
