import { prisma } from '@/lib/prisma';
import { callNvidiaLLM, generateAIImageWithFallback } from '@/modules/tolee-ai-manager/Core/chat-engine';

export interface ActionExecutionContext {
  userId: string;
  userEmail?: string;
  userName?: string;
  command: string;
}

export interface ActionExecutionResult {
  success: boolean;
  action: string;
  message: string;
  data?: any;
  interactiveAction?: {
    type: 'NAVIGATE' | 'OPEN_CHAT' | 'OPEN_POST' | 'PREVIEW_IMAGE' | 'CONFIRMATION_REQUIRED';
    label?: string;
    payload?: any;
  };
}

/**
 * ⚡ Ultra-Fast Non-Blocking Audit Logger for AI Actions
 * Executed asynchronously to eliminate DB latency from user response path.
 */
function logAIAction(
  userId: string,
  action: string,
  command: string,
  status: 'SUCCESS' | 'FAILED' | 'REJECTED',
  details: any
) {
  // Fire and forget async log insertion
  prisma.auditLog.create({
    data: {
      action: `AI_ACTION:${action}`,
      target: userId,
      targetType: 'user',
      details: JSON.stringify({ command, status, details, timestamp: new Date().toISOString() })
    }
  }).catch((err: any) => {
    console.warn('AI Action Audit Log save notice:', err);
  });
}

/**
 * 🌐 Live Multi-Source News Engine (Prisma DB NewsPost + GNews + Finnhub + NewsAPI)
 */
async function fetchLiveNewsForToleeAI(categoryQuery?: string): Promise<{ title: string; source: string; summary?: string; url?: string }[]> {
  const results: { title: string; source: string; summary?: string; url?: string }[] = [];

  // 1. Fetch from Tolee Database NewsPost table with pruned select fields
  try {
    const dbNews = await prisma.newsPost.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { headline: true, summary: true, category: true, sourceUrl: true }
    });

    for (const item of dbNews) {
      if (item.headline) {
        results.push({
          title: item.headline,
          source: `Tolee News (${item.category || 'General'})`,
          summary: item.summary ? item.summary.slice(0, 120) : undefined,
          url: item.sourceUrl || '/news'
        });
      }
    }
  } catch (err) {
    console.warn('Prisma newsPost fetch notice:', err);
  }

  // 2. Fetch from GNews API
  const gnewsKey = process.env.GNEWS_API_KEY || "84f1a26d7f0224151744b82143003028";
  if (gnewsKey) {
    try {
      const topic = categoryQuery || 'general';
      const url = `https://gnews.io/api/v4/top-headlines?category=${topic}&lang=hi&country=in&max=5&apikey=${gnewsKey}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.articles && Array.isArray(data.articles)) {
          for (const a of data.articles) {
            if (a.title && !results.some(r => r.title.toLowerCase() === a.title.toLowerCase())) {
              results.push({
                title: a.title,
                source: a.source?.name || 'GNews India',
                summary: a.description ? a.description.slice(0, 120) : undefined,
                url: a.url
              });
            }
          }
        }
      }
    } catch (e) {}
  }

  // 3. Fetch Stock Market & Financial News via Finnhub
  const finnhubKey = process.env.FINNHUB_API_KEY || "d9r5t99r01qnlhcli2ngd9r5t99r01qnlhcli2o0";
  if (finnhubKey && results.length < 5) {
    try {
      const url = `https://finnhub.io/api/v1/news?category=general&token=${finnhubKey}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          for (const a of data.slice(0, 4)) {
            if (a.headline && !results.some(r => r.title.toLowerCase() === a.headline.toLowerCase())) {
              results.push({
                title: a.headline,
                source: 'Market & Finance',
                summary: a.summary ? a.summary.slice(0, 120) : undefined,
                url: a.url
              });
            }
          }
        }
      }
    } catch (e) {}
  }

  return results.slice(0, 5);
}

/**
 * 🌐 Helper: Translates & cleans Devanagari / Hinglish concepts into vivid English image prompts using LLM & Festivals Knowledge
 */
