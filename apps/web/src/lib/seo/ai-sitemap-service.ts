import { prisma } from '@/lib/prisma';
import { NvidiaNIMProvider } from '@/lib/ai-gateway/providers/nvidia-nim';
import fs from 'fs';
import path from 'path';

export interface SitemapUrlEntry {
  loc: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

export interface SitemapBreakdown {
  static: number;
  categories: number;
  locations: number;
  topics: number;
  tolees: number;
  news: number;
  listings: number;
  reels: number;
  posts: number;
  screenVideos: number;
  users: number;
  projects: number;
}

export interface FullSitemapResult {
  success: boolean;
  totalUrls: number;
  breakdown: SitemapBreakdown;
  sitemapPath?: string;
  sitemapUrl: string;
  generatedAt: string;
  durationMs: number;
  pingResults?: Record<string, boolean>;
  error?: string;
}

export interface AISitemapGenerationResult {
  success: boolean;
  totalUrls: number;
  aiTrendingTopics: string[];
  highPrioritySlugs: string[];
  aiAnalysisSummary?: string;
  sitemapPath?: string;
  pingResults?: Record<string, boolean>;
  durationMs: number;
  error?: string;
}

export class AISitemapService {
  private static baseUrl = 'https://tolee.in';
  private static cachedResult: AISitemapGenerationResult | null = null;
  private static cachedTrendingTopics: string[] = [];

  /**
   * Get recently discovered AI trending topics for Next.js sitemap.ts
   */
  public static getTrendingTopics(): string[] {
    return this.cachedTrendingTopics;
  }

  /**
   * Core generator: Uses NVIDIA AI to evaluate trending topics & generate daily sitemap.xml
   */
  public static async generateDailySitemap(): Promise<AISitemapGenerationResult> {
    const startTime = Date.now();
    const baseUrl = this.baseUrl;

    try {
      console.log('[AISitemapService] Starting Daily Sitemap Generation with NVIDIA AI...');

      // 1. Fetch fresh candidate data from Neon PostgreSQL
      const [recentNews, recentReels, activeTolees, recentListings, worldProjects, recentScreenVideos] = await Promise.all([
        prisma.newsPost.findMany({
          where: { post: { status: 'published', isArchived: false } },
          select: { slug: true, updatedAt: true, post: { select: { caption: true } } },
          orderBy: { updatedAt: 'desc' },
          take: 20,
        }).catch(() => []),

        prisma.post.findMany({
          where: {
            postType: 'reel',
            status: 'published',
            visibility: 'public',
            author: { isPrivate: false },
          },
          select: { id: true, caption: true, updatedAt: true, viewsCount: true },
          orderBy: { updatedAt: 'desc' },
          take: 20,
        }).catch(() => []),

        prisma.tolee.findMany({
          where: { isPrivate: false, isPublicVisible: true },
          select: { slug: true, name: true, createdAt: true },
          take: 30,
        }).catch(() => []),

        prisma.listing.findMany({
          where: { status: 'active' },
          select: { id: true, title: true, updatedAt: true },
          take: 20,
        }).catch(() => []),

        prisma.worldProject.findMany({
          where: { status: 'published' },
          select: { slug: true, type: true, updatedAt: true },
          take: 20,
        }).catch(() => []),
        prisma.screenVideo.findMany({
          select: { id: true, title: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 25,
        }).catch(() => []),
      ]);

      // 2. NVIDIA AI Consultation: Analyze headlines and detect viral search intent
      let aiTrendingTopics: string[] = [
        'ipl-live-score',
        'tech-startups-india',
        'mumbai-real-estate',
        'delhi-food-guide',
        'bollywood-viral-news',
        'ai-tools-2026',
      ];
      let highPrioritySlugs: string[] = [];
      let aiAnalysisSummary = 'Heuristic fallback ranking applied';

      try {
        const nim = new NvidiaNIMProvider();
        const newsSamples = recentNews.slice(0, 10).map((n: any) => n.post?.caption || n.slug).filter(Boolean);
        const reelSamples = recentReels.slice(0, 10).map((r: any) => r.caption).filter(Boolean);

        const prompt = `You are Tolee AI SEO Strategist. Analyze these recent Indian news headlines and viral social reel topics:
Headlines: ${JSON.stringify(newsSamples.slice(0, 8))}
Reels: ${JSON.stringify(reelSamples.slice(0, 8))}

Tasks:
1. Identify 8 high-intent SEO trending topics/slugs in lowercase hyphenated format (e.g. "budget-2026-updates", "ipl-match-today").
2. Identify up to 5 news or reel slugs from above that deserve highest Google index priority (1.0).
3. Provide a 1-sentence SEO strategy summary.

Return JSON only in this exact schema:
{
  "trendingTopics": ["topic-1", "topic-2", ...],
  "highPrioritySlugs": ["slug-1", ...],
  "seoSummary": "Brief strategy summary"
}`;

        const nimResponse = await nim.generateText({
          model: 'meta/llama-3.2-11b-vision-instruct',
          messages: [
            { role: 'system', content: 'You are an expert technical SEO & Sitemap indexing agent. Output valid JSON only.' },
            { role: 'user', content: prompt }
          ],
        });

        if (nimResponse.text) {
          const jsonMatch = nimResponse.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed.trendingTopics) && parsed.trendingTopics.length > 0) {
              aiTrendingTopics = parsed.trendingTopics.map((t: string) =>
                t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
              );
            }
            if (Array.isArray(parsed.highPrioritySlugs)) {
              highPrioritySlugs = parsed.highPrioritySlugs;
            }
            if (parsed.seoSummary) {
              aiAnalysisSummary = parsed.seoSummary;
            }
          }
        }
      } catch (aiErr: any) {
        console.warn('[AISitemapService] NVIDIA AI optimization note (using heuristic fallback):', aiErr?.message);
      }

