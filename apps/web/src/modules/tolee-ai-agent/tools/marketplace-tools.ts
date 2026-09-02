import { prisma } from '@/lib/prisma';
import { ToolDefinition } from './types';

export const getMarketplaceEnquiriesTool: ToolDefinition = {
  name: 'get_marketplace_enquiries',
  description: 'Fetches active buyer leads and enquiries on the user listings on Tolee Marketplace.',
  riskLevel: 'LOW',
  parameters: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Number of listings/enquiries to fetch',
      },
    },
  },
  execute: async (args, context) => {
    try {
      const { limit = 5 } = args || {};

      const listings = await prisma.listing.findMany({
        where: { sellerId: context.userId, status: 'active' },
        select: {
          id: true,
          title: true,
          price: true,
          location: true,
          views: true,
          createdAt: true,
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      return {
        success: true,
        data: listings.map((l) => ({
          listingId: l.id,
          title: l.title,
          price: `₹${l.price}`,
          location: l.location,
          viewsCount: l.views,
        })),
        message: `${listings.length} active marketplace listings mile hain.`,
      };
    } catch (err: any) {
      console.error('[Tool: get_marketplace_enquiries] Error:', err);
      return { success: false, error: 'Marketplace data fetch karne me error aaya.' };
    }
  },
};
