'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { isVideoUrl } from '@/lib/media';
import bcrypt from 'bcryptjs';

// Helper to get active session user ID
async function getUserId() {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.id || null;
}

/**
 * Lazy initializes a user's promotional wallet with ₹2,500 credit.
 * Credits referral bonuses if referredBy is provided.
 */
export async function checkAndInitializeWallet(referredBy?: string) {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, error: 'Unauthorized' };

    // 1. Check if wallet already exists
    let wallet = await prisma.wallet.findUnique({
      where: { userId }
    });

    if (wallet) {
      return { success: true, isNew: false, balance: wallet.balance };
    }

    // 2. Initialize new wallet inside transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create wallet
      const newWallet = await tx.wallet.create({
        data: {
          userId,
          balance: 2500.0,
          totalEarned: 2500.0,
          totalSpent: 0.0,
          transactions: {
            create: {
              amount: 2500.0,
              type: 'welcome',
              description: 'Congratulations! Welcome promotional wallet credits'
            }
          }
        }
      });

      // 3. Handle referral reward (₹500 for referrer, only if referral doesn't already exist)
      if (referredBy && referredBy !== userId) {
        const referrer = await tx.user.findFirst({
          where: {
            OR: [
              { id: referredBy },
              { username: referredBy }
            ]
          }
        });

        // Abort if referrer is found but it's the user themselves (self-referral prevention)
        if (referrer && referrer.id !== userId) {
          // Check if referee already was referred by anyone
          const existingReferral = await tx.referral.findUnique({
            where: { refereeId: userId }
          });

          if (!existingReferral) {
            const currentReferee = await tx.user.findUnique({
              where: { id: userId },
              select: { name: true, lastLoginIp: true }
            });
            const refereeName = currentReferee?.name || 'A new user';

            // Fraud check: self-referrals, duplicate IP addresses, or same device log
            let status = 'completed';
            let isSuspicious = false;

            if (referrer.lastLoginIp && currentReferee?.lastLoginIp && referrer.lastLoginIp === currentReferee.lastLoginIp) {
              status = 'pending_review';
              isSuspicious = true;
            }

            // Create referral connection
            await tx.referral.create({
              data: {
                referrerId: referrer.id,
                refereeId: userId,
                rewardAmount: 500.0,
                status
              }
            });

            if (status === 'completed') {
              // Credit referrer wallet
              let referrerWallet = await tx.wallet.findUnique({
                where: { userId: referrer.id }
              });

              if (referrerWallet) {
                await tx.wallet.update({
                  where: { userId: referrer.id },
                  data: {
                    balance: { increment: 500.0 },
                    totalEarned: { increment: 500.0 },
                    transactions: {
                      create: {
                        amount: 500.0,
                        type: 'referral',
                        description: `Referral bonus for inviting ${refereeName}`
                      }
                    }
                  }
                });
              } else {
                // Lazy-create referrer's wallet too if they didn't have one
                await tx.wallet.create({
                  data: {
                    userId: referrer.id,
                    balance: 3000.0,
                    totalEarned: 3000.0,
                    totalSpent: 0.0,
                    transactions: {
                      createMany: {
                        data: [
                          { amount: 2500.0, type: 'welcome', description: 'Welcome promotional wallet credits' },
                          { amount: 500.0, type: 'referral', description: `Referral bonus for inviting ${refereeName}` }
                        ]
                      }
                    }
                  }
                });
              }

              // Create notification for referrer (Referral joined, ₹500 credited)
              await tx.notification.create({
                data: {
                  userId: referrer.id,
                  type: 'referral_joined',
                  message: `${refereeName} joined Tolee using your referral link. ₹500 has been credited to your Ads Wallet.`,
                  link: '/ads-manager'
                }
              });
            } else {
              // Suspicious/Pending review notification for referrer
              await tx.notification.create({
                data: {
                  userId: referrer.id,
                  type: 'referral_pending',
                  message: `Your referral of ${refereeName} is pending verification. Reward will be credited after review.`,
                  link: '/ads-manager?tab=referrals'
                }
              });
            }
          }
        }
      }

      return newWallet;
    });

    return { success: true, isNew: true, balance: result.balance };
  } catch (error: any) {
    console.error('Wallet initialization error:', error);
    return { success: false, error: error.message || 'Failed to initialize wallet' };
  }
}

/**
 * Fetches user's wallet info and transaction history.
 */
export async function getUserWallet() {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, error: 'Unauthorized' };

    let wallet = await prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    // Lazy load if not exists yet
    if (!wallet) {
      const init = await checkAndInitializeWallet();
      if (init.success) {
        wallet = await prisma.wallet.findUnique({
          where: { userId },
          include: {
            transactions: {
              orderBy: { createdAt: 'desc' }
            }
          }
        });
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true, transferPin: true, username: true }
    });

    const successfulSignups = await prisma.referral.count({
      where: { referrerId: userId, status: 'completed' }
    });

    const pendingReferrals = await prisma.referral.count({
      where: { referrerId: userId, status: 'pending_review' }
    });

    const clicksCount = await prisma.auditLog.count({
      where: {
        action: 'referral_click',
        target: userId
      }
    });

    // App Installs estimation (measurable from clicks and successful signups)
    const appInstalls = successfulSignups + Math.min(
      Math.floor(clicksCount * 0.4),
      Math.max(0, clicksCount - successfulSignups)
    );

    const referralCode = user?.username || userId;
    const referralLink = `https://www.tolee.in/ref/${referralCode}`;

    return {
      success: true,
      wallet,
      referralCount: successfulSignups,
      referralLink,
      referralCode,
      hasTransferPin: !!user?.transferPin,
      hasPassword: !!user?.passwordHash,
      referralStats: {
        clicks: clicksCount,
        installs: appInstalls,
        signups: successfulSignups,
        approved: successfulSignups,
        pending: pendingReferrals,
        earnings: successfulSignups * 500,
        balance: wallet?.balance || 0
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to get wallet' };
  }
}

/**
 * Meta-style Campaign Creation Action (Campaign -> AdSet -> Ad)
 */
