'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import Mux from '@mux/mux-node';
import { getSimulationSettings } from '@/lib/simulation';

const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID || '0f358a94-4bdf-403e-bb8a-02ee17b68b66';
const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET || 'GiZ6iyNUthNh1Kt1BEYph8zVv24R4CINmTl64k7l0lyRzdvehcZlHCcndb0Gcn8KdsVnv5n3XBc';

const mux = new Mux({
  tokenId: MUX_TOKEN_ID,
  tokenSecret: MUX_TOKEN_SECRET,
});



/**
 * Seed simulated videos if Simulation Mode is ON
 */
async function seedSimulatedScreenVideos() {
  try {
    const simSettings = await getSimulationSettings();
    if (!simSettings.simulationMode) return;

    // Check count of simulated videos
    const count = await prisma.screenVideo.count({
      where: { isSimulation: true }
    });

    if (count >= 24) return; // Already seeded enough

    // Get simulated users
    let simUsers = await prisma.user.findMany({
      where: { isSimulation: true }
    });

    // If no simulated users exist, create a few
    if (simUsers.length === 0) {
      const mockCreators = [
        { name: 'Tech Gyan', email: 'techgyan@simulation.tolee', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', username: 'techgyan' },
        { name: 'Finance Guruji', email: 'guruji@simulation.tolee', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150', username: 'finance_guruji' },
        { name: 'Gaming Zone', email: 'gaming@simulation.tolee', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150', username: 'gaming_zone' },
        { name: 'Chef Rasoi', email: 'chef@simulation.tolee', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', username: 'chef_rasoi' },
        { name: 'Fitness Mantra', email: 'fitness@simulation.tolee', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', username: 'fitness_mantra' }
      ];

      for (const mc of mockCreators) {
        const u = await prisma.user.create({
          data: {
            name: mc.name,
            email: mc.email,
            avatar: mc.avatar,
            username: mc.username,
            isSimulation: true,
            isVerified: true
          }
        });
        simUsers.push(u);
      }
    }

    const videoUrls = [
      'https://videos.pexels.com/video-files/7823396/7823396-hd_1080_1920_30fps.mp4',
      'https://videos.pexels.com/video-files/7983988/7983988-sd_360_640_25fps.mp4',
      'https://videos.pexels.com/video-files/8141297/8141297-sd_540_960_25fps.mp4',
      'https://videos.pexels.com/video-files/7593564/7593564-hd_1920_1080_25fps.mp4',
      'https://videos.pexels.com/video-files/10395606/10395606-hd_1080_1920_24fps.mp4'
    ];

    const thumbUrls = [
      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=640',
      'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=640',
      'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=640',
      'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=640',
      'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=640'
    ];

    const seedTemplates = [
      { title: 'Next.js 16 Server Actions: The Complete Engineering Guide', desc: 'Step-by-step tutorial on Next.js 16 advanced patterns, databases, and secure APIs.', category: 'Programming', duration: 720 },
      { title: 'How to Invest in Stock Markets in 2026 (Zero Risks)', desc: 'Daily finance guidance on investing, assets, mutual funds, and passive cashflows.', category: 'Finance', duration: 480 },
      { title: 'Cyberpunk 2077 Phantom Liberty - RayTracing Ultra Gameplay Walkthrough', desc: 'No commentary gameplay of Phantom Liberty expansion at Max Settings 4K HDR.', category: 'Gaming', duration: 1200 },
      { title: 'Authentic Butter Chicken Recipe - Restaurant Style Secrets', desc: 'Learn how to cook the best butter chicken at home with traditional spices.', category: 'Food', duration: 320 },
      { title: '15 Mins Full Body Daily Workout (No Equipment Needed)', desc: 'Home workout routine for burning fat, cardiovascular strength, and muscle tone.', category: 'Health', duration: 900 }
    ];

    for (let i = 0; i < 20; i++) {
      const template = seedTemplates[i % seedTemplates.length];
      const author = simUsers[i % simUsers.length];

      await prisma.screenVideo.create({
        data: {
          title: `${template.title} (Vol ${Math.floor(i/5) + 1})`,
          description: template.desc,
          mediaUrl: videoUrls[i % videoUrls.length],
          duration: template.duration + (i * 20),
          thumbnailUrl: thumbUrls[i % thumbUrls.length],
          category: template.category,
          viewsCount: 1500 + (i * 450),
          likesCount: 120 + (i * 25),
          isSimulation: true,
          userId: author.id,
          createdAt: new Date(Date.now() - (i * 4 * 3600 * 1000)) // offset timestamps
        }
      });
    }
  } catch (err) {
    console.error('Failed to seed simulated videos:', err);
  }
}

/**
 * Fetch screen videos supporting Cursor Pagination for Infinite Scroll
 */
export async function getScreenVideos(searchQuery?: string, category?: string, limit = 8, cursorId?: string) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user ? (session.user as any).id : null;

    // Attempt to seed simulated content in background
    await seedSimulatedScreenVideos();

    const simSettings = await getSimulationSettings();
    const isSimOn = simSettings.simulationMode;

    const andConditions: any[] = [];

    // Simulation filter fallback
    if (!isSimOn) {
      if (currentUserId) {
        andConditions.push({
          OR: [
            { isSimulation: false },
            { userId: currentUserId }
          ]
        });
      } else {
        andConditions.push({ isSimulation: false });
      }
    }

    // Draft filter fallback
    if (currentUserId) {
      andConditions.push({
        OR: [
          { status: 'published' },
          { userId: currentUserId }
        ]
      });
    } else {
      andConditions.push({ status: 'published' });
    }

    if (searchQuery && searchQuery.trim() !== '') {
      andConditions.push({
        OR: [
          { title: { contains: searchQuery, mode: 'insensitive' } },
          { description: { contains: searchQuery, mode: 'insensitive' } },
        ]
      });
    }

    if (category && category.trim() !== '' && category !== 'Recommended' && category !== 'Latest' && category !== 'Trending') {
      andConditions.push({ category });
    }

    const whereClause = andConditions.length > 0 ? { AND: andConditions } : {};

    let orderByClause: any = { createdAt: 'desc' };
    if (category === 'Trending') {
      orderByClause = { viewsCount: 'desc' };
    }

    const videos = await prisma.screenVideo.findMany({
      where: whereClause,
      take: limit + 1, // Get extra item for cursor checking
      cursor: cursorId ? { id: cursorId } : undefined,
      skip: cursorId ? 1 : 0,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            username: true,
            isVerified: true,
            followers: true // For subscribers
          },
        },
      },
      orderBy: orderByClause,
    });

    let nextCursor: string | null = null;
    if (videos.length > limit) {
      const nextItem = videos.pop();
      nextCursor = nextItem?.id || null;
    }

    const enrichedVideos = videos.map((video: any) => ({
      ...video,
      aspectRatio: '16:9',
      videoType: video.muxPlaybackId ? 'hls' : 'mp4',
      audioInfo: 'Original Audio',
      duration: video.duration || 15,
    }));

    return { success: true, videos: JSON.parse(JSON.stringify(enrichedVideos)), nextCursor };
  } catch (error) {
    console.error('Error fetching screen videos:', error);
    return { success: false, error: 'Failed to fetch videos' };
  }
}

