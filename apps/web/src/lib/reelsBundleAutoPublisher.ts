import { prisma } from '@/lib/prisma';
import { v2 as cloudinary } from 'cloudinary';
import { getAllCloudinaryAccounts } from '@/lib/cloudinary-fallback';
import { probeGoogleDriveVideo } from '@/lib/videoValidationService';

export interface SourceIndexPage {
  id: string;
  name: string;
  url: string;
  provider: 'bio_link' | 'linktree';
  description: string;
}

export interface DiscoveredBundle {
  sourceIndexUrl: string;
  bundleUrl: string;
  folderId: string;
  name: string;
  category: string;
  provider: string;
}

export interface CentralReelItem {
  fileId: string;
  title: string;
  folder: string;
  category: string;
  sourceIndex: string;
  bundleUrl: string;
  videoUrl: string;
  posterUrl: string;
}

export interface BundleReelItem extends CentralReelItem {}

/**
 * 1. OFFICIAL REELS BUNDLE SOURCE INDEX PAGES
 */
export const SOURCE_INDEXES: SourceIndexPage[] = [
  {
    id: 'linktree_dollarkit',
    name: 'DollarKit Movie & Viral Reels Hub',
    url: 'https://linktr.ee/dollarkit',
    provider: 'linktree',
    description: 'Realistic movie clips, cinema shorts, gym fitness, cricket, satisfying, and emotional video bundles'
  },
  {
    id: 'linktree_reelsbundle',
    name: 'Reels Bundle & Movie Collection',
    url: 'https://linktr.ee/reelsbundle',
    provider: 'linktree',
    description: 'Movie explanations, cinema clips, and viral realistic shorts'
  }
];

/**
 * Pre-indexed verified realistic movie clips & shorts bundles
 * Prioritizing real movies, cinema scenes, sports, gym motivation, and emotional clips.
 */