export async function createCampaignAction(data: {
  name: string;
  objective: string;
  specialAdCategory?: string;
  cboEnabled: boolean;
  abTestingEnabled: boolean;
  adSetName: string;
  conversionLocation?: string;
  performanceGoal?: string;
  budgetType: 'daily' | 'lifetime';
  budgetAmount: number;
  startDate: string;
  endDate?: string;
  targetingCountries?: string;
  targetingStates?: string;
  targetingCities?: string;
  targetingPincodes?: string;
  targetingToleeIds?: string;
  targetingInterests?: string;
  targetingFollowers: boolean;
  targetingEngagedUsers: boolean;
  placements: string[];
  adName: string;
  format: 'single_image' | 'single_video' | 'carousel' | 'collection';
  mediaUrls: string[];
  primaryText?: string;
  headline?: string;
  description?: string;
  ctaButton?: string;
  destinationUrl?: string;
  status?: string;
}) {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, error: 'Unauthorized' };

    // Get current wallet balance
    const wallet = await prisma.wallet.findUnique({
      where: { userId }
    });

    if (!wallet || wallet.balance <= 0) {
      return { success: false, error: 'Insufficient wallet balance to run campaigns. Refer friends to earn more credits!' };
    }

    const campaign = await prisma.campaign.create({
      data: {
        userId,
        name: data.name,
        objective: data.objective,
        specialAdCategory: data.specialAdCategory || 'none',
        cboEnabled: data.cboEnabled,
        abTestingEnabled: data.abTestingEnabled,
        type: 'manual',
        status: data.status || 'pending', // custom status support (e.g. running for direct campaigns)
        adSets: {
          create: {
            name: data.adSetName,
            conversionLocation: data.conversionLocation,
            performanceGoal: data.performanceGoal,
            budgetType: data.budgetType,
            budgetAmount: Number(data.budgetAmount),
            startDate: new Date(data.startDate),
            endDate: data.endDate ? new Date(data.endDate) : null,
            targetingCountries: data.targetingCountries,
            targetingStates: data.targetingStates,
            targetingCities: data.targetingCities,
            targetingPincodes: data.targetingPincodes,
            targetingToleeIds: data.targetingToleeIds,
            targetingInterests: data.targetingInterests,
            targetingFollowers: data.targetingFollowers,
            targetingEngagedUsers: data.targetingEngagedUsers,
            placements: data.placements.join(','),
            ads: {
              create: {
                name: data.adName,
                format: data.format,
                mediaUrls: data.mediaUrls.join(','),
                primaryText: data.primaryText,
                headline: data.headline,
                description: data.description,
                ctaButton: data.ctaButton,
                destinationUrl: data.destinationUrl
              }
            }
          }
        }
      }
    });

    // Create Notification
    await prisma.notification.create({
      data: {
        userId,
        type: 'campaign_review',
        message: `📢 Campaign "${data.name}" has been created and is pending admin approval.`,
        link: '/ads-manager'
      }
    });

    revalidatePath('/ads-manager');
    return { success: true, campaignId: campaign.id };
  } catch (error: any) {
    console.error('Campaign creation error:', error);
    return { success: false, error: error.message || 'Failed to create campaign' };
  }
}

/**
 * Creates a quick boost campaign for a Post, Reel, or Marketplace Listing.
 */
export async function createQuickBoostAction(
  type: 'post' | 'reel' | 'listing',
  targetId: string,
  options: {
    budgetAmount: number;
    durationDays: number;
    targetingToleeIds?: string;
    targetingLocations?: string;
    targetingInterests?: string;
  }
) {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, error: 'Unauthorized' };

    const wallet = await prisma.wallet.findUnique({
      where: { userId }
    });

    if (!wallet || wallet.balance <= 0) {
      return { success: false, error: 'Insufficient wallet balance. Earn ₹500 per friend referred!' };
    }

    let mediaUrls: string[] = [];
    let primaryText = '';
    let name = `Quick Boost - ${type.toUpperCase()}`;
    let isVideoPost = false;

    // Load original post, reel, or listing to get basic content
    if (type === 'post') {
      const post = await prisma.post.findUnique({
        where: { id: targetId },
        select: { caption: true, mediaUrls: true, mediaTypes: true }
      });
      if (!post) return { success: false, error: 'Post not found' };
      mediaUrls = post.mediaUrls ? post.mediaUrls.split(',').map(u => u.trim()).filter(Boolean) : [];
      primaryText = post.caption || '';
      name = `Boost Post: ${primaryText.slice(0, 20)}...`;

      const types = post.mediaTypes ? post.mediaTypes.split(',').map(t => t.trim().toLowerCase()) : [];
      if (types.some(t => t.startsWith('video'))) {
        isVideoPost = true;
      }
    } else if (type === 'reel') {
      const post = await prisma.post.findUnique({
        where: { id: targetId },
        select: { caption: true, mediaUrls: true, postType: true, mediaTypes: true }
      });
      if (!post) return { success: false, error: 'Reel not found' };
      mediaUrls = post.mediaUrls ? post.mediaUrls.split(',').map(u => u.trim()).filter(Boolean) : [];
      primaryText = post.caption || '';
      name = `Boost Reel: ${primaryText.slice(0, 20)}...`;
    } else if (type === 'listing') {
      const listing = await prisma.listing.findUnique({
        where: { id: targetId },
        select: { title: true, images: true, description: true }
      });
      if (!listing) return { success: false, error: 'Marketplace listing not found' };
      mediaUrls = listing.images ? listing.images.split(',').map(u => u.trim()).filter(Boolean) : [];
      primaryText = listing.description || '';
      name = `Boost Listing: ${listing.title}`;
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + options.durationDays);

    const campaign = await prisma.campaign.create({
      data: {
        userId,
        name,
        objective: 'engagement',
        type: 'boost',
        status: 'pending',
        postBoostId: type === 'post' ? targetId : null,
        reelBoostId: type === 'reel' ? targetId : null,
        listingBoostId: type === 'listing' ? targetId : null,
        adSets: {
          create: {
            name: `${name} - Ad Set`,
            budgetType: 'lifetime',
            budgetAmount: Number(options.budgetAmount),
            startDate,
            endDate,
            targetingToleeIds: options.targetingToleeIds,
            targetingCities: options.targetingLocations,
            targetingInterests: options.targetingInterests,
            placements: type === 'reel' ? 'reels' : type === 'listing' ? 'marketplace' : 'feed,reels,marketplace',
            ads: {
              create: {
                name: `${name} - Creative`,
                format: type === 'reel' ? 'single_video' : isVideoPost ? 'single_video' : 'single_image',
                mediaUrls: mediaUrls.join(','),
                primaryText,
                headline: name,
                ctaButton: type === 'listing' ? 'learn_more' : 'send_message',
                destinationUrl: type === 'listing' 
                  ? `/marketplace/listing/${targetId}` 
                  : type === 'reel' 
                    ? `/reels?id=${targetId}` 
                    : `/feed?postId=${targetId}`
              }
            }
          }
        }
      }
    });

    await prisma.notification.create({
      data: {
        userId,
        type: 'campaign_review',
        message: `🚀 Boost request submitted for review! Check Ads Manager for status.`,
        link: '/ads-manager'
      }
    });

    revalidatePath('/ads-manager');
    return { success: true, campaignId: campaign.id };
  } catch (error: any) {
    console.error('Quick Boost creation error:', error);
    return { success: false, error: error.message || 'Failed to request boost' };
  }
}

