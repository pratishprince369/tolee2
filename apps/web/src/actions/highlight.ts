'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { destroyAsset, extractPublicIdFromUrl, extractResourceTypeFromUrl } from '@/lib/cloudinary-cleanup';

export async function getHighlights(userId: string) {
  try {
    const highlights = await prisma.highlight.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        stories: {
          orderBy: { createdAt: 'asc' },
          include: {
            story: true
          }
        }
      }
    });

    return {
      success: true,
      highlights: highlights.map((h: any) => {
        // Determine cover: use saved coverUrl, else pick thumbnail (video) or mediaUrl (image) from latest story
        const latestStory = h.stories[h.stories.length - 1]?.story;
        const autoCover = latestStory
          ? (latestStory.thumbnailUrl || latestStory.mediaUrl)
          : null;
        return {
          id: h.id,
          title: h.name,
          coverUrl: h.coverUrl || autoCover || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=300',
          slides: h.stories.map((hs: any) => hs.story.mediaUrl),
          stories: h.stories.map((hs: any) => ({
            id: hs.story.id,
            mediaUrl: hs.story.mediaUrl,
            mediaType: hs.story.mediaType,
            thumbnailUrl: hs.story.thumbnailUrl || null,
            createdAt: hs.story.createdAt
          }))
        };
      })
    };
  } catch (error) {
    console.error("Error fetching highlights:", error);
    return { success: false, error: 'Failed to fetch highlights', highlights: [] };
  }
}

export async function getStoriesArchive() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized', stories: [] };
    }
    const userId = (session.user as any).id;

    const stories = await prisma.story.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, stories };
  } catch (error) {
    console.error("Error fetching stories archive:", error);
    return { success: false, error: 'Failed to fetch stories archive', stories: [] };
  }
}

export async function createHighlight(name: string, storyIds: string[], coverUrl?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    if (!name || name.trim() === '') {
      return { success: false, error: 'Highlight name is required' };
    }
    if (storyIds.length === 0) {
      return { success: false, error: 'At least one story must be selected' };
    }

    let finalCoverUrl = coverUrl;
    if (!finalCoverUrl) {
      const firstStory = await prisma.story.findUnique({
        where: { id: storyIds[0] }
      });
      // Use thumbnailUrl for videos (Cloudinary-generated JPG), fall back to mediaUrl for images
      finalCoverUrl = firstStory?.thumbnailUrl || firstStory?.mediaUrl || '';
    }

    const highlight = await prisma.highlight.create({
      data: {
        name,
        coverUrl: finalCoverUrl,
        userId,
        stories: {
          create: storyIds.map(storyId => ({
            storyId
          }))
        }
      }
    });

    revalidatePath(`/u/${session.user.username}`);
    return { success: true, highlight };
  } catch (error) {
    console.error("Error creating highlight:", error);
    return { success: false, error: 'Failed to create highlight' };
  }
}

export async function editHighlight(highlightId: string, name: string, storyIds: string[], coverUrl?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const highlight = await prisma.highlight.findUnique({
      where: { id: highlightId }
    });

    if (!highlight || highlight.userId !== userId) {
      return { success: false, error: 'Highlight not found or unauthorized' };
    }

    if (!name || name.trim() === '') {
      return { success: false, error: 'Highlight name is required' };
    }
    if (storyIds.length === 0) {
      return { success: false, error: 'At least one story must be selected' };
    }

    let finalCoverUrl = coverUrl;
    if (!finalCoverUrl) {
      const firstStory = await prisma.story.findUnique({
        where: { id: storyIds[0] }
      });
      // Use thumbnailUrl for videos (Cloudinary-generated JPG), fall back to mediaUrl for images
      finalCoverUrl = firstStory?.thumbnailUrl || firstStory?.mediaUrl || '';
    }

    // Delete existing mapping and create new
    await prisma.$transaction([
      prisma.highlightStory.deleteMany({
        where: { highlightId }
      }),
      prisma.highlight.update({
        where: { id: highlightId },
        data: {
          name,
          coverUrl: finalCoverUrl,
          stories: {
            create: storyIds.map(storyId => ({
              storyId
            }))
          }
        }
      })
    ]);

    revalidatePath(`/u/${session.user.username}`);
    return { success: true };
  } catch (error) {
    console.error("Error editing highlight:", error);
    return { success: false, error: 'Failed to edit highlight' };
  }
}

