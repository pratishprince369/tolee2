'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { getOrCreatePersonalChat, sendRealChatMessage } from './chat';

export async function fetchFeedStories() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized', groups: [] };
    }
    const currentUserId = (session.user as any).id;
    const now = new Date();

    // 1. Find all users the current user follows
    const follows = await prisma.follow.findMany({
      where: {
        followerId: currentUserId,
        status: 'approved'
      },
      select: {
        followingId: true
      }
    });
    const followedIds = follows.map(f => f.followingId);

    // 2. Find all friends of the current user
    const friendships = await prisma.friendship.findMany({
      where: {
        userId: currentUserId
      },
      select: {
        friendUserId: true
      }
    });
    const friendIds = friendships.map(fr => fr.friendUserId);

    // Combine all relevant user IDs: followed + friends + current user
    const allUserIds = Array.from(new Set([...followedIds, ...friendIds, currentUserId]));

    // 3. Fetch active stories for these users
    const activeStories = await prisma.story.findMany({
      where: {
        authorId: { in: allUserIds },
        expiresAt: { gt: now }
      },
      orderBy: {
        createdAt: 'asc'
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true
          }
        },
        views: {
          where: {
            userId: currentUserId
          }
        }
      }
    });

    // 4. Group stories by author
    const groupsMap = new Map<string, any>();

    // Pre-populate current user group in map so we can ensure current user appears first
    const currentUserInfo = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: {
        id: true,
        username: true,
        name: true,
        avatar: true
      }
    });

    if (currentUserInfo) {
      groupsMap.set(currentUserId, {
        user: {
          id: currentUserInfo.id,
          username: currentUserInfo.username || currentUserInfo.name,
          name: currentUserInfo.name,
          avatar: currentUserInfo.avatar || '/default-user-avatar.svg'
        },
        stories: [],
        hasUnviewed: false
      });
    }

    // Fill groups map with stories
    for (const story of activeStories) {
      const authorId = story.authorId;
      const viewed = story.views.length > 0;

      if (!groupsMap.has(authorId)) {
        groupsMap.set(authorId, {
          user: {
            id: story.author.id,
            username: story.author.username || story.author.name,
            name: story.author.name,
            avatar: story.author.avatar || '/default-user-avatar.svg'
          },
          stories: [],
          hasUnviewed: false
        });
      }

      const group = groupsMap.get(authorId);
      group.stories.push({
        id: story.id,
        mediaUrl: story.mediaUrl,
        mediaType: story.mediaType,
        thumbnailUrl: (story as any).thumbnailUrl || null,
        createdAt: story.createdAt,
        expiresAt: story.expiresAt,
        viewed,
        caption: story.caption || null,
        overlays: story.overlays || null,
        closeFriends: story.closeFriends || false
      });
    }

    // Calculate hasUnviewed and filter out empty non-self groups
    const groups: any[] = [];
    for (const [authorId, group] of groupsMap.entries()) {
      // For other users, if they have no active stories, don't show them in the tray
      if (authorId !== currentUserId && group.stories.length === 0) {
        continue;
      }
      group.hasUnviewed = group.stories.some((s: any) => !s.viewed);
      groups.push(group);
    }

    // Sort: Current user first, then followed users with unviewed stories, then followed users with viewed stories
    // Within those, sort by most recently updated story
    groups.sort((a, b) => {
      if (a.user.id === currentUserId) return -1;
      if (b.user.id === currentUserId) return 1;

      // Group with unviewed first
      if (a.hasUnviewed && !b.hasUnviewed) return -1;
      if (!a.hasUnviewed && b.hasUnviewed) return 1;

      // Newest story first
      const aNewest = a.stories.length > 0 ? new Date(a.stories[a.stories.length - 1].createdAt).getTime() : 0;
      const bNewest = b.stories.length > 0 ? new Date(b.stories[b.stories.length - 1].createdAt).getTime() : 0;
      return bNewest - aNewest;
    });

    return { success: true, groups };
  } catch (error) {
    console.error('Error fetching feed stories:', error);
    return { success: false, error: 'Failed to fetch stories', groups: [] };
  }
}

