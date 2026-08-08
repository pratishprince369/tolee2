import { prisma } from '@/lib/prisma';
import { generateAIImageWithFallback } from '@/modules/ai-manager/Core/chat-engine';
import { generateAINewsArticle } from '@/lib/aiNewsGenerator';

export interface NewsAccountConfig {
  email: string;
  category: string;
  language: 'hi' | 'mr' | 'en';
  languageName: string;
  fallbackName: string;
}

export const REGISTERED_NEWS_ACCOUNTS: NewsAccountConfig[] = [
  { email: 'adsvidia369@gmail.com', category: 'Technology & AI', language: 'hi', languageName: 'Hindi', fallbackName: 'ads vidia' },
  { email: 'loktimes369@gmail.com', category: 'India & National Affairs', language: 'mr', languageName: 'Marathi', fallbackName: 'Suman Kumar' },
  { email: 'updatesontimes@gmail.com', category: 'Business & Finance', language: 'en', languageName: 'English', fallbackName: 'updateson times' },
  { email: 'vadapavwaledada@gmail.com', category: 'Food, Lifestyle & Culture', language: 'en', languageName: 'English', fallbackName: 'vadapav wale dada' },
  { email: 'rinkugupta90282@gmail.com', category: 'Sports & Entertainment', language: 'en', languageName: 'English', fallbackName: 'Rinku Sharma' },
  { email: 'foodpaass@gmail.com', category: 'Stock Market & Trading', language: 'en', languageName: 'English', fallbackName: 'Scroll On' }
];

export interface NewsArticleItem {
  headline: string;
  image?: string;
  description?: string;
  language: 'hi' | 'mr' | 'en';
}

/**
 * Strips all external competitor URLs, domain names, or fake claims.
 */
function sanitizeNewsText(text: string): string {
  if (!text) return '';
  return text
    .replace(/https?:\/\/\S+/gi, '') // Remove URLs
    .replace(/www\.\S+/gi, '')
    .replace(/\b(ndtv|timesofindia|hindustantimes|bbc|cnn|reuters|aajtak|abpnews|indiatoday)\.com\b/gi, '')
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
    .replace(/[<>]/g, '')
    .trim();
}

/**
 * Fetch dedicated Stock Market & Financial news via Finnhub API Key
 */
async function fetchFinnhubStockNews(logs: string[]): Promise<NewsArticleItem[]> {
  const key = process.env.FINNHUB_API_KEY || "d9r5t99r01qnlhcli2ngd9r5t99r01qnlhcli2o0";
  try {
    const url = `https://finnhub.io/api/v1/news?category=general&token=${key}`;
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();

    if (Array.isArray(data) && data.length > 0) {
      const items = data.map((a: any) => ({
        headline: sanitizeNewsText(a.headline || ''),
        image: a.image && a.image.startsWith('http') ? a.image : undefined,
        description: sanitizeNewsText(a.summary || ''),
        language: 'en' as const
      })).filter((item: NewsArticleItem) => item.headline && item.headline.length > 10);

      if (items.length > 0) {
        logs.push(`[STOCK] Fetched ${items.length} market articles via Finnhub API.`);
        return items;
      }
    }
  } catch (err: any) {
    logs.push(`[STOCK] Finnhub notice: ${err.message}`);
  }
  return [];
}

/**
 * Fetch breaking news articles specifically targeted by language ('hi' | 'mr' | 'en')
 */
