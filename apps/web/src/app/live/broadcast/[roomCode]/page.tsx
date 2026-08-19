import React from 'react';
import dynamic from 'next/dynamic';

const LiveBroadcastRoomClient = dynamic(
  () => import('./LiveBroadcastRoomClient'),
  { ssr: false }
);

export default async function LiveBroadcastPage({
  params
}: {
  params: Promise<{ roomCode: string }>
}) {
  const { roomCode } = await params;
  return <LiveBroadcastRoomClient roomCode={roomCode} />;
}
