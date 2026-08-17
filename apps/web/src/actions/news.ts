'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createSystemNotification } from '@/lib/notification-service';
import { runNewsAIPipeline } from '@/lib/aiNews';

// NVIDIA NIM API configuration for Moderation and AI assistant functions
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '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';

function safeRevalidatePath(path: string, type?: 'layout' | 'page') {
  try {
    revalidatePath(path, type);
  } catch (err) {
    console.warn(`[SafeRevalidate] Error revalidating ${path}:`, err);
  }
}

// 1. Save News Draft Server Action
export async function saveNewsDraft(data: {
  postId?: string;
  headline: string;
  slug?: string;
  summary?: string;
  metaDescription?: string;
  keywords?: string;
  tags?: string;
  category: string;
  subcategory?: string;
  language?: string;
  region?: string;
  state?: string;
  district?: string;
  city?: string;
  coverCaption?: string;
  imageCredit?: string;
  sourceUrl?: string;
  externalRef?: string;
  content: string; // rich text JSON string
  mediaUrls?: string; // comma-separated URLs
  mediaTypes?: string; // comma-separated types
  status?: string; // optional status ('draft' | 'published')
  selectedToleeIds?: string[];
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;
    const isSuperAdmin = (session.user as any).email === process.env.SUPER_ADMIN_EMAIL;

    // Generate slug if empty
    let slug = data.slug || data.headline.toLowerCase().trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    if (!slug) {
      slug = `draft-${Date.now()}`;
    }

    // Verify slug uniqueness
    const existingNews = await prisma.newsPost.findFirst({
      where: {
        slug,
        postId: data.postId ? { not: data.postId } : undefined,
      }
    });

    if (existingNews) {
      slug = `${slug}-${Math.floor(100 + Math.random() * 900)}`;
    }

    let post;
    if (data.postId) {
      // Find existing post for security check
      const existing = await prisma.post.findUnique({
        where: { id: data.postId },
        select: { authorId: true, status: true }
      });

      if (!existing) {
        return { success: false, error: 'News post not found' };
      }

      if (existing.authorId !== userId && !isSuperAdmin) {
        return { success: false, error: 'Unauthorized edit request' };
      }

      const targetStatus = data.status || existing.status;

      // Update existing post
      post = await prisma.post.update({
        where: { id: data.postId },
        data: {
          caption: data.headline,
          mediaUrls: data.mediaUrls || null,
          mediaTypes: data.mediaTypes || null,
          status: targetStatus,
        }
      });

      await prisma.newsPost.upsert({
        where: { postId: post.id },
        update: {
          headline: data.headline,
          slug,
          summary: data.summary,
          metaDescription: data.metaDescription,
          keywords: data.keywords,
          tags: data.tags,
          category: data.category,
          subcategory: data.subcategory,
          language: data.language || 'English',
          region: data.region,
          state: data.state,
          district: data.district,
          city: data.city,
          coverCaption: data.coverCaption,
          imageCredit: data.imageCredit,
          sourceUrl: data.sourceUrl,
          externalRef: data.externalRef,
          content: data.content,
        },
        create: {
          postId: post.id,
          headline: data.headline,
          slug,
          summary: data.summary,
          metaDescription: data.metaDescription,
          keywords: data.keywords,
          tags: data.tags,
          category: data.category,
          subcategory: data.subcategory,
          language: data.language || 'English',
          region: data.region,
          state: data.state,
          district: data.district,
          city: data.city,
          coverCaption: data.coverCaption,
          imageCredit: data.imageCredit,
          sourceUrl: data.sourceUrl,
          externalRef: data.externalRef,
          content: data.content,
        }
      });
    } else {
      // Create new draft post
      post = await prisma.post.create({
        data: {
          authorId: userId,
          caption: data.headline,
          postType: 'news',
          mediaUrls: data.mediaUrls || null,
          mediaTypes: data.mediaTypes || null,
          status: data.status || 'draft',
          visibility: 'followers', // default restriction
        }
      });

      await prisma.newsPost.create({
        data: {
          postId: post.id,
          headline: data.headline,
          slug,
          summary: data.summary,
          metaDescription: data.metaDescription,
          keywords: data.keywords,
          tags: data.tags,
          category: data.category,
          subcategory: data.subcategory,
          language: data.language || 'English',
          region: data.region,
          state: data.state,
          district: data.district,
          city: data.city,
          coverCaption: data.coverCaption,
          imageCredit: data.imageCredit,
          sourceUrl: data.sourceUrl,
          externalRef: data.externalRef,
          content: data.content,
        }
      });
    }

    // Sync Tolee links for draft if provided
    if (data.selectedToleeIds) {
      // Delete old connections
      await prisma.postTolee.deleteMany({
        where: { postId: post.id }
      });
      // Add new connections
      if (data.selectedToleeIds.length > 0) {
        await prisma.postTolee.createMany({
          data: data.selectedToleeIds.map(toleeId => ({
            postId: post.id,
            toleeId,
          }))
        });
      }
    }

    return { success: true, postId: post.id, slug };
  } catch (err: any) {
    console.error('Error saving draft:', err);
    return { success: false, error: err.message || 'Failed to save draft' };
  }
}

