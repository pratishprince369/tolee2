import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cleanupMeetingResources } from '@/actions/meeting';
import { createSystemNotification } from '@/lib/notification-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

    console.log(`[Cron Cleanup] Running background cleanup job at ${now.toISOString()}`);

    // --- 1. Event transitions & notifications ---
    console.log(`[Cron Cleanup] Starting event transition and notifications checks...`);
    const activeEvents = await prisma.event.findMany({
      where: {
        status: 'active'
      },
      include: {
        attendees: {
          where: { status: 'approved' }
        }
      }
    });

    let updatedEventsCount = 0;
    let notificationsSentCount = 0;

    for (const event of activeEvents) {
      const updates: any = {};
      const notificationsToCreate: string[] = [];

      const start = new Date(event.startDate);
      const end = new Date(event.endDate);

      const timeToStartMs = start.getTime() - now.getTime();
      const isPastEnd = now >= end;
      const isPastStart = now >= start;

      // 1. Check end/expiry
      if (isPastEnd) {
        updates.status = 'ended';
        if (!event.notifiedEnded) {
          updates.notifiedEnded = true;
          notificationsToCreate.push(`Your event "${event.name}" has ended. You can now delete it or keep it for your event history.`);
        }
      } else {
        // 2. Check start
        if (isPastStart && !event.notifiedStarted) {
          updates.notifiedStarted = true;
          notificationsToCreate.push(`Live Now: The event "${event.name}" has started!`);
        }

        // 3. Check 2 hours reminder
        if (timeToStartMs <= 2 * 60 * 60 * 1000 && timeToStartMs > 0 && !event.notified2hBefore) {
          updates.notified2hBefore = true;
          notificationsToCreate.push(`Reminder: The event "${event.name}" starts in 2 hours.`);
        }

        // 4. Check 1 hour reminder
        if (timeToStartMs <= 60 * 60 * 1000 && timeToStartMs > 0 && !event.notified1hBefore) {
          updates.notified1hBefore = true;
          notificationsToCreate.push(`Reminder: The event "${event.name}" starts in 1 hour.`);
        }

        // 5. Check 24 hour reminder
        if (timeToStartMs <= 24 * 60 * 60 * 1000 && timeToStartMs > 0 && !event.notified24hBefore) {
          updates.notified24hBefore = true;
          notificationsToCreate.push(`Reminder: The event "${event.name}" starts in 24 hours.`);
        }

        // 6. Check 7 days reminder
        if (timeToStartMs <= 7 * 24 * 60 * 60 * 1000 && timeToStartMs > 0 && !event.notified7dBefore) {
          updates.notified7dBefore = true;
          notificationsToCreate.push(`Reminder: The event "${event.name}" starts in 7 days.`);
        }

        // 7. Check 30 days reminder
        if (timeToStartMs <= 30 * 24 * 60 * 60 * 1000 && timeToStartMs > 0 && !event.notified30dBefore) {
          updates.notified30dBefore = true;
          notificationsToCreate.push(`Reminder: The event "${event.name}" starts in 30 days.`);
        }
      }

      // If we have updates, update the event in the database
      if (Object.keys(updates).length > 0) {
        await prisma.event.update({
          where: { id: event.id },
          data: updates
        });
        updatedEventsCount++;
      }

      // Send notifications to creator and all approved attendees
      const targetUserIds = [event.creatorId, ...event.attendees.map((a: any) => a.userId)];
      const uniqueUserIds = Array.from(new Set(targetUserIds));

      for (const msg of notificationsToCreate) {
        for (const recipientId of uniqueUserIds) {
          const isCreator = recipientId === event.creatorId;
          await createSystemNotification({
            userId: recipientId,
            type: 'default',
            message: msg,
            link: isCreator ? '/creator-dashboard' : `/map?eventId=${event.id}`
          });
          notificationsSentCount++;
        }
      }
    }
    console.log(`[Cron Cleanup] Finished event processing. Updated ${updatedEventsCount} events, sent ${notificationsSentCount} notifications.`);

    // --- 2. Zombie Meetings Cleanup ---
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

    let cleanedMeetingsCount = 0;
    const results: any[] = [];

    if (zombieMeetings.length > 0) {
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

      const cleanResults = await Promise.all(cleanPromises);
      results.push(...cleanResults);
      cleanedMeetingsCount = cleanResults.filter(r => r.success).length;
    }

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${cleanedMeetingsCount} zombie meetings. Processed ${activeEvents.length} events (updated ${updatedEventsCount}, notified ${notificationsSentCount}).`,
      zombieMeetingsResults: results,
      eventsProcessed: activeEvents.length,
      eventsUpdated: updatedEventsCount,
      notificationsSent: notificationsSentCount
    });
  } catch (error: any) {
    console.error('[Cron Cleanup Fatal Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

