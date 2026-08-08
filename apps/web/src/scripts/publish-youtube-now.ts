import dotenv from 'dotenv';
dotenv.config();

import { publishYouTubeVideosBatch } from '../lib/youtubeAutoPublisher';

async function run() {
  console.log("🚀 Starting immediate YouTube Video Publishing for the 6 accounts...");
  const res = await publishYouTubeVideosBatch(false);
  console.log("Publishing Result:", res);
  process.exit(0);
}

run().catch((err) => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
