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
 * EXPANDED VIDEO CATEGORIES & QUERIES
 */
const YOUTUBE_VIDEO_CATEGORIES: Record<string, string[]> = {
  // === SCIENCE & SPACE ===
  'NASA & Space': [
    'NASA space rocket launch 2026 4k official',
    'NASA James Webb telescope discoveries universe',
    'SpaceX Starship launch Mars mission 2026',
    'ISS International Space Station astronaut life',
    'solar system planets exploration documentary 4k',
    'black hole universe documentary science 4k',
    'NASA Artemis Moon mission highlights'
  ],

  // === DISCOVERY & NATURE ===
  'Discovery & Wildlife': [
    'Discovery Channel wildlife documentary 4k hd',
    'ocean deep sea creatures documentary 4k',
    'African safari lion tiger wildlife 4k',
    'Amazon rainforest documentary nature 4k',
    'animal planet predators wildlife documentary',
    'coral reef underwater world documentary 4k',
    'extreme weather nature documentary 4k'
  ],

  // === NATIONAL GEOGRAPHIC ===
  'National Geographic': [
    'National Geographic documentary 4k hd 2026',
    'National Geographic animals nature world',
    'Nat Geo wild ancient civilizations history',
    'National Geographic ocean exploration deep sea',
    'Nat Geo science technology innovation documentary',
    'National Geographic survival adventure extreme',
    'Nat Geo earth planet documentary 4k'
  ],

  // === ANIMATION & CARTOONS ===
  'Animation & Cartoons': [
    '3d animated cartoon kids funny video 2026',
    'best animated short film award winning',
    'Pixar style animation short film 4k',
    'funny cartoon animation comedy kids',
    'CGI animated short film 3d 4k',
    'nursery rhymes baby songs cartoon animation',
    'anime best scenes action adventure'
  ],

  // === EDUCATION ===
  'Education': [
    'educational documentary science technology 4k',
    'how things work explained documentary',
    'AI artificial intelligence explained 2026',
    'history of ancient civilizations documentary',
    'physics quantum mechanics explained simply',
    'TED talk best motivational speech 2026',
    'brain science psychology documentary'
  ],

  // === SHORT FILMS ===
  'Short Films': [
    'best short film award winning 2026',
    'emotional short film drama story',
    'inspirational short film motivational',
    'sci-fi short film futuristic 4k',
    'comedy short film funny sketch',
    'animated short film oscar nominated',
    'thriller suspense short film'
  ],

  // === NEWS & CURRENT AFFAIRS ===
  'News & Current Affairs': [
    'India latest news today breaking 2026',
    'world news international affairs update today',
    'technology news AI startup update 2026',
    'business finance market news today India',
    'political news India parliament session today',
    'climate change environment news 2026',
    'health medical news breakthrough 2026'
  ],

  // === TECHNOLOGY & GADGETS ===
  'Technology': [
    'latest tech unboxing gadgets review AI 2026',
    'iPhone Samsung new phone unboxing review',
    'AI robotics future technology 2026 4k',
    'electric car EV Tesla review 2026',
    'gaming PC setup build 2026 4k',
    'smart home IoT automation gadgets 2026',
    'drone camera 4k aerial footage technology'
  ],

  // === FOOD & COOKING ===
  'Food & Recipes': [
    'indian street food recipe travel vlog 2026',
    'best cooking recipe kitchen hacks tips',
    'gordon ramsay style cooking professional chef',
    'viral food recipes TikTok trending 2026',
    'healthy eating meal prep nutrition guide',
    'world best restaurants food documentary',
    'Mumbai Delhi street food tour 4k vlog'
  ],

  // === COMEDY & ENTERTAINMENT ===
  'Comedy & Entertainment': [
    'standup comedy clips funny humor India 2026',
    'best funny comedy video meme clips 2026',
    'prank videos funny reaction compilation',
    'funny Indian comedy videos skits pranks',
    'comedy podcast highlights funny moments',
    'late night show best comedy moments',
    'improv comedy sketch funny viral'
  ],

  // === SPORTS ===
  'Sports': [
    'cricket match top highlights IPL 2026',
    'football soccer goals best highlights 2026',
    'Olympics sports highlights moments 4k',
    'NBA basketball best dunks plays 2026',
    'combat sports MMA boxing highlights',
    'extreme sports adventure skateboarding surfing',
    'Formula 1 race highlights 2026'
  ],

  // === FINANCE & STOCK MARKET ===
  'Finance & Markets': [
    'stock market trading sensex nifty analysis 2026',
    'cryptocurrency bitcoin ethereum news today',
    'personal finance investing tips beginners',
    'mutual fund SIP investment strategy India',
    'real estate property market India 2026',
    'startup funding venture capital India 2026',
    'forex trading strategy tutorial 2026'
  ],

  // === MUSIC & ARTS ===
  'Music & Arts': [
    'best music video new songs 2026 trending',
    'classical music orchestra performance live',
    'bollywood new songs music video 2026',
    'piano guitar cover songs acoustic live',
    'art painting timelapse satisfying creative',
    'dance performance choreography viral 2026',
    'street music busking performance amazing'
  ]
};

