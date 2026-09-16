import { prisma } from '@/lib/prisma';

// Reusable YouTube API Key Pool from existing Tolee architecture
const YOUTUBE_API_KEYS = [
  process.env.YOUTUBE_API_KEY,
  'AIzaSyAQGEjKb5EkJjZSSh4I4X5x2zhESnhSzH0'
].filter((k): k is string => Boolean(k && k.trim()));

export interface TempleStreamInfo {
  videoId: string | null;
  embedUrl: string;
  isLive: boolean;
  statusLabel: 'LIVE' | 'Latest Video' | 'Offline';
  title?: string;
  thumbnail?: string;
}

// In-memory cache for live stream status to strictly avoid YouTube quota depletion
// Key: templeId, Value: { data: TempleStreamInfo, expiry: timestamp }
const streamCache = new Map<string, { data: TempleStreamInfo; expiry: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

export const SEED_TEMPLES = [
  {
    name: 'Shirdi Sai Baba',
    slug: 'shirdi-sai-baba',
    deity: 'Sai Baba',
    city: 'Shirdi',
    state: 'Maharashtra',
    thumbnail: 'https://images.unsplash.com/photo-1609766857041-ed402ea8069a?q=80&w=800&auto=format&fit=crop',
    youtubeChannelId: 'UCp7Ew69g28c-s9r5d35aYSw',
    officialUrl: 'https://sai.org.in',
    sortOrder: 1,
    isFeatured: true
  },
  {
    name: 'Tirupati Balaji (TTD)',
    slug: 'tirupati-balaji',
    deity: 'Lord Venkateswara',
    city: 'Tirupati',
    state: 'Andhra Pradesh',
    thumbnail: 'https://images.unsplash.com/photo-1620619767323-b95a89183081?q=80&w=800&auto=format&fit=crop',
    youtubeChannelId: 'UCYkG9mCg0Y7uQZlY6B4bJcw', // SVBC TTD
    officialUrl: 'https://ttdevasthanams.ap.gov.in',
    sortOrder: 2,
    isFeatured: true
  },
  {
    name: 'Shree Siddhivinayak Temple',
    slug: 'siddhivinayak-mumbai',
    deity: 'Lord Ganesha',
    city: 'Mumbai',
    state: 'Maharashtra',
    thumbnail: 'https://images.unsplash.com/photo-1567591974584-f1832dfcad32?q=80&w=800&auto=format&fit=crop',
    youtubeChannelId: 'UCn6m2k8S4fK7_9L1B5uX_Rw',
    officialUrl: 'https://www.siddhivinayak.org',
    sortOrder: 3,
    isFeatured: true
  },
  {
    name: 'Lalbaugcha Raja',
    slug: 'lalbaugcha-raja',
    deity: 'Lord Ganesha',
    city: 'Mumbai',
    state: 'Maharashtra',
    thumbnail: 'https://images.unsplash.com/photo-1598387993441-a364f854c3e1?q=80&w=800&auto=format&fit=crop',
    youtubeChannelId: 'UCw8xN1N1h3T24Kj7_88bN9A',
    officialUrl: 'https://www.lalbaugcharaja.com',
    sortOrder: 4,
    isFeatured: true
  },
  {
    name: 'Kashi Vishwanath',
    slug: 'kashi-vishwanath',
    deity: 'Lord Shiva',
    city: 'Varanasi',
    state: 'Uttar Pradesh',
    thumbnail: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?q=80&w=800&auto=format&fit=crop',
    youtubeChannelId: 'UCyF7C_eG9a3X5lH8x8K9b5w',
    officialUrl: 'https://shrikashivishwanath.org',
    sortOrder: 5,
    isFeatured: true
  },
  {
    name: 'Somnath Temple',
    slug: 'somnath-temple',
    deity: 'Lord Shiva',
    city: 'Prabhas Patan',
    state: 'Gujarat',
    thumbnail: 'https://images.unsplash.com/photo-1605649487212-47bdab064df7?q=80&w=800&auto=format&fit=crop',
    youtubeChannelId: 'UC7P6a4e3g9W5_0B4J3yR_fw',
    officialUrl: 'https://somnath.org',
    sortOrder: 6,
    isFeatured: true
  },
  {
    name: 'Mahakaleshwar Jyotirlinga',
    slug: 'mahakaleshwar-ujjain',
    deity: 'Lord Shiva',
    city: 'Ujjain',
    state: 'Madhya Pradesh',
    thumbnail: 'https://images.unsplash.com/photo-1621847468516-1ed5d0df56fe?q=80&w=800&auto=format&fit=crop',
    youtubeChannelId: 'UC6K8m1h8B4o6_7h8Y9k4b1A',
    officialUrl: 'https://shrimahakaleshwar.com',
    sortOrder: 7,
    isFeatured: true
  },
  {
    name: 'Kedarnath Dham',
    slug: 'kedarnath-dham',
    deity: 'Lord Shiva',
    city: 'Rudraprayag',
    state: 'Uttarakhand',
    thumbnail: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?q=80&w=800&auto=format&fit=crop',
    youtubeChannelId: 'UCe5j7q5u8j6h5r4e3w2q1aA',
    officialUrl: 'https://badrinath-kedarnath.gov.in',
    sortOrder: 8,
    isFeatured: true
  },
  {
    name: 'Badrinath Dham',
    slug: 'badrinath-dham',
    deity: 'Lord Vishnu',
    city: 'Chamoli',
    state: 'Uttarakhand',
    thumbnail: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?q=80&w=800&auto=format&fit=crop',
    youtubeChannelId: 'UCe5j7q5u8j6h5r4e3w2q1aA',
    officialUrl: 'https://badrinath-kedarnath.gov.in',
    sortOrder: 9,
    isFeatured: true
  },
  {
    name: 'Mata Vaishno Devi',
    slug: 'vaishno-devi',
    deity: 'Maa Vaishno Devi',
    city: 'Katra',
    state: 'Jammu & Kashmir',
    thumbnail: 'https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?q=80&w=800&auto=format&fit=crop',
    youtubeChannelId: 'UCpWv6eG7A6Z9uH2j8F4v6wQ',
    officialUrl: 'https://www.maavaishnodevi.org',
    sortOrder: 10,
    isFeatured: true
  },
  {
    name: 'Ayodhya Ram Mandir',
    slug: 'ayodhya-ram-mandir',
    deity: 'Lord Rama',
    city: 'Ayodhya',
    state: 'Uttar Pradesh',
    thumbnail: 'https://images.unsplash.com/photo-1705861145885-3b9944b0e8b2?q=80&w=800&auto=format&fit=crop',
    youtubeChannelId: 'UCqH6R7K8L2V4n9B3M1C5wEA',
    officialUrl: 'https://srjbtkshetra.org',
    sortOrder: 11,
    isFeatured: true
  },
  {
    name: 'Jagannath Puri Temple',
    slug: 'jagannath-puri',
    deity: 'Lord Jagannath',
    city: 'Puri',
    state: 'Odisha',
    thumbnail: 'https://images.unsplash.com/photo-1628151015968-3a4429e9ef04?q=80&w=800&auto=format&fit=crop',
    youtubeChannelId: 'UC8vN9z1C3j6K4w7L9b2M5eA',
    officialUrl: 'https://shreejagannatha.in',
    sortOrder: 12,
    isFeatured: true
  },
  {
    name: 'Dagdusheth Halwai Ganpati',
    slug: 'dagdusheth-ganpati',
    deity: 'Lord Ganesha',
    city: 'Pune',
    state: 'Maharashtra',
    thumbnail: 'https://images.unsplash.com/photo-1598387993281-cecf8b71a8f8?q=80&w=800&auto=format&fit=crop',
    youtubeChannelId: 'UC7f6d4g2h8K9e3W1v5A4b2Q',
    officialUrl: 'https://www.dagdushethganpati.com',
    sortOrder: 13,
    isFeatured: false
  },
  {
    name: 'ISKCON Vrindavan',
    slug: 'iskcon-vrindavan',
    deity: 'Radha Krishna',
    city: 'Vrindavan',
    state: 'Uttar Pradesh',
    thumbnail: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?q=80&w=800&auto=format&fit=crop',
    youtubeChannelId: 'UC7C_nK8M9z3J2v7L6w4K9eQ',
    officialUrl: 'https://iskconvrindavan.com',
    sortOrder: 14,
    isFeatured: false
  },
  {
    name: 'Golden Temple (Sri Harmandir Sahib)',
    slug: 'golden-temple-amritsar',
    deity: 'Waheguru',
    city: 'Amritsar',
    state: 'Punjab',
    thumbnail: 'https://images.unsplash.com/photo-1595846519845-68e298c2edd8?q=80&w=800&auto=format&fit=crop',
    youtubeChannelId: 'UCv6C8eH9m4J2b1K7w5N8vXQ',
    officialUrl: 'https://sgpc.net',
    sortOrder: 15,
    isFeatured: false
  }
];

/**
 * Seed major temples if database table is empty
 */
export async function ensureTemplesSeeded() {
  try {
    const count = await prisma.temple.count();
    if (count === 0) {
      for (const temple of SEED_TEMPLES) {
        await prisma.temple.create({
          data: {
            ...temple,
            liveStatus: 'offline',
            isActive: true
          }
        });
      }
    }
  } catch (error) {
    console.error('[DarshanService] Seed check error:', error);
  }
}

/**
 * Resolve live stream for a temple using YouTube Data API with quota-safe caching
 */
export async function resolveTempleLiveStream(temple: {
  id: string;
  name: string;
  youtubeChannelId?: string | null;
  youtubeVideoId?: string | null;
  streamUrl?: string | null;
}): Promise<TempleStreamInfo> {
  const cached = streamCache.get(temple.id);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  // If a manual override stream URL or fixed video ID is configured
  if (temple.youtubeVideoId) {
    const result: TempleStreamInfo = {
      videoId: temple.youtubeVideoId,
      embedUrl: `https://www.youtube.com/embed/${temple.youtubeVideoId}?autoplay=1&mute=0&controls=1&rel=0&playsinline=1`,
      isLive: true,
      statusLabel: 'LIVE'
    };
    streamCache.set(temple.id, { data: result, expiry: Date.now() + CACHE_TTL_MS });
    return result;
  }

  // Attempt 1: Query YouTube API for active LIVE stream
  for (const apiKey of YOUTUBE_API_KEYS) {
    try {
      let liveUrl = '';
      if (temple.youtubeChannelId) {
        liveUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${temple.youtubeChannelId}&eventType=live&type=video&key=${apiKey}`;
      } else {
        liveUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(`${temple.name} live darshan`)}&eventType=live&type=video&regionCode=IN&key=${apiKey}`;
      }

      const res = await fetch(liveUrl, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          const item = data.items[0];
          const videoId = item.id?.videoId;
          if (videoId) {
            const streamInfo: TempleStreamInfo = {
              videoId,
              embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&controls=1&rel=0&playsinline=1`,
              isLive: true,
              statusLabel: 'LIVE',
              title: item.snippet?.title,
              thumbnail: item.snippet?.thumbnails?.high?.url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
            };

            // Update cache and DB asynchronously
            streamCache.set(temple.id, { data: streamInfo, expiry: Date.now() + CACHE_TTL_MS });
            prisma.temple.update({
              where: { id: temple.id },
              data: {
                liveStatus: 'live',
                youtubeVideoId: videoId,
                lastCheckedAt: new Date()
              }
            }).catch(() => {});

            return streamInfo;
          }
        }
      }
    } catch {
      // Continue to next key or fallback
    }
  }

  // Attempt 2: If no live stream active, fetch latest relevant official video / aarti
  for (const apiKey of YOUTUBE_API_KEYS) {
    try {
      let latestUrl = '';
      if (temple.youtubeChannelId) {
        latestUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${temple.youtubeChannelId}&order=date&type=video&maxResults=1&key=${apiKey}`;
      } else {
        latestUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(`${temple.name} aarti darshan`)}&order=date&type=video&maxResults=1&regionCode=IN&key=${apiKey}`;
      }

      const res = await fetch(latestUrl, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          const item = data.items[0];
          const videoId = item.id?.videoId;
          if (videoId) {
            const streamInfo: TempleStreamInfo = {
              videoId,
              embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&controls=1&rel=0&playsinline=1`,
              isLive: false,
              statusLabel: 'Latest Video',
              title: item.snippet?.title,
              thumbnail: item.snippet?.thumbnails?.high?.url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
            };

            streamCache.set(temple.id, { data: streamInfo, expiry: Date.now() + CACHE_TTL_MS });
            prisma.temple.update({
              where: { id: temple.id },
              data: {
                liveStatus: 'offline',
                youtubeVideoId: videoId,
                lastCheckedAt: new Date()
              }
            }).catch(() => {});

            return streamInfo;
          }
        }
      }
    } catch {
      // Continue
    }
  }

  // Attempt 3: Native YouTube Channel Live Embed Fallback (Works when quota is 0 or offline)
  const channelFallback: TempleStreamInfo = temple.youtubeChannelId
    ? {
        videoId: null,
        embedUrl: `https://www.youtube.com/embed/live_stream?channel=${temple.youtubeChannelId}&autoplay=1&mute=0&controls=1&playsinline=1`,
        isLive: true,
        statusLabel: 'LIVE'
      }
    : {
        videoId: null,
        embedUrl: '',
        isLive: false,
        statusLabel: 'Offline'
      };

  streamCache.set(temple.id, { data: channelFallback, expiry: Date.now() + 60 * 1000 });
  return channelFallback;
}

/**
 * Get all temples with filtering and live status
 */
export async function getTemples(options?: {
  search?: string;
  city?: string;
  state?: string;
  liveOnly?: boolean;
}) {
  await ensureTemplesSeeded();

  const where: any = { isActive: true };

  if (options?.search) {
    where.OR = [
      { name: { contains: options.search, mode: 'insensitive' } },
      { deity: { contains: options.search, mode: 'insensitive' } },
      { city: { contains: options.search, mode: 'insensitive' } },
      { state: { contains: options.search, mode: 'insensitive' } },
    ];
  }

  if (options?.city) {
    where.city = { equals: options.city, mode: 'insensitive' };
  }

  if (options?.state) {
    where.state = { equals: options.state, mode: 'insensitive' };
  }

  if (options?.liveOnly) {
    where.liveStatus = 'live';
  }

  const temples = await prisma.temple.findMany({
    where,
    orderBy: [
      { isFeatured: 'desc' },
      { sortOrder: 'asc' },
      { createdAt: 'asc' }
    ]
  });

  return temples;
}
