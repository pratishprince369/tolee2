const dotenv = require('dotenv');
dotenv.config();

async function testPublish() {
  console.log('Testing Apify token:', process.env.APIFY_API_TOKEN ? 'Present' : 'Missing');
  
  // Test Instagram Scraper via Apify
  try {
    const { scrapeInstagramVideosViaApify } = require('../src/lib/apifyInstagramAutoPublisher');
    console.log('Testing Apify Instagram Scraper with 1 tag...');
    const items = await scrapeInstagramVideosViaApify(['https://www.instagram.com/explore/tags/animationreels/'], 2);
    console.log(`Apify returned ${items.length} items:`, items.map(i => ({ shortCode: i.shortCode, hasVideo: !!i.videoUrl })));
  } catch (err) {
    console.error('Apify test error:', err.message);
  }

  // Test Google Drive Catalog
  try {
    const { buildCentralReelCatalog } = require('../src/lib/reelsBundleAutoPublisher');
    console.log('Testing Central Reel Catalog...');
    const catalog = await buildCentralReelCatalog();
    console.log(`Catalog discovered: ${catalog.length} items. Sample 2:`, catalog.slice(0, 2));
  } catch (err) {
    console.error('Catalog test error:', err.message);
  }
}

testPublish().catch(console.error);
