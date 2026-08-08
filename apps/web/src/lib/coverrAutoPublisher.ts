import { prisma } from '@/lib/prisma';
import { REGISTERED_NEWS_ACCOUNTS } from '@/lib/newsAutoPublisher';

export interface CoverrVideoItem {
  id: string;
  title: string;
  description: string;
  mp4Url: string;
  posterUrl: string;
  category: string;
}

/**
 * Fetch HD stock videos from Coverr.co API by topic query
 */
export async function fetchCoverrVideos(query: string, category: string, limit: number = 5): Promise<CoverrVideoItem[]> {
  const apiKey = process.env.COVERR_API_KEY || "7629199d2c18c260036aa0ea792088f8";
  try {
    const url = `https://api.coverr.co/videos?query=${encodeURIComponent(query)}&api_key=${apiKey}`;
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();

    const hits = data.hits || data.results || [];
    if (Array.isArray(hits) && hits.length > 0) {
      return hits.slice(0, limit).map((v: any) => {
        const mp4Url = `https://cdn.coverr.co/videos/${v.base_filename}/1080p.mp4`;
        const posterUrl = v.poster || v.thumbnail || `https://cdn.coverr.co/videos/${v.base_filename}/thumbnail?width=1280`;

        return {
          id: v.id || v.objectID,
          title: v.title || `${category} Video Spot`,
          description: v.description || `Watch HD video coverage of ${v.title || category} on Tolee.`,
          mp4Url,
          posterUrl,
          category
        };
      }).filter((v: CoverrVideoItem) => v.mp4Url && v.posterUrl);
    }
  } catch (err: any) {
    console.error(`[Coverr API Error]: ${err.message}`);
  }
  return [];
}

/**
 * Publishes native MP4 Video posts from Coverr.co across the 6 registered user accounts
 */
export async function publishCoverrVideosBatch(): Promise<{ success: boolean; count: number; log: string[] }> {
  const logs: string[] = [];
  logs.push("Starting Coverr Stock Video Auto-Publisher batch execution...");

  try {
    const accountQueries = [
      { email: 'adsvidia369@gmail.com', query: 'technology', category: 'Technology & AI' },
      { email: 'loktimes369@gmail.com', query: 'india', category: 'India & National Affairs' },
      { email: 'updatesontimes@gmail.com', query: 'business', category: 'Business & Finance' },
      { email: 'vadapavwaledada@gmail.com', query: 'food', category: 'Food, Lifestyle & Culture' },
      { email: 'rinkugupta90282@gmail.com', query: 'sports', category: 'Sports & Entertainment' },
      { email: 'foodpaass@gmail.com', query: 'finance', category: 'Stock Market & Trading' }
    ];

    const userEmails = REGISTERED_NEWS_ACCOUNTS.map(a => a.email);
    const users = await prisma.user.findMany({
      where: { email: { in: userEmails } },
      select: { id: true, email: true, name: true, username: true }
    });

    const userMap = new Map<string, { id: string; email: string; name: string | null; username: string | null }>(users.map((u: any) => [u.email, u]));
    const defaultTolee = await prisma.tolee.findFirst({ select: { id: true } });

    let publishedCount = 0;

    for (const config of accountQueries) {
      const dbUser = userMap.get(config.email);
      if (!dbUser) continue;

      const videoList = await fetchCoverrVideos(config.query, config.category, 3);
      if (videoList.length === 0) continue;

      let selectedVideo: CoverrVideoItem | null = null;
      for (const v of videoList) {
        const existing = await prisma.post.findFirst({
          where: { mediaUrls: { contains: v.mp4Url } }
        });
        if (!existing) {
          selectedVideo = v;
          break;
        }
      }

      if (!selectedVideo) continue;

      const slugBase = selectedVideo.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 45);
      const slug = `vid-${slugBase}-${Date.now().toString().slice(-4)}`;

      const mediaUrlsCombined = `${selectedVideo.mp4Url},${selectedVideo.posterUrl}`;

      await prisma.post.create({
        data: {
          caption: selectedVideo.title,
          postType: 'news',
          mediaUrls: mediaUrlsCombined,
          mediaTypes: 'video,image',
          status: 'published',
          authorId: dbUser.id,
          tolees: defaultTolee ? { create: [{ toleeId: defaultTolee.id }] } : undefined,
          newsRelation: {
            create: {
              headline: selectedVideo.title,
              slug,
              summary: selectedVideo.description,
              category: selectedVideo.category,
              content: `🎬 **Featured Video Report**: ${selectedVideo.title}\n\n📖 **Video Overview**:\n${selectedVideo.description}\n\nWatch full native HD video directly on Tolee News & Feed stream.`,
              metaDescription: `Watch HD video of ${selectedVideo.title} on Tolee News.`,
              keywords: 'video, coverr, news, media, tolee',
              tags: 'video, reels, media',
              seoScore: 94,
              aeoScore: 90,
              geoScore: 88,
              language: 'English',
              readingTime: 2
            }
          }
        }
      });

      publishedCount++;
      logs.push(`[Coverr Video Post #${publishedCount}] Published HD video "${selectedVideo.title}" under @${dbUser.username}.`);
    }

    logs.push(`Coverr Auto-Publisher completed: ${publishedCount} video posts published.`);
    return { success: true, count: publishedCount, log: logs };
  } catch (err: any) {
    logs.push(`Coverr Auto-Publisher error: ${err.message}`);
    return { success: false, count: 0, log: logs };
  }
}
