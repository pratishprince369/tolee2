import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EgressClient } from 'livekit-server-sdk';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const { meetingId, action } = await req.json();

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId }
    });
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    if (meeting.hostId !== userId) {
      return NextResponse.json({ error: 'Only the host can control recording' }, { status: 403 });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    // Local / Dev Fallback: Simulate recording
    if (!apiKey || !apiSecret || !livekitUrl || livekitUrl.includes('localhost')) {
      console.log(`[Recording Simulator] Simulated ${action} recording for meeting ${meeting.meetingCode}`);
      if (action === 'start') {
        const recording = await prisma.meetingRecording.create({
          data: {
            meetingId,
            egressId: `sim-egress-${Math.random().toString(36).substring(2, 11)}`,
            recordingUrl: `https://res.cloudinary.com/demo/video/upload/v1618210355/live_session_${meeting.meetingCode}.mp4`,
            duration: 0
          }
        });
        return NextResponse.json({ success: true, recording, simulated: true });
      } else {
        // Stop recording
        const recording = await prisma.meetingRecording.findFirst({
          where: { meetingId },
          orderBy: { createdAt: 'desc' }
        });
        if (recording) {
          await prisma.meetingRecording.update({
            where: { id: recording.id },
            data: { duration: 120 } // 2 mins simulated
          });
        }
        return NextResponse.json({ success: true, simulated: true });
      }
    }

    // Actual LiveKit Egress trigger
    const egressClient = new EgressClient(livekitUrl, apiKey, apiSecret);
    
    if (action === 'start') {
      const output = {
        filepath: `recordings/${meeting.meetingCode}/{time}.mp4`,
        s3: {
          accessKey: process.env.AWS_ACCESS_KEY_ID || '',
          secret: process.env.AWS_SECRET_ACCESS_KEY || '',
          bucket: process.env.AWS_S3_BUCKET || 'tolee-recordings',
          region: process.env.AWS_REGION || 'us-east-1',
        }
      };

      const info = await egressClient.startRoomCompositeEgress(meeting.meetingCode, {
        file: output
      });

      const recording = await prisma.meetingRecording.create({
        data: {
          meetingId,
          egressId: info.egressId,
          recordingUrl: `s3://${output.s3.bucket}/${output.filepath}`,
          duration: 0
        }
      });

      return NextResponse.json({ success: true, recording });
    } else {
      // Find active recording
      const recording = await prisma.meetingRecording.findFirst({
        where: { meetingId },
        orderBy: { createdAt: 'desc' }
      });

      if (!recording || recording.egressId.startsWith('sim-')) {
        return NextResponse.json({ success: true, simulated: true });
      }

      await egressClient.stopEgress(recording.egressId);
      return NextResponse.json({ success: true });
    }

  } catch (error: any) {
    console.error('Recording API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