      this.cachedTrendingTopics = aiTrendingTopics;

      // 3. Assemble all Sitemap URL Entries with AI-optimized priorities
      const urlEntries: SitemapUrlEntry[] = [];
      const nowIso = new Date().toISOString();

      // A. Static Core Hubs
      const coreHubs = [
        { path: '', priority: 1.0, freq: 'daily' },
        { path: '/news', priority: 0.95, freq: 'hourly' },
        { path: '/reels', priority: 0.95, freq: 'hourly' },
        { path: '/discover', priority: 0.9, freq: 'daily' },
        { path: '/marketplace', priority: 0.9, freq: 'daily' },
        { path: '/screen', priority: 0.85, freq: 'daily' },
        { path: '/world', priority: 0.85, freq: 'daily' },
        { path: '/sports', priority: 0.95, freq: 'hourly' },
        { path: '/radar', priority: 0.8, freq: 'daily' },
        { path: '/creator-program', priority: 0.8, freq: 'weekly' },
        { path: '/boost-membership', priority: 0.8, freq: 'weekly' },
      ];

      for (const hub of coreHubs) {
        urlEntries.push({
          loc: `${baseUrl}${hub.path}`,
          lastmod: nowIso,
          changefreq: hub.freq as any,
          priority: hub.priority,
        });
      }

      // B. AI-Discovered Trending Topic Hubs
      for (const topic of aiTrendingTopics) {
        urlEntries.push({
          loc: `${baseUrl}/topic/${topic}`,
          lastmod: nowIso,
          changefreq: 'hourly',
          priority: 0.9,
        });
      }

      // C. Published News Posts (Prioritized by AI)
      for (const n of recentNews) {
        const isHigh = highPrioritySlugs.some((s) => n.slug.includes(s));
        urlEntries.push({
          loc: `${baseUrl}/news/${n.slug}`,
          lastmod: n.updatedAt ? new Date(n.updatedAt).toISOString() : nowIso,
          changefreq: isHigh ? 'hourly' : 'daily',
          priority: isHigh ? 1.0 : 0.9,
        });
      }

      // D. Public Reels
      for (const r of recentReels) {
        urlEntries.push({
          loc: `${baseUrl}/reel/${r.id}`,
          lastmod: r.updatedAt ? new Date(r.updatedAt).toISOString() : nowIso,
          changefreq: 'daily',
          priority: 0.85,
        });
      }

