import dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../lib/prisma';

async function main() {
  console.log("🎬 Fetching and publishing a LIVE Comedy Video from YouTube API...");

  const apiKey = process.env.YOUTUBE_API_KEY || "AIzaSyAQGEjKb5EkJjZSSh4I4X5x2zhESnhSzH0";
  const query = "standup comedy clips funny humor India 2026";
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoDuration=medium&regionCode=IN&maxResults=5&order=date&key=${apiKey}`;

  const res = await fetch(url, { cache: 'no-store' });
  const data = await res.json();

  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    console.error("No videos returned from YouTube API:", data);
    process.exit(1);
  }

  // Pick first comedy video
  const item = data.items[0];
  const videoId = item.id?.videoId;
  const snippet = item.snippet || {};
  const title = snippet.title?.replace(/#\w+/g, '').replace(/[<>]/g, '').trim() || 'Hilarious Comedy Video';
  const description = snippet.description || 'Watch the funniest comedy clip on Tolee.';
  const thumbnail = snippet.thumbnails?.high?.url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  const channelTitle = snippet.channelTitle || 'Standup Comedy';
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const embedUrl = `https://www.youtube.com/embed/${videoId}`;

  console.log(`📌 Found Comedy Video: "${title}" (Channel: ${channelTitle}, ID: ${videoId})`);

  // Target account: @vsdapav (vadapavwaledada@gmail.com)
  const dbUser = await prisma.user.findFirst({
    where: { email: 'vadapavwaledada@gmail.com' }
  });

  if (!dbUser) {
    console.error("User account vadapavwaledada@gmail.com not found!");
    process.exit(1);
  }

  const allTolees = await prisma.tolee.findMany({ select: { id: true } });
  const slugBase = title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 60);
  const slug = `yt-${slugBase}-${Date.now().toString().slice(-5)}`;

  const videoContent = `😂 **Comedy & Entertainment Video**\n\n📌 **${title}**\n📺 Channel: ${channelTitle}\n\n📖 ${description.slice(0, 400) || 'Watch this hilarious comedy video on Tolee.'}\n\n🔗 Watch full video: ${watchUrl}\n\nEnjoy daily stand-up comedy, funny skits, and viral memes on Tolee!`;

  const newPost = await prisma.post.create({
    data: {
      caption: `😂 ${title}`,
      postType: 'video',
      mediaUrls: embedUrl,
      mediaTypes: 'video',
      status: 'published',
      authorId: dbUser.id,
      tolees: allTolees.length > 0 ? { create: allTolees.map((t: any) => ({ toleeId: t.id })) } : undefined,
      newsRelation: {
        create: {
          headline: title,
          slug,
          summary: description.slice(0, 200) || `Watch ${title} on Tolee Comedy.`,
          category: 'Comedy & Entertainment',
          content: videoContent,
          metaDescription: `Watch Comedy: ${title} on Tolee`,
          keywords: `comedy, standup, funny, youtube, video, tolee`,
          tags: `comedy, funny, video, english`,
          seoScore: 95,
          aeoScore: 92,
          geoScore: 90,
          language: 'English',
          sourceUrl: watchUrl,
          readingTime: 4,
          coverCaption: thumbnail
        }
      }
    },
    include: {
      newsRelation: true
    }
  });

  console.log("✅ Live Comedy Video Post Successfully Created in DB!");
  console.log({
    postId: newPost.id,
    author: dbUser.username,
    title: title,
    channel: channelTitle,
    embedUrl: embedUrl,
    watchUrl: watchUrl,
    newsSlug: newPost.newsRelation?.slug,
    toleeLink: `https://www.tolee.in/news/${newPost.newsRelation?.slug}`
  });

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
