import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateWaveform } from '@/lib/audioLibrary';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const song = await prisma.song.findUnique({
      where: { id: params.id },
      select: { id: true, title: true, waveform: true },
    });

    if (!song) {
      return NextResponse.json({ success: false, error: 'Song not found' }, { status: 404 });
    }

    let waveformData: number[] = [];
    if (song.waveform) {
      try {
        waveformData = JSON.parse(song.waveform);
      } catch {
        waveformData = generateWaveform(song.id + song.title);
      }
    } else {
      waveformData = generateWaveform(song.id + song.title);
    }

    return NextResponse.json({ success: true, waveform: waveformData });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
