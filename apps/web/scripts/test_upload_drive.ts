import dotenv from 'dotenv';
dotenv.config();
import { getAllCloudinaryAccounts } from '../src/lib/cloudinary-fallback';
import { v2 as cloudinary } from 'cloudinary';

async function testUpload() {
  const accounts = getAllCloudinaryAccounts();
  const validAccs = accounts.filter(a => a.apiKey && a.apiSecret && a.cloudName);
  console.log(`Found ${validAccs.length} valid Cloudinary accounts:`, validAccs.map(a => a.cloudName));

  const acc = validAccs[0];
  console.log('Testing upload with account:', acc.cloudName);

  cloudinary.config({
    cloud_name: acc.cloudName,
    api_key: acc.apiKey,
    api_secret: acc.apiSecret
  });

  const fileId = '1JqfhcvqmkH4EB0JNzmy0i6BmBQXRg3Hh'; // First reel in DB!
  const downloadUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
  console.log('Download URL:', downloadUrl);

  const start = Date.now();
  try {
    const res = await cloudinary.uploader.upload(downloadUrl, {
      resource_type: 'video',
      folder: 'tolee_reels',
      public_id: `test_reel_${fileId}`,
      timeout: 30000,
      transformation: [
        { width: 720, crop: 'limit', quality: 'auto:good' }
      ]
    });
    console.log(`Uploaded in ${(Date.now() - start)/1000}s!`);
    console.log('Result URL:', res.secure_url);
  } catch (err: any) {
    console.error(`Upload failed in ${(Date.now() - start)/1000}s:`, err.message || err);
  }
}

testUpload().catch(console.error);
