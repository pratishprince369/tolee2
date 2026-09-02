import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://tolee.in';

  // 1. Core Public Static Hubs (High Priority Indexing)
  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${baseUrl}`, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/discover`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/reels`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/news`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/marketplace`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/screen`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.85 },
    { url: `${baseUrl}/world`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.85 },
    { url: `${baseUrl}/map`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.85 },
    { url: `${baseUrl}/world/book`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.85 },
    { url: `${baseUrl}/world/ai-resume-builder`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/radar`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/creator-program`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/signup`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
  ];

  let toleeUrls: MetadataRoute.Sitemap = [];
  let projectUrls: MetadataRoute.Sitemap = [];
  let listingUrls: MetadataRoute.Sitemap = [];
  let userUrls: MetadataRoute.Sitemap = [];
  let newsUrls: MetadataRoute.Sitemap = [];
  let screenUrls: MetadataRoute.Sitemap = [];
  let postUrls: MetadataRoute.Sitemap = [];
  let reelUrls: MetadataRoute.Sitemap = [];

  try {
    // 2. Fetch Public Tolee Communities (priority: 0.9) - Exclude private groups
    const tolees = await prisma.tolee.findMany({
      where: {
        isPrivate: false,
        isPublicVisible: true,
      },
      select: {
        slug: true,
        createdAt: true,
      },
      take: 2500,
    });
    toleeUrls = tolees.map((t: any) => ({
      url: `${baseUrl}/t/${t.slug}`,
      lastModified: t.createdAt ? new Date(t.createdAt) : new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    }));
  } catch (error) {
    console.error('[Sitemap] Error fetching tolees:', error);
  }

  try {
    // 3. Fetch Published News Posts (priority: 0.9)
    const news = await prisma.newsPost.findMany({
      where: {
        post: {
          status: 'published',
          isArchived: false,
        }
      },
      select: {
        slug: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 5000,
    });
    newsUrls = news.map((n: any) => ({
      url: `${baseUrl}/news/${n.slug}`,
      lastModified: n.updatedAt ? new Date(n.updatedAt) : new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    }));
  } catch (error) {
    console.error('[Sitemap] Error fetching news posts:', error);
  }

  try {
    // 4. Fetch Active Marketplace Listings (priority: 0.8)
    const listings = await prisma.listing.findMany({
      where: {
        status: 'active',
      },
      select: {
        id: true,
        updatedAt: true,
      },
      take: 3000,
    });
    listingUrls = listings.map((l: any) => ({
      url: `${baseUrl}/marketplace/listing/${l.id}`,
      lastModified: l.updatedAt ? new Date(l.updatedAt) : new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    }));
  } catch (error) {
    console.error('[Sitemap] Error fetching listings:', error);
  }

  try {
    // 5. Fetch Public Feed Posts & Reels (priority: 0.85) - Exclude private accounts/groups
    const posts = await prisma.post.findMany({
      where: {
        visibility: 'public',
        status: 'published',
        postType: { not: 'news' },
        author: { isPrivate: false },
        tolees: {
          none: {
            tolee: {
              isPrivate: true,
            }
          }
        }
      },
      select: {
        id: true,
        postType: true,
        updatedAt: true,
      },
      take: 4000,
    });

    for (const p of posts) {
      if (p.postType === 'reel') {
        reelUrls.push({
          url: `${baseUrl}/reel/${p.id}`,
          lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
          changeFrequency: 'daily',
          priority: 0.85,
        });
      }
      postUrls.push({
        url: `${baseUrl}/post/${p.id}`,
        lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
        changeFrequency: 'daily',
        priority: 0.8,
      });
    }
  } catch (error) {
    console.error('[Sitemap] Error fetching posts:', error);
  }

  try {
    // 6. Fetch Public Screen Videos (priority: 0.8)
    const videos = await prisma.screenVideo.findMany({
      select: {
        id: true,
        createdAt: true,
      },
      take: 2000,
    });
    screenUrls = videos.map((v: any) => ({
      url: `${baseUrl}/screen/watch/${v.id}`,
      lastModified: v.createdAt ? new Date(v.createdAt) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));
  } catch (error) {
    console.error('[Sitemap] Error fetching screen videos:', error);
  }

  try {
    // 7. Fetch Public User Profiles (priority: 0.7) - Exclude private/banned accounts
    const users = await prisma.user.findMany({
      where: {
        username: { not: null },
        isBanned: false,
        isSuspended: false,
        isPrivate: false,
      },
      select: {
        username: true,
        createdAt: true,
      },
      take: 3000,
    });
    userUrls = users.map((u: any) => ({
      url: `${baseUrl}/u/${u.username}`,
      lastModified: u.createdAt ? new Date(u.createdAt) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    }));
  } catch (error) {
    console.error('[Sitemap] Error fetching users:', error);
  }

  try {
    // 8. Fetch World Projects (Websites, Blogs, Stores, Restaurants) (priority: 0.8)
    const projects = await prisma.worldProject.findMany({
      where: {
        status: 'published',
      },
      select: {
        slug: true,
        type: true,
        updatedAt: true,
      },
      take: 2000,
    });
    projectUrls = projects.map((p: any) => {
      let route = 'micro-website';
      if (p.type === 'BLOG') route = 'blog';
      else if (p.type === 'RESTAURANT') route = 'restaurant';
      else if (p.type === 'STORE') route = 'store';

      return {
        url: `${baseUrl}/${route}/${p.slug}`,
        lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      };
    });
    let categoryUrls: MetadataRoute.Sitemap = [
      'business',
      'technology',
      'real-estate',
      'entertainment',
      'music',
      'sports',
      'health',
      'lifestyle',
      'spirituality',
      'education',
    ].map((cat) => ({
      url: `${baseUrl}/category/${cat}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.85,
    }));

    let locationUrls: MetadataRoute.Sitemap = [
      'mumbai',
      'delhi',
      'bangalore',
      'pune',
      'hyderabad',
      'kolkata',
      'chennai',
      'ahmedabad',
      'jaipur',
      'chandigarh',
      'dubai',
    ].map((loc) => ({
      url: `${baseUrl}/location/${loc}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.85,
    }));

    let topicUrls: MetadataRoute.Sitemap = [
      'mumbai-real-estate',
      'tech-startups-india',
      'delhi-food-guide',
      'bollywood-updates',
      'cricket-ipl',
      'health-fitness-tips',
    ].map((top) => ({
      url: `${baseUrl}/topic/${top}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }));

    return [
      ...staticUrls,
      ...categoryUrls,
      ...locationUrls,
      ...topicUrls,
      ...toleeUrls,
      ...newsUrls,
      ...listingUrls,
      ...reelUrls,
      ...postUrls,
      ...screenUrls,
      ...userUrls,
      ...projectUrls,
    ];
  } catch (error) {
    console.error('[Sitemap] Critical error:', error);
    return staticUrls;
  }
}