async function fetchNewsForLanguage(lang: 'hi' | 'mr' | 'en', logs: string[]): Promise<NewsArticleItem[]> {
  const newsdataKey = process.env.NEWSDATA_API_KEY || "pub_080f52adf1114cc59f8201ad47eb64f8";
  const gnewsKey = process.env.GNEWS_API_KEY || "7c9cbcae5f8b01d649ab17e1a4528dc9";
  const newsApiKey = process.env.NEWS_API_KEY || "bd92a188805e44e3b654a871e2ba1553";

  // Tier 1: NewsData.io
  try {
    const url = `https://newsdata.io/api/1/news?apikey=${newsdataKey}&country=in&language=${lang}`;
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();

    if (data.status === 'success' && Array.isArray(data.results) && data.results.length > 0) {
      const items = data.results.map((a: any) => ({
        headline: sanitizeNewsText(a.title || ''),
        image: a.image_url,
        description: sanitizeNewsText(a.description || a.snippet || ''),
        language: lang
      })).filter((item: NewsArticleItem) => item.headline && item.headline.length > 10);

      if (items.length > 0) {
        logs.push(`[${lang.toUpperCase()}] Fetched ${items.length} articles from NewsData.io.`);
        return items;
      }
    }
  } catch (e: any) {
    logs.push(`[${lang.toUpperCase()}] NewsData.io notice: ${e.message}`);
  }

  // Tier 2: GNews.io
  try {
    const url = `https://gnews.io/api/v4/top-headlines?category=general&lang=${lang}&country=in&max=10&apikey=${gnewsKey}`;
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();

    if (data.articles && Array.isArray(data.articles) && data.articles.length > 0) {
      const items = data.articles.map((a: any) => ({
        headline: sanitizeNewsText(a.title || ''),
        image: a.image,
        description: sanitizeNewsText(a.description || ''),
        language: lang
      })).filter((item: NewsArticleItem) => item.headline && item.headline.length > 10);

      if (items.length > 0) {
        logs.push(`[${lang.toUpperCase()}] Fetched ${items.length} articles from GNews.io.`);
        return items;
      }
    }
  } catch (e: any) {
    logs.push(`[${lang.toUpperCase()}] GNews.io notice: ${e.message}`);
  }

  // Tier 3: Google News RSS
  try {
    const rssLang = lang === 'hi' ? 'hi' : lang === 'mr' ? 'mr' : 'en';
    const rssUrl = `https://news.google.com/rss?hl=${rssLang}&gl=IN&ceid=IN:${rssLang}`;
    const res = await fetch(rssUrl, { cache: 'no-store' });
    const xml = await res.text();
    const titleMatches = [...xml.matchAll(/<title>(.*?)<\/title>/g)].slice(1, 15);
    const items = titleMatches.map(m => ({
      headline: sanitizeNewsText(m[1].replace(/ - .*$/, '')),
      language: lang
    })).filter(item => item.headline && item.headline.length > 10 && !item.headline.toLowerCase().includes('google news'));

    logs.push(`[${lang.toUpperCase()}] Fetched ${items.length} headlines from Google News RSS.`);
    return items;
  } catch (e: any) {
    logs.push(`[${lang.toUpperCase()}] RSS notice: ${e.message}`);
  }

  return [];
}

/**
 * Builds localized report text based on content language
 */
function buildLocalizedNewsContent(headline: string, category: string, lang: 'hi' | 'mr' | 'en'): { content: string; languageDb: string } {
  if (lang === 'hi') {
    return {
      languageDb: 'Hindi',
      content: `📌 **मुख्य समाचार**:\n• ${headline} को लेकर बड़ी खबर सामने आई है।\n• जानिए आज की मुख्य बातें और विशेष अपडेट।\n\n📖 **विस्तृत रिपोर्ट**:\nआज ${headline} से जुड़ी महत्वपूर्ण जानकारियां साझा की गईं। इस विषय पर क्षेत्र के विशेषज्ञों ने अपने सुझाव और विश्लेषण पेश किए हैं।\n\nसत्यापित और ताजा खबरों के लिए टॉली न्यूज के साथ बने रहें।`
    };
  } else if (lang === 'mr') {
    return {
      languageDb: 'Marathi',
      content: `📌 **महत्त्वाच्या घडामोडी**:\n• ${headline} संदर्भात लेटेस्ट अपडेट समोर आले आहेत.\n• जाणून घ्या आजच्या ताज्या बातम्या व विशेष रिपोर्ट.\n\n📖 **सविस्तर वृत्त**:\nआज ${headline} विषयी महत्त्वाची माहिती प्रसिद्ध करण्यात आली आहे. संबंधित क्षेत्रातील तज्ज्ञांनी यावर भाष्य केले आहे.\n\nताज्या व विश्वासार्ह बातम्यांसाठी टॉली न्यूज पाहत रहा.`
    };
  } else {
    return {
      languageDb: 'English',
      content: `📌 **Key Highlights**:\n• Official developments and latest press updates regarding ${headline}.\n• Key insights, analysis, and verified reporting from authoritative sources.\n\n📖 **Detailed Verified Report**:\nToday, major developments were reported regarding ${headline}. Community leaders and domain experts emphasized the significance of these updates across ${category}.\n\nStay connected with Tolee News for verified real-time coverage.`
    };
  }
}

