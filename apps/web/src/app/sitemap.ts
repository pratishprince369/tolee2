import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.tolee.in';

  // 1. Static URLs with prioritization (No private pages like /feed)
  const staticUrls = [
    { url: `${baseUrl}`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 1.0 },
    { url: `${baseUrl}/discover`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${baseUrl}/reels`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${baseUrl}/marketplace`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${baseUrl}/news`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${baseUrl}/screen`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${baseUrl}/world`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${baseUrl}/creator-program`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.3 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
  ];

  let toleeUrls: MetadataRoute.Sitemap = [];
  let projectUrls: MetadataRoute.Sitemap = [];
  let listingUrls: MetadataRoute.Sitemap = [];
  let userUrls: MetadataRoute.Sitemap = [];
  let newsUrls: MetadataRoute.Sitemap = [];
  let screenUrls: MetadataRoute.Sitemap = [];
  let postUrls: MetadataRoute.Sitemap = [];

  try {
    // 2. Fetch Public Tolee Groups (priority: 0.9) - Exclude private groups
    const tolees = await prisma.tolee.findMany({
      where: {
        isPrivate: false,
        privacy: { not: 'private' },
      },
      select: {
        slug: true,
        createdAt: true,
      },
      take: 2000,
    });
    toleeUrls = tolees.map((t: any) => ({
      url: `${baseUrl}/t/${t.slug}`,
      lastModified: t.createdAt ? new Date(t.createdAt) : new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    }));
  } catch (error) {
    console.error('Error fetching tolees for sitemap:', error);
  }

  try {
    // 3. Fetch World Projects (Websites, Blogs, etc.) (priority: 0.8)
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
  } catch (error) {
    console.error('Error fetching projects for sitemap:', error);
  }

  try {
    // 4. Fetch Active Marketplace Listings (priority: 0.7)
    const listings = await prisma.listing.findMany({
      where: {
        status: 'active',
      },
      select: {
        id: true,
        updatedAt: true,
      },
      take: 2000,
    });
    listingUrls = listings.map((l: any) => ({
      url: `${baseUrl}/marketplace/listing/${l.id}`,
      lastModified: l.updatedAt ? new Date(l.updatedAt) : new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    }));
  } catch (error) {
    console.error('Error fetching listings for sitemap:', error);
  }

  try {
    // 5. Fetch Public User Profiles (priority: 0.6) - Exclude private accounts
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
      priority: 0.6,
    }));
  } catch (error) {
    console.error('Error fetching users for sitemap:', error);
  }

  try {
    // 6. Fetch Published News Posts (priority: 0.9)
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
    console.error('Error fetching news posts for sitemap:', error);
  }

  try {
    // 7. Fetch Public Screen Videos (priority: 0.8)
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
    console.error('Error fetching screen videos for sitemap:', error);
  }

  try {
    // 8. Fetch Public Feed Posts & Reels (priority: 0.8) - Exclude private accounts or private groups
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
        updatedAt: true,
      },
      take: 3000,
    });
    postUrls = posts.map((p: any) => ({
      url: `${baseUrl}/post/${p.id}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    }));
  } catch (error) {
    console.error('Error fetching posts for sitemap:', error);
  }

  return [
    ...staticUrls,
    ...toleeUrls,
    ...projectUrls,
    ...listingUrls,
    ...userUrls,
    ...newsUrls,
    ...screenUrls,
    ...postUrls,
  ];
}
