import { prisma } from '@/lib/prisma';
import { REGISTERED_NEWS_ACCOUNTS } from '@/lib/newsAutoPublisher';

export interface YouTubeVideoItem {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  watchUrl: string;
  embedUrl: string;
  language: 'hi' | 'mr' | 'en';
}

/**
 * Clean YouTube video titles by removing hashtags and promotional clutter
 */
function cleanYouTubeTitle(title: string): string {
  if (!title) return '';
  return title
    .replace(/#\w+/g, '') // Remove hashtags
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fetch top YouTube videos for a specific query & language using YouTube Data API v3
 */
async function fetchYouTubeVideos(query: string, lang: 'hi' | 'mr' | 'en', maxResults: number = 10): Promise<YouTubeVideoItem[]> {
  const apiKey = process.env.YOUTUBE_API_KEY || "AIzaSyAQGEjKb5EkJjZSSh4I4X5x2zhESnhSzH0";
  const regionCode = 'IN';

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&regionCode=${regionCode}&maxResults=${maxResults}&key=${apiKey}`;
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();

    if (data.items && Array.isArray(data.items) && data.items.length > 0) {
      return data.items.map((item: any) => {
        const videoId = item.id?.videoId;
        const snippet = item.snippet || {};
        return {
          videoId,
          title: cleanYouTubeTitle(snippet.title || ''),
          description: snippet.description || '',
          thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          channelTitle: snippet.channelTitle || 'YouTube News',
          watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
          embedUrl: `https://www.youtube.com/embed/${videoId}`,
          language: lang
        };
      }).filter((v: YouTubeVideoItem) => v.videoId && v.title && v.title.length > 5);
    }
  } catch (error: any) {
    console.error(`YouTube API fetch error for ${lang} (${query}):`, error.message);
  }
  return [];
}

/**
 * Publishes YouTube Video News Posts across the 5 registered user accounts
 */
