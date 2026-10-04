import dotenv from 'dotenv';
dotenv.config();
import { prisma } from '../src/lib/prisma';
import { getAllCloudinaryAccounts } from '../src/lib/cloudinary-fallback';
import { v2 as cloudinary } from 'cloudinary';

async function convertAllDriveReels() {
  console.log('=== CONVERTING ALL GOOGLE DRIVE REELS TO COMPRESSED CLOUDINARY CDN ===');

  const accounts = getAllCloudinaryAccounts().filter(a => a.apiKey && a.apiSecret && a.cloudName);
  console.log(`Available Cloudinary Accounts: ${accounts.length} (${accounts.map(a => a.cloudName).join(', ')})`);

  if (accounts.length === 0) {
    console.error('No valid Cloudinary accounts found!');
    process.exit(1);
  }

  // Find all reels with Google Drive URLs
  const driveReels = await prisma.post.findMany({
    where: {
      postType: 'reel',
      OR: [
        { mediaUrls: { contains: 'drive.usercontent.google.com' } },
        { mediaUrls: { contains: 'drive.google.com' } }
      ]
    },
    select: { id: true, mediaUrls: true, caption: true, author: { select: { username: true } } }
  });

  console.log(`Total Google Drive reels to compress and convert: ${driveReels.length}`);

  let successCount = 0;
  let failCount = 0;
  let accountIndex = 0;

  for (let i = 0; i < driveReels.length; i++) {
    const post = driveReels[i];
    const rawUrl = post.mediaUrls || '';
    const match = rawUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/) || rawUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || rawUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);

    if (!match || !match[1]) {
      console.warn(`[Skip] Cannot extract file ID for post ${post.id}`);
      continue;
    }

    const fileId = match[1];
    const downloadUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;

    // Round-robin across the 8 Cloudinary accounts to balance load and storage
    let uploaded = false;
    let attempts = 0;

    while (!uploaded && attempts < accounts.length) {
      const currentAcc = accounts[accountIndex % accounts.length];
      accountIndex++;
      attempts++;

      try {
        cloudinary.config({
          cloud_name: currentAcc.cloudName,
          api_key: currentAcc.apiKey,
          api_secret: currentAcc.apiSecret,
        });

        const uploadRes = await cloudinary.uploader.upload(downloadUrl, {
          resource_type: 'video',
          folder: 'tolee_reels',
          public_id: `gdrive_reel_${fileId}`,
          overwrite: false,
          timeout: 45000,
          transformation: [
            { width: 720, crop: 'limit', quality: 'auto:good' }
          ]
        });

        if (uploadRes && uploadRes.secure_url) {
          const optimizedVideo = uploadRes.secure_url.replace('/upload/', '/upload/q_auto:good,vc_h264,w_720/');
          const posterUrl = uploadRes.secure_url.replace(/\.[^/.]+$/, '.jpg');
          const combinedUrls = `${optimizedVideo},${posterUrl}`;

          await prisma.post.update({
            where: { id: post.id },
            data: {
              mediaUrls: combinedUrls,
              mediaResourceTypes: 'cloudinary',
              mediaPublicIds: uploadRes.public_id
            }
          });

          uploaded = true;
          successCount++;
          console.log(`[${i + 1}/${driveReels.length}] Successfully converted post ${post.id} via ${currentAcc.cloudName} -> ${optimizedVideo.slice(0, 70)}...`);
        }
      } catch (err: any) {
        console.warn(`[Retry] Upload failed on ${currentAcc.cloudName} for post ${post.id}: ${err.message || err}. Trying next account...`);
      }
    }

    if (!uploaded) {
      failCount++;
      console.error(`[Failed] Could not convert post ${post.id} (fileId: ${fileId}) across all Cloudinary accounts.`);
    }
  }

  console.log(`\n=== CONVERSION COMPLETE ===`);
  console.log(`Successfully converted to Cloudinary CDN: ${successCount}`);
  console.log(`Failed: ${failCount}`);

  await prisma.$disconnect();
}

convertAllDriveReels().catch(err => {
  console.error('Fatal in convertAllDriveReels:', err);
  process.exit(1);
});
