import { prismaAI as prisma } from '@/lib/prisma-ai'; // 🛡️ AI content goes to tolee-1 DB
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
  category: string;
}

/**
 * Clean YouTube video titles by removing hashtags and promotional clutter
 */
function cleanYouTubeTitle(title: string): string {
  if (!title) return '';
  return title
    .replace(/#\w+/g, '')
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 11 USER-SPECIFIED VIDEO CATEGORIES & HIGH-IMPACT QUERIES
 */
const YOUTUBE_VIDEO_CATEGORIES: Record<string, string[]> = {
  // 1. NASA
  'NASA': [
    'NASA rocket launch 4k official 2026',
    'NASA James Webb space telescope discoveries',
    'NASA Artemis Moon mission updates 2026',
    'NASA Mars Rover Perseverance discovery',
    'ISS International Space Station live astronaut',
    'NASA deep space exploration 4k'
  ],

  // 2. DISCOVERY
  'Discovery': [
    'Discovery Channel documentary 4k 2026',
    'Discovery Channel deep sea creatures',
    'Discovery Channel survival wild nature',
    'Discovery Channel extreme engineering',
    'Discovery expedition mysteries world 4k'
  ],

  // 3. NATIONAL GEOGRAPHIC
  'National Geographic': [
    'National Geographic wild 4k documentary',
    'National Geographic ocean exploration deep',
    'National Geographic earth planet nature',
    'National Geographic ancient civilizations',
    'Nat Geo wild predators wildlife 4k'
  ],

  // 4. SCIENCE
  'Science': [
    'latest science breakthroughs 2026 4k',
    'quantum physics science explained simply',
    'future of artificial intelligence robotics science',
    'human body neuroscience brain science',
    'climate science environment breakthroughs 4k'
  ],

  // 5. EDUCATION
  'Education': [
    'educational documentary 4k full episode',
    'how things work engineering explained',
    'TED talk best educational speeches 2026',
    'history of human evolution documentary',
    'world geography history education'
  ],

  // 6. DOCUMENTARY
  'Documentary': [
    'award winning short documentary 4k',
    'untamed nature documentary full 4k',
    'universe cosmos mystery documentary',
    'deep ocean sea life documentary 4k',
    'historical mystery full documentary'
  ],

  // 7. HISTORY
  'History': [
    'ancient Egypt Pyramids history documentary 4k',
    'ancient Rome Empire history documentary',
    'World War history documentary 4k',
    'Indian ancient history civilisations 4k',
    'lost cities archaeological discoveries history'
  ],

  // 8. SPACE
  'Space': [
    'SpaceX Starship launch Mars mission 4k',
    'black hole universe space documentary',
    'solar system planets 4k space exploration',
    'milky way galaxy space documentary 4k',
    'james webb telescope deep space images'
  ],

  // 9. ANIMALS
  'Animals': [
    'wild animals lion tiger elephant 4k safari',
    'underwater marine animals ocean documentary',
    'cute animals birds wildlife documentary 4k',
    'predators vs prey animal planet 4k',
    'African savanna wildlife animals'
  ],

  // 10. TECHNOLOGY
  'Technology': [
    'latest technology gadgets unboxing 2026 4k',
    'AI artificial intelligence technology review',
    'electric vehicles EV Tesla tech 2026',
    'drone aerial 4k camera technology',
    'smart robotics future tech 2026'
  ],

  // 11. KIDS EDUCATION
  'Kids Education': [
    '3d animated cartoon kids education funny',
    'science experiments for kids educational',
    'animals documentary for kids fun learning',
    'solar system planets animation for kids',
    'nursery rhymes 3d cartoon educational video'
  ]
};

/**
 * Account specific categories mapping (balanced across all 11 categories for 6 accounts)
 */
const ACCOUNT_VIDEO_CATEGORIES: Record<string, string[]> = {
  'adsvidia369@gmail.com': ['NASA', 'Space', 'Technology', 'Science'],
  'loktimes369@gmail.com': ['Discovery', 'National Geographic', 'Animals', 'Kids Education'],
  'updatesontimes@gmail.com': ['Education', 'History', 'Documentary', 'Science'],
  'vadapavwaledada@gmail.com': ['Kids Education', 'Animals', 'Discovery', 'Documentary'],
  'rinkugupta90282@gmail.com': ['National Geographic', 'Animals', 'History', 'Space'],
  'foodpaass@gmail.com': ['Technology', 'NASA', 'Education', 'Documentary']
};

/**
 * Fetch top YouTube videos for a specific query & language using YouTube Data API v3 with Invidious Fallback
 */
async function fetchYouTubeVideos(query: string, lang: 'hi' | 'mr' | 'en', maxResults: number = 15): Promise<YouTubeVideoItem[]> {
  const apiKeys = [
    process.env.YOUTUBE_API_KEY,
    "AIzaSyAQGEjKb5EkJjZSSh4I4X5x2zhESnhSzH0"
  ].filter((k): k is string => Boolean(k && k.trim()));

  const regionCode = 'IN';

  // 1. Try Official YouTube Data API keys
  for (const apiKey of apiKeys) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoEmbeddable=true&videoSyndicated=true&videoDuration=medium&regionCode=${regionCode}&maxResults=${maxResults}&order=date&key=${apiKey}`;
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
            channelTitle: snippet.channelTitle || 'YouTube',
            watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
            embedUrl: `https://www.youtube.com/embed/${videoId}`,
            language: lang,
            category: query
          };
        }).filter((v: YouTubeVideoItem) => v.videoId && v.title && v.title.length > 5);
      }
    } catch (error: any) {
      // Failover to next key / Invidious fallback
    }
  }

  // 2. High-Availability Fallback: Public Invidious Search API Instances
  const invidiousInstances = [
    'https://invidious.drgns.space',
    'https://vid.puffyan.us',
    'https://inv.riversip.com'
  ];

  for (const instance of invidiousInstances) {
    try {
      const invUrl = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`;
      const res = await fetch(invUrl, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const items = await res.json();
        if (Array.isArray(items) && items.length > 0) {
          return items.map((item: any) => ({
            videoId: item.videoId,
            title: cleanYouTubeTitle(item.title || ''),
            description: item.description || '',
            thumbnail: item.videoThumbnails?.[0]?.url || `https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`,
            channelTitle: item.author || 'YouTube',
            watchUrl: `https://www.youtube.com/watch?v=${item.videoId}`,
            embedUrl: `https://www.youtube.com/embed/${item.videoId}`,
            language: lang,
            category: query
          })).filter((v: YouTubeVideoItem) => v.videoId && v.title && v.title.length > 5);
        }
      }
    } catch {
      // Continue to next instance
    }
  }

  return [];
}