/**
 * Fetch video details, recommended list, likes/dislikes ratio
 */
export async function getScreenVideoDetails(id: string) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user ? (session.user as any).id : null;

    // Increment views and retrieve details
    const video = await prisma.screenVideo.update({
      where: { id },
      data: {
        viewsCount: { increment: 1 }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            username: true,
            isVerified: true
          }
        },
        likes: true
      }
    });

    if (!video) return { success: false, error: 'Video not found' };

    // Fetch user engagement values
    let userLikeStatus: 'like' | 'dislike' | null = null;
    let isSubscribed = false;
    let bellPreference: string | null = null;

    if (currentUserId) {
      const likeRecord = video.likes.find(l => l.userId === currentUserId);
      if (likeRecord) {
        userLikeStatus = likeRecord.isDislike ? 'dislike' : 'like';
      }
      
      const sub = await prisma.subscription.findUnique({
        where: {
          subscriberId_creatorId: {
            subscriberId: currentUserId,
            creatorId: video.userId
          }
        }
      });
      isSubscribed = !!sub;
      bellPreference = sub?.bellPreference || null;
    }

    // Get likes / dislikes count
    const likesCount = video.likes.filter(l => !l.isDislike).length;
    const dislikesCount = video.likes.filter(l => l.isDislike).length;

    // recommended videos (excluding the current one)
    const recommended = await prisma.screenVideo.findMany({
      where: {
        id: { not: id },
        isSimulation: video.isSimulation // match simulation pool for cohesion
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            username: true,
            isVerified: true
          }
        }
      },
      take: 6,
      orderBy: { createdAt: 'desc' }
    });

    // Subscribed channels check
    const subscriberCount = await prisma.subscription.count({
      where: { creatorId: video.userId }
    }) + (video.isSimulation ? 12400 : 0);

    return JSON.parse(JSON.stringify({ 
      success: true, 
      video: {
        ...video,
        likesCount,
        dislikesCount,
        subscriberCount,
        userLikeStatus,
        isSubscribed,
        bellPreference
      }, 
      recommended 
    }));
  } catch (error) {
    console.error('Error fetching screen video details:', error);
    return { success: false, error: 'Failed to fetch video details' };
  }
}

