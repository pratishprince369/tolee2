'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

// Helper to check if current user is admin
async function isAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return false;
  
  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { email: true }
  });

  // Admin emails or role check
  return user?.email === 'admin@tolee.com' || (session.user as any).role === 'admin';
}

// 1. Get Flagged or Pending News Articles for Admin panel
export async function getFlaggedNewsArticles() {
  try {
    if (!(await isAdmin())) {
      return { success: false, error: 'Unauthorized Access' };
    }

    const flagged = await prisma.newsPost.findMany({
      where: {
        post: {
          OR: [
            { status: 'flagged_ai' },
            { status: 'pending' }
          ]
        }
      },
      include: {
        post: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                username: true,
                email: true,
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, articles: flagged };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch flagged items' };
  }
}

// 2. Perform Moderation Action
export async function moderateNewsArticle(
  postId: string, 
  action: 'approve' | 'reject' | 'ban_author', 
  reason?: string
) {
  try {
    if (!(await isAdmin())) {
      return { success: false, error: 'Unauthorized Access' };
    }

    const newsItem = await prisma.newsPost.findUnique({
      where: { postId },
      include: { post: true }
    });

    if (!newsItem) {
      return { success: false, error: 'Article not found' };
    }

    const authorId = newsItem.post.authorId;

    if (action === 'approve') {
      // Approve and make it published live
      await prisma.post.update({
        where: { id: postId },
        data: {
          status: 'published',
          aiReport: null // clear AI flag report
        }
      });
    } else if (action === 'reject') {
      // Permanently delete article
      await prisma.post.delete({
        where: { id: postId }
      });
    } else if (action === 'ban_author') {
      // Hard delete article and ban user account
      await prisma.post.delete({
        where: { id: postId }
      });

      await prisma.user.update({
        where: { id: authorId },
        data: {
          isBanned: true,
          isSuspended: true,
          suspensionReason: reason || 'Flagged for publishing illegal spam content on Tolee News.'
        }
      });
    }

    revalidatePath('/feed');
    revalidatePath('/news');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to complete moderation' };
  }
}