export async function deleteHighlight(highlightId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const highlight = await prisma.highlight.findUnique({
      where: { id: highlightId }
    });

    if (!highlight || highlight.userId !== userId) {
      return { success: false, error: 'Highlight not found or unauthorized' };
    }

    await prisma.highlight.delete({
      where: { id: highlightId }
    });

    revalidatePath(`/u/${session.user.username}`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting highlight:", error);
    return { success: false, error: 'Failed to delete highlight' };
  }
}

export async function createTestStory(
  mediaUrl: string,
  mediaType: string,
  thumbnailUrl?: string,
  caption?: string,
  overlays?: string,
  closeFriends?: boolean
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const story = await prisma.story.create({
      data: {
        mediaUrl,
        mediaType,
        // For images, thumbnailUrl = mediaUrl itself; for videos, it's the Cloudinary JPG thumbnail
        thumbnailUrl: thumbnailUrl || (mediaType === 'image' ? mediaUrl : null),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // active for 24h
        authorId: userId,
        caption: caption || null,
        overlays: overlays || null,
        closeFriends: closeFriends || false
      }
    });

    return { success: true, story };
  } catch (error) {
    console.error("Error creating test story:", error);
    return { success: false, error: 'Failed to create test story' };
  }
}

/**
 * Permanently deletes a story owned by the current user.
 * - Removes from all highlights it belongs to (cascade via DB)
 * - Deletes the Cloudinary media asset
 * - Removes the DB record
 */
export async function deleteStory(storyId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    // Verify ownership
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { id: true, authorId: true, mediaUrl: true, mediaType: true }
    });

    if (!story) return { success: false, error: 'Story not found' };
    if (story.authorId !== userId) return { success: false, error: 'Unauthorized' };

    // Delete DB record (HighlightStory entries cascade automatically)
    await prisma.story.delete({ where: { id: storyId } });

    // Best-effort Cloudinary asset deletion (non-blocking)
    const publicId = extractPublicIdFromUrl(story.mediaUrl);
    const resourceType = story.mediaType === 'video' ? 'video' : extractResourceTypeFromUrl(story.mediaUrl);
    if (publicId) {
      destroyAsset(publicId, resourceType).catch(() => {});
    }

    revalidatePath('/');
    revalidatePath(`/u/${(session.user as any).username || ''}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting story:', error);
    return { success: false, error: 'Failed to delete story' };
  }
}

/**
 * Removes a single story from a highlight WITHOUT deleting the story itself.
 * The story remains in the archive and can be re-added later.
 */
export async function removeStoryFromHighlight(highlightId: string, storyId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    // Verify highlight ownership
    const highlight = await prisma.highlight.findUnique({
      where: { id: highlightId },
      include: { stories: true }
    });

    if (!highlight || highlight.userId !== userId) {
      return { success: false, error: 'Highlight not found or unauthorized' };
    }

    // Remove the story-highlight mapping
    await prisma.highlightStory.deleteMany({
      where: { highlightId, storyId }
    });

    // If highlight is now empty, auto-delete it
    const remaining = highlight.stories.filter((hs: any) => hs.storyId !== storyId);
    if (remaining.length === 0) {
      await prisma.highlight.delete({ where: { id: highlightId } });
      revalidatePath(`/u/${(session.user as any).username || ''}`);
      return { success: true, highlightDeleted: true };
    }

    revalidatePath(`/u/${(session.user as any).username || ''}`);
    return { success: true, highlightDeleted: false };
  } catch (error) {
    console.error('Error removing story from highlight:', error);
    return { success: false, error: 'Failed to remove story from highlight' };
  }
}
