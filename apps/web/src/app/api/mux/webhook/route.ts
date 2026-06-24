import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Mux Webhook Handler
 * 
 * Receives webhook events from Mux when video assets are created, ready, or errored.
 * 
 * Configure in Mux Dashboard:
 *   URL: https://your-domain.com/api/mux/webhook
 *   Events: video.asset.created, video.asset.ready, video.asset.errored,
 *           video.upload.asset_created
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, data } = body;

    console.log(`[Mux Webhook] Received event: ${type}`);

    switch (type) {
      // When a new asset is created from a direct upload
      case 'video.upload.asset_created': {
        const uploadId = data?.id;
        const assetId = data?.asset_id;

        if (uploadId && assetId) {
          // Find the video by muxUploadId and update with the new assetId
          await prisma.screenVideo.updateMany({
            where: { muxUploadId: uploadId },
            data: { muxAssetId: assetId },
          });
          console.log(`[Mux Webhook] Linked upload ${uploadId} to asset ${assetId}`);
        }
        break;
      }

      // When a video asset is created (processing starts)
      case 'video.asset.created': {
        const assetId = data?.id;
        const uploadId = data?.upload_id;

        if (assetId && uploadId) {
          await prisma.screenVideo.updateMany({
            where: { muxUploadId: uploadId },
            data: { 
              muxAssetId: assetId,
            },
          });
          console.log(`[Mux Webhook] Asset created: ${assetId} for upload ${uploadId}`);
        }
        break;
      }

      // When video processing is complete and ready to stream
      case 'video.asset.ready': {
        const assetId = data?.id;
        const playbackId = data?.playback_ids?.[0]?.id;
        const duration = data?.duration;
        const uploadId = data?.upload_id;

        if (assetId) {
          const updateData: any = {};
          if (playbackId) {
            updateData.muxPlaybackId = playbackId;
            updateData.mediaUrl = `https://stream.mux.com/${playbackId}.m3u8`;
          }
          if (duration) updateData.duration = duration;

          // Try to find by assetId first, then by uploadId
          const updatedByAsset = await prisma.screenVideo.updateMany({
            where: { muxAssetId: assetId },
            data: updateData,
          });

          if (updatedByAsset.count === 0 && uploadId) {
            await prisma.screenVideo.updateMany({
              where: { muxUploadId: uploadId },
              data: {
                muxAssetId: assetId,
                ...updateData,
              },
            });
          }

          // Also update the associated Feed Post or Reel with the ready playback URL
          if (playbackId) {
            const videoUrl = `https://stream.mux.com/${playbackId}.m3u8`;
            const updatedPosts = await prisma.post.updateMany({
              where: { ocrText: `mux-asset:${assetId}` },
              data: { mediaUrls: videoUrl }
            });
            console.log(`[Mux Webhook] Updated ${updatedPosts.count} associated Feed Post/Reel mediaUrls to: ${videoUrl}`);
          }

          console.log(`[Mux Webhook] Asset ready: ${assetId}, playbackId: ${playbackId}, duration: ${duration}s`);
        }
        break;
      }

      // When video processing fails
      case 'video.asset.errored': {
        const assetId = data?.id;
        const uploadId = data?.upload_id;
        const errorMessage = data?.errors?.messages?.join(', ') || 'Unknown error';

        console.error(`[Mux Webhook] Asset errored: ${assetId}, error: ${errorMessage}`);

        if (assetId) {
          await prisma.screenVideo.updateMany({
            where: { muxAssetId: assetId },
            data: { status: 'error' },
          });
        } else if (uploadId) {
          await prisma.screenVideo.updateMany({
            where: { muxUploadId: uploadId },
            data: { status: 'error' },
          });
        }
        break;
      }

      // When a live stream becomes active
      case 'video.live_stream.active': {
        console.log(`[Mux Webhook] Live stream active: ${data?.id}`);
        break;
      }

      // When a live stream becomes idle
      case 'video.live_stream.idle': {
        console.log(`[Mux Webhook] Live stream idle: ${data?.id}`);
        break;
      }

      default:
        console.log(`[Mux Webhook] Unhandled event type: ${type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error('[Mux Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error.message },
      { status: 500 }
    );
  }
}

// Mux sends GET to verify the webhook endpoint exists
export async function GET() {
  return NextResponse.json({ status: 'Mux webhook endpoint is active' }, { status: 200 });
}
