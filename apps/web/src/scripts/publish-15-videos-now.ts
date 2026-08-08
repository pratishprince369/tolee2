import { publishYouTubeVideosBatch } from '../lib/youtubeAutoPublisher';
import { publishDailyNewsBatch } from '../lib/newsAutoPublisher';

async function main() {
  console.log("🚀 Executing batch for 15+ YouTube Videos & 15+ News Posts NOW...");

  console.log("🎬 Step 1: Publishing 15+ YouTube Videos...");
  const ytRes = await publishYouTubeVideosBatch(false);
  console.log(`✅ YouTube Batch Completed! Created ${ytRes.count} YouTube videos.`);
  console.log(ytRes.log.join('\n'));

  console.log("\n📰 Step 2: Publishing 15+ News Articles...");
  const newsRes = await publishDailyNewsBatch(false);
  console.log(`✅ News Batch Completed! Created ${newsRes.count} News posts.`);
  console.log(newsRes.log.join('\n'));

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error executing batch:", err);
  process.exit(1);
});