/**
 * Handle Like & Dislike Toggle
 */
export async function toggleLikeScreenVideo(videoId: string, isDislike = false) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    // Check existing interaction
    const existing = await prisma.screenVideoLike.findUnique({
      where: {
        videoId_userId: { videoId, userId }
      }
    });

    if (existing) {
      // If user clicks the same button, remove interaction
      if (existing.isDislike === isDislike) {
        await prisma.screenVideoLike.delete({
          where: { id: existing.id }
        });
      } else {
        // Toggle from like to dislike, or vice-versa
        await prisma.screenVideoLike.update({
          where: { id: existing.id },
          data: { isDislike }
        });
      }
    } else {
      // Create new interaction record
      await prisma.screenVideoLike.create({
        data: { videoId, userId, isDislike }
      });
    }

    // Update denormalized likesCount on Video
    const currentLikes = await prisma.screenVideoLike.count({
      where: { videoId, isDislike: false }
    });
    
    await prisma.screenVideo.update({
      where: { id: videoId },
      data: { likesCount: currentLikes }
    });

    return { success: true };
  } catch (err) {
    console.error('Error liking video:', err);
    return { success: false, error: 'Failed to complete like operation' };
  }
}

/**
 * Create custom comment threads (support replies, pins, hearts)
 */
export async function getScreenVideoComments(videoId: string) {
  try {
    const comments = await prisma.screenVideoComment.findMany({
      where: { videoId, parentId: null }, // Top level comments
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            username: true,
            isVerified: true
          }
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
                username: true,
                isVerified: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: [
        { isPinned: 'desc' }, // pinned comments at the top
        { createdAt: 'desc' }
      ]
    });

    return { success: true, comments: JSON.parse(JSON.stringify(comments)) };
  } catch (err) {
    console.error(err);
    return { success: false, error: 'Failed to retrieve comments' };
  }
}

export async function addScreenVideoComment(videoId: string, text: string, parentId?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const comment = await prisma.screenVideoComment.create({
      data: {
        videoId,
        userId,
        text,
        parentId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            username: true,
            isVerified: true
          }
        }
      }
    });

    return { success: true, comment: JSON.parse(JSON.stringify(comment)) };
  } catch (err) {
    console.error(err);
    return { success: false, error: 'Failed to publish comment' };
  }
}

export async function togglePinComment(commentId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: 'Unauthorized' };
    const userId = (session.user as any).id;

    const comment = await prisma.screenVideoComment.findUnique({
      where: { id: commentId },
      include: { video: true }
    });

    if (!comment || comment.video.userId !== userId) {
      return { success: false, error: 'Only the video creator can pin comments.' };
    }

    // Toggle pin status
    const updated = await prisma.screenVideoComment.update({
      where: { id: commentId },
      data: { isPinned: !comment.isPinned }
    });

    return { success: true, isPinned: updated.isPinned };
  } catch (err) {
    console.error(err);
    return { success: false, error: 'Failed to pin comment' };
  }
}

export async function toggleHeartComment(commentId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: 'Unauthorized' };
    const userId = (session.user as any).id;

    const comment = await prisma.screenVideoComment.findUnique({
      where: { id: commentId },
      include: { video: true }
    });

    if (!comment || comment.video.userId !== userId) {
      return { success: false, error: 'Only the video creator can heart comments.' };
    }

    // Toggle heart status
    const updated = await prisma.screenVideoComment.update({
      where: { id: commentId },
      data: { isHearted: !comment.isHearted }
    });

    return { success: true, isHearted: updated.isHearted };
  } catch (err) {
    console.error(err);
    return { success: false, error: 'Failed to heart comment' };
  }
}

