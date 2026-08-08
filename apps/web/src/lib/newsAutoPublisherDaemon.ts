import { publishDailyNewsBatch } from '@/lib/newsAutoPublisher';
import { publishYouTubeVideosBatch } from '@/lib/youtubeAutoPublisher';

let isDaemonRunning = false;

/**
 * Continuous Background Auto-Publisher Daemon Engine
 * Runs in the background and publishes 20-25 news posts daily with human-like time gaps.
 */
export function startNewsAutoPublisherDaemon() {
  if (isDaemonRunning) {
    console.log("⚡ Auto-Publisher Daemon is already active.");
    return;
  }

  isDaemonRunning = true;
  console.log("🚀 Starting Continuous Daily News Auto-Publisher Daemon Loop...");

  const runLoop = async () => {
    while (isDaemonRunning) {
      try {
        console.log("📰 [DAEMON LOOP] Executing daily news batch publication...");
        const newsResult = await publishDailyNewsBatch(false);
        console.log(`📰 [DAEMON LOOP] Published ${newsResult.count} news posts across registered accounts.`);

        console.log("🎬 [DAEMON LOOP] Executing YouTube video news publication...");
        const ytResult = await publishYouTubeVideosBatch(false);
        console.log(`🎬 [DAEMON LOOP] Published ${ytResult.count} YouTube video news posts.`);

      } catch (err: any) {
        console.error("❌ [DAEMON LOOP ERROR]:", err.message);
      }

      // Time gap between daemon batch cycles: 15-20 minutes
      const delayMinutes = Math.floor(Math.random() * 6) + 15;
      console.log(`⏱️ [DAEMON LOOP] Waiting ~${delayMinutes} minutes before next auto-publish cycle...`);
      await new Promise((res) => setTimeout(res, delayMinutes * 60 * 1000));
    }
  };

  runLoop();
}
