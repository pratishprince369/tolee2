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
 * 🛡️ Central Audit Logger for AI Actions
 */
async function logAIAction(
  userId: string,
  action: string,
  command: string,
  status: 'SUCCESS' | 'FAILED' | 'REJECTED',
  details: any
) {
  try {
    await prisma.auditLog.create({
      data: {
        action: `AI_ACTION:${action}`,
        target: userId,
        targetType: 'user',
        details: JSON.stringify({ command, status, details, timestamp: new Date().toISOString() })
      }
    });
  } catch (err) {
    console.warn('AI Action Audit Log save failed (non-critical):', err);
  }
}

/**
 * 🧠 CENTRAL TOLEE AI ACTION ENGINE
 * Analyzes natural language commands, detects intent, checks permissions,
 * executes real platform operations, validates results, and logs audit events.
 */
export async function executeToleeAIAction(ctx: ActionExecutionContext): Promise<ActionExecutionResult> {
  const { userId, command } = ctx;
  const trimmed = command.trim();
  const lower = trimmed.toLowerCase();

  // Fetch current user details for context
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
  // 1. CHAT OPERATIONS (Read, Unread, Send, Reply, Open)
  // ==========================================
  const isChatIntent =
    lower.includes('chat') ||
    lower.includes('message') ||
    lower.includes('msg') ||
    lower.includes('kisi ka message') ||
    lower.includes('unread') ||
    lower.includes('sandesh') ||
    trimmed.includes('चैट') ||
    trimmed.includes('मैसेज') ||
    trimmed.includes('संदेश');

  if (isChatIntent) {
    // A. Check Unread / Recent Messages
    if (lower.includes('check') || lower.includes('aaya') || lower.includes('batao') || lower.includes('dekho') || lower.includes('show') || lower.includes('read') || lower.includes('kya')) {
      const userChats = await prisma.chatParticipant.findMany({
        where: { userId },
        select: { chatId: true }
      });
      const chatIds = userChats.map(c => c.chatId);

      if (chatIds.length === 0) {
        await logAIAction(userId, 'CHAT_CHECK', command, 'SUCCESS', { unreadCount: 0 });
        return {
          success: true,
          action: 'VIEW_CHAT_MESSAGES',
          message: `📩 **Tolee AI Manager**: Maine aapki chats check ki hain! Abhi aapke paas koi active conversation nahi hai.`
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
        include: {
          sender: { select: { name: true, username: true } }
        }
      });

      if (unreadMessages.length > 0) {
        const msgList = unreadMessages.map((m, i) => {
          const senderName = m.sender?.name || m.sender?.username || 'User';
          return `${i + 1}. 👤 **${senderName}**: "${m.content.slice(0, 80)}"`;
        }).join('\n');

        await logAIAction(userId, 'CHAT_CHECK', command, 'SUCCESS', { unreadCount: unreadMessages.length });
        return {
          success: true,
          action: 'VIEW_CHAT_MESSAGES',
          message: `📩 **Tolee AI Manager**: Aapke paas **${unreadMessages.length} naye unread message(s)** aaye hain:\n\n${msgList}`,
          interactiveAction: {
            type: 'OPEN_CHAT',
            label: '💬 Open Chats Now',
            payload: { url: '/chat' }
          }
        };
      }

      // Recent message fallback
      const recentMessages = await prisma.message.findMany({
        where: { chatId: { in: chatIds }, senderId: { not: userId } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { sender: { select: { name: true, username: true } } }
      });

      const lastMsg = recentMessages[0];
      const lastSender = lastMsg ? (lastMsg.sender?.name || lastMsg.sender?.username || 'User') : 'no one';
      const lastText = lastMsg ? lastMsg.content.slice(0, 80) : '';

      await logAIAction(userId, 'CHAT_CHECK', command, 'SUCCESS', { unreadCount: 0 });
      return {
        success: true,
        action: 'VIEW_CHAT_MESSAGES',
        message: lastMsg 
          ? `✅ **Tolee AI Manager**: Aapke paas koi **naya unread message nahi hai**.\n\nAakhiri message **${lastSender}** se tha: "${lastText}"`
          : `✅ **Tolee AI Manager**: Aapke chat me koi naya message nahi hai.`
      };
    }

    // B. Send Message Command
    if (lower.includes('karo') || lower.includes('bhejo') || lower.includes('send')) {
      const words = trimmed.split(' ');
      const toIndex = words.findIndex(w => w.toLowerCase() === 'ko' || w.toLowerCase() === 'to');
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
          if (lower.includes(' ki ')) {
            msgText = trimmed.split(/ ki /i)[1] || 'Hello!';
          } else if (lower.includes(' message ')) {
            msgText = trimmed.split(/ message /i)[1] || 'Hello!';
          }

          const createdMsg = await prisma.message.create({
            data: {
              chatId,
              senderId: userId,
              content: msgText.trim()
            }
          });

          await logAIAction(userId, 'SEND_CHAT_MESSAGE', command, 'SUCCESS', { recipientId: recipient.id, messageId: createdMsg.id });
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
  // 2. FEED & POST OPERATIONS (Like, Unlike, Comment, Reply, Delete)
  // ==========================================
  const isPostLikeIntent = lower.includes('like') || trimmed.includes('लाइक');
  if (isPostLikeIntent && (lower.includes('post') || lower.includes('reel') || lower.includes('latest') || lower.includes('karo'))) {
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
      await logAIAction(userId, 'LIKE_POST', command, 'SUCCESS', { postId: latestPost.id, alreadyLiked: true });
      return {
        success: true,
        action: 'LIKE_POST',
        message: `👍 **Tolee AI Manager**: Aapne pehele se hi iss post ko like kar rakha hai!\n> "${postTitle.slice(0, 60)}..."`
      };
    }

    const createdLike = await prisma.like.create({
      data: {
        userId,
        postId: latestPost.id
      }
    });

    const verifyLike = await prisma.like.findUnique({
      where: { id: createdLike.id }
    });

    if (verifyLike) {
      await logAIAction(userId, 'LIKE_POST', command, 'SUCCESS', { postId: latestPost.id });
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
    } else {
      await logAIAction(userId, 'LIKE_POST', command, 'FAILED', { postId: latestPost.id });
      return {
        success: false,
        action: 'LIKE_POST',
        message: `❌ **Tolee AI Manager**: Main post like nahi kar paaya. System operation reject hua.`
      };
    }
  }

  // B. Comment on Post Intent
  if ((lower.includes('comment') || trimmed.includes('कमेंट')) && (lower.includes('karo') || lower.includes('batao') || lower.includes('write') || lower.includes('dekho'))) {
    if (lower.includes('dekho') || lower.includes('batao') || lower.includes('show')) {
      const targetPost = await prisma.post.findFirst({
        orderBy: { createdAt: 'desc' },
        include: {
          comments: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { author: { select: { name: true, username: true } } }
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

      const commentList = targetPost.comments.map((c, i) => {
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
        content: commentText.replace(/comment karo/i, '').trim() || 'Nice update!',
        postId: latestPost.id,
        authorId: userId
      }
    });

    await logAIAction(userId, 'COMMENT_POST', command, 'SUCCESS', { postId: latestPost.id, commentId: createdComment.id });
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
  if (lower.includes('delete') && (lower.includes('post') || lower.includes('my post') || lower.includes('mera post'))) {
    const userLatestPost = await prisma.post.findFirst({
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' }
    });

    if (!userLatestPost) {
      await logAIAction(userId, 'DELETE_POST', command, 'REJECTED', { reason: 'No owned posts found' });
      return {
        success: false,
        action: 'DELETE_POST',
        message: `⚠️ **Permission Denied**: Aapka koi post nahi mila jise delete kiya ja sake. Aap doosron ke posts delete nahi kar sakte.`
      };
    }

    const postTitle = userLatestPost.caption || 'Post';
    await prisma.post.delete({ where: { id: userLatestPost.id } });

    await logAIAction(userId, 'DELETE_POST', command, 'SUCCESS', { postId: userLatestPost.id });
    return {
      success: true,
      action: 'DELETE_POST',
      message: `🗑️ **Done! Aapka post successfully delete kar diya gaya hai.**\n> Deleted: "${postTitle.slice(0, 50)}"`
    };
  }

  // ==========================================
  // 3. TOLEE GROUPS & COMMUNITY OPERATIONS
  // ==========================================
  if (lower.includes('group') || lower.includes('tolee') || trimmed.includes('ग्रुप') || trimmed.includes('टोली')) {
    if (lower.includes('search') || lower.includes('dhundo') || lower.includes('find') || lower.includes('list')) {
      const groups = await prisma.tolee.findMany({
        take: 5,
        select: {
          id: true,
          name: true,
          slug: true,
          _count: { select: { members: true } }
        }
      });

      const groupList = groups.map((g, i) => `${i + 1}. 👥 **${g.name}** (${g._count.members} members)`).join('\n');

      await logAIAction(userId, 'SEARCH_TOLEE_GROUPS', command, 'SUCCESS', { count: groups.length });
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

    if (lower.includes('open') || lower.includes('kholo') || lower.includes('jao')) {
      const firstGroup = await prisma.tolee.findFirst({
        select: { id: true, name: true, slug: true }
      });

      if (firstGroup) {
        await logAIAction(userId, 'OPEN_TOLEE_GROUP', command, 'SUCCESS', { slug: firstGroup.slug });
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
  // 4. IMAGE GENERATION & POST CREATION PIPELINE
  // ==========================================
  const isImageIntent =
    lower.includes('image') ||
    lower.includes('photo') ||
    lower.includes('pic') ||
    lower.includes('generate') ||
    lower.includes('banao') ||
    lower.includes('poster') ||
    lower.includes('banner') ||
    trimmed.includes('इमेज') ||
    trimmed.includes('जनरेट') ||
    trimmed.includes('फोटो');

  if (isImageIntent) {
    const promptConcept = trimmed
      .replace(/generate|image|photo|pic|banao|bana do|creative|poster|banner|इमेज|जनरेट|फोटो|बनाओ/gi, '')
      .trim() || 'Modern futuristic AI poster graphic';

    const imageUrl = await generateAIImageWithFallback(promptConcept);

    const newPost = await prisma.post.create({
      data: {
        caption: `✨ AI Generated Creative: ${promptConcept}`,
        mediaUrls: JSON.stringify([imageUrl]),
        mediaTypes: JSON.stringify(['image']),
        authorId: userId
      }
    });

    await logAIAction(userId, 'GENERATE_IMAGE', command, 'SUCCESS', { imageUrl, postId: newPost.id });
    return {
      success: true,
      action: 'GENERATE_IMAGE',
      message: `🎨 **Done! Maine AI Image generate kar ke post create kar diya hai!**\n\nPrompt: "${promptConcept}"`,
      data: { imageUrl, postId: newPost.id },
      interactiveAction: {
        type: 'PREVIEW_IMAGE',
        label: '🖼️ Preview Generated Image',
        payload: { imageUrl, postUrl: `/post/${newPost.id}` }
      }
    };
  }

  // ==========================================
  // 5. NOTIFICATIONS & ALERTS CHECK
  // ==========================================
  if (lower.includes('notification') || lower.includes('who followed') || lower.includes('who liked') || lower.includes('kisne')) {
    const notifications = await prisma.notification.findMany({
      where: { userId, isRead: false },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    if (notifications.length > 0) {
      const notifStr = notifications.map((n, i) => `${i + 1}. 🔔 ${n.message}`).join('\n');
      await logAIAction(userId, 'CHECK_NOTIFICATIONS', command, 'SUCCESS', { count: notifications.length });
      return {
        success: true,
        action: 'CHECK_NOTIFICATIONS',
        message: `🔔 **Tolee AI Manager**: Aapke naye notifications:\n\n${notifStr}`
      };
    }

    await logAIAction(userId, 'CHECK_NOTIFICATIONS', command, 'SUCCESS', { count: 0 });
    return {
      success: true,
      action: 'CHECK_NOTIFICATIONS',
      message: `✅ **Tolee AI Manager**: Aapke paas abhi koi naya unread notification nahi hai.`
    };
  }

  // ==========================================
  // 6. MARKETPLACE CREATION / DRAFT
  // ==========================================
  if (lower.includes('marketplace') || lower.includes('sell') || lower.includes('listing')) {
    await logAIAction(userId, 'CREATE_MARKETPLACE_LISTING', command, 'SUCCESS', {});
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
  // 7. ADS MANAGER DRAFT SETUP
  // ==========================================
  if (lower.includes('ad') || lower.includes('campaign') || lower.includes('promot')) {
    await logAIAction(userId, 'CREATE_AD_CAMPAIGN', command, 'SUCCESS', {});
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
  // 8. FALLBACK CONVERSATIONAL AI ENGINE (NVIDIA Llama 3 70B)
  // ==========================================
  try {
    const aiText = await callNvidiaLLM([
      {
        role: 'system',
        content: `You are Tolee AI Manager, the personal AI Assistant and Central Brain of Tolee Platform. User: ${userNameStr}. Answer in helpful, warm conversational Hindi/English.`
      },
      { role: 'user', content: trimmed }
    ]);

    await logAIAction(userId, 'AI_CONVERSATION', command, 'SUCCESS', {});
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
