import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const room = req.nextUrl.searchParams.get("room");
    const name = session.user.name || 'Tolee User';
    const userId = (session.user as any).id;

    if (!room) {
      return NextResponse.json({ error: "Missing room parameter" }, { status: 400 });
    }

    // Retrieve meeting details to check host/cohost status
    let isHost = false;
    try {
      const meeting = await prisma.meeting.findUnique({
        where: { meetingCode: room }
      });

      if (meeting) {
        if (meeting.hostId === userId) {
          isHost = true;
        } else {
          const participant = await prisma.meetingParticipant.findUnique({
            where: {
              meetingId_userId: {
                meetingId: meeting.id,
                userId
              }
            }
          });
          if (participant && (participant.role === 'host' || participant.role === 'cohost')) {
            isHost = true;
          }
        }
      }
    } catch (dbErr) {
      console.error('Error fetching meeting from DB for token:', dbErr);
    }

    const apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
    const apiSecret = process.env.LIVEKIT_API_SECRET || 'secret';

    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: name,
    });

    at.addGrant({
      roomJoin: true,
      room: room,
      canPublish: true,
      canSubscribe: true,
      roomAdmin: isHost
    });

    const token = await at.toJwt();
    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
