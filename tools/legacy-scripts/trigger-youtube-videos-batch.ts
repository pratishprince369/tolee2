import dotenv from 'dotenv';
dotenv.config();

import { publishYouTubeVideosBatch } from '../lib/youtubeAutoPublisher';
import { publishDailyNewsBatch } from '../lib/newsAutoPublisher';

async function main() {
  console.log("🚀 Starting Immediate Auto-Publisher Batch (YouTube Videos + News)...");

  const ytResult = await publishYouTubeVideosBatch(false);
  console.log("🎬 YouTube Video Batch Result:", ytResult);

  const newsResult = await publishDailyNewsBatch(false);
  console.log("📰 News Batch Result:", newsResult);

  process.exit(0);
}

main().catch(err => {
  console.error("Fatal Batch Error:", err);
  process.exit(1);
});
