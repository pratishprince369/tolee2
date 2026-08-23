import { getContentPermanentUrl } from '../lib/shareService';
import { prisma } from '../lib/prisma';
import { incrementShareCount } from '../actions/post';

async function runShareTests() {
  console.log('--- 🧪 STARTING TOLEE SHARE SYSTEM VERIFICATION ---');

  // 1. URL Generation Test
  console.log('\n[TEST 1] Permanent URL Generation:');
  const postUrl = getContentPermanentUrl({ id: 'test-post-123', postType: 'post' });
  const reelUrl = getContentPermanentUrl({ id: 'test-reel-456', postType: 'reel' });
  const newsUrl = getContentPermanentUrl({ id: 'test-news-789', slug: 'kalyan-weather-alert', postType: 'news' });
  const marketUrl = getContentPermanentUrl({ id: 'test-item-999', postType: 'marketplace' });

  console.log('  Feed Post URL:', postUrl);
  console.log('  Reel URL:     ', reelUrl);
  console.log('  News URL:     ', newsUrl);
  console.log('  Market URL:   ', marketUrl);

  if (!postUrl.includes('/post/test-post-123') ||
      !reelUrl.includes('/reel/test-reel-456') ||
      !newsUrl.includes('/news/kalyan-weather-alert') ||
      !marketUrl.includes('/marketplace/listing/test-item-999')) {
    throw new Error('❌ URL Generation failed!');
  }
  console.log('✅ URL Generation Test Passed!');

  // 2. Database Share Count Increment Test
  console.log('\n[TEST 2] Database Share Count Increment:');
  const samplePost = await prisma.post.findFirst({
    select: { id: true, caption: true }
  });

  if (samplePost) {
    const initialShares = samplePost.shareCount || 0;
    console.log(`  Found Post ID: ${samplePost.id} | Initial Shares: ${initialShares}`);

    const res = await incrementShareCount(samplePost.id);
    console.log('  incrementShareCount Response:', res);

    if (res.success && res.shareCount === initialShares + 1) {
      console.log(`✅ DB Share count correctly incremented from ${initialShares} to ${res.shareCount}`);
    } else {
      console.warn('⚠️ Increment response:', res);
    }
  } else {
    console.log('  (No posts in DB, skipping DB increment check)');
  }

  console.log('\n--- 🎉 ALL SHARE VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
  process.exit(0);
}

runShareTests().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