/**
 * Increments click/impression metrics and dynamically deducts cost from the advertiser's wallet.
 * Protects against impression/click fraud using IP and timestamp tracking.
 */
export async function trackAdInteraction(
  adId: string,
  type: 'impression' | 'click' | 'lead',
  ipAddress?: string,
  context?: {
    contentId?: string;
    toleeId?: string;
    placementType?: 'normal_feed' | 'group_pin_post' | 'group_cover_banner';
  }
) {
  try {
    const viewerId = await getUserId();

    // 1. Fetch Ad along with campaign details and advertiser
    const ad = await prisma.ad.findUnique({
      where: { id: adId },
      include: {
        adSet: {
          include: {
            campaign: {
              include: {
                user: {
                  include: {
                    wallet: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!ad) return { success: false, error: 'Ad not found' };

    const campaign = ad.adSet.campaign;
    const advertiser = campaign.user;
    const wallet = advertiser.wallet;

    if (campaign.status !== 'running') {
      return { success: false, error: 'Campaign is not currently running' };
    }

    if (!wallet || wallet.balance <= 0) {
      // Auto-pause campaign if balance is empty
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: 'paused' }
      });
      return { success: false, error: 'Campaign paused due to insufficient wallet funds' };
    }

    // 2. Click / Impression Fraud Prevention
    // If same IP/Viewer tracks same type within last 1 minute, charge ₹0
    const oneMinuteAgo = new Date();
    oneMinuteAgo.setMinutes(oneMinuteAgo.getMinutes() - 1);

    const matchCriteria: any = {
      adId,
      type,
      createdAt: { gte: oneMinuteAgo }
    };

    if (viewerId) {
      matchCriteria.userId = viewerId;
    } else if (ipAddress) {
      matchCriteria.ipAddress = ipAddress;
    }

    const isDuplicate = (viewerId || ipAddress) ? await prisma.adAnalytics.findFirst({
      where: matchCriteria
    }) : null;

    // 3. Pricing & Split Rules (Suggested Tolee Revenue Model)
    let cost = 0.0;
    let creatorShare = 0.0;
    let adminShare = 0.0;
    let platformShare = 0.0;

    if (!isDuplicate) {
      if (type === 'click') {
        cost = 5.00; // ₹5 per CPC Click
        creatorShare = cost * 0.55;    // ₹2.75 (55%)
        adminShare = cost * 0.05;      // ₹0.25 (5%)
        platformShare = cost * 0.40;   // ₹2.00 (40%)
      } else if (type === 'impression') {
        const placement = context?.placementType || 'normal_feed';
        if (placement === 'group_pin_post') {
          cost = 0.20; // ₹200 CPM (₹0.20 per impression)
          creatorShare = cost * 0.55;  // ₹0.110 (55%)
          adminShare = cost * 0.10;    // ₹0.020 (10%)
          platformShare = cost * 0.35; // ₹0.070 (35%)
        } else if (placement === 'group_cover_banner') {
          cost = 0.20; // ₹200 CPM (₹0.20 per impression)
          creatorShare = cost * 0.50;  // ₹0.100 (50%)
          adminShare = cost * 0.15;    // ₹0.030 (15%)
          platformShare = cost * 0.35; // ₹0.070 (35%)
        } else {
          // normal_feed
          cost = 0.10; // ₹100 CPM (₹0.10 per impression)
          creatorShare = cost * 0.55;  // ₹0.055 (55%)
          adminShare = cost * 0.05;    // ₹0.005 (5%)
          platformShare = cost * 0.40; // ₹0.040 (40%)
        }
      } else if (type === 'lead') {
        cost = 10.00; // ₹10 lead cost
        creatorShare = cost * 0.55;    // 55%
        adminShare = cost * 0.05;      // 5%
        platformShare = cost * 0.40;   // 40%
      }
    }

    // Ensure we don't deduct more than the current wallet balance
    if (cost > wallet.balance) {
      const scale = wallet.balance / cost;
      cost = wallet.balance;
      creatorShare *= scale;
      adminShare *= scale;
      platformShare *= scale;
    }

    // 4. Identify Stakeholder IDs (Creator & Group Admin)
    let creatorId: string | null = null;
    
    // Check if the campaign itself is boosting a specific piece of content
    if (campaign.postBoostId) {
      const post = await prisma.post.findUnique({
        where: { id: campaign.postBoostId },
        select: { authorId: true }
      });
      if (post) creatorId = post.authorId;
    } else if (campaign.reelBoostId) {
      const reel = await prisma.post.findUnique({
        where: { id: campaign.reelBoostId },
        select: { authorId: true }
      });
      if (reel) creatorId = reel.authorId;
    } else if (campaign.listingBoostId) {
      const listing = await prisma.listing.findUnique({
        where: { id: campaign.listingBoostId },
        select: { sellerId: true }
      });
      if (listing) creatorId = listing.sellerId;
    }

    // If still not found and context has contentId, lookup that content
    if (!creatorId && context?.contentId) {
      const post = await prisma.post.findUnique({
        where: { id: context.contentId },
        select: { authorId: true }
      });
      if (post) {
        creatorId = post.authorId;
      } else {
        const listing = await prisma.listing.findUnique({
          where: { id: context.contentId },
          select: { sellerId: true }
        });
        if (listing) creatorId = listing.sellerId;
      }
    }

    let groupAdminId: string | null = null;
    let targetToleeId: string | null = context?.toleeId || null;

    // Check if the content is shared in a Tolee group
    if (!targetToleeId && context?.contentId) {
      const postTolee = await prisma.postTolee.findFirst({
        where: { postId: context.contentId },
        select: { toleeId: true }
      });
      if (postTolee) targetToleeId = postTolee.toleeId;
    }

    if (!targetToleeId && campaign.postBoostId) {
      const postTolee = await prisma.postTolee.findFirst({
        where: { postId: campaign.postBoostId },
        select: { toleeId: true }
      });
      if (postTolee) targetToleeId = postTolee.toleeId;
    }

    // Lookup Tolee Owner (Group Admin)
    if (targetToleeId) {
      const tolee = await prisma.tolee.findUnique({
        where: { id: targetToleeId },
        select: { ownerId: true }
      });
      if (tolee) groupAdminId = tolee.ownerId;
    }

    // 5. Update Advertiser Wallet & Record Log inside transactional system
    await prisma.$transaction(async (tx) => {
      // Helper to lazy-create wallet inside transaction if it doesn't exist
      const getOrCreateWalletTx = async (txClient: any, targetUserId: string) => {
        let w = await txClient.wallet.findUnique({ where: { userId: targetUserId } });
        if (!w) {
          w = await txClient.wallet.create({
            data: {
              userId: targetUserId,
              balance: 2500.0,
              totalEarned: 2500.0,
              totalSpent: 0.0,
              transactions: {
                create: {
                  amount: 2500.0,
                  type: 'welcome',
                  description: 'Congratulations! Welcome promotional wallet credits'
                }
              }
            }
          });
        }
        return w;
      };

      // Record interaction log
      await tx.adAnalytics.create({
        data: {
          adId,
          type,
          costDeducted: cost,
          ipAddress: ipAddress || null,
          userId: viewerId || null
        }
      });

      if (cost > 0) {
        // Deduct from advertiser wallet balance
        const updatedWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: { decrement: cost },
            totalSpent: { increment: cost }
          }
        });

        // Add spending transaction
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            amount: -cost,
            type: 'spend',
            description: `${type.toUpperCase()} deduction for ad "${ad.name}" (${context?.placementType || 'normal_feed'})`,
            campaignId: campaign.id
          }
        });

        // --- FRANCHISE COMMISSION REVENUE SHARING ---
        try {
          const referral = await tx.referral.findFirst({
            where: { refereeId: campaign.userId, franchiseId: { not: null } },
            include: { franchise: true }
          });
          if (referral && referral.franchise && referral.franchise.status === "active") {
            // Count active referred users for this franchise
            const activeUsersCount = await tx.referral.count({
              where: {
                franchiseId: referral.franchise.id,
                referee: {
                  OR: [
                    { email_verified: true },
                    { phoneVerified: true },
                    { isMobileVerified: true },
                    { lastActiveAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
                  ]
                }
              }
            });

            // Retrieve slab rules
            const slabs = await tx.franchiseSlab.findMany({
              orderBy: { minUsers: 'asc' }
            });

            let commissionPercent = 2.0; // fallback default
            if (slabs.length > 0) {
              for (const slab of slabs) {
                if (activeUsersCount >= slab.minUsers && activeUsersCount <= slab.maxUsers) {
                  commissionPercent = slab.commission;
                  break;
                }
              }
            } else {
              // Standard fallback slabs
              if (activeUsersCount < 20000) commissionPercent = 2.0;
              else if (activeUsersCount < 50000) commissionPercent = 2.5;
              else if (activeUsersCount < 100000) commissionPercent = 3.5;
              else commissionPercent = 5.0;
            }

            const comm = cost * (commissionPercent / 100);
            if (comm > 0) {
              await tx.franchise.update({
                where: { id: referral.franchise.id },
                data: {
                  walletBalance: { increment: comm },
                  commissionEarned: { increment: comm }
                }
              });

              await tx.franchiseTransaction.create({
                data: {
                  franchiseId: referral.franchise.id,
                  amount: comm,
                  type: "commission",
                  description: `Earned ${commissionPercent}% commission on ad spend of ₹${cost.toFixed(3)} by referred user (${referral.refereeId})`,
                  adCampaignId: campaign.id
                }
              });
            }
          }
        } catch (commErr) {
          console.error("[Franchise Commission Engine Error]:", commErr);
        }

        // Credit Creator Wallet
        if (creatorId && creatorShare > 0) {
          const creatorWallet = await getOrCreateWalletTx(tx, creatorId);
          await tx.wallet.update({
            where: { id: creatorWallet.id },
            data: {
              balance: { increment: creatorShare },
              totalEarned: { increment: creatorShare }
            }
          });
          await tx.walletTransaction.create({
            data: {
              walletId: creatorWallet.id,
              amount: creatorShare,
              type: 'ad_creator_earnings',
              description: `Creator share (${(type === 'click' ? '55%' : (context?.placementType === 'group_cover_banner' ? '50%' : '55%'))}) of ₹${cost.toFixed(3)} for ad "${ad.name}"`,
              campaignId: campaign.id
            }
          });
        }

        // Credit Group Admin Wallet
        if (groupAdminId && adminShare > 0) {
          const adminWallet = await getOrCreateWalletTx(tx, groupAdminId);
          await tx.wallet.update({
            where: { id: adminWallet.id },
            data: {
              balance: { increment: adminShare },
              totalEarned: { increment: adminShare }
            }
          });
          await tx.walletTransaction.create({
            data: {
              walletId: adminWallet.id,
              amount: adminShare,
              type: 'ad_admin_earnings',
              description: `Group Admin share (${(type === 'click' ? '5%' : (context?.placementType === 'group_pin_post' ? '10%' : (context?.placementType === 'group_cover_banner' ? '15%' : '5%')))}) of ₹${cost.toFixed(3)} for ad "${ad.name}"`,
              campaignId: campaign.id
            }
          });
        }

        // Low balance notification (Advertiser receives notice at ₹1,000 threshold)
        if (updatedWallet.balance < 1000 && wallet.balance >= 1000) {
          await tx.notification.create({
            data: {
              userId: advertiser.id,
              type: 'wallet_low',
              message: `⚠️ Alert: Your Tolee Ads Wallet balance is low (₹${updatedWallet.balance.toFixed(2)}). Share your invite link to earn ₹500 credits!`,
              link: '/ads-manager'
            }
          });
        }

        // Out of balance notification & Auto Pause
        if (updatedWallet.balance <= 0) {
          await tx.campaign.update({
            where: { id: campaign.id },
            data: { status: 'paused' }
          });

          await tx.notification.create({
            data: {
              userId: advertiser.id,
              type: 'campaign_paused',
              message: `🚫 Your campaign "${campaign.name}" was paused because your Ads Wallet balance is empty.`,
              link: '/ads-manager'
            }
          });
        }
      }
    });

    return { success: true, charged: cost };
  } catch (error: any) {
    console.error('Interaction tracking error:', error);
    return { success: false, error: error.message || 'Failed to track ad interaction' };
  }
}

