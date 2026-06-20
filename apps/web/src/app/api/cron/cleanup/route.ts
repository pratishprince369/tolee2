import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cleanupMeetingResources } from '@/actions/meeting';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

    console.log(`[Cron Cleanup] Running background cleanup job at ${now.toISOString()}`);

    // Find zombie meetings (active, but last heartbeat or startedAt is older than 10 minutes)
    const zombieMeetings = await prisma.meeting.findMany({
      where: {
        endedAt: null,
        OR: [
          { lastHeartbeatAt: { lt: tenMinutesAgo } },
          { lastHeartbeatAt: null, startedAt: { lt: tenMinutesAgo } }
        ]
      }
    });

    if (zombieMeetings.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No zombie meetings found.',
        cleanedCount: 0
      });
    }

    console.log(`[Cron Cleanup] Found ${zombieMeetings.length} zombie/abandoned meetings to clean up.`);

    const cleanPromises = zombieMeetings.map(async (meeting: any) => {
      try {
        // 1. Mark meeting as ended in database
        await prisma.meeting.update({
          where: { id: meeting.id },
          data: { endedAt: new Date() }
        });

        // 2. Mark all active participants as left
        await prisma.meetingParticipant.updateMany({
          where: { meetingId: meeting.id, leftAt: null },
          data: { leftAt: new Date() }
        });

        // 3. Clean up files, streams, caches, and DB records
        await cleanupMeetingResources(meeting.id);

        console.log(`[Cron Cleanup] Successfully cleaned up zombie meeting: ${meeting.meetingCode}`);
        return { meetingCode: meeting.meetingCode, success: true };
      } catch (err) {
        console.error(`[Cron Cleanup Error] Failed to clean meeting ${meeting.meetingCode}:`, err);
        return { meetingCode: meeting.meetingCode, success: false };
      }
    });

    const results = await Promise.all(cleanPromises);

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${results.filter(r => r.success).length} zombie meetings.`,
      results
    });
  } catch (error: any) {
    console.error('[Cron Cleanup Fatal Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