// 2. Publish News Server Action
export async function publishNews(postId: string, validationData: {
  visibility?: string;
  selectedToleeIds: string[];
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    // Load full news post
    const newsItem = await prisma.newsPost.findUnique({
      where: { postId },
      include: { post: true }
    });

    if (!newsItem || newsItem.post.authorId !== userId) {
      return { success: false, error: 'News post not found or permission denied' };
    }

    // Run AI news pipeline to populate category, summary, optimized content, and metadata
    let newsCategory = newsItem.category;
    let newsSummary = newsItem.summary || '';
    let newsContent = newsItem.content;
    let newsMetaDesc = newsItem.metaDescription || '';
    let newsKeywords = newsItem.keywords || '';
    let newsTags = newsItem.tags || '';
    let newsReadingTime = newsItem.readingTime || 1;
    let newsScoreAnalysis = newsItem.scoreAnalysis || null;
    let postStatus = 'published';
    let aiReport = null;

    try {
      const aiResult = await runNewsAIPipeline({
        headline: newsItem.headline,
        content: newsItem.content,
        mediaUrls: newsItem.post.mediaUrls
      });

      newsCategory = aiResult.category;
      newsSummary = aiResult.summary;
      newsContent = aiResult.content;
      newsMetaDesc = aiResult.metaDescription;
      newsKeywords = aiResult.keywords;
      newsTags = aiResult.tags;
      newsReadingTime = aiResult.readingTime;
      newsScoreAnalysis = aiResult.scoreAnalysis;

      if (!aiResult.clean) {
        postStatus = 'flagged_ai';
        aiReport = aiResult.moderationReason;
      }
    } catch (aiErr) {
      console.error("AI pipeline failed on draft publish:", aiErr);
    }

    if (postStatus === 'flagged_ai') {
      // Flag the post as AI flagged in database
      await prisma.post.update({
        where: { id: postId },
        data: {
          status: 'flagged_ai',
          aiReport,
        }
      });
      return {
        success: false,
        error: `AI Content Filter Flagged this article: ${aiReport}. It has been submitted for admin manual review.`
      };
    }

    // B. Calculate real-time SEO, AEO, and GEO optimization scores using automated/optimized parameters
    const seoMetrics = analyzeSEOMetrics({
      headline: newsItem.headline,
      summary: newsSummary,
      metaDesc: newsMetaDesc,
      content: newsContent,
      keywords: newsKeywords,
    });

    // C. Update database records to make the post public/live
    const finalPost = await prisma.post.update({
      where: { id: postId },
      data: {
        status: 'published',
        visibility: validationData.visibility || 'public',
      }
    });

    await prisma.newsPost.update({
      where: { postId },
      data: {
        category: newsCategory,
        summary: newsSummary,
        content: newsContent,
        metaDescription: newsMetaDesc,
        keywords: newsKeywords,
        tags: newsTags,
        readingTime: newsReadingTime,
        seoScore: seoMetrics.seoScore,
        aeoScore: seoMetrics.aeoScore,
        geoScore: seoMetrics.geoScore,
        scoreAnalysis: newsScoreAnalysis || JSON.stringify(seoMetrics.recommendations),
      }
    });

    // Link Tolees (groups)
    await prisma.postTolee.deleteMany({
      where: { postId }
    });
    if (validationData.selectedToleeIds.length > 0) {
      await prisma.postTolee.createMany({
        data: validationData.selectedToleeIds.map(toleeId => ({
          postId,
          toleeId
        }))
      });
    }

    // Revalidate paths
    safeRevalidatePath('/');
    safeRevalidatePath('/news');
    safeRevalidatePath(`/news/${newsItem.slug}`);

    return { success: true, slug: newsItem.slug };
  } catch (err: any) {
    console.error('Error publishing news:', err);
    return { success: false, error: err.message || 'Failed to publish news' };
  }
}