/**
 * Playlist management systems (public, private, unlisted)
 */
export async function getPlaylists(userIdParam?: string) {
  try {
    let userId = userIdParam;
    if (!userId) {
      const session = await getServerSession(authOptions);
      if (!session?.user) return { success: false, error: 'Unauthorized' };
      userId = (session.user as any).id;
    }

    const playlists = await prisma.screenVideoPlaylist.findMany({
      where: { userId },
      include: {
        videos: {
          select: { id: true, thumbnailUrl: true, muxPlaybackId: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return { success: true, playlists: JSON.parse(JSON.stringify(playlists)) };
  } catch (err) {
    console.error(err);
    return { success: false, error: 'Failed to load playlists' };
  }
}

export async function createPlaylist(name: string, visibility = 'public') {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: 'Unauthorized' };
    const userId = (session.user as any).id;

    const playlist = await prisma.screenVideoPlaylist.create({
      data: { name, userId, visibility }
    });

    return { success: true, playlist: JSON.parse(JSON.stringify(playlist)) };
  } catch (err) {
    console.error(err);
    return { success: false, error: 'Failed to create playlist' };
  }
}

export async function addVideoToPlaylist(playlistId: string, videoId: string) {
  try {
    await prisma.screenVideoPlaylist.update({
      where: { id: playlistId },
      data: {
        videos: {
          connect: { id: videoId }
        }
      }
    });
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: 'Failed to add video to playlist' };
  }
}

export async function removeVideoFromPlaylist(playlistId: string, videoId: string) {
  try {
    await prisma.screenVideoPlaylist.update({
      where: { id: playlistId },
      data: {
        videos: {
          disconnect: { id: videoId }
        }
      }
    });
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: 'Failed to remove video from playlist' };
  }
}

/**
 * Channel Subscription toggle (Subscribers mapping to Followers)
 */
export async function toggleSubscribeChannel(creatorId: string, sourcePostId?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const currentUserId = (session.user as any).id;

    if (currentUserId === creatorId) {
      return { success: false, error: 'You cannot subscribe to your own channel!' };
    }

    const existingSub = await prisma.subscription.findUnique({
      where: {
        subscriberId_creatorId: {
          subscriberId: currentUserId,
          creatorId
        }
      }
    });

    if (existingSub) {
      await prisma.subscription.delete({
        where: { id: existingSub.id }
      });
      return { success: true, subscribed: false };
    } else {
      await prisma.subscription.create({
        data: {
          subscriberId: currentUserId,
          creatorId,
          bellPreference: 'ALL',
          sourcePostId: sourcePostId || null
        }
      });

      // Notify the creator
      await prisma.notification.create({
        data: {
          userId: creatorId,
          type: 'new_subscriber',
          message: `🎉 You have a new subscriber!`,
          link: `/u/${currentUserId}`
        }
      });

      return { success: true, subscribed: true };
    }
  } catch (err) {
    console.error(err);
    return { success: false, error: 'Subscription operation failed' };
  }
}

/**
 * Creator Studio Analytics & Metrics Dashboard
 */
export async function getCreatorAnalytics(userIdParam?: string) {
  try {
    let userId = userIdParam;
    if (!userId) {
      const session = await getServerSession(authOptions);
      if (!session?.user) return { success: false, error: 'Unauthorized' };
      userId = (session.user as any).id;
    }

    // Fetch user channels stats
    const videosCount = await prisma.screenVideo.count({ where: { userId } });
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        followers: true,
        screenVideos: {
          select: { viewsCount: true, likesCount: true }
        }
      }
    });

    const subscriberCount = user?.followers.length || 0;
    const totalViews = user?.screenVideos.reduce((acc, v) => acc + v.viewsCount, 0) || 0;
    const totalLikes = user?.screenVideos.reduce((acc, v) => acc + v.likesCount, 0) || 0;

    // Compute estimated financial metrics
    const rpm = 2.45; // Revenue Per Mille (1000 views)
    const cpm = 4.12; // Cost Per Mille
    const estimatedRevenue = (totalViews / 1000) * rpm;
    const watchTime = (totalViews * 4.2) / 60; // Average watch time in hours

    return {
      success: true,
      metrics: {
        videosCount,
        subscriberCount,
        totalViews,
        totalLikes,
        estimatedRevenue: Number(estimatedRevenue.toFixed(2)),
        watchTime: Number(watchTime.toFixed(1)),
        rpm,
        cpm
      }
    };
  } catch (err) {
    console.error(err);
    return { success: false, error: 'Failed to compute creator metrics' };
  }
}