export const KNOWN_SOURCE_BUNDLES: DiscoveredBundle[] = [
  // 1. Realistic Movie Explained & Cinema Shorts (loktimes369 -> suman_kumar)
  {
    sourceIndexUrl: 'https://linktr.ee/dollarkit',
    bundleUrl: 'https://drive.google.com/drive/folders/1dVjqB7m_IKHIZ2-PN8PmNiXhC4jRVFbU',
    folderId: '1dVjqB7m_IKHIZ2-PN8PmNiXhC4jRVFbU',
    name: '500+ Movie Explained Shorts (Hindi/English)',
    category: 'movies',
    provider: 'google_drive'
  },
  {
    sourceIndexUrl: 'https://linktr.ee/dollarkit',
    bundleUrl: 'https://drive.google.com/drive/folders/1mOTYdoy7KXvd-rqh7tJwtEL08v5ibt8j',
    folderId: '1mOTYdoy7KXvd-rqh7tJwtEL08v5ibt8j',
    name: '250+ Movie Explained Shorts 1',
    category: 'movies',
    provider: 'google_drive'
  },
  {
    sourceIndexUrl: 'https://linktr.ee/dollarkit',
    bundleUrl: 'https://drive.google.com/drive/folders/15qei5cdB_Z0UAMNPj9_2uPmSzg8kh8cW',
    folderId: '15qei5cdB_Z0UAMNPj9_2uPmSzg8kh8cW',
    name: 'Viral Cinema & Thriller Clips',
    category: 'movies',
    provider: 'google_drive'
  },

  // 2. Real Indian Cricket Match Moments & Highlights (adsvidia369 -> adsvia)
  {
    sourceIndexUrl: 'https://linktr.ee/dollarkit',
    bundleUrl: 'https://drive.google.com/drive/folders/19ZOdWVrqXqH3G_RGIVDKIQ_THtAv3zao',
    folderId: '19ZOdWVrqXqH3G_RGIVDKIQ_THtAv3zao',
    name: '500+ Indian Cricket Match Moments',
    category: 'cricket',
    provider: 'google_drive'
  },
  {
    sourceIndexUrl: 'https://linktr.ee/dollarkit',
    bundleUrl: 'https://drive.google.com/drive/folders/1E5T979omkCYH36T-KapZeKxQoNPX8M1N',
    folderId: '1E5T979omkCYH36T-KapZeKxQoNPX8M1N',
    name: 'Cricket Viral Moments & Highlights',
    category: 'cricket',
    provider: 'google_drive'
  },

  // 3. Satisfying & Art Real World Reels (vadapavwaledada -> vsdapav)
  {
    sourceIndexUrl: 'https://linktr.ee/dollarkit',
    bundleUrl: 'https://drive.google.com/drive/folders/1jzhyjsiKPRWJSZZSsasz4qq8Kq9qapV5',
    folderId: '1jzhyjsiKPRWJSZZSsasz4qq8Kq9qapV5',
    name: '1200+ Satisfying Real World Reels',
    category: 'satisfying',
    provider: 'google_drive'
  },
  {
    sourceIndexUrl: 'https://linktr.ee/dollarkit',
    bundleUrl: 'https://drive.google.com/drive/folders/1HI2Q3zmom9MkblsgdgT-9sjjtFp5jDY3',
    folderId: '1HI2Q3zmom9MkblsgdgT-9sjjtFp5jDY3',
    name: '700+ Art & Craft Creations',
    category: 'art',
    provider: 'google_drive'
  },

  // 4. Business, Trading & Space Reels (updatesontimes -> updatesontimes)
  {
    sourceIndexUrl: 'https://linktr.ee/dollarkit',
    bundleUrl: 'https://drive.google.com/drive/folders/1U-hv1MG7Uh_ZXMcqsC48EXLSMkkcU2qU',
    folderId: '1U-hv1MG7Uh_ZXMcqsC48EXLSMkkcU2qU',
    name: 'Trading Tips & Market Analysis',
    category: 'business',
    provider: 'google_drive'
  },
  {
    sourceIndexUrl: 'https://linktr.ee/dollarkit',
    bundleUrl: 'https://drive.google.com/drive/folders/19OihxyPDGIludrkNUL-G35tqdY_607tM',
    folderId: '19OihxyPDGIludrkNUL-G35tqdY_607tM',
    name: 'Business Tips Hindi & Success Rules',
    category: 'business',
    provider: 'google_drive'
  },
  {
    sourceIndexUrl: 'https://linktr.ee/dollarkit',
    bundleUrl: 'https://drive.google.com/drive/folders/1ebHNOPHZcMWe1KBetMVFc0YqzXjtHAbh',
    folderId: '1ebHNOPHZcMWe1KBetMVFc0YqzXjtHAbh',
    name: '1000+ Universe & Astronomy Reels',
    category: 'space',
    provider: 'google_drive'
  },
  {
    sourceIndexUrl: 'https://linktr.ee/dollarkit',
    bundleUrl: 'https://drive.google.com/drive/folders/193sV7W9KGkZPVkVbs4rjFmHEu5Is8qZV',
    folderId: '193sV7W9KGkZPVkVbs4rjFmHEu5Is8qZV',
    name: 'Stock Market & Financial Wisdom',
    category: 'business',
    provider: 'google_drive'
  },

  // 5. Gym, Fitness, Aesthetic Lifestyle & Devotion (rinkugupta90282 -> rinku_sharma)
  {
    sourceIndexUrl: 'https://linktr.ee/dollarkit',
    bundleUrl: 'https://drive.google.com/drive/folders/1ABWJ5HhhYWD5b-Ijd46MJzX6jkl8Up74',
    folderId: '1ABWJ5HhhYWD5b-Ijd46MJzX6jkl8Up74',
    name: '2800+ GYM & Fitness Motivation',
    category: 'fitness',
    provider: 'google_drive'
  },
  {
    sourceIndexUrl: 'https://linktr.ee/dollarkit',
    bundleUrl: 'https://drive.google.com/drive/folders/1jesQ7V_duScTQ9W02bCPsvc8ffXSabxP',
    folderId: '1jesQ7V_duScTQ9W02bCPsvc8ffXSabxP',
    name: '2200+ Gym & Fitness Clips',
    category: 'fitness',
    provider: 'google_drive'
  },
  {
    sourceIndexUrl: 'https://linktr.ee/dollarkit',
    bundleUrl: 'https://drive.google.com/drive/folders/1abXzzLDuRm_WGrwGz-Zh5O798-JKvJAd',
    folderId: '1abXzzLDuRm_WGrwGz-Zh5O798-JKvJAd',
    name: 'Aesthetic Music Shorts & Lifestyle',
    category: 'lifestyle',
    provider: 'google_drive'
  },
  {
    sourceIndexUrl: 'https://linktr.ee/dollarkit',
    bundleUrl: 'https://drive.google.com/drive/folders/191Oh9QVYDCXKX0yIoy7_mGV7-D6BT9Jy',
    folderId: '191Oh9QVYDCXKX0yIoy7_mGV7-D6BT9Jy',
    name: '1000+ Emotional Real Life Shorts',
    category: 'emotional',
    provider: 'google_drive'
  },
  {
    sourceIndexUrl: 'https://linktr.ee/dollarkit',
    bundleUrl: 'https://drive.google.com/drive/folders/1S7pNvAiVhy6eBkQQQYHOxE5uBa94EwHn',
    folderId: '1S7pNvAiVhy6eBkQQQYHOxE5uBa94EwHn',
    name: 'Sanatan & Krishna Devotional Shorts',
    category: 'devotion',
    provider: 'google_drive'
  },
  {
    sourceIndexUrl: 'https://linktr.ee/dollarkit',
    bundleUrl: 'https://drive.google.com/drive/folders/1XZ00wKCxPruEpTyDmRxtLzP3GxPG3N1W',
    folderId: '1XZ00wKCxPruEpTyDmRxtLzP3GxPG3N1W',
    name: '1400+ Hindi Motivational (Real Speeches)',
    category: 'motivation',
    provider: 'google_drive'
  }
];

