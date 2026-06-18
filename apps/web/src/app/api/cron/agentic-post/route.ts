import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRandomAgenticVideo } from '@/lib/agenticVideos';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return handleAgenticPosting(req);
}

export async function POST(req: NextRequest) {
  return handleAgenticPosting(req);
}

async function handleAgenticPosting(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');
    const envSecret = process.env.CRON_SECRET || 'tolee-cron-agentic-secret-key-2026';
    
    // Auth check
    if (secret !== envSecret && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch all users who have agentic posting enabled
    const agentUsers = await prisma.user.findMany({
      where: {
        agenticReelsEnabled: true,
        isSuspended: false,
        isBanned: false
      },
      select: {
        id: true,
        username: true,
        name: true,
        agenticInterval: true,
        agenticLastPostAt: true
      }
    });

    if (agentUsers.length === 0) {
      return NextResponse.json({ message: 'No active agent users found.', postedCount: 0 });
    }

    const now = new Date();
    const postedUsers: string[] = [];

    // 2. Filter users who are due for a post based on interval
    for (const user of agentUsers) {
      let isDue = false;
      const lastPost = user.agenticLastPostAt;

      if (!lastPost) {
        // Never posted before, so it's due
        isDue = true;
      } else {
        const diffMs = now.getTime() - new Date(lastPost).getTime();
        const diffMins = diffMs / (1000 * 60);

        if (user.agenticInterval === '20_MINS' && diffMins >= 19.5) {
          isDue = true;
        } else if (user.agenticInterval === '1_HOUR' && diffMins >= 59.5) {
          isDue = true;
        } else if (user.agenticInterval === 'DAILY' && diffMins >= 1439.5) {
          // 24 hours
          isDue = true;
        }
      }

      if (!isDue) continue;

      // 3. Post a reel for this user
      const video = getRandomAgenticVideo();
      let caption = video.defaultCaptions[Math.floor(Math.random() * video.defaultCaptions.length)];

      // 4. Try generating a dynamic caption using Llama/NVIDIA API if key exists
      const apiKey = process.env.NVIDIA_API_KEY;
      if (apiKey) {
        try {
          const apiMessages = [
            {
              role: 'system',
              content: `You are the Tolee AI Reel Assistant. Write a natural, human-like social media caption for a short vertical video (Reel/Short) of category: "${video.category}".
Rules:
- Write in Hinglish (Hindi + English mix) or simple colloquial English as used by youth in Maharashtra, India.
- Keep it engaging, friendly, and include 2-4 relevant emojis.
- Include 3-4 hashtags (including #tolee, #reels, and ones specific to the category).
- Do not mention that you are an AI.
- Respond with a single JSON object having the exact key: "caption".`
            },
            {
              role: 'user',
              content: `Write a caption for a vertical video of category "${video.category}".`
            }
          ];

          const llmRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'meta/llama-3.1-70b-instruct',
              messages: apiMessages,
              temperature: 0.7,
              max_tokens: 300,
              response_format: { type: 'json_object' }
            })
          });

          if (llmRes.ok) {
            const data = await llmRes.json();
            const text = data?.choices?.[0]?.message?.content || '';
            const parsed = JSON.parse(text);
            if (parsed.caption) {
              caption = parsed.caption;
            }
          }
        } catch (err) {
          console.warn(`[Agentic Post] AI Caption generation failed for user ${user.username || user.id}, falling back to static caption.`, err);
        }
      }

      // 5. Find a Tolee (group) to associate the reel post with
      // Try user's joined Tolees first
      let targetToleeId: string | null = null;
      const userTolee = await prisma.toleeMember.findFirst({
        where: { userId: user.id, status: 'approved' },
        select: { toleeId: true }
      });

      if (userTolee) {
        targetToleeId = userTolee.toleeId;
      } else {
        // Fallback to any public Tolee
        const publicTolee = await prisma.tolee.findFirst({
          where: { isPrivate: false },
          select: { id: true }
        });
        if (publicTolee) {
          targetToleeId = publicTolee.id;
        }
      }

      // 6. Create the Reel Post in the database
      const postData: any = {
        caption,
        postType: 'reel',
        mediaUrls: video.url,
        mediaTypes: 'video',
        status: 'published',
        authorId: user.id
      };

      if (targetToleeId) {
        postData.tolees = {
          create: [
            { toleeId: targetToleeId }
          ]
        };
      }

      await prisma.post.create({
        data: postData
      });

      // 7. Update User's last active and last post timestamp
      await prisma.user.update({
        where: { id: user.id },
        data: {
          agenticLastPostAt: now,
          lastActiveAt: now
        }
      });

      postedUsers.push(`${user.name} (@${user.username || 'unknown'})`);
    }

    return NextResponse.json({
      success: true,
      message: `Checked ${agentUsers.length} agent users.`,
      postedCount: postedUsers.length,
      postedUsers
    });

  } catch (error: any) {
    console.error('Error in agentic-post cron:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