      // E. Public Tolee Communities
      for (const t of activeTolees) {
        urlEntries.push({
          loc: `${baseUrl}/t/${t.slug}`,
          lastmod: t.createdAt ? new Date(t.createdAt).toISOString() : nowIso,
          changefreq: 'daily',
          priority: 0.9,
        });
      }

      // F. Marketplace Listings
      for (const l of recentListings) {
        urlEntries.push({
          loc: `${baseUrl}/marketplace/listing/${l.id}`,
          lastmod: l.updatedAt ? new Date(l.updatedAt).toISOString() : nowIso,
          changefreq: 'daily',
          priority: 0.8,
        });
      }

      // G. World Projects
      for (const p of worldProjects) {
        let route = 'micro-website';
        if (p.type === 'BLOG') route = 'blog';
        else if (p.type === 'RESTAURANT') route = 'restaurant';
        else if (p.type === 'STORE') route = 'store';

        urlEntries.push({
          loc: `${baseUrl}/${route}/${p.slug}`,
          lastmod: p.updatedAt ? new Date(p.updatedAt).toISOString() : nowIso,
          changefreq: 'weekly',
          priority: 0.8,
        });
      }

      // H. Tolee Screen Public Watch Videos
      for (const v of (recentScreenVideos || [])) {
        urlEntries.push({
          loc: `${baseUrl}/screen/watch/${v.id}`,
          lastmod: v.createdAt ? new Date(v.createdAt).toISOString() : nowIso,
          changefreq: 'weekly',
          priority: 0.85,
        });
      }

      // 4. Generate Standard XML Sitemap
      const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
      const xmlFooter = '</urlset>';
      const xmlBody = urlEntries
        .map(
          (e) =>
            `  <url>\n    <loc>${e.loc}</loc>\n    <lastmod>${e.lastmod}</lastmod>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority.toFixed(2)}</priority>\n  </url>`
        )
        .join('\n');

      const fullXml = xmlHeader + xmlBody + '\n' + xmlFooter;

      // 5. Write to public/sitemap.xml on disk for static serving
      let writtenPath = '';
      try {
        const publicDir = path.join(process.cwd(), 'apps', 'web', 'public');
        if (fs.existsSync(publicDir)) {
          const sitemapFile = path.join(publicDir, 'sitemap.xml');
          fs.writeFileSync(sitemapFile, fullXml, 'utf8');
          writtenPath = sitemapFile;
          console.log(`[AISitemapService] Wrote sitemap.xml to ${sitemapFile} (${urlEntries.length} URLs)`);
        } else {
          // If cwd is already apps/web
          const altPublic = path.join(process.cwd(), 'public');
          if (fs.existsSync(altPublic)) {
            const sitemapFile = path.join(altPublic, 'sitemap.xml');
            fs.writeFileSync(sitemapFile, fullXml, 'utf8');
            writtenPath = sitemapFile;
            console.log(`[AISitemapService] Wrote sitemap.xml to ${sitemapFile} (${urlEntries.length} URLs)`);
          }
        }
      } catch (fileErr) {
        console.warn('[AISitemapService] Public directory file write notice:', fileErr);
      }

      // 6. Ping Google & Bing Search Engines for Instant Indexing
      const pingResults: Record<string, boolean> = {};
      const sitemapUrl = encodeURIComponent(`${baseUrl}/sitemap.xml`);

      await Promise.allSettled([
        fetch(`https://www.google.com/ping?sitemap=${sitemapUrl}`)
          .then((res) => { pingResults['google'] = res.ok; })
          .catch(() => { pingResults['google'] = false; }),
        fetch(`https://www.bing.com/ping?sitemap=${sitemapUrl}`)
          .then((res) => { pingResults['bing'] = res.ok; })
          .catch(() => { pingResults['bing'] = false; }),
      ]);