/**
 * Generate Mux Direct Upload Url
 */
export async function createMuxDirectUpload() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }

    const upload = await mux.video.uploads.create({
      new_asset_settings: { 
        playback_policy: ['public'],
        mp4_support: 'capped-1080p'
      },
      cors_origin: '*',
    });

    return {
      success: true,
      uploadId: upload.id || null,
      url: upload.url || null,
    };
  } catch (error) {
    console.error('Error creating Mux direct upload:', error);
    return { success: false, error: 'Failed to initiate video upload' };
  }
}

/**
 * Check Mux Upload Status
 */
export async function checkMuxUploadStatus(uploadId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: 'Unauthorized' };

    const upload = await mux.video.uploads.retrieve(uploadId);
    return {
      success: true,
      status: upload.status,
      assetId: upload.asset_id || null
    };
  } catch (error: any) {
    console.error('Error checking Mux upload status:', error);
    return { success: false, error: error.message || 'Failed to check upload status' };
  }
}

/**
 * Register video metadata in DB
 */
export async function saveScreenVideo(
  title: string, 
  description: string, 
  assetId: string, 
  category = 'General', 
  visibility = 'public',
  isReel = false
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const currentUserId = (session.user as any).id;

    // Retrieve asset details
    const asset = await mux.video.assets.retrieve(assetId);
    const playbackId = asset.playback_ids?.[0]?.id;
    const duration = asset.duration || 0;
    const videoUrl = playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : '';

    if (isReel) {
      // Create Reel Post directly
      const post = await prisma.post.create({
        data: {
          caption: `🎥 **${title}**\n\n${description || ''}`,
          mediaUrls: videoUrl,
          mediaTypes: 'video',
          postType: 'reel',
          status: 'published',
          visibility: 'public',
          authorId: currentUserId
        }
      });
      return { success: true, isReel: true, post: JSON.parse(JSON.stringify(post)) };
    }

    const video = await prisma.screenVideo.create({
      data: {
        title,
        description,
        muxAssetId: assetId,
        muxPlaybackId: playbackId,
        mediaUrl: videoUrl,
        duration,
        category,
        visibility,
        userId: currentUserId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            username: true,
          },
        },
      },
    });

    // Create Feed Post for Tolee Screen Video
    await prisma.post.create({
      data: {
        caption: `🎥 **${title}**\n\n${description || ''}`,
        mediaUrls: videoUrl,
        mediaTypes: 'video',
        postType: 'regular',
        status: 'published',
        visibility: 'public',
        authorId: currentUserId
      }
    });

    // Trigger notification to subscribers
    try {
      const { sendNewVideoNotification } = await import('@/actions/creator');
      await sendNewVideoNotification(currentUserId, video.id, title);
    } catch (err) {
      console.error('Failed to send new video notifications:', err);
    }

    return { success: true, video: JSON.parse(JSON.stringify(video)) };
  } catch (error) {
    console.error('Error saving screen video:', error);
    return { success: false, error: 'Failed to save video details' };
  }
}


/**
 * Fetch creator videos for Studio Content Tab
 */
export async function getCreatorVideos(userIdParam?: string) {
  try {
    let userId = userIdParam;
    if (!userId) {
      const session = await getServerSession(authOptions);
      if (!session?.user) return { success: false, error: 'Unauthorized' };
      userId = (session.user as any).id;
    }

    const videos = await prisma.screenVideo.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, videos: JSON.parse(JSON.stringify(videos)) };
  } catch (err) {
    console.error(err);
    return { success: false, error: 'Failed to retrieve creator videos' };
  }
}

/**
 * Create a simulated video record directly in database (Simulation Mode upload)
 */
