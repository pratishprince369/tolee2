import { prisma } from '@/lib/prisma';
import { ToolDefinition } from './types';

export const getUserPostsTool: ToolDefinition = {
  name: 'get_user_posts',
  description: 'Fetches recent posts created by the user or from their feed.',
  riskLevel: 'LOW',
  parameters: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Number of posts to fetch (default 5)',
      },
      searchQuery: {
        type: 'string',
        description: 'Keyword to search inside post captions',
      },
    },
  },
  execute: async (args, context) => {
    try {
      const { limit = 5, searchQuery } = args || {};

      const posts = await prisma.post.findMany({
        where: {
          authorId: context.userId,
          ...(searchQuery
            ? { caption: { contains: searchQuery, mode: 'insensitive' } }
            : {}),
        },
        include: {
          _count: { select: { likes: true, comments: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return {
        success: true,
        data: posts.map((p) => ({
          id: p.id,
          caption: p.caption,
          likesCount: p._count.likes,
          commentsCount: p._count.comments,
          createdAt: p.createdAt,
          postType: p.postType,
        })),
        message: `${posts.length} posts found.`,
      };
    } catch (err: any) {
      console.error('[Tool: get_user_posts] Error:', err);
      return { success: false, error: 'Posts retrieve karne me issue aaya.' };
    }
  },
};

export const createPostTool: ToolDefinition = {
  name: 'create_tolee_post',
  description: 'Creates and publishes a new social feed post or updates on Tolee on behalf of the user.',
  riskLevel: 'MEDIUM',
  parameters: {
    type: 'object',
    properties: {
      caption: {
        type: 'string',
        description: 'The full text / caption for the post',
      },
      imageUrl: {
        type: 'string',
        description: 'Optional image URL for the post',
      },
      toleeSlug: {
        type: 'string',
        description: 'Optional group / tolee slug to post inside a specific community',
      },
    },
    required: ['caption'],
  },
  execute: async (args, context) => {
    try {
      const { caption, imageUrl, toleeSlug } = args;

      let toleeConnect = undefined;
      if (toleeSlug) {
        const targetTolee = await prisma.tolee.findUnique({
          where: { slug: toleeSlug },
          select: { id: true, name: true },
        });
        if (targetTolee) {
          toleeConnect = {
            create: [{ toleeId: targetTolee.id }],
          };
        }
      }

      const post = await prisma.post.create({
        data: {
          authorId: context.userId,
          caption,
          mediaUrls: imageUrl || null,
          mediaTypes: imageUrl ? 'image' : null,
          postType: 'post',
          visibility: 'public',
          status: 'published',
          tolees: toleeConnect,
        },
      });

      return {
        success: true,
        data: {
          postId: post.id,
          caption: post.caption,
          url: `https://tolee.in/post/${post.id}`,
        },
        message: `Post successfully create ho gaya! URL: https://tolee.in/post/${post.id}`,
      };
    } catch (err: any) {
      console.error('[Tool: create_tolee_post] Error:', err);
      return { success: false, error: 'Post create karne me technical error aaya.' };
    }
  },
};