// 3. Delete News Server Action
export async function deleteNews(postId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    const isSuperAdmin = session.user.email === process.env.SUPER_ADMIN_EMAIL;
    if (!post || (post.authorId !== userId && !isSuperAdmin)) {
      return { success: false, error: 'Unauthorized delete request' };
    }

    // Cascade deletion removes NewsPost due to schema constraint onDelete: Cascade
    await prisma.post.delete({
      where: { id: postId }
    });

    safeRevalidatePath('/');
    safeRevalidatePath('/news');

    return { success: true };
  } catch (err: any) {
    console.error('Error deleting news:', err);
    return { success: false, error: err.message || 'Failed to delete news' };
  }
}

// 4. Retrieve single News Post by Slug
export async function getNewsBySlug(slug: string) {
  try {
    let news = await prisma.newsPost.findUnique({
      where: { slug },
      include: {
        post: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true,
              }
            },
            likes: true,
            comments: {
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                  }
                }
              }
            },
            tolees: {
              include: {
                tolee: true
              }
            },
            savedBy: {
              select: {
                userId: true,
              }
            },
            reposts: {
              select: {
                userId: true,
              }
            }
          }
        }
      }
    });

    // Fallback: If not found by slug, try searching by NewsPost id or Post id
    if (!news) {
      news = await prisma.newsPost.findFirst({
        where: {
          OR: [
            { id: slug },
            { postId: slug }
          ]
        },
        include: {
          post: {
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  image: true,
                }
              },
              likes: true,
              comments: {
                include: {
                  author: {
                    select: {
                      id: true,
                      name: true,
                      image: true,
                    }
                  }
                }
              },
              tolees: {
                include: {
                  tolee: true
                }
              },
              savedBy: {
                select: {
                  userId: true,
                }
              },
              reposts: {
                select: {
                  userId: true,
                }
              }
            }
          }
        }
      });
    }

    if (news) {
      // Increment views count asynchronously
      await prisma.newsPost.update({
        where: { id: news.id },
        data: { viewsCount: { increment: 1 } }
      });
    }

    return news;
  } catch (err) {
    console.error('Error loading news by slug:', err);
    return null;
  }
}