export async function markStoryAsViewed(storyId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const currentUserId = (session.user as any).id;

    // Create a view record
    await prisma.storyView.upsert({
      where: {
        storyId_userId: {
          storyId,
          userId: currentUserId
        }
      },
      create: {
        storyId,
        userId: currentUserId
      },
      update: {}
    });

    // Check if the story is a shared post and increment its views count
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { overlays: true }
    });

    if (story?.overlays) {
      try {
        const parsed = JSON.parse(story.overlays);
        if (parsed?.sharedPost?.id) {
          const postId = parsed.sharedPost.id;
          await prisma.postStoryAnalytics.upsert({
            where: { postId },
            create: { postId, storyViews: 1 },
            update: { storyViews: { increment: 1 } }
          });
        }
      } catch (e) {
        console.error("Error updating story views analytics:", e);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error marking story as viewed:', error);
    return { success: false, error: 'Failed to mark story as viewed' };
  }
}

export async function fetchUserActiveStories(userId: string) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserId = (session?.user as any)?.id;
    const now = new Date();

    const stories = await prisma.story.findMany({
      where: {
        authorId: userId,
        expiresAt: { gt: now }
      },
      orderBy: {
        createdAt: 'asc'
      },
      include: {
        views: currentUserId ? {
          where: {
            userId: currentUserId
          }
        } : false
      }
    });

    const formattedStories = stories.map(s => ({
      id: s.id,
      mediaUrl: s.mediaUrl,
      mediaType: s.mediaType,
      thumbnailUrl: (s as any).thumbnailUrl || null,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      viewed: currentUserId ? s.views.length > 0 : false,
      caption: s.caption || null,
      overlays: s.overlays || null,
      closeFriends: s.closeFriends || false
    }));

    return {
      success: true,
      stories: formattedStories,
      hasUnviewed: formattedStories.some(s => !s.viewed)
    };
  } catch (error) {
    console.error('Error fetching user stories:', error);
    return { success: false, error: 'Failed to fetch user stories', stories: [], hasUnviewed: false };
  }
}

export async function fetchStoryViewers(storyId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized', viewers: [] };
    }
    const currentUserId = (session.user as any).id;

    // First make sure the logged in user is the author of the story
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { authorId: true }
    });

    if (!story || story.authorId !== currentUserId) {
      return { success: false, error: 'Unauthorized to view story viewers', viewers: [] };
    }

    const views = await prisma.storyView.findMany({
      where: { storyId },
      include: {
        story: false,
        storyId: false,
        // Wait, storyId is a field, not model. Let's include user
        // wait, in the schema, StoryView has fields: storyId, userId, viewedAt
        // Let's check relation to User if it exists
      }
    });

    // Wait, let's verify if StoryView has relation to User in schema.prisma!
    // Let's check lines 416-422 of schema.prisma:
    // model StoryView {
    //   storyId   String
    //   userId    String
    //   viewedAt  DateTime @default(now())
    //   story     Story @relation(fields: [storyId], references: [id])
    //   @@id([storyId, userId])
    // }
    // Ah, it does NOT have a direct named relation to User in the schema. But we can fetch users by ID.
    const userIds = views.map(v => v.userId);
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds }
      },
      select: {
        id: true,
        username: true,
        name: true,
        avatar: true
      }
    });

    return { success: true, viewers: users };
  } catch (error) {
    console.error('Error fetching story viewers:', error);
    return { success: false, error: 'Failed to fetch story viewers', viewers: [] };
  }
}

export async function sendStoryReply(storyId: string, authorId: string, text: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const currentUserId = (session.user as any).id;
    if (currentUserId === authorId) {
      return { success: false, error: 'Cannot reply to your own story' };
    }

    // 1. Get or create the personal DM chat between current user and author
    const chatRes = await getOrCreatePersonalChat(authorId);
    if (!chatRes.success || !chatRes.chatId) {
      return { success: false, error: chatRes.error || 'Failed to start chat' };
    }

    // 2. Fetch story info to create context
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { mediaUrl: true, mediaType: true, thumbnailUrl: true, authorId: true, createdAt: true }
    });

    const contextPrefix = `[Replied to your story ${story?.mediaType || 'media'}]:`;
    const messageContent = `${contextPrefix} "${text}"`;

    // 3. Send message in chat with story reply metadata
    const sendRes = await sendRealChatMessage(
      chatRes.chatId,
      messageContent,
      undefined,
      story ? {
        storyId,
        storyType: story.mediaType,
        // Use thumbnailUrl for video stories so preview shows image not blank video
        storyThumbnail: story.thumbnailUrl || story.mediaUrl,
        storyUploaderId: story.authorId,
        storyCreatedAt: story.createdAt
      } : undefined
    );
    return sendRes;
  } catch (error) {
    console.error('Error sending story reply:', error);
    return { success: false, error: 'Failed to send reply' };
  }
}