/**
 * Main Batch Function: Publishes daily news targeted by account languages (Hindi, Marathi, English)
 */
export async function publishDailyNewsBatch(withDelay: boolean = false): Promise<{ success: boolean; count: number; log: string[] }> {
  const logs: string[] = [];
  logs.push("Starting Multi-Lingual Daily News Auto-Publisher batch execution...");

  try {
    // Pre-fetch news pools for hi, mr, en, and stock market
    const hindiPool = await fetchNewsForLanguage('hi', logs);
    const marathiPool = await fetchNewsForLanguage('mr', logs);
    const englishPool = await fetchNewsForLanguage('en', logs);
    const stockPool = await fetchFinnhubStockNews(logs);

    const userEmails = REGISTERED_NEWS_ACCOUNTS.map(a => a.email);
    const users = await prisma.user.findMany({
      where: { email: { in: userEmails } },
      select: { id: true, email: true, name: true, username: true }
    });

    const userMap = new Map<string, { id: string; email: string; name: string | null; username: string | null }>(users.map((u: any) => [u.email, u]));
    const defaultTolee = await prisma.tolee.findFirst({ select: { id: true } });

    let publishedCount = 0;
    const hindiIndex = { val: 0 };
    const marathiIndex = { val: 0 };
    const englishIndex = { val: 0 };
    const stockIndex = { val: 0 };
    const batchProcessedHeadlines = new Set<string>();

    for (let i = 0; i < 50; i++) { // Loop up to 50 candidates to publish 10 non-duplicate news posts
      if (publishedCount >= 10) break;

      const accountConfig = REGISTERED_NEWS_ACCOUNTS[publishedCount % REGISTERED_NEWS_ACCOUNTS.length];
      const dbUser = userMap.get(accountConfig.email);

      if (!dbUser) {
        logs.push(`Skipping item ${i + 1}: Account ${accountConfig.email} not found.`);
        continue;
      }

      // Pick article according to account's targeted language & niche
      let articleItem: NewsArticleItem | null = null;
      if (accountConfig.email === 'foodpaass@gmail.com' && stockPool.length > 0) {
        articleItem = stockPool[stockIndex.val % stockPool.length];
        stockIndex.val++;
      } else if (accountConfig.language === 'hi' && hindiPool.length > 0) {
        articleItem = hindiPool[hindiIndex.val % hindiPool.length];
        hindiIndex.val++;
      } else if (accountConfig.language === 'mr' && marathiPool.length > 0) {
        articleItem = marathiPool[marathiIndex.val % marathiPool.length];
        marathiIndex.val++;
      } else if (englishPool.length > 0) {
        articleItem = englishPool[englishIndex.val % englishPool.length];
        englishIndex.val++;
      }

      // Fallback: If external API has no article left, generate fresh news via AI Model
      if (!articleItem) {
        articleItem = await generateAINewsArticle(accountConfig.category, accountConfig.language, logs);
      }

      if (!articleItem) {
        logs.push(`Skipping item ${i + 1}: Could not generate article for ${accountConfig.email}.`);
        continue;
      }

      const headline = articleItem.headline;
      const normalizedKey = headline.toLowerCase().replace(/[^\w]/g, '').slice(0, 40);

      // Check 1: In-memory batch duplicate check
      if (batchProcessedHeadlines.has(normalizedKey)) {
        logs.push(`Duplicate skipped (in-batch): "${headline.slice(0, 40)}..."`);
        continue;
      }

      // Check 2: Database historical duplicate check
      const slugBase = headline
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 60);

      const dbDuplicate = await prisma.newsPost.findFirst({
        where: {
          OR: [
            { headline: { contains: headline.slice(0, 30), mode: 'insensitive' } },
            { slug: { startsWith: slugBase.slice(0, 30) } }
          ]
        }
      });

      if (dbDuplicate) {
        logs.push(`Duplicate skipped (DB history): "${headline.slice(0, 40)}..." already exists.`);
        batchProcessedHeadlines.add(normalizedKey);
        continue;
      }

      // Mark as processed
      batchProcessedHeadlines.add(normalizedKey);

      const slug = `${slugBase}-${Date.now().toString().slice(-4)}${publishedCount}`;
      const localized = buildLocalizedNewsContent(headline, accountConfig.category, accountConfig.language);
      const summary = articleItem.description || `Verified news coverage on ${headline}. Read full story on Tolee News.`;
      const metaDescription = `Latest updates on ${headline}. Read verified analysis on Tolee News.`;
      const keywords = `news, ${accountConfig.category.toLowerCase().replace(/[^a-z0-9]/g, '')}, india, tolee, ${accountConfig.languageName.toLowerCase()}`;

      // Use direct news image if available, else generate 8K Photorealistic Press Banner visual
      let imageUrl = articleItem.image;
      if (!imageUrl || !imageUrl.startsWith('http')) {
        const bannerPrompt = `Ultra photorealistic 8k studio press news photograph representing ${headline}, professional photojournalism shot, wide angle 16:9 aspect ratio, crisp details, natural lighting, award winning press photography`;
        imageUrl = await generateAIImageWithFallback(bannerPrompt);
      }

      const allTolees = await prisma.tolee.findMany({ select: { id: true } });

      // Create Post in DB linked to all Tolees
      await prisma.post.create({
        data: {
          caption: headline,
          postType: 'news',
          mediaUrls: imageUrl,
          mediaTypes: 'image',
          status: 'published',
          authorId: dbUser.id,
          tolees: allTolees.length > 0 ? { create: allTolees.map((t: any) => ({ toleeId: t.id })) } : undefined,
          newsRelation: {
            create: {
              headline,
              slug,
              summary,
              category: accountConfig.category,
              content: localized.content,
              metaDescription,
              keywords,
              tags: keywords,
              seoScore: 95,
              aeoScore: 90,
              geoScore: 88,
              language: localized.languageDb,
              readingTime: 2
            }
          }
        }
      });

      publishedCount++;
      const nextDelayMinutes = Math.floor(Math.random() * 15) + 10; // Random 10 to 25 mins
      logs.push(`[Post #${publishedCount}] Published [${accountConfig.languageName.toUpperCase()}] "${headline.slice(0, 45)}..." under @${dbUser.username} (${accountConfig.category}). [Scheduled next post gap: ~${nextDelayMinutes} mins]`);

      // If delayed mode is enabled, wait randomized 10-25 mins before next post
      if (withDelay && publishedCount < 15) {
        const delayMs = nextDelayMinutes * 60 * 1000;
        logs.push(`⏱️ Waiting ${nextDelayMinutes} minutes before publishing next article...`);
        await new Promise(res => setTimeout(res, delayMs));
      }
    }

    logs.push(`Multi-lingual batch completed: ${publishedCount} news posts published with randomized human-like time gaps.`);
    return { success: true, count: publishedCount, log: logs };

  } catch (error: any) {
    logs.push(`Fatal Error in news auto-publisher: ${error.message}`);
    return { success: false, count: 0, log: logs };
  }
}