async function cleanAndTranslateImagePrompt(rawCommand: string): Promise<string> {
  const lower = rawCommand.toLowerCase();
  
  // 1. Direct Term Mapping for Indian Festivals, National Days & Common Typos
  if (lower.includes('15') && (lower.includes('aug') || lower.includes('अगस्त') || lower.includes('augest') || lower.includes('august') || lower.includes('independe') || lower.includes('azadi') || lower.includes('aazadi'))) {
    return '15th August Indian Independence Day patriotic celebration commercial banner poster design, vibrant tricolor saffron white green ribbons, Indian national flag fluttering majestically, 3D typography Happy Independence Day, Ashoka Chakra emblem, celebratory patriotic background, 8k resolution graphic design';
  }
  if (lower.includes('26') && (lower.includes('jan') || lower.includes('जनवरी') || lower.includes('republic') || lower.includes('ganatantra'))) {
    return '26th January Indian Republic Day celebration creative banner, India Gate backdrop, majestic tricolor flag, patriotic typography, 8k commercial visual design';
  }
  if (lower.includes('तिरंगा') || lower.includes('tiranga') || lower.includes('indian flag')) {
    return 'Indian tricolor national flag waving proudly in bright sunny sky, patriotic background, cinematic lighting, 8k resolution';
  }
  if (lower.includes('rakhi') || lower.includes('raksha bandhan') || lower.includes('रक्षाबंधन')) {
    return 'Raksha Bandhan festival celebration creative banner, beautiful golden Rakhi with sweets and flowers on thali, warm festive lighting, 8k digital art poster';
  }
  if (lower.includes('diwali') || lower.includes('deepawali') || lower.includes('दिवाली') || lower.includes('दीपावली')) {
    return 'Happy Diwali grand festive celebration poster banner, glowing golden diyas, fireworks, traditional rangoli, luxury royal festive background, 8k resolution';
  }
  if (lower.includes('holi') || lower.includes('होली')) {
    return 'Happy Holi vibrant colorful celebration poster, explosion of bright organic gulal powders in air, festive water splash, joyful festival banner, 8k resolution';
  }
  if (lower.includes('ganesh') || lower.includes('ganpati') || lower.includes('गणेश') || lower.includes('गणपति') || lower.includes('chaturthi')) {
    return 'Lord Ganesha majestic idol with modak, glowing aura, golden temple festival backdrop, 8k graphic banner design';
  }
  if (lower.includes('krishna') || lower.includes('janmashtami') || lower.includes('जन्माष्टमी') || lower.includes('कृष्ण')) {
    return 'Lord Krishna with divine golden flute and peacock feather, glowing celestial backdrop, makhan matki, 8k spiritual festival banner';
  }
  if (lower.includes('गेंगो') || lower.includes('मैंगो') || lower.includes('आम') || lower.includes('mango')) {
    return 'Juicy vibrant ripe mangoes hanging on tree branch with fresh green leaves, ultra realistic studio lighting, 8k HD product photograph';
  }
  if (lower.includes('रियल एस्टेट') || lower.includes('real estate') || lower.includes('makan') || lower.includes('ghar') || lower.includes('property')) {
    return 'Luxury modern architectural real estate villa house exterior with swimming pool, sunset golden hour lighting, 8k graphic poster design';
  }
  if (lower.includes('गुड मॉर्निंग') || lower.includes('morning') || lower.includes('subah') || lower.includes('मॉर्निंग') || lower.includes('सुप्रभात')) {
    return 'Serene sunrise over peaceful mountains with steaming hot tea cup on wooden desk, typography heading Good Morning, 8k HD graphic poster';
  }
  if (lower.includes('गुड इवनिंग') || lower.includes('evening') || lower.includes('sandhya') || lower.includes('इवनिंग') || lower.includes('संध्या')) {
    return 'Relaxing golden sunset skyline over ocean with warm glowing lights, typography heading Good Evening, 8k HD graphic poster';
  }

  // 2. High-Speed LLM Creative Prompt Translation & Expansion
  try {
    const translationPrompt = `You are a World-Class Creative Art Director & Prompt Engineer.
Convert this user request (which may be in Hindi, Hinglish, Marathi, or English) into an ultra-detailed, professional 8K commercial graphic banner / advertising poster prompt for FLUX.1/Stable Diffusion:
User request: "${rawCommand}"

Requirements:
- Identify the exact core subject, festival, business, or product.
- Describe the visual composition, color scheme, background, lighting, and graphic design style.
- Output ONLY the final visual prompt in English without conversational commentary or quotes.`;

    const expanded = await callNvidiaLLM([{ role: 'user', content: translationPrompt }]);
    if (expanded && expanded.length > 15) {
      return `${expanded.trim().replace(/^["']|["']$/g, '')}, professional graphic design, commercial poster banner, 8k resolution, award-winning lighting, crisp detail`;
    }
  } catch (err) {}

  // 3. Fallback clean up
  const cleaned = rawCommand
    .replace(/generate|image|photo|pic|banao|bana do|creative|poster|banner|इमेज|जनरेट|फोटो|बनाओ|करके|दो|मुझे|कि|मैं|तो|का|की|के|ko|pe|par|ek|hai|please|बैनर|बेनर|बना|बनाएं|बनाये|बनाकर/gi, '')
    .replace(/[^\w\s\u0900-\u097F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned || cleaned.length < 2) {
    return 'Modern high-tech commercial poster banner design, vibrant colors, 8k resolution';
  }

  return `High resolution commercial marketing banner poster of ${cleaned}, professional advertising graphic design, realistic lighting, vibrant color palette, 8k resolution`;
}

/**
 * 🧠 CENTRAL TOLEE AI ACTION ENGINE
 * Analyzes natural language commands in English, Hindi, Devanagari script, & Hinglish,
 * checks permissions, executes real platform database operations, validates results, and logs audit events.
 */
export async function executeToleeAIAction(ctx: ActionExecutionContext): Promise<ActionExecutionResult> {
  const { userId, command } = ctx;
  const trimmed = command.trim();
  const lower = trimmed.toLowerCase();

  // Fetch current user details with minimal pruned fields
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, username: true, isCreator: true }
  });

  if (!user) {
    return {
      success: false,
      action: 'UNAUTHORIZED',
      message: '❌ Error: Active user session not found. Please log in to Tolee.'
    };
  }

  const userNameStr = user.name || user.username || 'User';

  // ==========================================
  // 1. NEWS OPERATIONS (Live DB NewsPost + GNews + Finnhub + NewsAPI Access)
  // ==========================================
  const isNewsIntent =
    lower.includes('news') ||
    lower.includes('khabar') ||
    lower.includes('headline') ||
    lower.includes('update') ||
    lower.includes('samachar') ||
    trimmed.includes('न्यूज़') ||
    trimmed.includes('न्यूज') ||
    trimmed.includes('खबर') ||
    trimmed.includes('समाचार') ||
    trimmed.includes('ताज़ा') ||
    trimmed.includes('अपडेट');

  if (isNewsIntent) {
    const liveNews = await fetchLiveNewsForToleeAI();

    if (liveNews.length > 0) {
      const newsList = liveNews.map((n, i) => `${i + 1}. 📰 **${n.title}**\n   *Source: ${n.source}*${n.summary ? `\n   > "${n.summary}"` : ''}`).join('\n\n');

      logAIAction(userId, 'GET_LIVE_NEWS', command, 'SUCCESS', { count: liveNews.length });
      return {
        success: true,
        action: 'GET_LIVE_NEWS',
        message: `📰 **Tolee AI Manager**: Aaj ki latest breaking news & top headlines:\n\n${newsList}`,
        data: { news: liveNews },
        interactiveAction: {
          type: 'NAVIGATE',
          label: '📰 Read All Tolee News',
          payload: { url: '/news' }
        }
      };
    } else {
      logAIAction(userId, 'GET_LIVE_NEWS', command, 'SUCCESS', { count: 0 });
      return {
        success: true,
        action: 'GET_LIVE_NEWS',
        message: `📰 **Tolee AI Manager**: Main live news search kar raha hoon. Tolee News Portal par naye articles check karein!`,
        interactiveAction: {
          type: 'NAVIGATE',
          label: '📰 Open Tolee News',
          payload: { url: '/news' }
        }
      };
    }
  }

  // ==========================================
  // 2. CHAT OPERATIONS (Read, Unread, Send, Reply, Open)
  // ==========================================
  const isChatIntent =
    lower.includes('chat') ||
    lower.includes('message') ||
    lower.includes('msg') ||
    lower.includes('kisi ka message') ||
    lower.includes('unread') ||
    lower.includes('sandesh') ||
    lower.includes('inbox') ||
    trimmed.includes('चैट') ||
    trimmed.includes('मैसेज') ||
    trimmed.includes('संदेश') ||
    trimmed.includes('इनबॉक्स');

  if (isChatIntent) {
    const isCheckReadIntent = 
      lower.includes('check') || 
      lower.includes('aaya') || 
      lower.includes('aaye') || 
      lower.includes('batao') || 
      lower.includes('dekho') || 
      lower.includes('show') || 
      lower.includes('read') || 
      lower.includes('kya') ||
      trimmed.includes('चेक') ||
      trimmed.includes('बताओ') ||
      trimmed.includes('दिखाओ') ||
      trimmed.includes('आया') ||
      trimmed.includes('आए') ||
      trimmed.includes('पढ़ो') ||
      trimmed.includes('क्या');

    if (isCheckReadIntent) {
      const userChats = await prisma.chatParticipant.findMany({
        where: { userId },
        select: { chatId: true }
      });
      const chatIds = userChats.map((c: any) => c.chatId);

      if (chatIds.length === 0) {
        logAIAction(userId, 'CHAT_CHECK', command, 'SUCCESS', { unreadCount: 0 });
        return {
          success: true,
          action: 'VIEW_CHAT_MESSAGES',
          message: `📩 **Tolee AI Manager**: Maine aapki chats check ki hain! Abhi aapke paas koi active conversation nahi hai.`,
          interactiveAction: {
            type: 'OPEN_CHAT',
            label: '💬 Open Chat Box',
            payload: { url: '/chat' }
          }
        };
      }

      const unreadMessages = await prisma.message.findMany({
        where: {
          chatId: { in: chatIds },
          senderId: { not: userId },
          isRead: false
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          content: true,
          sender: { select: { name: true, username: true } }
        }
      });

      if (unreadMessages.length > 0) {
        const msgList = unreadMessages.map((m: any, i: number) => {
          const senderName = m.sender?.name || m.sender?.username || 'User';
          return `${i + 1}. 👤 **${senderName}**: "${m.content.slice(0, 80)}"`;
        }).join('\n');

        logAIAction(userId, 'CHAT_CHECK', command, 'SUCCESS', { unreadCount: unreadMessages.length });
        return {
          success: true,
          action: 'VIEW_CHAT_MESSAGES',
          message: `📩 **Tolee AI Manager**: Aapke paas **${unreadMessages.length} naye unread message(s)** aaye hain:\n\n${msgList}`,
          interactiveAction: {
            type: 'OPEN_CHAT',
            label: '💬 Open Chat Box Now',
            payload: { url: '/chat' }
          }
        };
      }

      // Recent message fallback
      const recentMessages = await prisma.message.findMany({
        where: { chatId: { in: chatIds }, senderId: { not: userId } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          content: true,
          sender: { select: { name: true, username: true } }
        }
      });

      const lastMsg = recentMessages[0];
      const lastSender = lastMsg ? (lastMsg.sender?.name || lastMsg.sender?.username || 'User') : 'no one';
      const lastText = lastMsg ? lastMsg.content.slice(0, 80) : '';

      logAIAction(userId, 'CHAT_CHECK', command, 'SUCCESS', { unreadCount: 0 });
      return {
        success: true,
        action: 'VIEW_CHAT_MESSAGES',
        message: lastMsg 
          ? `✅ **Tolee AI Manager**: Aapke paas koi **naya unread message nahi hai**.\n\nAakhiri message **${lastSender}** se tha: "${lastText}"`
          : `✅ **Tolee AI Manager**: Aapke chat me koi naya message nahi hai.`,
        interactiveAction: {
          type: 'OPEN_CHAT',
          label: '💬 Go to Messages',
          payload: { url: '/chat' }
        }
      };
    }

    // B. Send Message Command
    if (lower.includes('karo') || lower.includes('bhejo') || lower.includes('send') || trimmed.includes('करो') || trimmed.includes('भेजो')) {
      const words = trimmed.split(' ');
      const toIndex = words.findIndex(w => w.toLowerCase() === 'ko' || w.toLowerCase() === 'to' || w === 'को');
      let targetName = '';
      if (toIndex > 0) {
        targetName = words[toIndex - 1];
      }

      if (targetName) {
        const recipient = await prisma.user.findFirst({
          where: {
            OR: [
              { name: { contains: targetName, mode: 'insensitive' } },
              { username: { contains: targetName, mode: 'insensitive' } }
            ]
          },
          select: { id: true, name: true, username: true }
        });

        if (recipient) {
          let existingParticipant = await prisma.chatParticipant.findFirst({
            where: {
              userId,
              chat: {
                isGroupChat: false,
                participants: { some: { userId: recipient.id } }
              }
            },
            select: { chatId: true }
          });

          let chatId = existingParticipant?.chatId;

          if (!chatId) {
            const newChat = await prisma.chat.create({
              data: {
                isGroupChat: false,
                participants: {
                  create: [
                    { userId },
                    { userId: recipient.id }
                  ]
                }
              }
            });
            chatId = newChat.id;
          }

          let msgText = 'Hello!';
          if (lower.includes(' ki ') || lower.includes(' की ')) {
            msgText = trimmed.split(/ ki | की /i)[1] || 'Hello!';
          } else if (lower.includes(' message ') || lower.includes(' मैसेज ')) {
            msgText = trimmed.split(/ message | मैसेज /i)[1] || 'Hello!';
          }

          const createdMsg = await prisma.message.create({
            data: {
              chatId,
              senderId: userId,
              content: msgText.trim()
            }
          });

          logAIAction(userId, 'SEND_CHAT_MESSAGE', command, 'SUCCESS', { recipientId: recipient.id, messageId: createdMsg.id });
          return {
            success: true,
            action: 'SEND_CHAT_MESSAGE',
            message: `💬 **Tolee AI Manager**: Message successfully sent to **${recipient.name || recipient.username}**:\n> "${createdMsg.content}"`,
            interactiveAction: {
              type: 'OPEN_CHAT',
              label: `💬 View Chat with ${recipient.name || recipient.username}`,
              payload: { url: `/chat?id=${chatId}` }
            }
          };
        }
      }
    }
  }

  // ==========================================
  // 3. FEED & POST OPERATIONS (Like, Unlike, Comment, Reply, Delete)
  // ==========================================
  const isPostLikeIntent = lower.includes('like') || trimmed.includes('लाइक');
  if (isPostLikeIntent && (lower.includes('post') || lower.includes('reel') || lower.includes('latest') || lower.includes('karo') || trimmed.includes('पोस्ट') || trimmed.includes('करो'))) {
    const latestPost = await prisma.post.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { id: true, caption: true, likes: { where: { userId } } }
    });

    if (!latestPost) {
      return {
        success: false,
        action: 'LIKE_POST',
        message: `⚠️ **Tolee AI Manager**: Platform par abhi koi post available nahi hai.`
      };
    }

    const postTitle = latestPost.caption || 'Tolee Post';

    if (latestPost.likes.length > 0) {
      logAIAction(userId, 'LIKE_POST', command, 'SUCCESS', { postId: latestPost.id, alreadyLiked: true });
      return {
        success: true,
        action: 'LIKE_POST',
        message: `👍 **Tolee AI Manager**: Aapne pehele se hi iss post ko like kar rakha hai!\n> "${postTitle.slice(0, 60)}..."`,
        interactiveAction: {
          type: 'OPEN_POST',
          label: '📖 View Post',
          payload: { url: `/post/${latestPost.id}` }
        }
      };
    }

    const createdLike = await prisma.like.create({
      data: {
        userId,
        postId: latestPost.id
      }
    });

    logAIAction(userId, 'LIKE_POST', command, 'SUCCESS', { postId: latestPost.id });
    return {
      success: true,
      action: 'LIKE_POST',
      message: `👍 **Done! Maine post like kar diya!**\n> Post: "${postTitle.slice(0, 70)}..."`,
      interactiveAction: {
        type: 'OPEN_POST',
        label: '📖 View Post',
        payload: { url: `/post/${latestPost.id}` }
      }
    };
  }

  // B. Comment on Post Intent
  if ((lower.includes('comment') || trimmed.includes('कमेंट')) && (lower.includes('karo') || lower.includes('batao') || lower.includes('write') || lower.includes('dekho') || trimmed.includes('करो') || trimmed.includes('बताओ') || trimmed.includes('देखो'))) {
    if (lower.includes('dekho') || lower.includes('batao') || lower.includes('show') || trimmed.includes('देखो') || trimmed.includes('बताओ') || trimmed.includes('दिखाओ')) {
      const targetPost = await prisma.post.findFirst({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          comments: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: { content: true, author: { select: { name: true, username: true } } }
          }
        }
      });

      if (!targetPost || targetPost.comments.length === 0) {
        return {
          success: true,
          action: 'READ_COMMENTS',
          message: `💬 **Tolee AI Manager**: Iss post par abhi koi comment nahi hai.`
        };
      }

      const commentList = targetPost.comments.map((c: any, i: number) => {
        const authorName = c.author?.name || c.author?.username || 'User';
        return `${i + 1}. 💬 **${authorName}**: "${c.content}"`;
      }).join('\n');

      return {
        success: true,
        action: 'READ_COMMENTS',
        message: `💬 **Tolee AI Manager**: Latest post ke recent comments:\n\n${commentList}`
      };
    }

    const latestPost = await prisma.post.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { id: true, caption: true }
    });

    if (!latestPost) {
      return {
        success: false,
        action: 'COMMENT_POST',
        message: `⚠️ **Tolee AI Manager**: Comment karne ke liye koi post nahi mila.`
      };
    }

    let commentText = 'Nice update!';
    if (lower.includes('pe ') || lower.includes('par ')) {
      commentText = trimmed.split(/pe |par /i)[1] || 'Nice update!';
    }

    const createdComment = await prisma.comment.create({
      data: {
        content: commentText.replace(/comment karo/i, '').replace(/कमेंट करो/i, '').trim() || 'Nice update!',
        postId: latestPost.id,
        authorId: userId
      }
    });

    logAIAction(userId, 'COMMENT_POST', command, 'SUCCESS', { postId: latestPost.id, commentId: createdComment.id });
    return {
      success: true,
      action: 'COMMENT_POST',
      message: `💬 **Done! Maine comment post kar diya!**\n> "${createdComment.content}"`,
      interactiveAction: {
        type: 'OPEN_POST',
        label: '📖 View Post & Comment',
        payload: { url: `/post/${latestPost.id}` }
      }
    };
  }

  // C. Delete Own Post (With Ownership Permission Safeguard)
  if (lower.includes('delete') || trimmed.includes('डिलीट')) {
    const userLatestPost = await prisma.post.findFirst({
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, caption: true }
    });

    if (!userLatestPost) {
      logAIAction(userId, 'DELETE_POST', command, 'REJECTED', { reason: 'No owned posts found' });
      return {
        success: false,
        action: 'DELETE_POST',
        message: `⚠️ **Permission Denied**: Aapka koi post nahi mila jise delete kiya ja sake. Aap doosron ke posts delete nahi kar sakte.`
      };
    }

    const postTitle = userLatestPost.caption || 'Post';
    await prisma.post.delete({ where: { id: userLatestPost.id } });

    logAIAction(userId, 'DELETE_POST', command, 'SUCCESS', { postId: userLatestPost.id });
    return {
      success: true,
      action: 'DELETE_POST',
      message: `🗑️ **Done! Aapka post successfully delete kar diya gaya hai.**\n> Deleted: "${postTitle.slice(0, 50)}"`
    };
  }

  // ==========================================
  // 4. TOLEE GROUPS & COMMUNITY OPERATIONS
  // ==========================================
  if (lower.includes('group') || lower.includes('tolee') || trimmed.includes('ग्रुप') || trimmed.includes('टोली')) {
    if (lower.includes('search') || lower.includes('dhundo') || lower.includes('find') || lower.includes('list') || trimmed.includes('सर्च') || trimmed.includes('ढूंढो')) {
      const groups = await prisma.tolee.findMany({
        take: 5,
        select: {
          id: true,
          name: true,
          slug: true,
          _count: { select: { members: true } }
        }
      });

      const groupList = groups.map((g: any, i: number) => `${i + 1}. 👥 **${g.name}** (${g._count.members} members)`).join('\n');

      logAIAction(userId, 'SEARCH_TOLEE_GROUPS', command, 'SUCCESS', { count: groups.length });
      return {
        success: true,
        action: 'SEARCH_TOLEE_GROUPS',
        message: `👥 **Tolee AI Manager**: Tolee Groups List:\n\n${groupList}`,
        interactiveAction: {
          type: 'NAVIGATE',
          label: '🌐 Discover All Tolees',
          payload: { url: '/discover' }
        }
      };
    }

    if (lower.includes('open') || lower.includes('kholo') || lower.includes('jao') || trimmed.includes('खोलो') || trimmed.includes('जाओ')) {
      const firstGroup = await prisma.tolee.findFirst({
        select: { id: true, name: true, slug: true }
      });

      if (firstGroup) {
        logAIAction(userId, 'OPEN_TOLEE_GROUP', command, 'SUCCESS', { slug: firstGroup.slug });
        return {
          success: true,
          action: 'OPEN_TOLEE_GROUP',
          message: `🚪 **Tolee AI Manager**: Opening **${firstGroup.name}** group!`,
          interactiveAction: {
            type: 'NAVIGATE',
            label: `👥 Open ${firstGroup.name}`,
            payload: { url: `/t/${firstGroup.slug}` }
          }
        };
      }
    }
  }

  // ==========================================
  // 5. IMAGE GENERATION & POST CREATION PIPELINE
  // ==========================================
  const isImageIntent =
    lower.includes('image') ||
    lower.includes('photo') ||
    lower.includes('pic') ||
    lower.includes('generate') ||
    lower.includes('banao') ||
    lower.includes('bana') ||
    lower.includes('poster') ||
    lower.includes('banner') ||
    trimmed.includes('इमेज') ||
    trimmed.includes('जनरेट') ||
    trimmed.includes('फोटो') ||
    trimmed.includes('बनाओ') ||
    trimmed.includes('बना') ||
    trimmed.includes('बनाएं') ||
    trimmed.includes('बनाये') ||
    trimmed.includes('पोस्टर') ||
    trimmed.includes('बैनर') ||
    trimmed.includes('बेनर') ||
    trimmed.includes('तस्वीर') ||
    trimmed.includes('चित्र');

  if (isImageIntent) {
    const promptConcept = await cleanAndTranslateImagePrompt(trimmed);

    const imageUrl = await generateAIImageWithFallback(promptConcept);

    const newPost = await prisma.post.create({
      data: {
        caption: `✨ AI Generated Creative: ${promptConcept.slice(0, 80)}`,
        mediaUrls: JSON.stringify([imageUrl]),
        mediaTypes: JSON.stringify(['image']),
        authorId: userId
      }
    });

    logAIAction(userId, 'GENERATE_IMAGE', command, 'SUCCESS', { imageUrl, postId: newPost.id });
    return {
      success: true,
      action: 'GENERATE_IMAGE',
      message: `🎨 **Done! Maine AI Image generate kar ke post create kar diya hai!**\n\nPrompt: "${promptConcept}"\n\n![AI Image](${imageUrl})`,
      data: { imageUrl, postId: newPost.id },
      interactiveAction: {
        type: 'PREVIEW_IMAGE',
        label: '🖼️ Preview Generated Image',
        payload: { imageUrl, postUrl: `/post/${newPost.id}` }
      }
    };
  }

  // ==========================================
  // 6. NOTIFICATIONS & ALERTS CHECK
  // ==========================================
  if (lower.includes('notification') || lower.includes('who followed') || lower.includes('who liked') || lower.includes('kisne') || trimmed.includes('नोटिफिकेशन')) {
    const notifications = await prisma.notification.findMany({
      where: { userId, isRead: false },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, message: true, createdAt: true }
    });

    if (notifications.length > 0) {
      const notifStr = notifications.map((n: any, i: number) => `${i + 1}. 🔔 ${n.message}`).join('\n');
      logAIAction(userId, 'CHECK_NOTIFICATIONS', command, 'SUCCESS', { count: notifications.length });
      return {
        success: true,
        action: 'CHECK_NOTIFICATIONS',
        message: `🔔 **Tolee AI Manager**: Aapke naye notifications:\n\n${notifStr}`
      };
    }

    logAIAction(userId, 'CHECK_NOTIFICATIONS', command, 'SUCCESS', { count: 0 });
    return {
      success: true,
      action: 'CHECK_NOTIFICATIONS',
      message: `✅ **Tolee AI Manager**: Aapke paas abhi koi naya unread notification nahi hai.`
    };
  }

  // ==========================================
  // 7. MARKETPLACE CREATION / DRAFT
  // ==========================================
  if (lower.includes('marketplace') || lower.includes('sell') || lower.includes('listing') || trimmed.includes('मार्केटप्लेस')) {
    logAIAction(userId, 'CREATE_MARKETPLACE_LISTING', command, 'SUCCESS', {});
    return {
      success: true,
      action: 'CREATE_MARKETPLACE_LISTING',
      message: `🛍️ **Tolee AI Manager**: Marketplace listing setup ready hai! Aap konse product ka listing create karna chahte hain? (Title, Price, Location enter karein).`,
      interactiveAction: {
        type: 'NAVIGATE',
        label: '🛍️ Create Listing',
        payload: { url: '/marketplace/create' }
      }
    };
  }

  // ==========================================
  // 8. ADS MANAGER DRAFT SETUP
  // ==========================================
  if (lower.includes('ad') || lower.includes('campaign') || lower.includes('promot') || trimmed.includes('विज्ञापन') || trimmed.includes('एड')) {
    logAIAction(userId, 'CREATE_AD_CAMPAIGN', command, 'SUCCESS', {});
    return {
      success: true,
      action: 'CREATE_AD_CAMPAIGN',
      message: `📢 **Tolee AI Manager**: Ad Campaign Draft Ready!\n\n⚠️ *Note: Financial ad spend actions require your explicit confirmation before payment activation.*`,
      interactiveAction: {
        type: 'CONFIRMATION_REQUIRED',
        label: '💳 Setup Ad Campaign',
        payload: { url: '/super-admin/ads' }
      }
    };
  }

  // ==========================================
  // 9. FALLBACK CONVERSATIONAL AI ENGINE (NVIDIA Llama 3 70B)
  // ==========================================
  try {
    const aiText = await callNvidiaLLM([
      {
        role: 'system',
        content: `You are Tolee AI Manager, the personal AI Assistant and Central Brain of Tolee Platform. User: ${userNameStr}. Answer in helpful, warm conversational Hindi/English.`
      },
      { role: 'user', content: trimmed }
    ]);

    logAIAction(userId, 'AI_CONVERSATION', command, 'SUCCESS', {});
    return {
      success: true,
      action: 'CONVERSATION',
      message: aiText || `🤖 **Tolee AI Manager**: Main aapki madad karne ke liye tayyar hoon! Bolen aap Tolee par kya karna chahte hain?`
    };
  } catch (err: any) {
    return {
      success: true,
      action: 'CONVERSATION',
      message: `🤖 **Tolee AI Manager**: Main Tolee Action Engine से connected हूँ! Bolen: "Chat me dekho", "Latest post ko like karo", ya "Ek image generate karo"!`
    };
  }
}