/**
 * 5 Predefined Automated Tolee Accounts with Distinct Thematic Categories
 * Each posts ~10 Reels per day = ~50 Reels/day across the 5 accounts.
 */
export const POSTING_ACCOUNTS = [
  {
    email: 'loktimes369@gmail.com',
    username: 'suman_kumar',
    name: 'Suman Kumar',
    preferredCategory: 'movies', // Movie explained, cinema scenes
    fallbackCategory: 'emotional'
  },
  {
    email: 'adsvidia369@gmail.com',
    username: 'adsvia',
    name: 'ads vidia',
    preferredCategory: 'cricket', // Cricket matches, sports & viral cinema
    fallbackCategory: 'movies'
  },
  {
    email: 'vadapavwaledada@gmail.com',
    username: 'vsdapav',
    name: 'vadapav wale dada',
    preferredCategory: 'satisfying', // Satisfying clips, art & crafts
    fallbackCategory: 'art'
  },
  {
    email: 'updatesontimes@gmail.com',
    username: 'updatesontimes',
    name: 'updateson times',
    preferredCategory: 'business', // Business tips, trading, space & universe
    fallbackCategory: 'space'
  },
  {
    email: 'rinkugupta90282@gmail.com',
    username: 'rinku_sharma',
    name: 'Rinku Sharma',
    preferredCategory: 'fitness', // Gym workout, aesthetic lifestyle, devotion
    fallbackCategory: 'lifestyle'
  }
];

// In-memory catalog cache with 2-hour TTL
let cachedCatalog: CentralReelItem[] | null = null;
let lastCatalogFetchTime = 0;
const CATALOG_CACHE_TTL = 2 * 60 * 60 * 1000;

/**
 * STEP 1 & 2: DISCOVER BUNDLE LINKS FROM BOTH SOURCE PAGES
 */
