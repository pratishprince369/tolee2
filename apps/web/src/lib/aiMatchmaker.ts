import { prisma } from './prisma';
import { createSystemNotification } from '@/lib/notification-service';

export async function matchRequirement(post: {
  id: string;
  caption: string | null;
  location: string | null;
  authorId: string;
  authorName: string;
}) {
  try {
    if (!post.caption || !post.location) {
      console.log('[AI Matchmaker] Missing description or location. Skipping.');
      return { success: false, matchedListings: 0, matchedUsers: 0 };
    }

    console.log(`[AI Matchmaker] Matching requirement ID: ${post.id} | Location: ${post.location}`);

    // 1. Tokenize and extract keywords
    const stopWords = new Set([
      'need', 'looking', 'for', 'a', 'an', 'the', 'in', 'at', 'on', 'with', 
      'to', 'of', 'and', 'or', 'is', 'am', 'are', 'i', 'we', 'you', 'my', 
      'me', 'please', 'required', 'wants', 'want', 'any', 'some', 'near', 
      'nearby', 'local', 'urgently', 'urgent', 'available', 'seeking'
    ]);

    const cleanText = post.caption
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, ' ')
      .replace(/\s{2,}/g, ' ');

    const words = cleanText.split(/\s+/).filter(w => w.length > 2);
    const keywords = words.filter(w => !stopWords.has(w));

    if (keywords.length === 0) {
      console.log('[AI Matchmaker] No significant keywords found after filtering. Skipping.');
      return { success: false, matchedListings: 0, matchedUsers: 0 };
    }

    console.log('[AI Matchmaker] Extracted keywords:', keywords);

    const locationTerm = post.location.trim().toLowerCase();

    // 2. Query matching Marketplace Listings
    const listings = await prisma.listing.findMany({
      where: {
        status: 'active',
        sellerId: { not: post.authorId },
        locationText: { contains: locationTerm },
      },
      select: {
        id: true,
        sellerId: true,
        title: true,
        description: true,
        tags: true
      }
    });

    const matchedListings = listings.filter((l: any) => {
      const targetStr = `${l.title} ${l.description} ${l.tags || ''}`.toLowerCase();
      return keywords.some(kw => targetStr.includes(kw));
    });

    console.log(`[AI Matchmaker] Found ${matchedListings.length} matching local listings.`);

    // 3. Query matching Service Providers (Users)
    const users = await prisma.user.findMany({
      where: {
        id: { not: post.authorId },
        location: { contains: locationTerm },
        bio: { not: null }
      },
      select: {
        id: true,
        name: true,
        bio: true
      }
    });

    const matchedUsers = users.filter((u: any) => {
      const bioStr = (u.bio || '').toLowerCase();
      return keywords.some(kw => bioStr.includes(kw));
    });

    console.log(`[AI Matchmaker] Found ${matchedUsers.length} matching local users.`);

    // 4. Create Notifications for matched Sellers and Service Providers
    const notificationPromises: any[] = [];
    const uniqueUserIds = new Set<string>();

    for (const listing of matchedListings) {
      if (uniqueUserIds.has(listing.sellerId)) continue;
      uniqueUserIds.add(listing.sellerId);

      notificationPromises.push(
        createSystemNotification({
          userId: listing.sellerId,
          type: 'requirement',
          message: `🚨 [Matchmaker] A user near you needs: "${post.caption.substring(0, 45)}${post.caption.length > 45 ? '...' : ''}". Tap to view!`,
          link: `/feed?post=${post.id}`
        }).catch(err => console.error(`Failed to send matchmaker notification to seller ${listing.sellerId}:`, err))
      );
    }

    for (const matchedUser of matchedUsers) {
      if (uniqueUserIds.has(matchedUser.id)) continue;
      uniqueUserIds.add(matchedUser.id);

      notificationPromises.push(
        createSystemNotification({
          userId: matchedUser.id,
          type: 'requirement',
          message: `🚨 [Matchmaker] New local requirement matches your bio: "${post.caption.substring(0, 45)}${post.caption.length > 45 ? '...' : ''}". Tap to view!`,
          link: `/feed?post=${post.id}`
        }).catch(err => console.error(`Failed to send matchmaker notification to provider ${matchedUser.id}:`, err))
      );
    }

    if (notificationPromises.length > 0) {
      await Promise.all(notificationPromises);
      console.log(`[AI Matchmaker] Dispatched ${notificationPromises.length} matchmaker notifications.`);
    }

    return {
      success: true,
      matchedListings: matchedListings.length,
      matchedUsers: matchedUsers.length,
      notificationsSent: notificationPromises.length
    };

  } catch (error) {
    console.error('[AI Matchmaker] Error running matchmaking:', error);
    return { success: false, matchedListings: 0, matchedUsers: 0 };
  }
}
