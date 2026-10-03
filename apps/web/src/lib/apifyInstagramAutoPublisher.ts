import { prisma } from '@/lib/prisma';
import { POSTING_ACCOUNTS, compressAndOptimizeReelVideo } from '@/lib/reelsBundleAutoPublisher';

const APIFY_TOKEN = process.env.APIFY_API_TOKEN || '';

/**
 * 5 Thematic Instagram Hashtag/Explore targets tailored to the 5 automated Tolee accounts
 */
export const INSTAGRAM_ACCOUNT_TARGETS: Record<string, string[]> = {
  // 1. vadapavwaledada@gmail.com (@vsdapav) -> Animation & Comedy
  'vadapavwaledada@gmail.com': [
    'https://www.instagram.com/explore/tags/animationreels/',
    'https://www.instagram.com/explore/tags/funnycartoons/',
    'https://www.instagram.com/explore/tags/2danimation/'
  ],
  // 2. loktimes369@gmail.com (@suman_kumar) -> Movies & Cinema
  'loktimes369@gmail.com': [
    'https://www.instagram.com/explore/tags/movieclips/',
    'https://www.instagram.com/explore/tags/cinematicvideo/',
    'https://www.instagram.com/explore/tags/bollywoodscenes/'
  ],
  // 3. adsvidia369@gmail.com (@adsvia) -> AI & Technology
  'adsvidia369@gmail.com': [
    'https://www.instagram.com/explore/tags/aitechnology/',
    'https://www.instagram.com/explore/tags/techtrends/',
    'https://www.instagram.com/explore/tags/futuristicai/'
  ],
  // 4. updatesontimes@gmail.com (@updatesontimes) -> Motivation & Finance
  'updatesontimes@gmail.com': [
    'https://www.instagram.com/explore/tags/motivationreels/',
    'https://www.instagram.com/explore/tags/successmindset/',
    'https://www.instagram.com/explore/tags/businessgrowth/'
  ],
  // 5. rinkugupta90282@gmail.com (@rinku_sharma) -> Lifestyle & Travel
  'rinkugupta90282@gmail.com': [
    'https://www.instagram.com/explore/tags/travelreels/',
    'https://www.instagram.com/explore/tags/lifestylevlog/',
    'https://www.instagram.com/explore/tags/wanderlustreels/'
  ]
};

export interface ScrapedReelVideoItem {
  shortCode: string;
  videoUrl: string;
  posterUrl: string;
  caption: string;
}

/**
 * Scrapes public Instagram videos/reels via Apify synchronously
 */
export async function scrapeInstagramVideosViaApify(
  targetUrls: string[],
  limit = 5
): Promise<ScrapedReelVideoItem[]> {
  const apiUrl = `https://api.apify.com/v2/actors/apify~instagram-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=50`;

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        directUrls: targetUrls,
        resultsType: 'posts',
        resultsLimit: limit
      }),
      signal: AbortSignal.timeout(55000)
    });

    if (!res.ok) {
      console.warn(`[Apify Instagram Scraper] API returned status ${res.status}`);
      return [];
    }

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    const videos: ScrapedReelVideoItem[] = [];

    for (const item of data) {
      const rawVideo = item.videoUrl || item.childPosts?.find((c: any) => c.videoUrl)?.videoUrl;
      const code = item.shortCode || item.id;

      if (rawVideo && code) {
        let cleanCaption = (item.caption || '')
          .replace(/https?:\/\/\S+/gi, '')
          .replace(/[#@][\w.-]+/g, '')
          .trim();

        if (cleanCaption.length < 5) {
          cleanCaption = 'Trending Instagram Reel #viral #reels #tolee';
        } else {
          cleanCaption = `${cleanCaption.slice(0, 150)} #viral #reels #tolee`;
        }

        videos.push({
          shortCode: `ig_${code}`,
          videoUrl: rawVideo,
          posterUrl: item.displayUrl || '',
          caption: cleanCaption
        });
      }
    }

    return videos;
  } catch (err: any) {
    console.error('[Apify Instagram Scraper Notice]:', err.message || err);
    return [];
  }
}

/**
 * Automatically scrapes, compresses, and posts Instagram Reels for the 5 automated accounts
 */
export async function publishInstagramReelsBatch(maxPerAccount = 2): Promise<{
  success: boolean;
  count: number;
  logs: string[];
}> {
  const logs: string[] = [];
  logs.push(`[Apify Instagram Engine] Starting batch at ${new Date().toISOString()}...`);

  try {
    const emails = POSTING_ACCOUNTS.map(a => a.email);
    const dbUsers = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true, email: true, username: true }
    });

    if (dbUsers.length === 0) {
      logs.push('Error: No target automated accounts found in database.');
      return { success: false, count: 0, logs };
    }

    const userMap = new Map<string, { id: string; email: string; username: string }>();
    dbUsers.forEach((u: any) => userMap.set(u.email, u));

    const defaultTolee = await prisma.tolee.findFirst({ select: { id: true } });

    // 30-day deduplication window
    const recentPosts = await prisma.post.findMany({
      where: {
        postType: 'reel',
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      },
      select: { mediaPublicIds: true }
    });

    const usedCodes = new Set<string>();
    recentPosts.forEach(p => {
      if (p.mediaPublicIds) {
        p.mediaPublicIds.split(',').forEach(c => usedCodes.add(c.trim()));
      }
    });

    let totalPublished = 0;

    for (const acc of POSTING_ACCOUNTS) {
      const u = userMap.get(acc.email);
      if (!u) continue;

      const targetUrls = INSTAGRAM_ACCOUNT_TARGETS[acc.email] || [];
      if (targetUrls.length === 0) continue;

      logs.push(`Fetching Instagram reels for @${u.username} (${acc.preferredCategory})...`);
      const scrapedItems = await scrapeInstagramVideosViaApify(targetUrls, 6);

      const freshItems = scrapedItems.filter(i => !usedCodes.has(i.shortCode));
      let accountPublished = 0;

      for (const item of freshItems) {
        if (accountPublished >= maxPerAccount) break;

        usedCodes.add(item.shortCode);

        // Step 20: Compress and optimize raw Instagram video via Cloudinary CDN for instant loading
        const optimized = await compressAndOptimizeReelVideo(item.shortCode, item.videoUrl);
        const poster = optimized.posterUrl || item.posterUrl;
        const mediaUrls = `${optimized.videoUrl},${poster}`;

        const created = await prisma.post.create({
          data: {
            caption: item.caption,
            postType: 'reel',
            mediaUrls,
            mediaTypes: 'video',
            mediaPublicIds: item.shortCode,
            mediaResourceTypes: optimized.resourceType,
            status: 'published',
            visibility: 'public',
            authorId: u.id,
            isSimulation: true,
            tolees: defaultTolee ? { create: [{ toleeId: defaultTolee.id }] } : undefined
          },
          select: { id: true }
        });

        accountPublished++;
        totalPublished++;
        logs.push(`Published [${acc.preferredCategory}] reel for @${u.username} -> ${created.id}`);
      }
    }

    logs.push(`Apify Instagram batch complete. Successfully posted ${totalPublished} compressed Reels.`);
    return { success: true, count: totalPublished, logs };
  } catch (err: any) {
    logs.push(`[Fatal Error] publishInstagramReelsBatch failed: ${err.message}`);
    return { success: false, count: 0, logs };
  }
}
