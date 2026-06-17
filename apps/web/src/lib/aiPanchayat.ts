import { prisma } from './prisma';
import { createSystemNotification } from '@/lib/notification-service';

export async function moderateContent(params: {
  userId: string;
  contentType: 'post' | 'listing';
  content: string;
}) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { trustScore: true, name: true, username: true }
    });

    if (!user) return { isFlagged: false, reason: null, newScore: 100 };

    let currentScore = user.trustScore !== null && user.trustScore !== undefined ? user.trustScore : 100;

    // 1. If trust score is already critically low, automatically flag everything
    if (currentScore < 30) {
      return { 
        isFlagged: true, 
        reason: 'Your account trust score is critically low (<30%). Sent to AI Panchayat review queue.',
        scoreDeducted: 0,
        newScore: currentScore
      };
    }

    // 2. Simple spam keywords detection
    const spamKeywords = [
      'get rich quick', 'earn ₹', 'invest and double', 'double money', 
      'free cash giveaway', 'telegram hack', 'whatsapp hack', 'crypto profit guarantee',
      'click link to earn', 'free credit card', 'win lottery', 'direct bank transfer hack'
    ];

    const lowerContent = params.content.toLowerCase();
    const matchesSpam = spamKeywords.some(keyword => lowerContent.includes(keyword));

    // 3. Repeated link detection (spammers post too many URLs)
    const urlPattern = /https?:\/\/[^\s]+/g;
    const urlMatches = lowerContent.match(urlPattern) || [];
    const tooManyUrls = urlMatches.length > 2; // more than 2 links is suspicious for local posts/listings

    let isSuspicious = matchesSpam || tooManyUrls;
    let deduction = 0;
    let reason = null;

    if (isSuspicious) {
      deduction = matchesSpam ? 20 : 10;
      currentScore = Math.max(0, currentScore - deduction);
      reason = matchesSpam 
        ? 'Suspicious get-rich-quick or financial scam phrases detected.'
        : 'Multiple outbound links detected (possible spam signature).';

      // Update trust score and restrictions in database
      await prisma.user.update({
        where: { id: params.userId },
        data: { 
          trustScore: currentScore,
          postingRestricted: currentScore < 30 ? true : undefined,
          marketplaceRestricted: currentScore < 30 ? true : undefined
        }
      });

      // Dispatch alert notification to the flagged user
      await createSystemNotification({
        userId: params.userId,
        type: 'system',
        message: `⚠️ [AI Panchayat] Your trust score fell to ${currentScore}% due to content flags. Low scores restrict account privileges.`,
        link: '/settings'
      }).catch(err => console.error('Failed to dispatch user Panchayat alert:', err));

      // Alert super admins about flagged activity
      const admins = await prisma.user.findMany({
        where: { email: 'pratishtolee@gmail.com' }, // super admin email from context!
        select: { id: true }
      });

      const adminAlertPromises = admins.map((admin: any) => {
        return createSystemNotification({
          userId: admin.id,
          type: 'system',
          message: `🚨 [Panchayat Alert] User @${user.username || user.name} flagged for spam. Trust score: ${currentScore}%.`,
          link: '/settings' // admin panel/settings view
        }).catch(() => {});
      });

      if (adminAlertPromises.length > 0) {
        await Promise.all(adminAlertPromises);
      }
    }

    return {
      isFlagged: isSuspicious,
      reason,
      scoreDeducted: deduction,
      newScore: currentScore
    };

  } catch (error) {
    console.error('[AI Panchayat] Error during content moderation:', error);
    return { isFlagged: false, reason: null, newScore: 100 };
  }
}