/**
 * Calculates premium real-time metrics for a user's advertising dashboard.
 */
export async function getAdCampaignsDashboard() {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, error: 'Unauthorized' };

    // Fetch all campaigns belonging to this user
    const campaigns = await prisma.campaign.findMany({
      where: { userId },
      include: {
        adSets: {
          include: {
            ads: {
              include: {
                analytics: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    let totalSpend = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalLeads = 0;

    // Daily aggregation for the performance graph (last 14 days)
    const dailyStats: Record<string, { date: string; spend: number; impressions: number; clicks: number; leads: number }> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dailyStats[dateString] = { date: dateString, spend: 0, impressions: 0, clicks: 0, leads: 0 };
    }

    campaigns.forEach((campaign) => {
      campaign.adSets.forEach((adSet) => {
        adSet.ads.forEach((ad) => {
          ad.analytics.forEach((analytic) => {
            totalSpend += analytic.costDeducted;
            if (analytic.type === 'impression') totalImpressions++;
            if (analytic.type === 'click') totalClicks++;
            if (analytic.type === 'lead') totalLeads++;

            const analyticDate = new Date(analytic.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (dailyStats[analyticDate]) {
              dailyStats[analyticDate].spend += analytic.costDeducted;
              if (analytic.type === 'impression') dailyStats[analyticDate].impressions++;
              if (analytic.type === 'click') dailyStats[analyticDate].clicks++;
              if (analytic.type === 'lead') dailyStats[analyticDate].leads++;
            }
          });
        });
      });
    });

    const graphData = Object.values(dailyStats);

    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const cpl = totalLeads > 0 ? totalSpend / totalLeads : 0;

    return {
      success: true,
      campaigns,
      stats: {
        totalSpend,
        totalImpressions,
        totalClicks,
        totalLeads,
        ctr,
        cpc,
        cpl
      },
      graphData
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to retrieve analytics' };
  }
}

/**
 * Pauses or resumes a campaign
 */
export async function toggleCampaignStatus(campaignId: string, pause: boolean) {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, error: 'Unauthorized' };

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, userId }
    });

    if (!campaign) return { success: false, error: 'Campaign not found' };

    if (campaign.status === 'pending' || campaign.status === 'rejected') {
      return { success: false, error: 'Cannot activate/pause campaign in pending or rejected status' };
    }

    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: pause ? 'paused' : 'running'
      }
    });

    revalidatePath('/ads-manager');
    return { success: true, status: updated.status };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Super Admin: Retrieves all campaigns inside the system.
 */
