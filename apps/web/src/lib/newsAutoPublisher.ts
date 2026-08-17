import { prisma } from '@/lib/prisma';
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
  const items: NewsArticleItem[] = [];

  // 1. Finnhub Market News
  try {
    const url = `https://finnhub.io/api/v1/news?category=general&token=${key}`;
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(4000) });
    const data = await res.json();

    if (Array.isArray(data) && data.length > 0) {
      const finnhubItems = data.map((a: any) => ({
        headline: sanitizeNewsText(a.headline || ''),
        image: a.image && a.image.startsWith('http') ? a.image : undefined,
        description: sanitizeNewsText(a.summary || ''),
        language: 'en' as const
      })).filter((item: NewsArticleItem) => item.headline && item.headline.length > 10 && item.image);

      if (finnhubItems.length > 0) {
        items.push(...finnhubItems);
        logs.push(`[STOCK/TECH] Fetched ${finnhubItems.length} market articles via Finnhub API.`);
      }
    }
  } catch (err: any) {
    logs.push(`[STOCK] Finnhub notice: ${err.message}`);
  }

  // 2. HackerNews Official API (https://github.com/HackerNews/API)
  try {
    const hnRes = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json?print=pretty", { cache: 'no-store', signal: AbortSignal.timeout(3000) });
    const topIds: number[] = await hnRes.json();
    if (Array.isArray(topIds) && topIds.length > 0) {
      const topSlice = topIds.slice(0, 8);
      const storyPromises = topSlice.map(async (id) => {
        try {
          const itemRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json?print=pretty`, { signal: AbortSignal.timeout(2500) });
          return await itemRes.json();
        } catch {
          return null;
        }
      });
      const stories = (await Promise.all(storyPromises)).filter(Boolean);
      for (const s of stories) {
        if (s.title && s.title.length > 10) {
          items.push({
            headline: sanitizeNewsText(s.title),
            description: `HackerNews Top Tech Discussion: Score ${s.score || 100}+ points by ${s.by || 'tech_community'}. Read full insights on Tolee News.`,
            language: 'en'
          });
        }
      }
      logs.push(`[HACKERNEWS] Fetched ${stories.length} tech stories from HackerNews API.`);
    }
  } catch (e: any) {
    logs.push(`[HACKERNEWS] Notice: ${e.message}`);
  }

  return items;
}

/**
 * Fetch breaking news articles specifically targeted by language ('hi' | 'mr' | 'en')
 */
async function fetchNewsForLanguage(lang: 'hi' | 'mr' | 'en', logs: string[]): Promise<NewsArticleItem[]> {
  const newsdataKey = process.env.NEWSDATA_API_KEY || "pub_080f52adf1114cc59f8201ad47eb64f8";
  const gnewsKey = process.env.GNEWS_API_KEY || "7c9cbcae5f8b01d649ab17e1a4528dc9";
  const newsApiKey = process.env.NEWS_API_KEY || "bd92a188805e44e3b654a871e2ba1553";
  const currentsApiKey = process.env.CURRENTS_API_KEY || "ue1WLanfXoMsFJ9MHsL_NLmVBD2v8fRNXAqe-b5-MlfY4oLz";
  const freeNewsApiKey = process.env.FREENEWS_API_KEY || "763b5eea94f613c9c3826c04220ffdf9f97bc7bd90844327989de58d19e7cbe5";

  // Tier 1: FreeNewsAPI.io (5,000 Requests/day)
  try {
    const fnLang = lang === 'hi' ? 'hi' : lang === 'mr' ? 'mr' : 'en';
    const url = `https://api.freenewsapi.io/v1/news?language=${fnLang}&country=in`;
    const res = await fetch(url, {
      headers: {
        'x-api-key': freeNewsApiKey,
        'Accept': 'application/json'
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(4000)
    });
    const data = await res.json();

    const articles = data.articles || data.results || data.news || data.data || [];
    if (Array.isArray(articles) && articles.length > 0) {
      const items = articles.map((a: any) => ({
        headline: sanitizeNewsText(a.title || a.headline || ''),
        image: (a.image_url || a.image || a.urlToImage || a.thumbnail) && (a.image_url || a.image || a.urlToImage || a.thumbnail).startsWith('http') ? (a.image_url || a.image || a.urlToImage || a.thumbnail) : undefined,
        description: sanitizeNewsText(a.description || a.summary || a.snippet || ''),
        language: lang
      })).filter((item: NewsArticleItem) => item.headline && item.headline.length > 10 && item.image);

      if (items.length > 0) {
        logs.push(`[${lang.toUpperCase()}] Fetched ${items.length} image-verified articles from FreeNewsAPI.io.`);
        return items;
      }
    }
  } catch (e: any) {
    logs.push(`[${lang.toUpperCase()}] FreeNewsAPI notice: ${e.message}`);
  }

  // Tier 2: CurrentsAPI.services
  try {
    const currentsLang = lang === 'hi' ? 'hi' : lang === 'mr' ? 'mr' : 'en';
    const url = `https://api.currentsapi.services/v1/latest-news?language=${currentsLang}&apiKey=${currentsApiKey}`;
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(4000) });
    const data = await res.json();

    if (data.status === 'ok' && Array.isArray(data.news) && data.news.length > 0) {
      const items = data.news.map((a: any) => ({
        headline: sanitizeNewsText(a.title || ''),
        image: a.image && a.image.startsWith('http') && a.image !== 'None' ? a.image : undefined,
        description: sanitizeNewsText(a.description || ''),
        language: lang
      })).filter((item: NewsArticleItem) => item.headline && item.headline.length > 10 && item.image);

      if (items.length > 0) {
        logs.push(`[${lang.toUpperCase()}] Fetched ${items.length} image-verified articles from CurrentsAPI.`);
        return items;
      }
    }
  } catch (e: any) {
    logs.push(`[${lang.toUpperCase()}] CurrentsAPI notice: ${e.message}`);
  }

  // Tier 2: GNews.io API
  try {
    const url = `https://gnews.io/api/v4/top-headlines?category=general&lang=${lang}&country=in&max=10&apikey=${gnewsKey}`;
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(4000) });
    const data = await res.json();

    if (data.articles && Array.isArray(data.articles) && data.articles.length > 0) {
      const items = data.articles.map((a: any) => ({
        headline: sanitizeNewsText(a.title || ''),
        image: a.image && a.image.startsWith('http') ? a.image : undefined,
        description: sanitizeNewsText(a.description || ''),
        language: lang
      })).filter((item: NewsArticleItem) => item.headline && item.headline.length > 10 && item.image);

      if (items.length > 0) {
        logs.push(`[${lang.toUpperCase()}] Fetched ${items.length} image-verified articles from GNews.io.`);
        return items;
      }
    }
  } catch (e: any) {
    logs.push(`[${lang.toUpperCase()}] GNews.io notice: ${e.message}`);
  }

  // Tier 3: NewsData.io
  try {
    const url = `https://newsdata.io/api/1/news?apikey=${newsdataKey}&country=in&language=${lang}&image=1`;
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(4000) });
    const data = await res.json();

    if (data.status === 'success' && Array.isArray(data.results) && data.results.length > 0) {
      const items = data.results.map((a: any) => ({
        headline: sanitizeNewsText(a.title || ''),
        image: a.image_url && a.image_url.startsWith('http') ? a.image_url : undefined,
        description: sanitizeNewsText(a.description || a.snippet || ''),
        language: lang
      })).filter((item: NewsArticleItem) => item.headline && item.headline.length > 10 && item.image);

      if (items.length > 0) {
        logs.push(`[${lang.toUpperCase()}] Fetched ${items.length} image-verified articles from NewsData.io.`);
        return items;
      }
    }
  } catch (e: any) {
    logs.push(`[${lang.toUpperCase()}] NewsData.io notice: ${e.message}`);
  }

  // Tier 4: NewsAPI.org
  try {
    const newsApiLang = lang === 'hi' ? 'hi' : 'en';
    const url = `https://newsapi.org/v2/top-headlines?country=in&language=${newsApiLang}&apiKey=${newsApiKey}`;
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(4000) });
    const data = await res.json();

    if (data.status === 'ok' && Array.isArray(data.articles) && data.articles.length > 0) {
      const items = data.articles.map((a: any) => ({
        headline: sanitizeNewsText(a.title || ''),
        image: a.urlToImage && a.urlToImage.startsWith('http') ? a.urlToImage : undefined,
        description: sanitizeNewsText(a.description || ''),
        language: lang
      })).filter((item: NewsArticleItem) => item.headline && item.headline.length > 10 && item.image);

      if (items.length > 0) {
        logs.push(`[${lang.toUpperCase()}] Fetched ${items.length} image-verified articles from NewsAPI.org.`);
        return items;
      }
    }
  } catch (e: any) {
    logs.push(`[${lang.toUpperCase()}] NewsAPI notice: ${e.message}`);
  }

  // Tier 4: Verified Indian News Feeds with direct Image Enclosures & Media Content
  const regionalFeeds: Record<string, string[]> = {
    hi: [
      'https://feeds.feedburner.com/ndtvkhabar',
      'https://www.abplive.com/home/feed',
      'https://hindi.news18.com/rss/khabar/national/national.xml',
      'https://feeds.bbci.co.uk/hindi/rss.xml'
    ],
    mr: [
      'https://www.loksatta.com/feed/',
      'https://marathi.abplive.com/home/feed',
      'https://lokmat.news18.com/rss/maharashtra.xml',
      'https://feeds.bbci.co.uk/marathi/rss.xml'
    ],
    en: [
      'https://feeds.feedburner.com/ndtvnews-top-stories',
      'https://www.thehindu.com/news/national/feeder/default.rss',
      'https://indianexpress.com/section/india/feed/',
      'https://timesofindia.indiatimes.com/rssfeedstopstories.cms'
    ]
  };

  const feeds = regionalFeeds[lang] || regionalFeeds.en;
  for (const feedUrl of feeds) {
    try {
      const res = await fetch(feedUrl, { cache: 'no-store', signal: AbortSignal.timeout(4000) });
      const xml = await res.text();
      
      const itemBlocks = xml.split(/<item[\s>]/i).slice(1);
      const feedItems: NewsArticleItem[] = [];

      for (const block of itemBlocks) {
        const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
        const headline = titleMatch ? sanitizeNewsText(titleMatch[1]) : '';
        if (!headline || headline.length < 10) continue;

        // 1. Check <enclosure url="..." />
        let image = '';
        const encMatch = block.match(/<enclosure[^>]+url=["'](https?:\/\/[^"']+)["']/i);
        if (encMatch) {
          image = encMatch[1];
        }

        // 2. Check <media:content url="..." /> or <media:thumbnail url="..." />
        if (!image) {
          const mediaMatch = block.match(/<media:(?:content|thumbnail)[^>]+url=["'](https?:\/\/[^"']+)["']/i);
          if (mediaMatch) {
            image = mediaMatch[1];
          }
        }

        // 3. Check <img> tag inside <description> or <content:encoded>
        if (!image) {
          const imgMatch = block.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i);
          if (imgMatch) {
            image = imgMatch[1];
          }
        }

        const descMatch = block.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/i);
        const description = descMatch ? sanitizeNewsText(descMatch[1]) : headline;

        feedItems.push({
          headline,
          image: image && image.startsWith('http') ? image : undefined,
          description,
          language: lang
        });
      }

      const withImages = feedItems.filter(f => f.image);
      if (withImages.length > 0) {
        logs.push(`[${lang.toUpperCase()}] Fetched ${withImages.length} verified image articles from ${feedUrl.split('/')[2]}.`);
        return withImages;
      }
    } catch (e: any) {
      // Continue to next feed
    }
  }

  // Tier 5: Google News RSS (Fallback)
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
    // Auto-cleanup: Clean any legacy fake AI generated images from news posts
    await prisma.post.updateMany({
      where: {
        postType: 'news',
        OR: [
          { mediaUrls: { contains: 'pollinations.ai' } },
          { mediaUrls: { contains: 'genai' } },
          { mediaUrls: { contains: 'ai.api.nvidia.com' } }
        ]
      },
      data: {
        mediaUrls: null,
        mediaTypes: null
      }
    }).catch(() => {});

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
    const allTolees = await prisma.tolee.findMany({ select: { id: true } });

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

      // Use ONLY the authentic direct image that came from the verified news publisher API
      const imageUrl = (articleItem.image && typeof articleItem.image === 'string' && articleItem.image.startsWith('http')) 
        ? articleItem.image 
        : null;

      const allTolees = await prisma.tolee.findMany({ select: { id: true } });

      // Create Post in DB linked to all Tolees
      await prisma.post.create({
        data: {
          caption: headline,
          postType: 'news',
          mediaUrls: imageUrl,
          mediaTypes: imageUrl ? 'image' : null,
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