// 5. Get Analytics stats for Author Dashboard
export async function getAuthorNewsStats() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    // Retrieve all news posts
    const newsPosts = await prisma.newsPost.findMany({
      where: {
        post: { authorId: userId }
      },
      include: {
        post: {
          include: {
            likes: true,
            comments: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;

    const list = newsPosts.map((n: any) => {
      totalViews += n.viewsCount;
      totalLikes += n.post.likes.length;
      totalComments += n.post.comments.length;

      return {
        id: n.id,
        postId: n.postId,
        headline: n.headline,
        slug: n.slug,
        views: n.viewsCount,
        likes: n.post.likes.length,
        comments: n.post.comments.length,
        createdAt: n.createdAt,
      };
    });

    return {
      success: true,
      stats: {
        totalViews,
        totalLikes,
        totalComments,
        articlesCount: newsPosts.length,
      },
      articles: list
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch analytics' };
  }
}

// Helper: Real-time SEO/AEO/GEO Analyzers
function analyzeSEOMetrics(data: {
  headline: string;
  summary: string;
  metaDesc: string;
  content: string; // Rich-text string
  keywords: string;
}) {
  const recommendations: string[] = [];
  let seoScore = 70;
  let aeoScore = 65;
  let geoScore = 60;

  // 1. Headline length checks
  if (data.headline.length >= 40 && data.headline.length <= 70) {
    seoScore += 10;
  } else {
    recommendations.push('Optimize news headline to be between 40 and 70 characters.');
    seoScore -= 5;
  }

  // 2. Meta description check
  if (data.metaDesc.length >= 100 && data.metaDesc.length <= 160) {
    seoScore += 10;
  } else {
    recommendations.push('Meta Description should be between 100 and 160 characters for snippets.');
    seoScore -= 10;
  }

  // 3. Keyword presence in headline
  const keywordsArr = data.keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
  if (keywordsArr.length > 0) {
    const hasKwInHeadline = keywordsArr.some(k => data.headline.toLowerCase().includes(k));
    if (hasKwInHeadline) {
      seoScore += 10;
      geoScore += 15; // LLM models prioritize exact keyword matching in headings
    } else {
      recommendations.push('Include at least one target keyword in your news headline.');
    }
  }

  // 4. Content length checks
  const wordCount = data.content.split(/\s+/).length;
  if (wordCount > 600) {
    seoScore += 10;
    aeoScore += 10; // AI answers prefer detailed, authoritative context
  } else {
    recommendations.push('Expand content to over 600 words to improve SEO and AEO authority.');
  }

  // 5. FAQ presence (Critical for AEO search snippets)
  if (data.content.toLowerCase().includes('faq') || data.content.toLowerCase().includes('frequently asked questions')) {
    aeoScore += 20;
    recommendations.push('Great job! FAQ sections improve your ranking in AI snippet answers.');
  } else {
    recommendations.push('Add an FAQ section at the bottom of the article to optimize for Voice Search & Perplexity (AEO).');
  }

  // Bound scores to max 100
  return {
    seoScore: Math.min(100, Math.max(10, seoScore)),
    aeoScore: Math.min(100, Math.max(10, aeoScore)),
    geoScore: Math.min(100, Math.max(10, geoScore)),
    recommendations
  };
}

// Helper: AI Text Scanner using NVIDIA NIM (Llama 3.1 70B Instruct)
async function scanContentAI(headline: string, summary: string, content: string): Promise<{ clean: boolean; reason?: string }> {
  try {
    const fullText = `Headline: ${headline}\nSummary: ${summary}\nContent: ${content}`;
    
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NVIDIA_API_KEY}`
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-70b-instruct',
        messages: [
          {
            role: 'system',
            content: 'You are an AI automated moderator content scanner. Analyze the article text. Flag the post if it contains hate speech, drugs, escort services, air ticket scams, extreme violence, or adult pornography. Reply strictly in JSON format: {"clean": true, "reason": ""} or {"clean": false, "reason": "Reason for flagging"}. Do not add any markdown packaging, block quotes or explanations outside the JSON.'
          },
          {
            role: 'user',
            content: fullText
          }
        ],
        temperature: 0.1,
        max_tokens: 150
      })
    });

    if (!response.ok) {
      console.warn('NVIDIA NIM API moderation check failed with status:', response.status);
      return { clean: true }; // Fallback to avoid blocking if NIM API is down
    }

    const data = await response.json();
    const resultText = data?.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(resultText.trim());
    return {
      clean: parsed.clean !== false,
      reason: parsed.reason || undefined
    };
  } catch (err) {
    console.error('AI Moderation scanner error:', err);
    return { clean: true }; // Fallback to avoid blocking on local connection failures
  }
}

// 6. Get paginated news posts feed
export async function getNewsFeedPosts(options: {
  category?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user ? (session.user as any).id : null;
    const page = options.page || 1;
    const limit = options.limit || 10;
    const category = options.category || 'All';
    // Background trigger: If latest news post is >90 seconds old, fetch fresh news & YouTube videos
    const checkAndTriggerFreshNews = async () => {
      try {
        const latestNews = await prisma.newsPost.findFirst({
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true }
        });
        const ageMs = latestNews ? Date.now() - new Date(latestNews.createdAt).getTime() : Infinity;
        if (ageMs > 90 * 1000) { // >90 seconds old
          const { publishDailyNewsBatch } = require('@/lib/newsAutoPublisher');
          const { publishYouTubeVideosBatch } = require('@/lib/youtubeAutoPublisher');
          publishDailyNewsBatch().catch(() => {});
          publishYouTubeVideosBatch(false).catch(() => {});
        }
      } catch (e) {}
    };
    checkAndTriggerFreshNews();

    const skip = (page - 1) * limit;

    const newsList = await prisma.newsPost.findMany({
      where: {
        post: {
          status: 'published',
          isArchived: false,
        },
        ...(category && category !== 'All' ? { category } : {}),
      },
      include: {
        post: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true,
                isPrivate: true,
              }
            },
            likes: {
              select: {
                userId: true,
              }
            },
            comments: {
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                    image: true,
                  }
                }
              },
              orderBy: { createdAt: 'desc' }
            },
            tolees: {
              include: {
                tolee: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  }
                }
              }
            },
            savedBy: {
              select: {
                userId: true,
              }
            },
            reposts: {
              select: {
                userId: true,
              }
            },
            _count: {
              select: {
                likes: true,
                comments: true,
                views: true,
                reposts: true,
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const mappedNews = newsList.map((item: any) => {
      const post = item.post;
      const firstTolee = post?.tolees?.[0]?.tolee || null;
      
      const likedByMe = currentUserId ? post?.likes?.some((like: any) => like.userId === currentUserId) : false;
      const savedByMe = currentUserId ? post?.savedBy?.some((save: any) => save.userId === currentUserId) : false;
      const repostedByMe = currentUserId ? post?.reposts?.some((rep: any) => rep.userId === currentUserId) : false;

      return {
        ...item,
        likedByMe,
        savedByMe,
        repostedByMe,
        post: {
          ...post,
          toleeName: firstTolee?.name || null,
          toleeSlug: firstTolee?.slug || null,
        }
      };
    });

    // Server-side strict deduplication by headline key
    const seenHeadlines = new Set<string>();
    const uniqueMappedNews = mappedNews.filter((item: any) => {
      const key = item.headline?.toLowerCase().trim().replace(/[^\w]/g, '').slice(0, 35);
      if (key && seenHeadlines.has(key)) return false;
      if (key) seenHeadlines.add(key);
      return true;
    });

    // Interleave: News Post -> Video Post -> News Post -> Video Post
    const textNews: any[] = [];
    const videoNews: any[] = [];

    for (const item of uniqueMappedNews) {
      const p = item.post;
      const isVid = p?.postType === 'reel' || 
                    (p?.mediaTypes && p?.mediaTypes.includes('video')) || 
                    (p?.mediaUrls && (p?.mediaUrls.includes('youtube') || p?.mediaUrls.includes('.mp4') || p?.mediaUrls.includes('youtu.be')));
      if (isVid) {
        videoNews.push(item);
      } else {
        textNews.push(item);
      }
    }

    let finalNewsStream = uniqueMappedNews;
    if (textNews.length > 0 && videoNews.length > 0) {
      const interleaved: any[] = [];
      let nIdx = 0;
      let vIdx = 0;
      while (nIdx < textNews.length || vIdx < videoNews.length) {
        if (nIdx < textNews.length) interleaved.push(textNews[nIdx++]);
        if (vIdx < videoNews.length) interleaved.push(videoNews[vIdx++]);
      }
      finalNewsStream = interleaved;
    }

    // Check if there are more posts in the next batch
    const hasMore = newsList.length === limit;

    return {
      success: true,
      news: JSON.parse(JSON.stringify(finalNewsStream)),
      hasMore
    };
  } catch (err: any) {
    console.error('Error fetching news feed posts:', err);
    return { success: false, error: err.message || 'Failed to fetch news posts' };
  }
}

