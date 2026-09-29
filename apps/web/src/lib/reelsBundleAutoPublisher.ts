import { prisma } from '@/lib/prisma';

export interface BundleReelItem {
  fileId: string;
  title: string;
  folder: string;
  videoUrl: string;
  posterUrl: string;
}

const BUNDLE_FOLDERS = [
  // Original Reel bundles
  { name: 'Cartoon Explained Shorts', url: 'https://drive.google.com/drive/folders/1dHDKZe6HIDnDpX4jXMfow3VEXYxRJgY5' },
  { name: 'Movie Explained Shorts 1', url: 'https://drive.google.com/drive/folders/1mOTYdoy7KXvd-rqh7tJwtEL08v5ibt8j' },
  { name: '500+ Movie Explained Shorts', url: 'https://drive.google.com/drive/folders/1dVjqB7m_IKHIZ2-PN8PmNiXhC4jRVFbU' },
  // Google Sites Reel & Shorts Bundle (https://sites.google.com/view/reel-shorts-bundle/home?pli=1&authuser=0)
  { name: '500+ 2D Funny Animation Videos', url: 'https://drive.google.com/drive/folders/1OztyF42rnSi_P1F1XdT78JoyBLFr5W7M' },
  { name: '200+ Viral Reel Videos', url: 'https://drive.google.com/drive/folders/1C2es7ujnrFvas4_b8eYJP6DmAkpwAxMj' },
  { name: '200+ Shin Chan Videos', url: 'https://drive.google.com/drive/folders/1Hyk3ZH2l3_3JQYFvzWiuEuND4_gYg7Pv' },
  { name: '150+ Motivational Reels Videos', url: 'https://drive.google.com/drive/folders/13DYmOOCGU5yrk3loYHwcwjXsyCTUVwLI' },
  { name: '300+ Viral Reel Videos', url: 'https://drive.google.com/drive/folders/1h5q_Bd1OoD4dAeZVtNUoqRzkq-V9DTke' },
  { name: 'Other Reel Videos', url: 'https://drive.google.com/drive/folders/1IPE8zRVYcm-l4tHN3A3gAzGJ-GQFffc2' }
];

export const POSTING_ACCOUNTS = [
  { email: 'vadapavwaledada@gmail.com', username: 'vsdapav', name: 'vadapav wale dada' },
  { email: 'loktimes369@gmail.com', username: 'suman_kumar', name: 'Suman Kumar' },
  { email: 'adsvidia369@gmail.com', username: 'adsvia', name: 'ads vidia' },
  { email: 'updatesontimes@gmail.com', username: 'updatesontimes', name: 'updateson times' },
  { email: 'rinkugupta90282@gmail.com', username: 'rinku_sharma', name: 'Rinku Sharma' }
];

/**
 * Extracts available video files from Google Drive folders linked in https://linktr.ee/reelsbundle
 */
export async function fetchBundleReelsFromSource(): Promise<BundleReelItem[]> {
  const allVideos: BundleReelItem[] = [];
  const seenIds = new Set<string>();

  for (const folder of BUNDLE_FOLDERS) {
    try {
      const res = await fetch(folder.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(6000)
      });
      const html = await res.text();

      const regex = /aria-label="([^"]+?\.(?:mp4|MP4|mkv|mov|webm))[^"]*"[^>]*?ssk='[^':]+:[^':]+:([^']+)'/gi;
      let m: RegExpExecArray | null;

      while ((m = regex.exec(html)) !== null) {
        const rawTitle = m[1];
        const cleanId = m[2].replace(/-\d+-\d+$/, '');

        if (!cleanId || cleanId.length < 20 || seenIds.has(cleanId)) continue;
        seenIds.add(cleanId);

        let caption = rawTitle
          .replace(/\.(mp4|mkv|mov|webm).*$/i, '')
          .replace(/Video Shared/gi, '')
          .replace(/[_-]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (!caption.includes('#')) {
          caption += ' #reels #viral #trending #tolee';
        }

        allVideos.push({
          fileId: cleanId,
          title: caption,
          folder: folder.name,
          videoUrl: `https://drive.usercontent.google.com/download?id=${cleanId}&export=download`,
          posterUrl: `https://lh3.googleusercontent.com/d/${cleanId}`
        });
      }
    } catch (err: any) {
      console.warn(`[ReelsBundle] Failed to parse folder ${folder.name}:`, err.message);
    }
  }

  return allVideos;
}

/**
 * Publishes daily reels from https://linktr.ee/reelsbundle rotated across the 5 confirmed accounts
 */
export async function publishDailyBundleReelsBatch(maxLimit: number = 5): Promise<{ success: boolean; count: number; log: string[] }> {
  const logs: string[] = [];
  logs.push("Starting Reels Bundle daily publisher batch...");

  try {
    // 🛡️ Daily quota check: maximum 10 bundle reels per 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentBundleReelsCount = await prisma.post.count({
      where: {
        postType: 'reel',
        mediaUrls: { contains: 'drive.usercontent.google.com' },
        createdAt: { gte: oneDayAgo }
      }
    });

    const DAILY_CAP = 10;
    if (recentBundleReelsCount >= DAILY_CAP) {
      logs.push(`Daily quota reached: ${recentBundleReelsCount}/${DAILY_CAP} bundle reels already published in last 24h.`);
      return { success: true, count: 0, log: logs };
    }

    const toPublishCount = Math.min(maxLimit, DAILY_CAP - recentBundleReelsCount);

    // Fetch verified account IDs from DB
    const emails = POSTING_ACCOUNTS.map(a => a.email);
    const users = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true, email: true, username: true }
    });

    if (users.length === 0) {
      logs.push("Error: None of the 5 posting accounts found in database.");
      return { success: false, count: 0, log: logs };
    }

    const userMap = new Map<string, typeof users[0]>(users.map((u: any) => [u.email, u]));
    const defaultTolee = await prisma.tolee.findFirst({ select: { id: true } });

    // Scrape candidate videos from source bundle
    const candidateVideos = await fetchBundleReelsFromSource();
    logs.push(`Fetched ${candidateVideos.length} candidate videos from bundle source.`);

    let publishedCount = 0;
    let accountRotationIdx = recentBundleReelsCount;

    for (const video of candidateVideos) {
      if (publishedCount >= toPublishCount) break;

      // Check if already published
      const existing = await prisma.post.findFirst({
        where: {
          mediaUrls: { contains: video.fileId }
        },
        select: { id: true }
      });

      if (existing) continue;

      const currentAccountConfig = POSTING_ACCOUNTS[accountRotationIdx % POSTING_ACCOUNTS.length];
      accountRotationIdx++;

      const dbUser = userMap.get(currentAccountConfig.email);
      if (!dbUser) continue;

      const mediaUrlsCombined = `${video.videoUrl},${video.posterUrl}`;

      await prisma.post.create({
        data: {
          caption: video.title,
          postType: 'reel',
          mediaUrls: mediaUrlsCombined,
          mediaTypes: 'video',
          status: 'published',
          visibility: 'public',
          authorId: dbUser.id,
          isSimulation: false,
          tolees: defaultTolee ? { create: [{ toleeId: defaultTolee.id }] } : undefined
        }
      });

      publishedCount++;
      logs.push(`Published reel: "${video.title.slice(0, 35)}..." by @${dbUser.username}`);
    }

    logs.push(`Successfully published ${publishedCount} new reels.`);
    return { success: true, count: publishedCount, log: logs };
  } catch (err: any) {
    logs.push(`[ReelsBundle Error]: ${err.message}`);
    return { success: false, count: 0, log: logs };
  }
}
