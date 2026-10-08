import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySuperAdminToken, SUPER_ADMIN_COOKIE } from '@/lib/superAdminAuth';
import { cleanupMeetingResources } from '@/actions/meeting';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SUPER_ADMIN_COOKIE)?.value;
  if (!token || !verifySuperAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const activeMeetings = await prisma.meeting.findMany({
      where: {
        endedAt: null,
      },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            avatar: true,
            image: true,
          },
        },
        _count: {
          select: {
            participants: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      count: activeMeetings.length,
      meetings: activeMeetings.map((m) => ({
        id: m.id,
        meetingCode: m.meetingCode,
        title: m.title,
        description: m.description,
        type: m.type,
        visibility: m.visibility,
        startedAt: m.startedAt || m.createdAt,
        createdAt: m.createdAt,
        isLocked: m.isLocked,
        isRecording: m.isRecording,
        host: m.host,
        participantCount: m._count.participants,
      })),
    });
  } catch (error: any) {
    console.error('[API Super Admin Meetings GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch active meetings' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SUPER_ADMIN_COOKIE)?.value;
  if (!token || !verifySuperAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { meetingId, action } = body;

    if (action === 'end_all') {
      const activeMeetings = await prisma.meeting.findMany({
        where: { endedAt: null },
        select: { id: true, meetingCode: true },
      });

      for (const m of activeMeetings) {
        await prisma.$transaction([
          prisma.meeting.update({
            where: { id: m.id },
            data: { endedAt: new Date() },
          }),
          prisma.meetingParticipant.updateMany({
            where: { meetingId: m.id, leftAt: null },
            data: { leftAt: new Date() },
          }),
        ]);
        await cleanupMeetingResources(m.id).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        message: `Successfully ended ${activeMeetings.length} active meeting(s) and cleared buffers.`,
        terminatedCount: activeMeetings.length,
      });
    }

    if (!meetingId) {
      return NextResponse.json({ success: false, error: 'Meeting ID is required' }, { status: 400 });
    }

    // End specific meeting
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { id: true, meetingCode: true, title: true },
    });

    if (!meeting) {
      return NextResponse.json({ success: false, error: 'Meeting not found' }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.meeting.update({
        where: { id: meetingId },
        data: { endedAt: new Date() },
      }),
      prisma.meetingParticipant.updateMany({
        where: { meetingId, leftAt: null },
        data: { leftAt: new Date() },
      }),
    ]);

    // Clean up temporary streams & storage allocations
    await cleanupMeetingResources(meetingId).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Meeting "${meeting.title}" (${meeting.meetingCode}) has been successfully ended.`,
      meetingId,
    });
  } catch (error: any) {
    console.error('[API Super Admin Meetings POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to terminate meeting' },
      { status: 500 }
    );
  }
}