export async function publishYouTubeVideosBatch(withDelay: boolean = false): Promise<{ success: boolean; count: number; log: string[] }> {
  const logs: string[] = [];
  logs.push("Starting YouTube Video News Auto-Publisher batch execution...");

  try {
    // Expanded Topic Categories: NASA, Discovery, Cartoons, Comedy, Education, Tech, Food, Sports, Finance
    const topicPools: Record<string, string[]> = {
      'adsvidia369@gmail.com': [
        'NASA space universe rocket launch discovery science 4k',
        'latest tech unboxing gadgets review AI 2026',
        'science educational experiments documentary 4k'
      ],
      'loktimes369@gmail.com': [
        'Discovery channel wild nature documentary 4k hd',
        'मराठी बातम्या महाराष्ट्र ट्रेंडिंग ट्रॅव्हल व्लॉग',
        '3d animated cartoon kids funny video'
      ],
      'updatesontimes@gmail.com': [
        'india business market tech news podcast today',
        'space documentary universe exploration NASA 4k',
        'funny Indian comedy videos skits pranks'
      ],
      'vadapavwaledada@gmail.com': [
        'indian street food recipe travel vlog 2026',
        'cute baby funny videos nursery rhymes cartoon animation',
        'standup comedy clips funny humor videos'
      ],
      'rinkugupta90282@gmail.com': [
        'cricket match top highlights sports news gaming',
        '3d cartoon animated kids fun stories',
        'Discovery channel animal wildlife documentary'
      ],
      'foodpaass@gmail.com': [
        'stock market trading sensex nifty crypto strategy',
        'NASA space galaxy rocket technology discovery',
        'best funny comedy video meme clips 2026'
      ]
    };

    const accountQueries = REGISTERED_NEWS_ACCOUNTS.map(acc => {
      const pool = topicPools[acc.email] || ['NASA Discovery science space documentary 4k'];
      const randomQuery = pool[Math.floor(Math.random() * pool.length)];
      return {
        email: acc.email,
        query: randomQuery,
        lang: acc.language
      };
    });

    const userEmails = REGISTERED_NEWS_ACCOUNTS.map(a => a.email);
    const users = await prisma.user.findMany({
      where: { email: { in: userEmails } },
      select: { id: true, email: true, name: true, username: true }
    });

    const userMap = new Map<string, { id: string; email: string; name: string | null; username: string | null }>(users.map((u: any) => [u.email, u]));
    const defaultTolee = await prisma.tolee.findFirst({ select: { id: true } });

    let publishedCount = 0;
    const batchProcessedVideos = new Set<string>();

    for (const config of accountQueries) {
      const dbUser = userMap.get(config.email);
      const accountMeta = REGISTERED_NEWS_ACCOUNTS.find(a => a.email === config.email);

      if (!dbUser || !accountMeta) {
        logs.push(`Skipping YouTube publishing for ${config.email}: User account not found.`);
        continue;
      }

      logs.push(`Fetching YouTube videos for @${dbUser.username} (${accountMeta.languageName})...`);
      const videoItems = await fetchYouTubeVideos(config.query, config.lang, 5);

      if (videoItems.length === 0) {
        logs.push(`No YouTube videos returned for @${dbUser.username}.`);
        continue;
      }

      // Pick first non-duplicate video
      let selectedVideo: YouTubeVideoItem | null = null;
      for (const v of videoItems) {
        if (batchProcessedVideos.has(v.videoId)) continue;

        // Check if video or title already posted in DB
        const dbExisting = await prisma.post.findFirst({
          where: {
            OR: [
              { caption: { contains: v.title.slice(0, 25), mode: 'insensitive' } },
              { mediaUrls: { contains: v.videoId } }
            ]
          }
        });

        if (!dbExisting) {
          selectedVideo = v;
          break;
        } else {
          logs.push(`Skipping YouTube Video "${v.title.slice(0, 30)}..." (Already posted in DB).`);
        }
      }

      if (!selectedVideo) {
        logs.push(`All fetched videos for @${dbUser.username} were duplicates.`);
        continue;
      }

      batchProcessedVideos.add(selectedVideo.videoId);

      // Create Video News Post
      const slugBase = selectedVideo.title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 60);
      const slug = `yt-${slugBase}-${Date.now().toString().slice(-4)}`;

      const localizedContent = `🎥 **YouTube Video News**:\n📌 Watch full video: ${selectedVideo.title}\n📺 Channel: ${selectedVideo.channelTitle}\n\n📖 **Report & Highlights**:\n${selectedVideo.description.slice(0, 300) || 'Watch live verified coverage and video reporting directly on Tolee News.'}\n\nStay connected with Tolee News for live video updates.`;

      const allTolees = await prisma.tolee.findMany({ select: { id: true } });

      await prisma.post.create({
        data: {
          caption: selectedVideo.title,
          postType: 'news',
          mediaUrls: selectedVideo.thumbnail,
          mediaTypes: 'image',
          status: 'published',
          authorId: dbUser.id,
          tolees: allTolees.length > 0 ? { create: allTolees.map((t: any) => ({ toleeId: t.id })) } : undefined,
          newsRelation: {
            create: {
              headline: selectedVideo.title,
              slug,
              summary: selectedVideo.description.slice(0, 200) || `Watch ${selectedVideo.title} on Tolee News.`,
              category: accountMeta.category,
              content: localizedContent,
              metaDescription: `Watch video coverage of ${selectedVideo.title} on Tolee News.`,
              keywords: `youtube, video, news, ${accountMeta.category.toLowerCase().replace(/[^a-z0-9]/g, '')}, tolee`,
              tags: `youtube, video, ${accountMeta.languageName.toLowerCase()}`,
              seoScore: 94,
              aeoScore: 90,
              geoScore: 88,
              language: accountMeta.languageName,
              sourceUrl: selectedVideo.watchUrl,
              readingTime: 3
            }
          }
        }
      });

      publishedCount++;
      const delayMins = Math.floor(Math.random() * 15) + 10;
      logs.push(`[YouTube Post #${publishedCount}] Published [${accountMeta.languageName.toUpperCase()}] "${selectedVideo.title.slice(0, 40)}..." (Channel: ${selectedVideo.channelTitle}) under @${dbUser.username}. [Next gap: ~${delayMins}m]`);

      if (withDelay && publishedCount < 5) {
        const delayMs = delayMins * 60 * 1000;
        logs.push(`⏱️ Waiting ${delayMins} minutes before posting next YouTube video...`);
        await new Promise(res => setTimeout(res, delayMs));
      }
    }

    logs.push(`YouTube Video Auto-Publisher completed: ${publishedCount} video news posts published.`);
    return { success: true, count: publishedCount, log: logs };

  } catch (error: any) {
    logs.push(`Fatal Error in youtube auto-publisher: ${error.message}`);
    return { success: false, count: 0, log: logs };
  }
}