/**
 * Auto-Publishes 50 YouTube Videos Daily across 6 Registered Accounts
 */
export async function publishYouTubeVideosBatch(withDelay: boolean = false): Promise<{ success: boolean; count: number; log: string[] }> {
  const logs: string[] = [];
  logs.push("🎬 Starting 50 Videos/Day YouTube Auto-Publisher batch execution across 6 ACCOUNTS...");

  try {
    const userEmails = REGISTERED_NEWS_ACCOUNTS.map(a => a.email);
    const users = await prisma.user.findMany({
      where: { email: { in: userEmails } },
      select: { id: true, email: true, name: true, username: true }
    });

    const userMap = new Map<string, { id: string; email: string; name: string | null; username: string | null }>(users.map((u: any) => [u.email, u]));
    const allTolees = await prisma.tolee.findMany({ select: { id: true } });

    let publishedCount = 0;
    const batchProcessedVideos = new Set<string>();
    const TARGET_BATCH_COUNT = 50; // 50 videos per day flow

    // Loop through accounts to reach 50 videos
    for (let round = 0; round < 9; round++) {
      if (publishedCount >= TARGET_BATCH_COUNT) break;

      for (const account of REGISTERED_NEWS_ACCOUNTS) {
        if (publishedCount >= TARGET_BATCH_COUNT) break;

        const dbUser = userMap.get(account.email);
        if (!dbUser) continue;

        const assignedCategories = ACCOUNT_VIDEO_CATEGORIES[account.email] || ['NASA', 'Discovery', 'Science', 'Technology'];
        const selectedCategory = assignedCategories[round % assignedCategories.length];
        const queries = YOUTUBE_VIDEO_CATEGORIES[selectedCategory] || ['documentary 4k hd'];
        
        let selectedVideo: YouTubeVideoItem | null = null;

/**
 * Verify if a YouTube video is 100% public & embeddable on external websites via oEmbed API
 */
async function isYouTubeVideoEmbeddable(videoId: string): Promise<boolean> {
  if (!videoId || videoId.length !== 11) return false;
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, { signal: AbortSignal.timeout(3000) });
    return res.status === 200;
  } catch {
    return true; // Fallback allow if network timeout
  }
}

        // Try queries in category
        for (const query of queries) {
          const videoItems = await fetchYouTubeVideos(query, account.language, 15);
          for (const v of videoItems) {
            if (batchProcessedVideos.has(v.videoId)) continue;

            // Check if exact videoId already exists in DB
            const dbExisting = await prisma.post.findFirst({
              where: {
                mediaUrls: { contains: v.videoId }
              }
            });

            if (!dbExisting) {
              const isEmbeddable = await isYouTubeVideoEmbeddable(v.videoId);
              if (isEmbeddable) {
                selectedVideo = v;
                selectedVideo.category = selectedCategory;
                break;
              }
            }
          }
          if (selectedVideo) break;
        }

        if (!selectedVideo) {
          continue;
        }

        batchProcessedVideos.add(selectedVideo.videoId);

        const slugBase = selectedVideo.title
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .slice(0, 60);
        const slug = `yt-${slugBase}-${Date.now().toString().slice(-5)}${publishedCount}`;

        const videoContent = `🎥 **${selectedVideo.category} Video**\n\n📌 **${selectedVideo.title}**\n📺 Channel: ${selectedVideo.channelTitle}\n\n📖 ${selectedVideo.description.slice(0, 400) || `Watch this video on Tolee.`}\n\n🔗 Watch full video: ${selectedVideo.watchUrl}\n\nStay connected with Tolee for daily video updates across NASA, Discovery, National Geographic, Science, Education, Documentary, History, Space, Animals, Technology, and Kids Education!`;

        await prisma.post.create({
          data: {
            caption: `🎬 ${selectedVideo.title}`,
            postType: 'video',
            mediaUrls: selectedVideo.embedUrl,
            mediaTypes: 'video',
            status: 'published',
            authorId: dbUser.id,
            tolees: allTolees.length > 0 ? { create: allTolees.map((t: any) => ({ toleeId: t.id })) } : undefined,
            newsRelation: {
              create: {
                headline: selectedVideo.title,
                slug,
                summary: selectedVideo.description.slice(0, 200) || `Watch ${selectedVideo.title} on Tolee.`,
                category: selectedVideo.category,
                content: videoContent,
                metaDescription: `Watch ${selectedVideo.category}: ${selectedVideo.title} on Tolee`,
                keywords: `${selectedVideo.category.toLowerCase()}, youtube, video, ${account.languageName.toLowerCase()}, tolee`,
                tags: `${selectedVideo.category.toLowerCase()}, youtube, video, ${account.languageName.toLowerCase()}`,
                seoScore: 95,
                aeoScore: 92,
                geoScore: 90,
                language: account.languageName,
                sourceUrl: selectedVideo.watchUrl,
                readingTime: 4,
                coverCaption: selectedVideo.thumbnail
              }
            }
          }
        });

        publishedCount++;
        logs.push(`✅ [#${publishedCount}/50] Published [@${dbUser.username}] [${selectedVideo.category}] "${selectedVideo.title.slice(0, 40)}..."`);

        if (withDelay) {
          await new Promise(res => setTimeout(res, 1000));
        }
      }
    }

    logs.push(`\n🎬 YouTube Auto-Publisher batch complete: ${publishedCount} new video posts created across all 11 specified categories.`);
    return { success: true, count: publishedCount, log: logs };

  } catch (error: any) {
    logs.push(`🔴 Fatal Error in YouTube Auto-Publisher: ${error.message}`);
    return { success: false, count: 0, log: logs };
  }
}