export async function superAdminGetCampaigns() {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, error: 'Unauthorized' };

    // Check if the current user is Super Admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    });

    if (user?.email !== process.env.SUPER_ADMIN_EMAIL) {
      return { success: false, error: 'Access denied: Super Admin only' };
    }

    const campaigns = await prisma.campaign.findMany({
      include: {
        user: {
          select: { name: true, email: true, wallet: true, image: true, avatar: true }
        },
        adSets: {
          include: {
            ads: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const mappedCampaigns = campaigns.map(camp => {
      const adSets = camp.adSets.map(adSet => {
        const ads = adSet.ads.map(ad => {
          const mediaList = ad.mediaUrls ? ad.mediaUrls.split(',').map((u: string) => u.trim()).filter(Boolean) : [];
          const displayMedia = mediaList[0] || null;
          const isVideo = isVideoUrl(displayMedia);
          return {
            ...ad,
            imageUrl: isVideo ? null : displayMedia,
            mediaType: isVideo ? 'video' : 'image',
            image: isVideo ? null : displayMedia,
            video: isVideo ? displayMedia : null,
          };
        });
        return { ...adSet, ads };
      });
      return { ...camp, adSets };
    });

    return { success: true, campaigns: mappedCampaigns };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Super Admin: Approves or rejects a campaign request.
 */
export async function superAdminModerateCampaign(campaignId: string, status: 'approved' | 'rejected', reason?: string) {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, error: 'Unauthorized' };

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    });

    if (user?.email !== process.env.SUPER_ADMIN_EMAIL) {
      return { success: false, error: 'Access denied: Super Admin only' };
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId }
    });

    if (!campaign) return { success: false, error: 'Campaign not found' };

    const finalStatus = status === 'approved' ? 'running' : 'rejected';

    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: finalStatus,
        rejectionReason: reason || null
      }
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId: campaign.userId,
        type: finalStatus === 'running' ? 'campaign_approved' : 'campaign_rejected',
        message: finalStatus === 'running'
          ? `🎉 Your campaign "${campaign.name}" has been approved and is now running!`
          : `❌ Your campaign "${campaign.name}" was rejected. Reason: ${reason || 'Inappropriate content'}`,
        link: '/ads-manager'
      }
    });

    revalidatePath('/ads-manager');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Fetches matching active ads based on audience targeting criteria (Tolee groups, location, interests).
 * Used for dynamic sponsored injection into Feed streams.
 */
export async function fetchEligibleAds(params: {
  toleeId?: string;
  location?: string;
  interest?: string;
  limit?: number;
}) {
  try {
    const activeAds = await prisma.ad.findMany({
      where: {
        adSet: {
          campaign: {
            status: 'running',
            user: {
              wallet: {
                balance: { gt: 0 }
              }
            }
          }
        }
      },
      include: {
        adSet: {
          include: {
            campaign: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                    avatar: true
                  }
                }
              }
            }
          }
        }
      },
      take: params.limit || 5
    });

    // Client-side/helper filtering for matching targets (or fallback to general active ads)
    const filtered = activeAds.filter((ad) => {
      const targetTolees = ad.adSet.targetingToleeIds ? ad.adSet.targetingToleeIds.split(',') : [];
      const targetCities = ad.adSet.targetingCities ? ad.adSet.targetingCities.split(',') : [];
      const targetInterests = ad.adSet.targetingInterests ? ad.adSet.targetingInterests.split(',') : [];

      if (params.toleeId && targetTolees.length > 0 && !targetTolees.includes(params.toleeId)) {
        return false;
      }
      if (params.location && targetCities.length > 0 && !targetCities.some(c => params.location?.toLowerCase().includes(c.toLowerCase()))) {
        return false;
      }
      if (params.interest && targetInterests.length > 0 && !targetInterests.some(i => params.interest?.toLowerCase().includes(i.toLowerCase()))) {
        return false;
      }
      return true;
    });

    const mapAd = (ad: any) => {
      const mediaList = ad.mediaUrls ? ad.mediaUrls.split(',').map((u: string) => u.trim()).filter(Boolean) : [];
      const displayMedia = mediaList[0] || null;
      const isVideo = isVideoUrl(displayMedia);
      return {
        ...ad,
        imageUrl: isVideo ? null : displayMedia,
        mediaType: isVideo ? 'video' : 'image',
        image: isVideo ? null : displayMedia,
        video: isVideo ? displayMedia : null,
      };
    };

    const finalAds = filtered.length > 0 ? filtered : activeAds;
    return finalAds.map(mapAd);
  } catch (error) {
    console.error('Failed to fetch eligible ads:', error);
    return [];
  }
}

/**
 * Searches users for wallet transfers based on name, username, email, or Page ID.
 */
