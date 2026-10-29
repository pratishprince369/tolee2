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
      const [recentNews, recentReels, activeTolees, recentListings, worldProjects] = await Promise.all([
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
        const newsSamples = recentNews.slice(0, 10).map((n) => n.post?.caption || n.slug).filter(Boolean);
        const reelSamples = recentReels.slice(0, 10).map((r) => r.caption).filter(Boolean);

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
}
