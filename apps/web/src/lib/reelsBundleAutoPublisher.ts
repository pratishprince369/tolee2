import { prisma } from '@/lib/prisma';

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
    id: 'bio_link_mdsiraju',
    name: 'REELS KI DUNIYA (4000+ Reels)',
    url: 'https://bio.link/mdsiraju',
    provider: 'bio_link',
    description: '4000+ Reels PRO bundle including AI, God, Sanatani, and Cartoon Shorts'
  },
  {
    id: 'linktree_reelsbundle',
    name: 'Reels Bundle & Shorts Collection',
    url: 'https://linktr.ee/reelsbundle',
    provider: 'linktree',
    description: 'Dynamic index of viral shorts, animations, movies, and motivational bundles'
  }
];

/**
 * Pre-indexed fallback bundles for bio.link/mdsiraju and verified collections
 * Used when Cloudflare WAF challenge (403) protects direct scraping of bio.link.
 */
export const KNOWN_SOURCE_BUNDLES: DiscoveredBundle[] = [
  // bio.link/mdsiraju bundles (AI, Cartoons, Motivation, Entertainment)
  {
    sourceIndexUrl: 'https://bio.link/mdsiraju',
    bundleUrl: 'https://drive.google.com/drive/folders/1OztyF42rnSi_P1F1XdT78JoyBLFr5W7M',
    folderId: '1OztyF42rnSi_P1F1XdT78JoyBLFr5W7M',
    name: '500+ 2D Funny Animation Videos',
    category: 'animation',
    provider: 'google_drive'
  },
  {
    sourceIndexUrl: 'https://bio.link/mdsiraju',
    bundleUrl: 'https://drive.google.com/drive/folders/1ebHNOPHZcMWe1KBetMVFc0YqzXjtHAbh',
    folderId: '1ebHNOPHZcMWe1KBetMVFc0YqzXjtHAbh',
    name: '500+ AI Reels Collection',
    category: 'ai_tech',
    provider: 'google_drive'
  },
  {
    sourceIndexUrl: 'https://bio.link/mdsiraju',
    bundleUrl: 'https://drive.google.com/drive/folders/13DYmOOCGU5yrk3loYHwcwjXsyCTUVwLI',
    folderId: '13DYmOOCGU5yrk3loYHwcwjXsyCTUVwLI',
    name: '150+ Motivational Reels Videos',
    category: 'motivation',
    provider: 'google_drive'
  },
  {
    sourceIndexUrl: 'https://bio.link/mdsiraju',
    bundleUrl: 'https://drive.google.com/drive/folders/1Hyk3ZH2l3_3JQYFvzWiuEuND4_gYg7Pv',
    folderId: '1Hyk3ZH2l3_3JQYFvzWiuEuND4_gYg7Pv',
    name: '200+ Shin Chan & Anime Videos',
    category: 'animation',
    provider: 'google_drive'
  },
  // linktr.ee/reelsbundle collections
  {
    sourceIndexUrl: 'https://linktr.ee/reelsbundle',
    bundleUrl: 'https://drive.google.com/drive/folders/1dHDKZe6HIDnDpX4jXMfow3VEXYxRJgY5',
    folderId: '1dHDKZe6HIDnDpX4jXMfow3VEXYxRJgY5',
    name: 'Cartoon Explained Shorts',
    category: 'animation',
    provider: 'google_drive'
  },
  {
    sourceIndexUrl: 'https://linktr.ee/reelsbundle',
    bundleUrl: 'https://drive.google.com/drive/folders/1mOTYdoy7KXvd-rqh7tJwtEL08v5ibt8j',
    folderId: '1mOTYdoy7KXvd-rqh7tJwtEL08v5ibt8j',
    name: 'Movie Explained Shorts 1',
    category: 'movies',
    provider: 'google_drive'
  },
  {
    sourceIndexUrl: 'https://linktr.ee/reelsbundle',
    bundleUrl: 'https://drive.google.com/drive/folders/1dVjqB7m_IKHIZ2-PN8PmNiXhC4jRVFbU',
    folderId: '1dVjqB7m_IKHIZ2-PN8PmNiXhC4jRVFbU',
    name: '500+ Movie Explained Shorts',
    category: 'movies',
    provider: 'google_drive'
  },
  {
    sourceIndexUrl: 'https://linktr.ee/reelsbundle',
    bundleUrl: 'https://drive.google.com/drive/folders/1-20KuM_Q8N41AZ3urB9OIsE4RwEqg33o',
    folderId: '1-20KuM_Q8N41AZ3urB9OIsE4RwEqg33o',
    name: 'Viral Shorts Vault A',
    category: 'viral',
    provider: 'google_drive'
  },
  {
    sourceIndexUrl: 'https://linktr.ee/reelsbundle',
    bundleUrl: 'https://drive.google.com/drive/folders/1abXzzLDuRm_WGrwGz-Zh5O798-JKvJAd',
    folderId: '1abXzzLDuRm_WGrwGz-Zh5O798-JKvJAd',
    name: 'Facts & Wonders Shorts',
    category: 'motivation',
    provider: 'google_drive'
  },
  {
    sourceIndexUrl: 'https://linktr.ee/reelsbundle',
    bundleUrl: 'https://drive.google.com/drive/folders/15qei5cdB_Z0UAMNPj9_2uPmSzg8kh8cW',
    folderId: '15qei5cdB_Z0UAMNPj9_2uPmSzg8kh8cW',
    name: 'Viral Cinema Clips',
    category: 'movies',
    provider: 'google_drive'
  },
  {
    sourceIndexUrl: 'https://linktr.ee/reelsbundle',
    bundleUrl: 'https://drive.google.com/drive/folders/1FNBnfB99cmeAujzgTyIcAChKoUaZO-y6',
    folderId: '1FNBnfB99cmeAujzgTyIcAChKoUaZO-y6',
    name: 'Funny & Comedy Shorts',
    category: 'comedy',
    provider: 'google_drive'
  },
  {
    sourceIndexUrl: 'https://linktr.ee/reelsbundle',
    bundleUrl: 'https://drive.google.com/drive/folders/1C2es7ujnrFvas4_b8eYJP6DmAkpwAxMj',
    folderId: '1C2es7ujnrFvas4_b8eYJP6DmAkpwAxMj',
    name: '200+ Viral Reel Videos',
    category: 'viral',
    provider: 'google_drive'
  },
  {
    sourceIndexUrl: 'https://linktr.ee/reelsbundle',
    bundleUrl: 'https://drive.google.com/drive/folders/1h5q_Bd1OoD4dAeZVtNUoqRzkq-V9DTke',
    folderId: '1h5q_Bd1OoD4dAeZVtNUoqRzkq-V9DTke',
    name: '300+ Viral Reel Videos',
    category: 'viral',
    provider: 'google_drive'
  },
  {
    sourceIndexUrl: 'https://linktr.ee/reelsbundle',
    bundleUrl: 'https://drive.google.com/drive/folders/1maID_DgrGhrXMvCs7d7JtGPorOmMfbKH',
    folderId: '1maID_DgrGhrXMvCs7d7JtGPorOmMfbKH',
    name: 'Lifestyle & Travel Shorts',
    category: 'lifestyle',
    provider: 'google_drive'
  }
];