export async function discoverBundleSources(): Promise<DiscoveredBundle[]> {
  const discoveredMap = new Map<string, DiscoveredBundle>();

  // 1. Seed with known baseline bundles
  for (const bundle of KNOWN_SOURCE_BUNDLES) {
    discoveredMap.set(bundle.folderId, bundle);
  }

  // 2. Scan linktr.ee/dollarkit for newly added folders
  try {
    const res = await fetch('https://linktr.ee/dollarkit', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(8000)
    });

    if (res.ok) {
      const html = await res.text();
      const folderMatches = html.match(/https?:\/\/drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/gi) || [];
      for (const rawUrl of folderMatches) {
        const idMatch = rawUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
        if (idMatch && idMatch[1]) {
          const folderId = idMatch[1];
          if (!discoveredMap.has(folderId)) {
            discoveredMap.set(folderId, {
              sourceIndexUrl: 'https://linktr.ee/dollarkit',
              bundleUrl: `https://drive.google.com/drive/folders/${folderId}`,
              folderId,
              name: `DollarKit Bundle ${folderId.slice(0, 6)}`,
              category: 'movies',
              provider: 'google_drive'
            });
          }
        }
      }
    }
  } catch (err: any) {
    console.warn('[BundleDiscovery] Failed to refresh DollarKit source index:', err?.message || err);
  }

  // 3. Scan linktr.ee/reelsbundle as secondary source
  try {
    const res = await fetch('https://linktr.ee/reelsbundle', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(6000)
    });

    if (res.ok) {
      const html = await res.text();
      const driveFolderMatches = html.match(/https?:\/\/drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/gi) || [];
      for (const rawUrl of driveFolderMatches) {
        const idMatch = rawUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
        if (idMatch && idMatch[1]) {
          const folderId = idMatch[1];
          if (!discoveredMap.has(folderId)) {
            discoveredMap.set(folderId, {
              sourceIndexUrl: 'https://linktr.ee/reelsbundle',
              bundleUrl: `https://drive.google.com/drive/folders/${folderId}`,
              folderId,
              name: `ReelsBundle Discovered ${folderId.slice(0, 6)}`,
              category: 'movies',
              provider: 'google_drive'
            });
          }
        }
      }
    }
  } catch (err: any) {
    console.warn('[BundleDiscovery] ReelsBundle secondary index unavailable; utilizing cached catalog.');
  }

  return Array.from(discoveredMap.values());
}

/**
 * STEP 3, 4, 6: BUILD CENTRAL REEL SOURCE CATALOG WITH ROUND-ROBIN FOLDER INTERLEAVING
 * Picks 1 video from each Drive bundle in round-robin sequence so that adjacent videos
 * always belong to different Drive folders and different realistic categories.
 */