export async function searchUsersForTransfer(query: string) {
  try {
    const senderId = await getUserId();
    if (!senderId) return { success: false, error: 'Unauthorized' };

    if (!query || query.trim().length < 2) {
      return { success: true, users: [] };
    }

    const trimmed = query.trim();

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: senderId } }, // prevent self transfer
          {
            OR: [
              { email: { contains: trimmed, mode: 'insensitive' } },
              { username: { contains: trimmed, mode: 'insensitive' } },
              { name: { contains: trimmed, mode: 'insensitive' } },
              { id: { equals: trimmed } }
            ]
          }
        ]
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        avatar: true,
        image: true,
        isVerified: true
      },
      take: 5
    });

    return { success: true, users };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Atomic transfer of Ads Wallet Credits from one Tolee user to another.
 */
export async function transferWalletCreditsAction(data: {
  recipientId: string;
  amount: number;
  password?: string;
  pin?: string;
  note?: string;
}) {
  try {
    const { authLimiter, getClientIp } = require('@/lib/rate-limit');
    const ip = getClientIp();
    if (authLimiter.isRateLimited(ip)) {
      return { success: false, error: 'Too many transfer attempts. Please try again in 15 minutes.' };
    }

    const senderId = await getUserId();
    if (!senderId) return { success: false, error: 'Unauthorized' };

    if (senderId === data.recipientId) {
      return { success: false, error: 'Self-transfer is not permitted.' };
    }

    const transferAmount = Number(data.amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return { success: false, error: 'Please enter a valid transfer amount greater than zero.' };
    }

    // 1. Authenticate Sender & check password or PIN
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { passwordHash: true, transferPin: true, username: true, name: true }
    });

    if (!sender) return { success: false, error: 'Sender account not found.' };

    if (data.pin) {
      if (!sender.transferPin) {
        return { success: false, error: 'Transfer PIN is not set. Please set a Transfer PIN first.' };
      }
      const isPinValid = await bcrypt.compare(data.pin, sender.transferPin);
      if (!isPinValid) {
        return { success: false, error: 'Incorrect Transfer PIN. Verification failed.' };
      }
    } else if (data.password) {
      if (!sender.passwordHash) {
        return { success: false, error: 'Password is not set for this account. Please set a Transfer PIN instead.' };
      }
      const isPasswordValid = await bcrypt.compare(data.password, sender.passwordHash);
      if (!isPasswordValid) {
        return { success: false, error: 'Incorrect password. Verification failed.' };
      }
    } else {
      return { success: false, error: 'Authorization (Password or PIN) is required to complete this transfer.' };
    }

    // 2. Validate recipient
    const recipient = await prisma.user.findUnique({
      where: { id: data.recipientId },
      select: { username: true, name: true }
    });

    if (!recipient) return { success: false, error: 'Recipient account not found.' };

    // 3. Execute atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // Find sender's wallet
      const senderWallet = await tx.wallet.findUnique({
        where: { userId: senderId }
      });

      if (!senderWallet || senderWallet.balance < transferAmount) {
        throw new Error('Insufficient wallet balance to complete this transfer.');
      }

      // Check or lazy-create recipient's wallet
      let recipientWallet = await tx.wallet.findUnique({
        where: { userId: data.recipientId }
      });

      if (!recipientWallet) {
        recipientWallet = await tx.wallet.create({
          data: {
            userId: data.recipientId,
            balance: 2500.0,
            totalEarned: 2500.0,
            totalSpent: 0.0
          }
        });
      }

      // Deduct from sender
      const updatedSenderWallet = await tx.wallet.update({
        where: { userId: senderId },
        data: {
          balance: { decrement: transferAmount }
        }
      });

      // Add to recipient
      await tx.wallet.update({
        where: { userId: data.recipientId },
        data: {
          balance: { increment: transferAmount },
          totalEarned: { increment: transferAmount }
        }
      });

      // Create transaction logs
      await tx.walletTransaction.create({
        data: {
          walletId: senderWallet.id,
          amount: -transferAmount,
          type: 'transfer_send',
          description: `Transferred ₹${transferAmount} to @${recipient.username || recipient.name}${data.note ? ` (${data.note})` : ''}`
        }
      });

      await tx.walletTransaction.create({
        data: {
          walletId: recipientWallet.id,
          amount: transferAmount,
          type: 'transfer_receive',
          description: `Received ₹${transferAmount} from @${sender.username || sender.name}${data.note ? ` (${data.note})` : ''}`
        }
      });

      // Create notification for sender
      await tx.notification.create({
        data: {
          userId: senderId,
          type: 'wallet_debit',
          message: `💸 ₹${transferAmount.toLocaleString('en-IN')} successfully transferred to @${recipient.username || recipient.name}.`,
          link: '/ads-manager'
        }
      });

      // Create notification for recipient
      await tx.notification.create({
        data: {
          userId: data.recipientId,
          type: 'wallet_credit',
          message: `🎉 You received ₹${transferAmount.toLocaleString('en-IN')} from @${sender.username || sender.name} in your Ads Wallet!`,
          link: '/ads-manager'
        }
      });

      return {
        newBalance: updatedSenderWallet.balance,
        recipientName: recipient.name
      };
    });

    revalidatePath('/ads-manager');
    return {
      success: true,
      balance: result.newBalance,
      message: `Successfully transferred ₹${transferAmount.toLocaleString('en-IN')} to ${result.recipientName}!`
    };
  } catch (err: any) {
    console.error('Wallet transfer transaction failed:', err);
    return { success: false, error: err.message || 'Atomic transfer transaction failed.' };
  }
}

/**
 * Super Admin: Retrieves all wallet transfers and transaction statements with fraud flagging.
 */