/**
 * 5 Predefined Automated Tolee Accounts with Distinct Thematic Categories
 * Each posts ~10 Reels per day = ~50 Reels/day across the 5 accounts.
 */
export const POSTING_ACCOUNTS = [
  {
    email: 'vadapavwaledada@gmail.com',
    username: 'vsdapav',
    name: 'vadapav wale dada',
    preferredCategory: 'animation', // Cartoons, Shin Chan, 2D animations
    fallbackCategory: 'comedy'
  },
  {
    email: 'loktimes369@gmail.com',
    username: 'suman_kumar',
    name: 'Suman Kumar',
    preferredCategory: 'movies', // Movie explained, cinema stories, drama
    fallbackCategory: 'viral'
  },
  {
    email: 'adsvidia369@gmail.com',
    username: 'adsvia',
    name: 'ads vidia',
    preferredCategory: 'ai_tech', // AI reels, tech trends, futuristic clips
    fallbackCategory: 'viral'
  },
  {
    email: 'updatesontimes@gmail.com',
    username: 'updatesontimes',
    name: 'updateson times',
    preferredCategory: 'motivation', // Motivational, life lessons, facts & news
    fallbackCategory: 'viral'
  },
  {
    email: 'rinkugupta90282@gmail.com',
    username: 'rinku_sharma',
    name: 'Rinku Sharma',
    preferredCategory: 'lifestyle', // Lifestyle, travel, comedy, entertainment
    fallbackCategory: 'comedy'
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

  // 2. Scan linktr.ee/reelsbundle for newly added folders
  try {
    const res = await fetch('https://linktr.ee/reelsbundle', {
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
              sourceIndexUrl: 'https://linktr.ee/reelsbundle',
              bundleUrl: `https://drive.google.com/drive/folders/${folderId}`,
              folderId,
              name: `Discovered Bundle ${folderId.slice(0, 6)}`,
              category: 'viral',
              provider: 'google_drive'
            });
          }
        }
      }
    }
  } catch (err: any) {
    console.warn('[BundleDiscovery] Failed to refresh Linktree source index:', err?.message || err);
  }

  // 3. Scan bio.link/mdsiraju (with graceful fallback on Cloudflare WAF)
  try {
    const res = await fetch('https://bio.link/mdsiraju', {
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
              sourceIndexUrl: 'https://bio.link/mdsiraju',
              bundleUrl: `https://drive.google.com/drive/folders/${folderId}`,
              folderId,
              name: `BioLink Discovered ${folderId.slice(0, 6)}`,
              category: 'ai_tech',
              provider: 'google_drive'
            });
          }
        }
      }
    }
  } catch (err: any) {
    console.warn('[BundleDiscovery] Bio.link source index protected or unavailable; utilizing cached catalog.');
  }

  return Array.from(discoveredMap.values());
}