      const result: AISitemapGenerationResult = {
        success: true,
        totalUrls: urlEntries.length,
        aiTrendingTopics,
        highPrioritySlugs,
        aiAnalysisSummary,
        sitemapPath: writtenPath || undefined,
        pingResults,
        durationMs: Date.now() - startTime,
      };

      this.cachedResult = result;
      return result;
    } catch (error: any) {
      console.error('[AISitemapService] Generation failure:', error);
      return {
        success: false,
        totalUrls: 0,
        aiTrendingTopics: [],
        highPrioritySlugs: [],
        durationMs: Date.now() - startTime,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Super Admin Full Generator: Rebuilds complete sitemap XML across all database models
   * and overwrites public/sitemap.xml so https://www.tolee.in/sitemap.xml is instantly updated.
   */
  public static async generateFullSitemap(): Promise<FullSitemapResult> {
    const startTime = Date.now();
    const baseUrl = this.baseUrl;
    const nowIso = new Date().toISOString();

    const breakdown: SitemapBreakdown = {
      static: 0,
      categories: 0,
      locations: 0,
      topics: 0,
      tolees: 0,
      news: 0,
      listings: 0,
      reels: 0,
      posts: 0,
      screenVideos: 0,
      users: 0,
      projects: 0,
    };

    try {
      console.log('[AISitemapService] Generating full sitemap from database...');
      const urlEntries: SitemapUrlEntry[] = [];

      // 1. Static Core Hubs
      const staticUrls = [
        { path: '', priority: 1.0, freq: 'daily' },
        { path: '/discover', priority: 0.9, freq: 'daily' },
        { path: '/reels', priority: 0.9, freq: 'daily' },
        { path: '/news', priority: 0.9, freq: 'daily' },
        { path: '/marketplace', priority: 0.9, freq: 'daily' },
        { path: '/screen', priority: 0.85, freq: 'daily' },
        { path: '/world', priority: 0.85, freq: 'daily' },
        { path: '/sports', priority: 0.95, freq: 'hourly' },
        { path: '/map', priority: 0.85, freq: 'daily' },
        { path: '/world/book', priority: 0.85, freq: 'daily' },
        { path: '/radar', priority: 0.8, freq: 'daily' },
        { path: '/creator-program', priority: 0.8, freq: 'weekly' },
        { path: '/login', priority: 0.7, freq: 'monthly' },
        { path: '/signup', priority: 0.7, freq: 'monthly' },
        { path: '/about', priority: 0.6, freq: 'monthly' },
        { path: '/contact', priority: 0.6, freq: 'monthly' },
        { path: '/privacy', priority: 0.4, freq: 'monthly' },
        { path: '/terms', priority: 0.4, freq: 'monthly' },
        { path: '/refund-policy', priority: 0.4, freq: 'monthly' },
        { path: '/boost-membership', priority: 0.8, freq: 'weekly' },
        { path: '/llms.txt', priority: 0.8, freq: 'weekly' },
        { path: '/llms-full.txt', priority: 0.8, freq: 'weekly' },
      ];

      for (const s of staticUrls) {
        urlEntries.push({
          loc: `${baseUrl}${s.path}`,
          lastmod: nowIso,
          changefreq: s.freq as any,
          priority: s.priority,
        });
      }
      breakdown.static = staticUrls.length;

      // 2. Categories
      const categories = [
        'business', 'technology', 'real-estate', 'entertainment', 'music',
        'sports', 'health', 'lifestyle', 'spirituality', 'education'
      ];
      for (const cat of categories) {
        urlEntries.push({
          loc: `${baseUrl}/category/${cat}`,
          lastmod: nowIso,
          changefreq: 'daily',
          priority: 0.85,
        });
      }
      breakdown.categories = categories.length;

      // 3. Locations
      const locations = [
        'mumbai', 'delhi', 'bangalore', 'pune', 'hyderabad', 'kolkata',
        'chennai', 'ahmedabad', 'jaipur', 'chandigarh', 'dubai'
      ];
      for (const loc of locations) {
        urlEntries.push({
          loc: `${baseUrl}/location/${loc}`,
          lastmod: nowIso,
          changefreq: 'daily',
          priority: 0.85,
        });
      }
      breakdown.locations = locations.length;

      // 4. Topics
      const baseTopics = [
        'mumbai-real-estate', 'tech-startups-india', 'delhi-food-guide',
        'bollywood-updates', 'cricket-ipl', 'health-fitness-tips'
      ];
      const aiTrending = this.cachedTrendingTopics.length > 0
        ? this.cachedTrendingTopics
        : ['ipl-live-score', 'ai-tools-2026', 'bollywood-viral-news'];
      const topics = Array.from(new Set([...baseTopics, ...aiTrending]));
      for (const top of topics) {
        urlEntries.push({
          loc: `${baseUrl}/topic/${top}`,
          lastmod: nowIso,
          changefreq: 'daily',
          priority: 0.8,
        });
      }
      breakdown.topics = topics.length;

      // 5. Database Queries in Parallel
      const [
        tolees,
        newsPosts,
        listings,
        posts,
        screenVideos,
        users,
        worldProjects,
      ] = await Promise.all([
        prisma.tolee.findMany({
          where: { isPrivate: false, isPublicVisible: true },
          select: { slug: true, createdAt: true },
          take: 5000,
        }).catch(() => []),

        prisma.newsPost.findMany({
          where: { post: { status: 'published', isArchived: false } },
          select: { slug: true, updatedAt: true },
          orderBy: { updatedAt: 'desc' },
          take: 5000,
        }).catch(() => []),

        prisma.listing.findMany({
          where: { status: 'active' },
          select: { id: true, updatedAt: true },
          take: 3000,
        }).catch(() => []),

        prisma.post.findMany({
          where: {
            visibility: 'public',
            status: 'published',
            author: { isPrivate: false },
            tolees: { none: { tolee: { isPrivate: true } } },
          },
          select: { id: true, postType: true, updatedAt: true },
          orderBy: { updatedAt: 'desc' },
          take: 5000,
        }).catch(() => []),

        prisma.screenVideo.findMany({
          select: { id: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 2000,
        }).catch(() => []),

        prisma.user.findMany({
          where: { username: { not: null }, isBanned: false, isSuspended: false, isPrivate: false },
          select: { username: true, createdAt: true },
          take: 3000,
        }).catch(() => []),

        prisma.worldProject.findMany({
          where: { status: 'published' },
          select: { slug: true, type: true, updatedAt: true },
          take: 2000,
        }).catch(() => []),
      ]);

      // Tolees
      for (const t of tolees) {
        if (!t.slug) continue;
        urlEntries.push({
          loc: `${baseUrl}/t/${t.slug}`,
          lastmod: t.createdAt ? new Date(t.createdAt).toISOString() : nowIso,
          changefreq: 'daily',
          priority: 0.9,
        });
      }
      breakdown.tolees = tolees.length;

      // News
      for (const n of newsPosts) {
        if (!n.slug) continue;
        urlEntries.push({
          loc: `${baseUrl}/news/${n.slug}`,
          lastmod: n.updatedAt ? new Date(n.updatedAt).toISOString() : nowIso,
          changefreq: 'daily',
          priority: 0.9,
        });
      }
      breakdown.news = newsPosts.length;

      // Listings
      for (const l of listings) {
        urlEntries.push({
          loc: `${baseUrl}/marketplace/listing/${l.id}`,
          lastmod: l.updatedAt ? new Date(l.updatedAt).toISOString() : nowIso,
          changefreq: 'daily',
          priority: 0.8,
        });
      }
      breakdown.listings = listings.length;

      // Posts & Reels
      let reelsCount = 0;
      let regularPostsCount = 0;
      for (const p of posts) {
        if (p.postType === 'reel') {
          reelsCount++;
          urlEntries.push({
            loc: `${baseUrl}/reel/${p.id}`,
            lastmod: p.updatedAt ? new Date(p.updatedAt).toISOString() : nowIso,
            changefreq: 'daily',
            priority: 0.85,
          });
        } else {
          regularPostsCount++;
          urlEntries.push({
            loc: `${baseUrl}/post/${p.id}`,
            lastmod: p.updatedAt ? new Date(p.updatedAt).toISOString() : nowIso,
            changefreq: 'daily',
            priority: 0.8,
          });
        }
      }
      breakdown.reels = reelsCount;
      breakdown.posts = regularPostsCount;

      // Screen Videos
      for (const v of screenVideos) {
        urlEntries.push({
          loc: `${baseUrl}/screen/watch/${v.id}`,
          lastmod: v.createdAt ? new Date(v.createdAt).toISOString() : nowIso,
          changefreq: 'weekly',
          priority: 0.85,
        });
      }
      breakdown.screenVideos = screenVideos.length;

      // Users
      for (const u of users) {
        if (!u.username) continue;
        urlEntries.push({
          loc: `${baseUrl}/u/${u.username}`,
          lastmod: u.createdAt ? new Date(u.createdAt).toISOString() : nowIso,
          changefreq: 'weekly',
          priority: 0.7,
        });
      }
      breakdown.users = users.length;

      // World Projects
      for (const wp of worldProjects) {
        if (!wp.slug) continue;
        let route = 'micro-website';
        if (wp.type === 'BLOG') route = 'blog';
        else if (wp.type === 'RESTAURANT') route = 'restaurant';
        else if (wp.type === 'STORE') route = 'store';

        urlEntries.push({
          loc: `${baseUrl}/${route}/${wp.slug}`,
          lastmod: wp.updatedAt ? new Date(wp.updatedAt).toISOString() : nowIso,
          changefreq: 'weekly',
          priority: 0.8,
        });
      }
      breakdown.projects = worldProjects.length;

      // Generate XML Document
      const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
      const xmlFooter = '</urlset>';
      const xmlBody = urlEntries
        .map(
          (e) =>
            `  <url>\n    <loc>${e.loc}</loc>\n    <lastmod>${e.lastmod}</lastmod>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority.toFixed(2)}</priority>\n  </url>`
        )
        .join('\n');

      const fullXml = xmlHeader + xmlBody + '\n' + xmlFooter;

      // Write / Replace sitemap.xml to disk
      let writtenPath = '';
      const targetDirs = [
        path.join(process.cwd(), 'apps', 'web', 'public'),
        path.join(process.cwd(), 'public'),
      ];

      for (const dir of targetDirs) {
        try {
          if (fs.existsSync(dir)) {
            const filePath = path.join(dir, 'sitemap.xml');
            fs.writeFileSync(filePath, fullXml, 'utf8');
            writtenPath = filePath;
            console.log(`[AISitemapService] Successfully replaced ${filePath} with ${urlEntries.length} entries`);
          }
        } catch (wErr) {
          console.warn(`[AISitemapService] Could not write to ${dir}:`, wErr);
        }
      }

      // Ping Search Engines in background
      const pingResults: Record<string, boolean> = {};
      const sitemapUrl = encodeURIComponent(`${baseUrl}/sitemap.xml`);

      await Promise.allSettled([
        fetch(`https://www.google.com/ping?sitemap=${sitemapUrl}`)
          .then((res) => { pingResults['google'] = res.ok; })
          .catch(() => { pingResults['google'] = false; }),
        fetch(`https://www.bing.com/ping?sitemap=${sitemapUrl}`)
          .then((res) => { pingResults['bing'] = res.ok; })
          .catch(() => { pingResults['bing'] = false; }),
      ]);

      return {
        success: true,
        totalUrls: urlEntries.length,
        breakdown,
        sitemapPath: writtenPath || undefined,
        sitemapUrl: `${baseUrl}/sitemap.xml`,
        generatedAt: nowIso,
        durationMs: Date.now() - startTime,
        pingResults,
      };
    } catch (err: any) {
      console.error('[AISitemapService] Full generation error:', err);
      return {
        success: false,
        totalUrls: 0,
        breakdown,
        sitemapUrl: `${baseUrl}/sitemap.xml`,
        generatedAt: nowIso,
        durationMs: Date.now() - startTime,
        error: err.message || 'Failed to generate full sitemap',
      };
    }
  }
}
