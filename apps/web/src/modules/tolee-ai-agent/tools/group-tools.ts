import { prisma } from '@/lib/prisma';
import { ToolDefinition } from './types';

export const getToleeGroupsTool: ToolDefinition = {
  name: 'get_tolee_groups',
  description: 'Searches and retrieves public or joined Tolee community groups.',
  riskLevel: 'LOW',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Optional search keyword to find groups by name or topic',
      },
      limit: {
        type: 'number',
        description: 'Max groups to return (default 5)',
      },
    },
  },
  execute: async (args, context) => {
    try {
      const { query, limit = 5 } = args || {};

      const groups = await prisma.tolee.findMany({
        where: {
          isPrivate: false,
          isPublicVisible: true,
          ...(query
            ? {
                OR: [
                  { name: { contains: query, mode: 'insensitive' } },
                  { category: { contains: query, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          name: true,
          slug: true,
          category: true,
          _count: { select: { members: true, posts: true } },
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      return {
        success: true,
        data: groups.map((g) => ({
          name: g.name,
          slug: g.slug,
          category: g.category,
          membersCount: g._count.members,
          postsCount: g._count.posts,
          url: `https://tolee.in/t/${g.slug}`,
        })),
        message: `${groups.length} groups found.`,
      };
    } catch (err: any) {
      console.error('[Tool: get_tolee_groups] Error:', err);
      return { success: false, error: 'Groups list retrieve nahi ho paayi.' };
    }
  },
};