/**
 * STEP 3, 4, 6: BUILD CENTRAL REEL SOURCE CATALOG WITH DEDUPLICATION
 */
export async function buildCentralReelCatalog(forceRefresh = false): Promise<CentralReelItem[]> {
  const now = Date.now();
  if (!forceRefresh && cachedCatalog && (now - lastCatalogFetchTime < CATALOG_CACHE_TTL)) {
    return cachedCatalog;
  }

  const bundles = await discoverBundleSources();
  const centralMap = new Map<string, CentralReelItem>();

  // Helper to extract videos from a Google Drive folder
  async function scanFolder(bundle: DiscoveredBundle) {
    try {
      const res = await fetch(`https://drive.google.com/drive/folders/${bundle.folderId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: AbortSignal.timeout(7000)
      });
      const html = await res.text();
      const regex = /aria-label="([^"]+?\.(?:mp4|MP4|mkv|mov|webm))[^"]*"[^>]*?ssk='[^':]+:[^':]+:([^']+)'/gi;
      let m: RegExpExecArray | null;

      while ((m = regex.exec(html)) !== null) {
        const rawTitle = m[1];
        const cleanId = m[2].replace(/-\d+-\d+$/, '');

        if (!cleanId || cleanId.length < 20) continue;

        // STEP 4: Unique canonical identification (deduplicate across all folders)
        if (centralMap.has(cleanId)) continue;

        let caption = rawTitle
          .replace(/\.(mp4|mkv|mov|webm).*$/i, '')
          .replace(/Video Shared/gi, '')
          .replace(/[_-]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (!caption.includes('#')) {
          caption += ` #${bundle.category} #reels #viral #tolee`;
        }

        centralMap.set(cleanId, {
          fileId: cleanId,
          title: caption,
          folder: bundle.name,
          category: bundle.category,
          sourceIndex: bundle.sourceIndexUrl,
          bundleUrl: bundle.bundleUrl,
          // STEP 20: Direct streaming delivery URL bypassing serverless proxy
          videoUrl: `https://drive.usercontent.google.com/download?id=${cleanId}&export=download`,
          posterUrl: `https://lh3.googleusercontent.com/d/${cleanId}`
        });
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

  cachedCatalog = Array.from(centralMap.values());
  lastCatalogFetchTime = Date.now();
  console.log(`[CentralCatalog] Catalog built successfully with ${cachedCatalog.length} unique videos from ${bundles.length} bundles.`);

  return cachedCatalog;
}

/**
 * Backward compatibility alias for existing callers
 */
export async function fetchBundleReelsFromSource(): Promise<CentralReelItem[]> {
  return buildCentralReelCatalog();
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

    // 5. Publish videos in rotation across eligible accounts
    for (const acc of eligibleAccounts) {
      if (publishedCount >= maxLimitPerRun) break;

      const u = userMap.get(acc.email);
      if (!u) continue;

      const currentQuota = user24hCounts[u.username] || 0;
      if (currentQuota >= DAILY_USER_CAP) continue;

      // Select matching videos by preferred category first, then fallback
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

      // STEP 10: Cross-user duplicate claim
      sessionClaimedIds.add(chosenVideo.fileId);
      usedFileIds.add(chosenVideo.fileId);

      const mediaUrlsCombined = `${chosenVideo.videoUrl},${chosenVideo.posterUrl}`;

      const created = await prisma.post.create({
        data: {
          caption: chosenVideo.title,
          postType: 'reel',
          mediaUrls: mediaUrlsCombined,
          mediaTypes: 'video',
          mediaPublicIds: chosenVideo.fileId,
          mediaResourceTypes: 'google_drive',
          status: 'published',
          visibility: 'public',
          authorId: u.id,
          isSimulation: true,
          tolees: defaultTolee ? { create: [{ toleeId: defaultTolee.id }] } : undefined
        },
        select: { id: true }
      });

      publishedCount++;
      user24hCounts[u.username] = (user24hCounts[u.username] || 0) + 1;
      logs.push(`Published [${chosenVideo.category}] "${chosenVideo.title.slice(0, 32)}..." for @${u.username} (Post #${user24hCounts[u.username]}/10 today) -> ${created.id}`);
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