export async function saveSimulatedScreenVideo(
  title: string,
  description: string,
  category: string,
  visibility: string,
  thumbnailUrl: string,
  mediaUrl: string,
  isReel = false,
  status = 'published'
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const currentUserId = (session.user as any).id;

    if (isReel) {
      // Save directly as a Reel (Post model)
      const post = await prisma.post.create({
        data: {
          caption: `🎥 **${title}**\n\n${description || ''}`,
          mediaUrls: mediaUrl,
          mediaTypes: 'video',
          postType: 'reel',
          status: 'published',
          visibility: 'public',
          authorId: currentUserId,
          isSimulation: true
        }
      });
      return { success: true, isReel: true, post: JSON.parse(JSON.stringify(post)) };
    }

    const video = await prisma.screenVideo.create({
      data: {
        title,
        description,
        category,
        visibility,
        thumbnailUrl,
        mediaUrl,
        duration: 360 + Math.floor(Math.random() * 240), // random duration
        isSimulation: true,
        status,
        userId: currentUserId
      }
    });

    if (status !== 'draft') {
      // Also create a Feed Post so it shows up in the main Feed
      await prisma.post.create({
        data: {
          caption: `🎥 **${title}**\n\n${description || ''}`,
          mediaUrls: mediaUrl,
          mediaTypes: 'video',
          postType: 'regular',
          status: 'published',
          visibility: 'public',
          authorId: currentUserId,
          isSimulation: true
        }
      });
    }

    return { success: true, video: JSON.parse(JSON.stringify(video)) };
  } catch (err) {
    console.error('Error saving simulated video:', err);
    return { success: false, error: 'Failed to publish simulated video' };
  }
}

/**
 * Fetch all comments on the creator's videos
 */
export async function getCreatorComments(userIdParam?: string) {
  try {
    let userId = userIdParam;
    if (!userId) {
      const session = await getServerSession(authOptions);
      if (!session?.user) return { success: false, error: 'Unauthorized' };
      userId = (session.user as any).id;
    }

    const comments = await prisma.screenVideoComment.findMany({
      where: {
        video: {
          userId: userId
        }
      },
      include: {
        user: {
          select: {
            name: true,
            username: true,
            avatar: true
          }
        },
        video: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
            muxPlaybackId: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return { success: true, comments: JSON.parse(JSON.stringify(comments)) };
  } catch (err) {
    console.error('Error fetching creator comments:', err);
    return { success: false, error: 'Failed to fetch comments' };
  }
}

/**
 * Update video metadata (title, description, category, visibility, thumbnailUrl, status)
 */
export async function updateScreenVideo(
  id: string,
  data: {
    title: string;
    description?: string;
    category?: string;
    visibility?: string;
    thumbnailUrl?: string;
    status?: string;
  }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: 'Unauthorized' };
    const userId = (session.user as any).id;

    // Check ownership
    const existing = await prisma.screenVideo.findUnique({
      where: { id }
    });
    if (!existing || existing.userId !== userId) {
      return { success: false, error: 'Unauthorized or video not found' };
    }

    const updated = await prisma.screenVideo.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description ?? null,
        category: data.category ?? 'General',
        visibility: data.visibility ?? 'public',
        thumbnailUrl: data.thumbnailUrl ?? null,
        status: data.status ?? 'published'
      }
    });

    return { success: true, video: JSON.parse(JSON.stringify(updated)) };
  } catch (err: any) {
    console.error('Error updating video:', err);
    return { success: false, error: err.message || 'Failed to update video details' };
  }
}

/**
 * Delete a video from the database AND from Mux
 */
export async function deleteScreenVideo(videoId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: 'Unauthorized' };
    const userId = (session.user as any).id;

    // Find the video and verify ownership
    const video = await prisma.screenVideo.findUnique({
      where: { id: videoId },
    });

    if (!video) return { success: false, error: 'Video not found' };
    if (video.userId !== userId) return { success: false, error: 'Unauthorized' };

    // Delete the Mux asset if it exists
    if (video.muxAssetId) {
      try {
        await mux.video.assets.delete(video.muxAssetId);
        console.log(`[Mux] Deleted asset: ${video.muxAssetId}`);
      } catch (muxErr: any) {
        // Don't fail the whole operation if Mux delete fails (asset may already be gone)
        console.warn(`[Mux] Failed to delete asset ${video.muxAssetId}:`, muxErr.message);
      }
    }

    // Delete related feed posts that reference this video
    try {
      await prisma.post.deleteMany({
        where: {
          userId,
          content: { contains: videoId },
        },
      });
    } catch (postErr) {
      console.warn('[Delete] Failed to clean up related posts:', postErr);
    }

    // Delete the video from the database (cascading deletes will handle likes, comments, playlists)
    await prisma.screenVideo.delete({
      where: { id: videoId },
    });

    return { success: true };
  } catch (err: any) {
    console.error('Error deleting video:', err);
    return { success: false, error: err.message || 'Failed to delete video' };
  }
}
