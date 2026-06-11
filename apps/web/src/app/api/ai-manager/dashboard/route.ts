import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserId = (session.user as any).id;

    // 1. Fetch real notifications
    const dbNotifications = await prisma.notification.findMany({
      where: { userId: currentUserId },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // 2. Fetch real comments on user's posts
    const userComments = await prisma.comment.findMany({
      where: {
        post: {
          authorId: currentUserId
        }
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            image: true
          }
        },
        post: {
          select: {
            id: true,
            caption: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 15
    });

    // 3. Fetch groups user is member of
    const userTolees = await prisma.toleeMember.findMany({
      where: { userId: currentUserId, status: 'approved' },
      include: {
        tolee: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });

    const groupsList = userTolees.map(ut => ({
      id: ut.tolee.id,
      name: ut.tolee.name,
      slug: ut.tolee.slug
    }));

    // 4. Run semantic reranker on comments using NVIDIA Llama Nemotron Rerank
    const rerankApiKey = process.env.NVIDIA_RERANK_KEY || process.env.NVIDIA_API_KEY;
    let semanticCategorizedComments: any[] = [];

    if (rerankApiKey && userComments.length > 0) {
      try {
        const passages = userComments.map(c => ({ text: c.content }));

        // Pass 1: Rerank against Buying/Purchase Inquiry Intent
        const leadResponse = await fetch('https://ai.api.nvidia.com/v1/retrieval/nvidia/reranking', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${rerankApiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            model: "nvidia/llama-nemotron-rerank-1b-v2",
            query: { text: "customer interested in buying, price inquiry, business query, property purchase interest, product cost, ordering details, contact details, or whatsapp number" },
            passages: passages,
            truncate: "END"
          }),
          signal: AbortSignal.timeout(8000)
        });

        // Pass 2: Rerank against Spam/Advertising Intent
        const spamResponse = await fetch('https://ai.api.nvidia.com/v1/retrieval/nvidia/reranking', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${rerankApiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            model: "nvidia/llama-nemotron-rerank-1b-v2",
            query: { text: "cryptocurrency crypto spam, win free money cash lottery, follow back link, telegram channel promo, advertising link, or bot spam" },
            passages: passages,
            truncate: "END"
          }),
          signal: AbortSignal.timeout(8000)
        });

        if (leadResponse.ok && spamResponse.ok) {
          const leadData = await leadResponse.json();
          const spamData = await spamResponse.json();

          const leadScores = new Map<number, number>();
          const spamScores = new Map<number, number>();

          if (leadData.rankings && Array.isArray(leadData.rankings)) {
            for (const r of leadData.rankings) {
              leadScores.set(r.index, r.logit !== undefined ? r.logit : r.score ?? -999);
            }
          }
          if (spamData.rankings && Array.isArray(spamData.rankings)) {
            for (const r of spamData.rankings) {
              spamScores.set(r.index, r.logit !== undefined ? r.logit : r.score ?? -999);
            }
          }

          semanticCategorizedComments = userComments.map((comment, index) => {
            const leadScore = leadScores.get(index) ?? -999;
            const spamScore = spamScores.get(index) ?? -999;

            let priority: 'high' | 'medium' | 'low' = 'low';
            let isLead = false;
            let isSpam = false;

            // In NVIDIA Rerank, logits or scores represent relevance.
            // A score/logit > -1.5 is standard indicator of relevance.
            if (spamScore > -1.2) {
              isSpam = true;
            } else if (leadScore > -1.5) {
              isLead = true;
              priority = 'high';
            } else {
              const content = comment.content.toLowerCase();
              if (
                content.includes('?') || 
                content.includes('what') || 
                content.includes('how') || 
                content.includes('where') || 
                content.includes('when') || 
                content.includes('why')
              ) {
                priority = 'medium';
              }
            }

            return {
              id: comment.id,
              content: comment.content,
              createdAt: comment.createdAt,
              author: comment.author,
              post: comment.post,
              priority,
              isLead,
              isSpam
            };
          });
        }
      } catch (err) {
        console.error("NVIDIA Semantic Reranker error, using rule-based fallbacks:", err);
      }
    }

    // Standardized rule-based fallback analyzer if semantic API is not configured or failed
    const categorizedComments = semanticCategorizedComments.length > 0 
      ? semanticCategorizedComments 
      : userComments.map(comment => {
          const content = comment.content.toLowerCase();
          let priority: 'high' | 'medium' | 'low' = 'low';
          let isLead = false;
          let isSpam = false;

          // Spam rules
          if (
            content.includes('free money') || 
            content.includes('cryptocurrency') || 
            content.includes('win cash') || 
            content.includes('follow back') || 
            content.includes('spam') ||
            content.includes('http') ||
            content.includes('t.me')
          ) {
            isSpam = true;
          }

          // Lead rules (buying intention / queries)
          if (
            content.includes('price') || 
            content.includes('how much') || 
            content.includes('cost') || 
            content.includes('interested') || 
            content.includes('buy') || 
            content.includes('contact') || 
            content.includes('phone') || 
            content.includes('mobile') || 
            content.includes('whatsapp') || 
            content.includes('dm me') ||
            content.includes('available')
          ) {
            priority = 'high';
            isLead = true;
          } else if (
            content.includes('?') || 
            content.includes('what') || 
            content.includes('how') || 
            content.includes('where') || 
            content.includes('when') || 
            content.includes('why')
          ) {
            priority = 'medium';
          }

          return {
            id: comment.id,
            content: comment.content,
            createdAt: comment.createdAt,
            author: comment.author,
            post: comment.post,
            priority,
            isLead,
            isSpam
          };
        });

    // Extract leads
    const leadsList = categorizedComments.filter(c => c.isLead);

    // Extract spams
    const spamsList = categorizedComments.filter(c => c.isSpam);

    // Mock dashboard metrics (Growth parameters)
    const metrics = {
      growthScore: 84,
      growthChange: 4.8,
      reachScore: 72,
      reachChange: 6.2,
      engagementScore: 68,
      engagementChange: -1.5,
      consistencyScore: 92,
      followerHistory: [1020, 1032, 1054, 1089, 1102, 1140, 1175] // last 7 days
    };

    // 5. LLM Call to NVIDIA Llama if API Key is configured for dynamic personalized planning
    const apiKey = process.env.NVIDIA_API_KEY;
    let coachSuggestions = [
      'Post between 7:00 PM and 9:00 PM today for highest audience activity.',
      'Create more video content. Reels receive 4x more engagement than text updates.',
      'Target real estate and investment groups like "Mumbai Real Estate" for property posts.',
      'Share a client testimonial to build trust on the platform.'
    ];

    let trendingTopics = [
      'Property investment trends in Kalyan-Dombivli.',
      'Advantage+ Creative hacks for local brands.',
      'Top 3 home decor trends for 2026.'
    ];

    if (apiKey) {
      try {
        const prompt = `You are a social media growth coach. Analyze this metadata:
- Total groups joined: ${groupsList.length} (${groupsList.map(g => g.name).join(', ')})
- Pending Leads: ${leadsList.length}
- Recent notifications count: ${dbNotifications.length}

Generate 4 short growth suggestions (single-sentence advice) and 3 trending topic ideas in JSON format.
Output format:
{
  "suggestions": ["advice 1", "advice 2", "advice 3", "advice 4"],
  "trends": ["topic 1", "topic 2", "topic 3"]
}`;

        const llmResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'meta/llama-3.1-70b-instruct',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            max_tokens: 300,
            response_format: { type: 'json_object' }
          })
        });

        if (llmResponse.ok) {
          const resJson = await llmResponse.json();
          const content = JSON.parse(resJson.choices[0].message.content);
          if (Array.isArray(content.suggestions)) coachSuggestions = content.suggestions;
          if (Array.isArray(content.trends)) trendingTopics = content.trends;
        }
      } catch (err) {
        console.error("LLM Suggestions failed, using fallbacks:", err);
      }
    }

    return NextResponse.json({
      success: true,
      metrics,
      notifications: dbNotifications,
      comments: categorizedComments,
      leads: leadsList,
      spam: spamsList,
      groups: groupsList,
      coachSuggestions,
      trendingTopics
    });

  } catch (error: any) {
    console.error('API Error in GET /api/ai-manager/dashboard:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