export async function superAdminGetWalletTransactions() {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, error: 'Unauthorized' };

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    });

    if (user?.email !== process.env.SUPER_ADMIN_EMAIL) {
      return { success: false, error: 'Access denied: Super Admin only' };
    }

    const transactions = await prisma.walletTransaction.findMany({
      include: {
        wallet: {
          include: {
            user: {
              select: { name: true, email: true, username: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    // Fraud detection and dynamic audit warning flags
    const flagged = transactions.map(tx => {
      let isFlagged = false;
      let flagReason = '';

      if (tx.type === 'transfer_send' && Math.abs(tx.amount) > 2000.0) {
        isFlagged = true;
        flagReason = 'Suspicious high-value transfer (> ₹2,000)';
      }

      return {
        ...tx,
        isFlagged,
        flagReason
      };
    });

    return { success: true, transactions: flagged };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Sets a new hashed numeric Transfer PIN for wallet confirmation.
 */
export async function setTransferPinAction(pin: string) {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, error: 'Unauthorized' };

    if (!pin || pin.length < 4 || pin.length > 6 || isNaN(Number(pin))) {
      return { success: false, error: 'PIN must be a 4 to 6 digit numeric code.' };
    }

    const pinHash = await bcrypt.hash(pin, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { transferPin: pinHash }
    });

    return { success: true, message: 'Transfer PIN set successfully!' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to set Transfer PIN.' };
  }
}

/**
 * Fetches preview details for boosting a Post, Reel, or Listing, along with the user's wallet balance.
 */
export async function getBoostPreviewDataAction(
  type: 'post' | 'reel' | 'listing',
  targetId: string
) {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, error: 'Unauthorized' };

    const wallet = await prisma.wallet.findUnique({
      where: { userId }
    });

    let preview = {
      name: '',
      username: '',
      avatar: '',
      caption: '',
      mediaUrl: '',
      type: type,
      targetId: targetId
    };

    if (type === 'post' || type === 'reel') {
      const post = await prisma.post.findUnique({
        where: { id: targetId },
        select: { 
          caption: true, 
          mediaUrls: true, 
          author: { 
            select: { name: true, username: true, avatar: true, image: true } 
          } 
        }
      });
      if (post) {
        preview.name = post.author.name || '';
        preview.username = post.author.username || '';
        preview.avatar = post.author.avatar || post.author.image || '/default-user-avatar.svg';
        preview.caption = post.caption || '';
        const mediaUrls = post.mediaUrls ? post.mediaUrls.split(',').map(u => u.trim()).filter(Boolean) : [];
        preview.mediaUrl = mediaUrls[0] || '';
      }
    } else if (type === 'listing') {
      const listing = await prisma.listing.findUnique({
        where: { id: targetId },
        select: { 
          title: true, 
          description: true, 
          images: true, 
          seller: { 
            select: { name: true, username: true, avatar: true, image: true } 
          } 
        }
      });
      if (listing) {
        preview.name = listing.seller.name || '';
        preview.username = listing.seller.username || '';
        preview.avatar = listing.seller.avatar || listing.seller.image || '/default-user-avatar.svg';
        preview.caption = listing.description || '';
        const images = listing.images ? listing.images.split(',').map(u => u.trim()).filter(Boolean) : [];
        preview.mediaUrl = images[0] || '';
      }
    }

    return { 
      success: true, 
      preview, 
      walletBalance: wallet?.balance ?? 0 
    };
  } catch (error: any) {
    console.error('getBoostPreviewDataAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch preview data' };
  }
}

/**
 * Updates an existing campaign (boost or manual) and sends it for review.
 */
export async function updateCampaignAction(
  campaignId: string,
  data: {
    name?: string;
    objective?: string;
    specialAdCategory?: string;
    cboEnabled?: boolean;
    abTestingEnabled?: boolean;
    adSetName?: string;
    conversionLocation?: string;
    performanceGoal?: string;
    budgetType?: 'daily' | 'lifetime';
    budgetAmount?: number;
    startDate?: string;
    endDate?: string;
    targetingCountries?: string;
    targetingStates?: string;
    targetingCities?: string;
    targetingPincodes?: string;
    targetingToleeIds?: string;
    targetingInterests?: string;
    targetingFollowers?: boolean;
    targetingEngagedUsers?: boolean;
    placements?: string[];
    adName?: string;
    format?: 'single_image' | 'single_video' | 'carousel' | 'collection';
    mediaUrls?: string[];
    primaryText?: string;
    headline?: string;
    description?: string;
    ctaButton?: string;
    destinationUrl?: string;
    status?: string;
  }
) {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, error: 'Unauthorized' };

    // Verify campaign ownership
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, userId },
      include: { adSets: { include: { ads: true } } }
    });

    if (!campaign) {
      return { success: false, error: 'Campaign not found or access denied.' };
    }

    const updatedStatus = data.status || 'pending'; // Default back to review upon edit/re-publish

    // Update campaign
    const updatedCampaign = await prisma.$transaction(async (tx) => {
      // 1. Update Campaign
      const camp = await tx.campaign.update({
        where: { id: campaignId },
        data: {
          name: data.name ?? campaign.name,
          objective: data.objective ?? campaign.objective,
          specialAdCategory: data.specialAdCategory ?? campaign.specialAdCategory,
          cboEnabled: data.cboEnabled ?? campaign.cboEnabled,
          abTestingEnabled: data.abTestingEnabled ?? campaign.abTestingEnabled,
          status: updatedStatus,
          rejectionReason: null // clear rejection reason
        }
      });

      // 2. Update AdSet
      const adSet = campaign.adSets[0];
      let updatedAdSet = null;
      if (adSet) {
        updatedAdSet = await tx.adSet.update({
          where: { id: adSet.id },
          data: {
            name: data.adSetName ?? adSet.name,
            conversionLocation: data.conversionLocation ?? adSet.conversionLocation,
            performanceGoal: data.performanceGoal ?? adSet.performanceGoal,
            budgetType: data.budgetType ?? adSet.budgetType,
            budgetAmount: data.budgetAmount !== undefined ? Number(data.budgetAmount) : adSet.budgetAmount,
            startDate: data.startDate ? new Date(data.startDate) : adSet.startDate,
            endDate: data.endDate ? new Date(data.endDate) : (data.endDate === null ? null : adSet.endDate),
            targetingCountries: data.targetingCountries ?? adSet.targetingCountries,
            targetingStates: data.targetingStates ?? adSet.targetingStates,
            targetingCities: data.targetingCities ?? adSet.targetingCities,
            targetingPincodes: data.targetingPincodes ?? adSet.targetingPincodes,
            targetingToleeIds: data.targetingToleeIds ?? adSet.targetingToleeIds,
            targetingInterests: data.targetingInterests ?? adSet.targetingInterests,
            targetingFollowers: data.targetingFollowers ?? adSet.targetingFollowers,
            targetingEngagedUsers: data.targetingEngagedUsers ?? adSet.targetingEngagedUsers,
            placements: data.placements ? data.placements.join(',') : adSet.placements
          }
        });

        // 3. Update Ad
        const ad = adSet.ads[0];
        if (ad) {
          await tx.ad.update({
            where: { id: ad.id },
            data: {
              name: data.adName ?? ad.name,
              format: data.format ?? ad.format,
              mediaUrls: data.mediaUrls ? data.mediaUrls.join(',') : ad.mediaUrls,
              primaryText: data.primaryText ?? ad.primaryText,
              headline: data.headline ?? ad.headline,
              description: data.description ?? ad.description,
              ctaButton: data.ctaButton ?? ad.ctaButton,
              destinationUrl: data.destinationUrl ?? ad.destinationUrl
            }
          });
        }
      }

      return camp;
    });

    // Notify super admin/moderation
    await prisma.notification.create({
      data: {
        userId,
        type: 'campaign_review',
        message: `🔄 Campaign "${campaign.name}" has been updated and re-submitted for review.`,
        link: '/ads-manager'
      }
    });

    revalidatePath('/ads-manager');
    return { success: true, campaignId: updatedCampaign.id };
  } catch (error: any) {
    console.error('Campaign update error:', error);
    return { success: false, error: error.message || 'Failed to update campaign' };
  }
}

