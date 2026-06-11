import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySuperAdminToken, SUPER_ADMIN_COOKIE } from '@/lib/superAdminAuth';
import { extractPublicIdFromUrl, extractResourceTypeFromUrl, destroyAsset } from '@/lib/cloudinary-cleanup';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SUPER_ADMIN_COOKIE)?.value;
  if (!token || !verifySuperAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 20;
  const skip = (page - 1) * limit;

  const where: any = q ? { name: { contains: q, mode: 'insensitive' } } : {};
  const [tolees, total] = await Promise.all([
    prisma.tolee.findMany({
      where, skip, take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true } },
        _count: { select: { members: true, posts: true } }
      }
    }),
    prisma.tolee.count({ where })
  ]);
  return NextResponse.json({ tolees, total, page, pages: Math.ceil(total / limit) });
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get(SUPER_ADMIN_COOKIE)?.value;
  if (!token || !verifySuperAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await req.json();
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  try {
    const tolee = await prisma.tolee.findUnique({
      where: { id },
      select: {
        avatar: true,
        avatarPublicId: true,
        coverImage: true,
        coverImagePublicId: true
      }
    });

    if (tolee) {
      if (tolee.avatar) {
        const deleteId = tolee.avatarPublicId || extractPublicIdFromUrl(tolee.avatar);
        if (deleteId) {
          await destroyAsset(deleteId, extractResourceTypeFromUrl(tolee.avatar));
        }
      }

      if (tolee.coverImage) {
        const deleteId = tolee.coverImagePublicId || extractPublicIdFromUrl(tolee.coverImage);
        if (deleteId) {
          await destroyAsset(deleteId, extractResourceTypeFromUrl(tolee.coverImage));
        }
      }
    }

    // Retrieve course, module, and lesson hierarchies for safe deletion
    const courses = await prisma.course.findMany({ where: { toleeId: id }, select: { id: true } });
    const courseIds = courses.map(c => c.id);
    const modules = await prisma.module.findMany({ where: { courseId: { in: courseIds } }, select: { id: true } });
    const moduleIds = modules.map(m => m.id);
    const lessons = await prisma.lesson.findMany({ where: { moduleId: { in: moduleIds } }, select: { id: true } });
    const lessonIds = lessons.map(l => l.id);

    await prisma.$transaction([
      prisma.lessonProgress.deleteMany({ where: { lessonId: { in: lessonIds } } }),
      prisma.lesson.deleteMany({ where: { moduleId: { in: moduleIds } } }),
      prisma.module.deleteMany({ where: { courseId: { in: courseIds } } }),
      prisma.course.deleteMany({ where: { toleeId: id } }),
      prisma.toleeMember.deleteMany({ where: { toleeId: id } }),
      prisma.postTolee.deleteMany({ where: { toleeId: id } }),
      prisma.tolee.delete({ where: { id } }),
      prisma.auditLog.create({ data: { action: 'delete_tolee', target: id, targetType: 'tolee', ipAddress: ip } })
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error in super-admin delete group:", err);
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
  }
}