export async function buildCentralReelCatalog(forceRefresh = false): Promise<CentralReelItem[]> {
  const now = Date.now();
  if (!forceRefresh && cachedCatalog && (now - lastCatalogFetchTime < CATALOG_CACHE_TTL)) {
    return cachedCatalog;
  }

  const bundles = await discoverBundleSources();
  const bundleBuckets = new Map<string, CentralReelItem[]>();

  // Helper to extract videos from a Google Drive folder
  async function scanFolder(bundle: DiscoveredBundle) {
    try {
      const bundleVideos: CentralReelItem[] = [];
      const localSeen = new Set<string>();

      // embeddedfolderview server-renders HTML containing all file IDs and names directly in flip-entry tags
      const res = await fetch(`https://drive.google.com/embeddedfolderview?id=${bundle.folderId}#grid`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: AbortSignal.timeout(14000)
      });
      const html = await res.text();

      // Split by flip-entry for lightning-fast parsing without catastrophic regex backtracking
      const entries = html.split('class="flip-entry"');
      for (let i = 1; i < entries.length; i++) {
        const chunk = entries[i];
        const idMatch = chunk.match(/id="entry-([a-zA-Z0-9_-]+)"/);
        const titleMatch = chunk.match(/class="flip-entry-title">([^<]+)<\/div>/);
        if (!idMatch || !titleMatch) continue;

        const cleanId = idMatch[1];
        const rawTitle = titleMatch[1].trim();

        if (!cleanId || cleanId.length < 20) continue;

        // Skip non-video files (text, zip, pdf, etc.) and non-media names like "Bonuses"
        if (/\.(txt|pdf|docx?|zip|rar|tar|7z|jpe?g|png|webp|exe|json|html?)$/i.test(rawTitle)) continue;
        if (/^bonuses|bonus|readme|instruction|links|guide/i.test(rawTitle)) continue;

        // Skip cartoon & AI generated video indicators explicitly
        if (/ai_|#ai|flux|midjourney|ai generated|ai avatar|avatar|cartoon|2d animation/i.test(rawTitle)) continue;
        if (localSeen.has(cleanId)) continue;
        localSeen.add(cleanId);

        let caption = rawTitle
          .replace(/\.(mp4|mkv|mov|webm).*$/i, '')
          .replace(/Video Shared/gi, '')
          .replace(/[_-]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (!caption.includes('#')) {
          caption += ` #${bundle.category} #reels #viral #tolee`;
        }

        bundleVideos.push({
          fileId: cleanId,
          title: caption,
          folder: bundle.name,
          category: bundle.category,
          sourceIndex: bundle.sourceIndexUrl,
          bundleUrl: bundle.bundleUrl,
          videoUrl: `https://drive.usercontent.google.com/download?id=${cleanId}&export=download`,
          posterUrl: `https://lh3.googleusercontent.com/d/${cleanId}`
        });
      }

      if (bundleVideos.length > 0) {
        bundleBuckets.set(bundle.folderId, bundleVideos);
      }
    } catch (err: any) {
      // Quiet fail per folder to prevent whole scan failure
    }
  }

  // Scan bundles concurrently in batches of 4
  const batchSize = 4;
  for (let i = 0; i < bundles.length; i += batchSize) {
    const chunk = bundles.slice(i, i + batchSize);
    await Promise.all(chunk.map(b => scanFolder(b)));
  }

  // Interleave round-robin across all different Google Drive folders
  // Take 1 video from Folder 1, 1 from Folder 2, 1 from Folder 3...
  const buckets = Array.from(bundleBuckets.values()).filter(list => list.length > 0);
  const interleavedCatalog: CentralReelItem[] = [];
  const globalSeen = new Set<string>();

  let maxLen = 0;
  for (const b of buckets) {
    if (b.length > maxLen) maxLen = b.length;
  }

  for (let idx = 0; idx < maxLen; idx++) {
    for (const b of buckets) {
      if (idx < b.length) {
        const item = b[idx];
        if (!globalSeen.has(item.fileId)) {
          globalSeen.add(item.fileId);
          interleavedCatalog.push(item);
        }
      }
    }
  }

  cachedCatalog = interleavedCatalog;
  lastCatalogFetchTime = Date.now();
  console.log(`[CentralCatalog] Interleaved catalog built with ${cachedCatalog.length} unique videos from ${buckets.length} active bundles.`);

  return cachedCatalog;
}

/**
 * Backward compatibility alias for existing callers
 */
export async function fetchBundleReelsFromSource(): Promise<CentralReelItem[]> {
  return buildCentralReelCatalog();
}

/**
 * STEP 20: Compress & optimize raw video via Cloudinary CDN
 * Converts heavy 30MB-100MB Google Drive video into a fast-loading 720p H.264 stream (~1.5MB - 3MB)
 * with auto-generated poster frame for zero-buffering instant mobile playback.
 */
export async function compressAndOptimizeReelVideo(fileId: string, downloadUrl: string): Promise<{
  videoUrl: string;
  posterUrl: string;
  resourceType: 'cloudinary' | 'google_drive';
}> {
  const accounts = getAllCloudinaryAccounts();

  // Try available Cloudinary accounts (with fallback rotation)
  for (const account of accounts) {
    if (!account.apiKey || !account.apiSecret || !account.cloudName) continue;

    try {
      cloudinary.config({
        cloud_name: account.cloudName,
        api_key: account.apiKey,
        api_secret: account.apiSecret,
      });

      const result = await cloudinary.uploader.upload(downloadUrl, {
        resource_type: 'video',
        folder: 'tolee_reels',
        public_id: `reel_${fileId}`,
        overwrite: false,
        timeout: 25000,
        transformation: [
          { width: 720, crop: 'limit', quality: 'auto:good', video_codec: 'auto' }
        ]
      });

      if (result && result.secure_url) {
        // High-speed CDN streaming URL with responsive adaptive compression
        const optimizedVideo = result.secure_url.replace('/upload/', '/upload/q_auto:good,vc_h264,w_720/');
        const optimizedPoster = result.secure_url.replace(/\.[^/.]+$/, '.jpg');

        return {
          videoUrl: optimizedVideo,
          posterUrl: optimizedPoster,
          resourceType: 'cloudinary'
        };
      }
    } catch (err: any) {
      console.warn(`[Video Compression] Cloudinary account ${account.cloudName} notice:`, err.message || err);
    }
  }

  // Graceful fallback to drive-stream proxy if CDN upload is unavailable
  return {
    videoUrl: `/api/video/drive-stream?id=${fileId}`,
    posterUrl: `https://lh3.googleusercontent.com/d/${fileId}`,
    resourceType: 'google_drive'
  };
}

let isPublishingBatch = false;
let lastBatchRunTime = 0;

/**
 * ⚡ Lazy Self-Healing Auto-Publisher
 * Auto-triggers Google Drive bundle ingest in background when users visit Reels.
 * Throttled to at most once per 20 minutes to keep fresh content continuously streaming.
 */
export function triggerBackgroundReelsPublisherIfNeeded(): void {
  const now = Date.now();
  if (isPublishingBatch || (now - lastBatchRunTime < 20 * 60 * 1000)) {
    return;
  }

  isPublishingBatch = true;
  lastBatchRunTime = now;

  // Background non-blocking execution
  setTimeout(async () => {
    try {
      console.log('[AutoPublisher] Auto-triggering background Reels batch from Google Drive bundles...');
      await publishDailyBundleReelsBatch(5);
    } catch (err: any) {
      console.warn('[AutoPublisher] Background batch execution notice:', err?.message || err);
    } finally {
      isPublishingBatch = false;
    }
  }, 100);
}

/**
 * STEP 7, 8, 9, 10, 11: ROTATE 5 ACCOUNTS & PUBLISH ~10 POSTS PER USER PER DAY
 */
export async function publishDailyBundleReelsBatch(maxLimitPerRun = 5): Promise<{
  success: boolean;
  count: number;
  userStats: Record<string, number>;
  log: string[];
}> {
  const logs: string[] = [];
  logs.push(`[NVIDIA AI Engine] Starting automated multi-account Reels batch at ${new Date().toISOString()}...`);

  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 1. Fetch the 5 verified accounts
    const emails = POSTING_ACCOUNTS.map(a => a.email);
    const dbUsers = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true, email: true, username: true }
    });

    if (dbUsers.length === 0) {
      logs.push("Error: None of the 5 posting accounts found in database.");
      return { success: false, count: 0, userStats: {}, log: logs };
    }

    interface AutoPostingUser {
      id: string;
      email: string;
      username: string;
    }

    const userMap = new Map<string, AutoPostingUser>();
    (dbUsers as any[]).forEach((u: any) => {
      if (u?.email) userMap.set(u.email, u as AutoPostingUser);
    });
    const defaultTolee = await prisma.tolee.findFirst({ select: { id: true } });

    // 2. Check 24-hour quota per account (target: up to 10 reels/user/day)
    const DAILY_USER_CAP = 10;
    const user24hCounts: Record<string, number> = {};

    for (const acc of POSTING_ACCOUNTS) {
      const u = userMap.get(acc.email);
      if (!u) continue;
      const count = await prisma.post.count({
        where: {
          authorId: u.id,
          postType: 'reel',
          createdAt: { gte: oneDayAgo }
        }
      });
      user24hCounts[u.username] = count;
    }

    // Filter accounts that haven't hit their daily cap
    const eligibleAccounts = POSTING_ACCOUNTS.filter(acc => {
      const u = userMap.get(acc.email);
      if (!u) return false;
      return (user24hCounts[u.username] || 0) < DAILY_USER_CAP;
    });

    if (eligibleAccounts.length === 0) {
      logs.push(`All 5 accounts have reached their daily cap of ${DAILY_USER_CAP} reels/day.`);
      return { success: true, count: 0, userStats: user24hCounts, log: logs };
    }

    // 3. Load central source catalog
    const catalog = await buildCentralReelCatalog();
    if (catalog.length === 0) {
      logs.push("Error: Central source catalog is empty.");
      return { success: false, count: 0, userStats: user24hCounts, log: logs };
    }

    // 4. Fetch all recently posted video IDs from DB to prevent duplicates
    const recentPosts = await prisma.post.findMany({
      where: {
        postType: 'reel',
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // 30-day window
      },
      select: { mediaPublicIds: true, mediaUrls: true }
    });

    const usedFileIds = new Set<string>();
    for (const p of recentPosts) {
      if (p.mediaPublicIds) {
        p.mediaPublicIds.split(',').forEach((id: string) => usedFileIds.add(id.trim()));
      }
      if (p.mediaUrls) {
        const match = p.mediaUrls.match(/[?&]id=([a-zA-Z0-9_-]+)/) || p.mediaUrls.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) usedFileIds.add(match[1]);
      }
    }

    logs.push(`Central catalog: ${catalog.length} items. Already used in past 30 days: ${usedFileIds.size} items.`);

    let publishedCount = 0;
    const sessionClaimedIds = new Set<string>();

    // 5. Interleaved Multi-Account Posting:
    // Distribute 1 video per account per round so that subsequent posts alternate across accounts and categories.
    while (publishedCount < maxLimitPerRun && eligibleAccounts.some(acc => {
      const u = userMap.get(acc.email);
      return u && (user24hCounts[u.username] || 0) < DAILY_USER_CAP;
    })) {
      let publishedInThisRound = 0;

      for (const acc of eligibleAccounts) {
        if (publishedCount >= maxLimitPerRun) break;

        const u = userMap.get(acc.email);
        if (!u) continue;

        const currentQuota = user24hCounts[u.username] || 0;
        if (currentQuota >= DAILY_USER_CAP) continue;

        // Select matching videos by preferred category first, then fallback, then any unused interleaved item
        const candidates = catalog.filter(item => 
          !usedFileIds.has(item.fileId) && 
          !sessionClaimedIds.has(item.fileId)
        );

        const categoryCandidates = candidates.filter(item => 
          item.category === acc.preferredCategory || item.category === acc.fallbackCategory
        );

        const chosenVideo = categoryCandidates[0] || candidates[0];

        if (!chosenVideo) {
          logs.push(`No unused video candidates remaining for @${u.username}.`);
          continue;
        }

        // Validate the candidate with Google Drive probe before publishing to guarantee playability!
        const probeResult = await probeGoogleDriveVideo(chosenVideo.fileId);
        if (!probeResult.isValid) {
          logs.push(`Skipping unplayable Drive candidate ${chosenVideo.fileId} (${probeResult.reason || 'probe failed'}).`);
          sessionClaimedIds.add(chosenVideo.fileId);
          usedFileIds.add(chosenVideo.fileId);
          continue;
        }

        // STEP 10: Cross-user duplicate claim
        sessionClaimedIds.add(chosenVideo.fileId);
        usedFileIds.add(chosenVideo.fileId);

        // STEP 20: Compress and optimize raw video before publishing to guarantee instant streaming
        const optimizedMedia = await compressAndOptimizeReelVideo(chosenVideo.fileId, chosenVideo.videoUrl);
        const mediaUrlsCombined = `${optimizedMedia.videoUrl},${optimizedMedia.posterUrl}`;

        // Stagger createdAt slightly so reels appear in the interleaved chronological order
        const postTimestamp = new Date(Date.now() - (maxLimitPerRun - publishedCount) * 60 * 1000);

        const created = await prisma.post.create({
          data: {
            caption: chosenVideo.title,
            postType: 'reel',
            mediaUrls: mediaUrlsCombined,
            mediaTypes: 'video',
            mediaPublicIds: chosenVideo.fileId,
            mediaResourceTypes: optimizedMedia.resourceType,
            status: 'published',
            visibility: 'public',
            authorId: u.id,
            isSimulation: true,
            createdAt: postTimestamp,
            tolees: defaultTolee ? { create: [{ toleeId: defaultTolee.id }] } : undefined,
            sourceValidation: {
              create: {
                sourceType: optimizedMedia.resourceType,
                sourceFileId: chosenVideo.fileId,
                sourceUrl: optimizedMedia.videoUrl,
                validationStatus: 'READY',
                lastValidatedAt: new Date(),
                lastPlaybackSuccessAt: new Date(),
                consecutiveFailureCount: 0,
                publishedAt: postTimestamp,
              }
            }
          },
          select: { id: true }
        });

        publishedCount++;
        publishedInThisRound++;
        user24hCounts[u.username] = (user24hCounts[u.username] || 0) + 1;
        logs.push(`Published [${chosenVideo.category}] "${chosenVideo.title.slice(0, 32)}..." for @${u.username} (Post #${user24hCounts[u.username]}/10 today) -> ${created.id}`);
      }

      if (publishedInThisRound === 0) break;
    }

    logs.push(`Batch complete. Successfully published ${publishedCount} new Reels.`);
    return {
      success: true,
      count: publishedCount,
      userStats: user24hCounts,
      log: logs
    };
  } catch (err: any) {
    logs.push(`[Fatal Error] publishDailyBundleReelsBatch failed: ${err.message}`);
    return { success: false, count: 0, userStats: {}, log: logs };
  }
}