/**
 * Fetches full campaign details including AdSet and Ad.
 */
export async function getCampaignDetailsAction(campaignId: string) {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, error: 'Unauthorized' };

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId },
      include: {
        adSets: {
          include: {
            ads: true
          }
        }
      }
    });

    if (!campaign) return { success: false, error: 'Campaign not found' };
    return { success: true, campaign };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getSuperAdminReferralsDashboard() {
  try {
    // 1. Fetch counts
    const totalSuccessful = await prisma.referral.count({
      where: { status: 'completed' }
    });

    const totalPending = await prisma.referral.count({
      where: { status: 'pending_review' }
    });

    const totalClicks = await prisma.auditLog.count({
      where: { action: 'referral_click' }
    });

    // Estimations
    const totalDownloads = totalSuccessful + Math.floor(totalClicks * 0.15);
    const totalEarnings = totalSuccessful * 500;
    const totalWalletCredits = totalSuccessful * 500;

    // Time series (Daily, Weekly, Monthly)
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const dailyReferrals = await prisma.referral.count({
      where: { createdAt: { gte: oneDayAgo }, status: 'completed' }
    });

    const weeklyReferrals = await prisma.referral.count({
      where: { createdAt: { gte: oneWeekAgo }, status: 'completed' }
    });

    const monthlyReferrals = await prisma.referral.count({
      where: { createdAt: { gte: oneMonthAgo }, status: 'completed' }
    });

    // 2. Fetch Referrers details
    const referrers = await prisma.user.findMany({
      where: {
        referralsMade: { some: {} }
      },
      select: {
        id: true,
        name: true,
        username: true,
        createdAt: true,
        wallet: {
          select: {
            balance: true,
            totalEarned: true
          }
        },
        referralsMade: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            referee: {
              select: {
                id: true,
                name: true,
                username: true
              }
            }
          }
        }
      }
    });

    const referrersList = await Promise.all(referrers.map(async (u) => {
      const clicks = await prisma.auditLog.count({
        where: { action: 'referral_click', target: u.id }
      });

      const completedReferrals = u.referralsMade.filter(r => r.status === 'completed');
      const lastReferralDate = u.referralsMade.length > 0 
        ? u.referralsMade[0].createdAt 
        : null;

      return {
        id: u.id,
        name: u.name,
        code: u.username || u.id,
        clicks,
        successfulReferrals: completedReferrals.length,
        walletBalance: u.wallet?.balance || 0,
        totalEarned: u.wallet?.totalEarned || 0,
        createdAt: u.createdAt,
        lastReferralDate,
        referrals: u.referralsMade
      };
    }));

    const topReferrers = [...referrersList]
      .sort((a, b) => b.successfulReferrals - a.successfulReferrals)
      .slice(0, 10);

    const pendingReferralsList = await prisma.referral.findMany({
      where: { status: 'pending_review' },
      include: {
        referrer: {
          select: { id: true, name: true, username: true }
        },
        referee: {
          select: { id: true, name: true, username: true, lastLoginIp: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      success: true,
      stats: {
        totalClicks,
        totalDownloads,
        totalSuccessful,
        totalEarnings,
        totalWalletCredits,
        totalPending,
        dailyReferrals,
        weeklyReferrals,
        monthlyReferrals
      },
      topReferrers,
      referrersList,
      pendingReferralsList
    };
  } catch (error: any) {
    console.error("Super Admin Referral dashboard error:", error);
    return { success: false, error: error.message };
  }
}

export async function approveReferralAction(referralId: string) {
  try {
    await prisma.$transaction(async (tx) => {
      const referral = await tx.referral.findUnique({
        where: { id: referralId },
        include: {
          referrer: { select: { id: true, name: true } },
          referee: { select: { name: true } }
        }
      });

      if (!referral) throw new Error("Referral record not found");
      if (referral.status === 'completed') throw new Error("Referral already approved");

      await tx.referral.update({
        where: { id: referralId },
        data: { status: 'completed' }
      });

      let referrerWallet = await tx.wallet.findUnique({
        where: { userId: referral.referrerId }
      });

      const refereeName = referral.referee.name;

      if (referrerWallet) {
        await tx.wallet.update({
          where: { userId: referral.referrerId },
          data: {
            balance: { increment: 500.0 },
            totalEarned: { increment: 500.0 },
            transactions: {
              create: {
                amount: 500.0,
                type: 'referral',
                description: `Referral bonus for inviting ${refereeName} (Approved by Admin)`
              }
            }
          }
        });
      } else {
        await tx.wallet.create({
          data: {
            userId: referral.referrerId,
            balance: 3000.0,
            totalEarned: 3000.0,
            totalSpent: 0.0,
            transactions: {
              createMany: {
                data: [
                  { amount: 2500.0, type: 'welcome', description: 'Welcome promotional wallet credits' },
                  { amount: 500.0, type: 'referral', description: `Referral bonus for inviting ${refereeName} (Approved by Admin)` }
                ]
              }
            }
          }
        });
      }

      await tx.notification.create({
        data: {
          userId: referral.referrerId,
          type: 'referral_joined',
          message: `🎉 Congratulations! Your referral of ${refereeName} was approved. ₹500 has been credited to your Ads Wallet.`,
          link: '/ads-manager'
        }
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error("Approve referral action error:", error);
    return { success: false, error: error.message };
  }
}

export async function rejectReferralAction(referralId: string) {
  try {
    const referral = await prisma.referral.update({
      where: { id: referralId },
      data: { status: 'rejected' },
      include: {
        referee: { select: { name: true } }
      }
    });

    await prisma.notification.create({
      data: {
        userId: referral.referrerId,
        type: 'referral_rejected',
        message: `Your referral of ${referral.referee.name} was rejected during security check.`,
        link: '/ads-manager?tab=referrals'
      }
    });

    return { success: true };
  } catch (error: any) {
    console.error("Reject referral action error:", error);
    return { success: false, error: error.message };
  }
}


