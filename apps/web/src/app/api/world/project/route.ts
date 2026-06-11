import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Project ID is required.' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const project = await prisma.worldProject.findUnique({
      where: { id },
      include: {
        tolees: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found.' }, { status: 404 });
    }

    // Verify ownership or check if they are an admin
    const isAdmin = session.user.email === 'adsvidia369@gmail.com' || session.user.email === 'pratish@example.com';
    if (project.creatorId !== userId && !isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden.' }, { status: 403 });
    }

    return NextResponse.json({ success: true, project });
  } catch (error: any) {
    console.error('Error fetching project detail api:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