/**
 * Account specific categories mapping
 */
const ACCOUNT_VIDEO_CATEGORIES: Record<string, string[]> = {
  'adsvidia369@gmail.com': ['NASA & Space', 'Technology', 'Education'],
  'loktimes369@gmail.com': ['Discovery & Wildlife', 'National Geographic', 'Animation & Cartoons'],
  'updatesontimes@gmail.com': ['News & Current Affairs', 'Short Films', 'Education'],
  'vadapavwaledada@gmail.com': ['Food & Recipes', 'Animation & Cartoons', 'Comedy & Entertainment'],
  'rinkugupta90282@gmail.com': ['Sports', 'Discovery & Wildlife', 'Music & Arts'],
  'foodpaass@gmail.com': ['Finance & Markets', 'NASA & Space', 'Short Films']
};

/**
 * Fetch top YouTube videos for a specific query & language using YouTube Data API v3
 */
async function fetchYouTubeVideos(query: string, lang: 'hi' | 'mr' | 'en', maxResults: number = 15): Promise<YouTubeVideoItem[]> {
  const apiKey = process.env.YOUTUBE_API_KEY || "AIzaSyAQGEjKb5EkJjZSSh4I4X5x2zhESnhSzH0";
  const regionCode = 'IN';

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoEmbeddable=true&videoSyndicated=true&videoDuration=medium&regionCode=${regionCode}&maxResults=${maxResults}&order=date&key=${apiKey}`;
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();

    if (data.error) {
      console.error(`YouTube API Error:`, data.error.message || JSON.stringify(data.error));
      return [];
    }

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
    console.error(`YouTube API fetch error for ${lang} (${query}):`, error.message);
  }
  return [];
}

/**
 * Auto-Publishes YouTube Videos for ALL 6 Accounts (Target 3 videos per account = 18 videos per batch)
 */
export async function publishYouTubeVideosBatch(withDelay: boolean = false): Promise<{ success: boolean; count: number; log: string[] }> {
  const logs: string[] = [];
  logs.push("🎬 Starting YouTube Video Auto-Publisher batch execution across ALL 6 ACCOUNTS...");

  try {
    const userEmails = REGISTERED_NEWS_ACCOUNTS.map(a => a.email);
    const users = await prisma.user.findMany({
      where: { email: { in: userEmails } },
      select: { id: true, email: true, name: true, username: true }
    });

    const userMap = new Map<string, { id: true; email: string; name: string | null; username: string | null }>(users.map((u: any) => [u.email, u]));
    const allTolees = await prisma.tolee.findMany({ select: { id: true } });

    let publishedCount = 0;
    const batchProcessedVideos = new Set<string>();

    for (const account of REGISTERED_NEWS_ACCOUNTS) {
      const dbUser = userMap.get(account.email);
      if (!dbUser) {
        logs.push(`⚠️ Skipping ${account.email}: User not found in DB.`);
        continue;
      }

      const assignedCategories = ACCOUNT_VIDEO_CATEGORIES[account.email] || ['NASA & Space', 'Discovery & Wildlife', 'Technology'];
      let accountPostCount = 0;

      // Try up to 3 videos for this account
      for (let itemIdx = 0; itemIdx < 3; itemIdx++) {
        const selectedCategory = assignedCategories[itemIdx % assignedCategories.length];
        const queries = YOUTUBE_VIDEO_CATEGORIES[selectedCategory] || ['documentary 4k hd'];
        
        let selectedVideo: YouTubeVideoItem | null = null;

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
              selectedVideo = v;
              selectedVideo.category = selectedCategory;
              break;
            }
          }
          if (selectedVideo) break;
        }

        if (!selectedVideo) {
          logs.push(`⚠️ Could not find non-duplicate video for @${dbUser.username} in ${selectedCategory}.`);
          continue;
        }

        batchProcessedVideos.add(selectedVideo.videoId);

        const slugBase = selectedVideo.title
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .slice(0, 60);
        const slug = `yt-${slugBase}-${Date.now().toString().slice(-5)}${publishedCount}`;

        const videoContent = `🎥 **${selectedVideo.category} Video**\n\n📌 **${selectedVideo.title}**\n📺 Channel: ${selectedVideo.channelTitle}\n\n📖 ${selectedVideo.description.slice(0, 400) || `Watch this video on Tolee.`}\n\n🔗 Watch full video: ${selectedVideo.watchUrl}\n\nStay connected with Tolee for daily video updates across NASA, Discovery, Animation, Education, Sports, and more!`;

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
        accountPostCount++;
        logs.push(`✅ [@${dbUser.username} #${accountPostCount}] Published [${selectedVideo.category}] "${selectedVideo.title.slice(0, 45)}..."`);

        if (withDelay) {
          await new Promise(res => setTimeout(res, 2000));
        }
      }
    }

    logs.push(`\n🎬 YouTube Auto-Publisher batch complete: ${publishedCount} new video posts created across all 6 accounts.`);
    return { success: true, count: publishedCount, log: logs };

  } catch (error: any) {
    logs.push(`🔴 Fatal Error in YouTube Auto-Publisher: ${error.message}`);
    return { success: false, count: 0, log: logs };
  }
}
