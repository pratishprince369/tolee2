'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { generateWaveform } from '@/lib/audioLibrary';

// Initial dataset to auto-seed when database table is empty
const INITIAL_ARTISTS = [
  {
    id: 'artist-arijit',
    name: 'Arijit Singh',
    bio: 'Renowned Indian playback singer and music composer celebrated for soulful romantic and classical hits.',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
    genre: 'Bollywood',
    isVerified: true,
    monthlyListeners: 42500000,
  },
  {
    id: 'artist-diljit',
    name: 'Diljit Dosanjh',
    bio: 'Global Punjabi music sensation delivering chart-topping dhol beats, bhangra rhythms and urban hits.',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
    genre: 'Punjabi',
    isVerified: true,
    monthlyListeners: 28900000,
  },
  {
    id: 'artist-tolee-lofi',
    name: 'Tolee Vibes Collective',
    bio: 'Independent indie producers crafting late-night lo-fi chai rhythms, rainy jazz chords and ambient study loops.',
    image: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80',
    genre: 'Lo-Fi',
    isVerified: true,
    monthlyListeners: 5400000,
  },
  {
    id: 'artist-darshan',
    name: 'Rishikesh Resonance',
    bio: 'Spiritual instrumentalists honoring Vedic mantras, temple bells, and meditative Himalayan bamboo flute.',
    image: 'https://images.unsplash.com/photo-1545239351-ef35f43d514b?w=500&auto=format&fit=crop&q=80',
    genre: 'Devotional',
    isVerified: true,
    monthlyListeners: 7800000,
  },
  {
    id: 'artist-prateek',
    name: 'Prateek Kuhad',
    bio: 'Critically acclaimed indie singer-songwriter known for intimate acoustic melodies and tender poetic lyrics.',
    image: 'https://images.unsplash.com/photo-1445985543470-41fdd5c31447?w=500&auto=format&fit=crop&q=80',
    genre: 'Indie',
    isVerified: true,
    monthlyListeners: 9200000,
  },
  {
    id: 'artist-ajay-atul',
    name: 'Ajay-Atul',
    bio: 'Legendary Indian music duo famed for grand cinematic orchestrations in Marathi and Hindi cinema.',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
    genre: 'Marathi',
    isVerified: true,
    monthlyListeners: 14500000,
  },
];

const INITIAL_ALBUMS = [
  {
    id: 'album-bollywood-dreams',
    title: 'Bollywood Cinematic Dreams',
    artistId: 'artist-arijit',
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
    releaseYear: '2026',
    genre: 'Bollywood',
    description: 'Soulful cinematic melodies, monsoon string ballads and trending romantic vibes.',
    isFeatured: true,
  },
  {
    id: 'album-punjabi-heat',
    title: 'Desi Dhol & Urban Heat',
    artistId: 'artist-diljit',
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
    releaseYear: '2026',
    genre: 'Punjabi',
    description: 'Electrifying 808s paired with authentic Punjabi dhol beats, ideal for high-energy Reels.',
    isFeatured: true,
  },
  {
    id: 'album-lofi-chai',
    title: 'Midnight Chai Lo-Fi',
    artistId: 'artist-tolee-lofi',
    coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80',
    releaseYear: '2026',
    genre: 'Lo-Fi',
    description: 'Warm vinyl crackles and smooth piano loops for late-night editing, coding, and chill stories.',
    isFeatured: true,
  },
  {
    id: 'album-darshan-vedic',
    title: 'Maha Aarti & Vedic Chants',
    artistId: 'artist-darshan',
    coverUrl: 'https://images.unsplash.com/photo-1545239351-ef35f43d514b?w=500&auto=format&fit=crop&q=80',
    releaseYear: '2026',
    genre: 'Devotional',
    description: 'Authentic temple bells, bansuri flute, and transcendent mantras for morning posts and darshan.',
    isFeatured: false,
  },
  {
    id: 'album-mountain-acoustic',
    title: 'Mountain Acoustic Diaries',
    artistId: 'artist-prateek',
    coverUrl: 'https://images.unsplash.com/photo-1445985543470-41fdd5c31447?w=500&auto=format&fit=crop&q=80',
    releaseYear: '2026',
    genre: 'Indie',
    description: 'Raw acoustic fingerpicking and mountain breeze soundscapes for travel vloggers.',
    isFeatured: true,
  },
  {
    id: 'album-marathi-dhol',
    title: 'Zingaat Dhol Tasha Express',
    artistId: 'artist-ajay-atul',
    coverUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=500&auto=format&fit=crop&q=80',
    releaseYear: '2026',
    genre: 'Marathi',
    description: 'High-voltage celebratory dhol-tasha beats, Ganpati utsav rhythms and energetic party anthems.',
    isFeatured: false,
  },
];

const INITIAL_SONGS = [
  {
    id: 'song-kesariya-romance',
    title: 'Kesariya Sukoon (Acoustic)',
    artistId: 'artist-arijit',
    albumId: 'album-bollywood-dreams',
    coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80',
    audioUrl: 'https://cdn.freesound.org/previews/573/573381_11861866-lq.mp3',
    duration: 135,
    genre: 'Bollywood',
    language: 'Hindi',
    isTrending: true,
    isFeatured: true,
    playCount: 154200,
    likeCount: 42000,
  },
  {
    id: 'song-patiala-swag',
    title: 'Patiala Swag & Urban Bass',
    artistId: 'artist-diljit',
    albumId: 'album-punjabi-heat',
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
    audioUrl: 'https://cdn.freesound.org/previews/462/462808_838627-lq.mp3',
    duration: 110,
    genre: 'Punjabi',
    language: 'Punjabi',
    isTrending: true,
    isFeatured: true,
    playCount: 231500,
    likeCount: 89000,
  },
  {
    id: 'song-midnight-chai',
    title: 'Midnight Chai & Rain Drops',
    artistId: 'artist-tolee-lofi',
    albumId: 'album-lofi-chai',
    coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80',
    audioUrl: 'https://cdn.freesound.org/previews/612/612644_5674468-lq.mp3',
    duration: 124,
    genre: 'Lo-Fi',
    language: 'Instrumental',
    isTrending: false,
    isFeatured: true,
    playCount: 98400,
    likeCount: 31000,
  },
  {
    id: 'song-shiva-mantra',
    title: 'Shiva Dhun & Temple Bells',
    artistId: 'artist-darshan',
    albumId: 'album-darshan-vedic',
    coverUrl: 'https://images.unsplash.com/photo-1545239351-ef35f43d514b?w=500&auto=format&fit=crop&q=80',
    audioUrl: 'https://cdn.freesound.org/previews/530/530415_1648170-lq.mp3',
    duration: 155,
    genre: 'Devotional',
    language: 'Hindi',
    isTrending: true,
    isFeatured: true,
    playCount: 312000,
    likeCount: 112000,
  },
  {
    id: 'song-pahadi-guitar',
    title: 'Pahadi Breeze & Cold Coffee',
    artistId: 'artist-prateek',
    albumId: 'album-mountain-acoustic',
    coverUrl: 'https://images.unsplash.com/photo-1445985543470-41fdd5c31447?w=500&auto=format&fit=crop&q=80',
    audioUrl: 'https://cdn.freesound.org/previews/568/568169_9497060-lq.mp3',
    duration: 115,
    genre: 'Indie',
    language: 'Hindi',
    isTrending: true,
    isFeatured: false,
    playCount: 88200,
    likeCount: 27500,
  },
  {
    id: 'song-marathi-jallosh',
    title: 'Jallosh Dhol Tasha Dhadak',
    artistId: 'artist-ajay-atul',
    albumId: 'album-marathi-dhol',
    coverUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=500&auto=format&fit=crop&q=80',
    audioUrl: 'https://cdn.freesound.org/previews/458/458867_838627-lq.mp3',
    duration: 102,
    genre: 'Marathi',
    language: 'Marathi',
    isTrending: true,
    isFeatured: true,
    playCount: 176000,
    likeCount: 64000,
  },
  {
    id: 'song-workout-energy',
    title: 'High Velocity Beast Mode Drop',
    artistId: 'artist-diljit',
    albumId: 'album-punjabi-heat',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
    audioUrl: 'https://cdn.freesound.org/previews/462/462808_838627-lq.mp3',
    duration: 95,
    genre: 'Workout',
    language: 'English',
    isTrending: true,
    isFeatured: false,
    playCount: 142000,
    likeCount: 52000,
  },
  {
    id: 'song-party-celebration',
    title: 'Desi Celebration Dholak Groove',
    artistId: 'artist-ajay-atul',
    albumId: 'album-marathi-dhol',
    coverUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=500&auto=format&fit=crop&q=80',
    audioUrl: 'https://cdn.freesound.org/previews/458/458867_838627-lq.mp3',
    duration: 98,
    genre: 'Party',
    language: 'Hindi',
    isTrending: true,
    isFeatured: true,
    playCount: 198000,
    likeCount: 71000,
  },
];

/**
 * Ensure music catalog is seeded into the database
 */
export async function ensureInitialMusicSeeded() {
  try {
    const songCount = await prisma.song.count();
    if (songCount > 0) return;

    // Seed Artists
    for (const artist of INITIAL_ARTISTS) {
      await prisma.artist.upsert({
        where: { id: artist.id },
        update: {},
        create: artist,
      });
    }

    // Seed Albums
    for (const album of INITIAL_ALBUMS) {
      await prisma.album.upsert({
        where: { id: album.id },
        update: {},
        create: album,
      });
    }

    // Seed Songs
    for (const song of INITIAL_SONGS) {
      const waveformJson = JSON.stringify(generateWaveform(song.id + song.title));
      await prisma.song.upsert({
        where: { id: song.id },
        update: {},
        create: {
          ...song,
          waveform: waveformJson,
        },
      });
    }
  } catch (err) {
    console.error('[Tolee Songs] Error seeding initial music:', err);
  }
}

/**
 * Get comprehensive Tolee Songs Homepage Feed
 */
export async function getSongsFeedAction() {
  await ensureInitialMusicSeeded();

  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;

  try {
    const [
      trendingSongs,
      featuredSongs,
      newReleases,
      popularArtists,
      featuredAlbums,
      allGenres,
    ] = await Promise.all([
      prisma.song.findMany({
        where: { isTrending: true },
        include: { artist: true, album: true },
        orderBy: { playCount: 'desc' },
        take: 12,
      }),
      prisma.song.findMany({
        where: { isFeatured: true },
        include: { artist: true, album: true },
        take: 12,
      }),
      prisma.song.findMany({
        orderBy: { createdAt: 'desc' },
        include: { artist: true, album: true },
        take: 12,
      }),
      prisma.artist.findMany({
        orderBy: { monthlyListeners: 'desc' },
        take: 8,
      }),
      prisma.album.findMany({
        include: { artist: true, songs: true },
        take: 8,
      }),
      prisma.song.findMany({
        select: { genre: true },
        distinct: ['genre'],
      }),
    ]);

    // User's liked song IDs for optimistic UI
    let userLikedSongIds: string[] = [];
    let userLikedAlbumIds: string[] = [];
    let userFollowedArtistIds: string[] = [];

    if (userId) {
      const [likedSongs, likedAlbums, followedArtists] = await Promise.all([
        prisma.songLike.findMany({
          where: { userId },
          select: { songId: true },
        }),
        prisma.albumLike.findMany({
          where: { userId },
          select: { albumId: true },
        }),
        prisma.artistFollow.findMany({
          where: { userId },
          select: { artistId: true },
        }),
      ]);

      userLikedSongIds = likedSongs.map((l) => l.songId);
      userLikedAlbumIds = likedAlbums.map((l) => l.albumId);
      userFollowedArtistIds = followedArtists.map((l) => l.artistId);
    }

    return {
      success: true,
      trendingSongs,
      featuredSongs,
      newReleases,
      popularArtists,
      featuredAlbums,
      genres: allGenres.map((g) => g.genre),
      userLikedSongIds,
      userLikedAlbumIds,
      userFollowedArtistIds,
    };
  } catch (err: any) {
    console.error('[Tolee Songs] getSongsFeedAction error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Spotify-Style Multi-Entity Music Search
 */
export async function searchSongsAction(query: string, genre?: string, language?: string) {
  await ensureInitialMusicSeeded();
  const trimmed = query.trim();

  try {
    const whereSong: any = {};
    if (trimmed) {
      whereSong.OR = [
        { title: { contains: trimmed, mode: 'insensitive' } },
        { artist: { name: { contains: trimmed, mode: 'insensitive' } } },
        { album: { title: { contains: trimmed, mode: 'insensitive' } } },
        { genre: { contains: trimmed, mode: 'insensitive' } },
      ];
    }
    if (genre && genre !== 'All') {
      whereSong.genre = { equals: genre, mode: 'insensitive' };
    }
    if (language && language !== 'All') {
      whereSong.language = { equals: language, mode: 'insensitive' };
    }

    const [songs, artists, albums, playlists] = await Promise.all([
      prisma.song.findMany({
        where: whereSong,
        include: { artist: true, album: true },
        take: 30,
      }),
      trimmed
        ? prisma.artist.findMany({
            where: { name: { contains: trimmed, mode: 'insensitive' } },
            take: 8,
          })
        : [],
      trimmed
        ? prisma.album.findMany({
            where: { title: { contains: trimmed, mode: 'insensitive' } },
            include: { artist: true },
            take: 8,
          })
        : [],
      trimmed
        ? prisma.musicPlaylist.findMany({
            where: {
              isPublic: true,
              title: { contains: trimmed, mode: 'insensitive' },
            },
            include: { user: { select: { id: true, name: true, username: true } } },
            take: 8,
          })
        : [],
    ]);

    return {
      success: true,
      songs,
      artists,
      albums,
      playlists,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Get Specific Song with Album & Reels Usage
 */
export async function getSongByIdAction(songId: string) {
  try {
    const song = await prisma.song.findUnique({
      where: { id: songId },
      include: {
        artist: {
          include: {
            songs: {
              where: { id: { not: songId } },
              take: 5,
            },
          },
        },
        album: {
          include: {
            songs: true,
          },
        },
        reelAudios: {
          include: {
            post: {
              include: {
                author: { select: { id: true, name: true, username: true, avatar: true } },
              },
            },
          },
          take: 10,
        },
      },
    });

    if (!song) return { success: false, error: 'Song not found' };

    return { success: true, song };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Get Specific Artist Profile
 */
export async function getArtistByIdAction(artistId: string) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;

  try {
    const artist = await prisma.artist.findUnique({
      where: { id: artistId },
      include: {
        songs: {
          include: { album: true },
          orderBy: { playCount: 'desc' },
        },
        albums: {
          include: { songs: true },
        },
      },
    });

    if (!artist) return { success: false, error: 'Artist not found' };

    let isFollowing = false;
    if (userId) {
      const follow = await prisma.artistFollow.findUnique({
        where: { userId_artistId: { userId, artistId } },
      });
      isFollowing = !!follow;
    }

    return { success: true, artist, isFollowing };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Get Specific Album with Tracklist
 */
export async function getAlbumByIdAction(albumId: string) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;

  try {
    const album = await prisma.album.findUnique({
      where: { id: albumId },
      include: {
        artist: true,
        songs: {
          include: { artist: true },
        },
      },
    });

    if (!album) return { success: false, error: 'Album not found' };

    let isLiked = false;
    if (userId) {
      const like = await prisma.albumLike.findUnique({
        where: { userId_albumId: { userId, albumId } },
      });
      isLiked = !!like;
    }

    return { success: true, album, isLiked };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Toggle Like on Song
 */
export async function toggleSongLikeAction(songId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false, error: 'Authentication required' };
  const userId = (session.user as any).id;

  try {
    const existing = await prisma.songLike.findUnique({
      where: { userId_songId: { userId, songId } },
    });

    if (existing) {
      await prisma.$transaction([
        prisma.songLike.delete({
          where: { userId_songId: { userId, songId } },
        }),
        prisma.song.update({
          where: { id: songId },
          data: { likeCount: { decrement: 1 } },
        }),
      ]);
      return { success: true, liked: false };
    } else {
      await prisma.$transaction([
        prisma.songLike.create({
          data: { userId, songId },
        }),
        prisma.song.update({
          where: { id: songId },
          data: { likeCount: { increment: 1 } },
        }),
      ]);
      return { success: true, liked: true };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Record Song Play & Update Recently Played (Deduplicated session)
 */
export async function recordSongPlayAction(songId: string, completionPercentage = 0) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;

  try {
    // 1. Increment total song plays
    await prisma.song.update({
      where: { id: songId },
      data: { playCount: { increment: 1 } },
    });

    // 2. Upsert user's recently played record if logged in
    if (userId) {
      await prisma.recentlyPlayedSong.upsert({
        where: { userId_songId: { userId, songId } },
        update: {
          playedAt: new Date(),
          completionPercentage,
        },
        create: {
          userId,
          songId,
          completionPercentage,
        },
      });
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Get User's Saved Music (My Music)
 */
export async function getUserMusicAction() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false, error: 'Authentication required' };
  const userId = (session.user as any).id;

  try {
    const [likedSongs, likedAlbums, followedArtists, recentlyPlayed, playlists] =
      await Promise.all([
        prisma.songLike.findMany({
          where: { userId },
          include: {
            song: { include: { artist: true, album: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.albumLike.findMany({
          where: { userId },
          include: {
            album: { include: { artist: true, songs: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.artistFollow.findMany({
          where: { userId },
          include: {
            artist: { include: { songs: true, albums: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.recentlyPlayedSong.findMany({
          where: { userId },
          include: {
            song: { include: { artist: true, album: true } },
          },
          orderBy: { playedAt: 'desc' },
          take: 20,
        }),
        prisma.musicPlaylist.findMany({
          where: { userId },
          include: {
            songs: {
              include: { song: { include: { artist: true } } },
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { updatedAt: 'desc' },
        }),
      ]);

    return {
      success: true,
      likedSongs: likedSongs.map((l) => l.song),
      likedAlbums: likedAlbums.map((l) => l.album),
      followedArtists: followedArtists.map((f) => f.artist),
      recentlyPlayed: recentlyPlayed.map((r) => r.song),
      playlists,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Create Playlist
 */
export async function createMusicPlaylistAction(title: string, description?: string, isPublic = true) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false, error: 'Authentication required' };
  const userId = (session.user as any).id;

  try {
    const playlist = await prisma.musicPlaylist.create({
      data: {
        userId,
        title: title.trim(),
        description: description?.trim(),
        isPublic,
      },
    });
    return { success: true, playlist };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Add Song to Playlist
 */
export async function addSongToPlaylistAction(playlistId: string, songId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false, error: 'Authentication required' };
  const userId = (session.user as any).id;

  try {
    const playlist = await prisma.musicPlaylist.findUnique({
      where: { id: playlistId },
      include: { songs: true },
    });
    if (!playlist || playlist.userId !== userId) {
      return { success: false, error: 'Playlist not found or permission denied' };
    }

    const nextOrder = playlist.songs.length;
    await prisma.playlistSong.upsert({
      where: { playlistId_songId: { playlistId, songId } },
      update: {},
      create: {
        playlistId,
        songId,
        order: nextOrder,
      },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Attach Audio Segment to Reel
 */
export async function attachAudioToReelAction(data: {
  postId: string;
  songId: string;
  startTime: number;
  endTime: number;
  duration: number;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false, error: 'Authentication required' };

  try {
    // Validate bounds
    const safeDuration = Math.min(60, Math.max(5, data.duration || 30));
    const safeStart = Math.max(0, data.startTime || 0);
    const safeEnd = safeStart + safeDuration;

    const reelAudio = await prisma.reelAudio.upsert({
      where: { postId: data.postId },
      update: {
        songId: data.songId,
        startTime: safeStart,
        endTime: safeEnd,
        duration: safeDuration,
      },
      create: {
        postId: data.postId,
        songId: data.songId,
        startTime: safeStart,
        endTime: safeEnd,
        duration: safeDuration,
      },
    });

    return { success: true, reelAudio };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Super Admin: Get complete music analytics and records
 */
export async function adminGetMusicStatsAction() {
  await ensureInitialMusicSeeded();
  try {
    const [
      totalSongs,
      totalArtists,
      totalAlbums,
      songs,
      artists,
      albums,
      reelAudioCount,
    ] = await Promise.all([
      prisma.song.count(),
      prisma.artist.count(),
      prisma.album.count(),
      prisma.song.findMany({
        include: { artist: true, album: true },
        orderBy: { playCount: 'desc' },
      }),
      prisma.artist.findMany({
        include: { songs: true, albums: true },
        orderBy: { monthlyListeners: 'desc' },
      }),
      prisma.album.findMany({
        include: { artist: true, songs: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.reelAudio.count(),
    ]);

    const totalPlays = songs.reduce((sum, s) => sum + s.playCount, 0);

    return {
      success: true,
      stats: {
        totalSongs,
        totalArtists,
        totalAlbums,
        totalPlays,
        reelAudioCount,
      },
      songs,
      artists,
      albums,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Super Admin: Create Song
 */
export async function adminCreateSongAction(data: {
  title: string;
  artistId: string;
  albumId?: string;
  audioUrl: string;
  coverUrl?: string;
  duration: number;
  genre: string;
  language: string;
  isTrending?: boolean;
  isFeatured?: boolean;
}) {
  try {
    const song = await prisma.song.create({
      data: {
        title: data.title.trim(),
        artistId: data.artistId,
        albumId: data.albumId || null,
        audioUrl: data.audioUrl.trim(),
        coverUrl: data.coverUrl?.trim() || null,
        duration: Math.max(10, data.duration || 120),
        genre: data.genre || 'Bollywood',
        language: data.language || 'Hindi',
        isTrending: !!data.isTrending,
        isFeatured: !!data.isFeatured,
        waveform: JSON.stringify(generateWaveform(data.title)),
      },
    });
    return { success: true, song };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Super Admin: Delete Song
 */
export async function adminDeleteSongAction(songId: string) {
  try {
    await prisma.song.delete({ where: { id: songId } });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Super Admin: Create Artist
 */
export async function adminCreateArtistAction(data: {
  name: string;
  bio?: string;
  image?: string;
  genre?: string;
  isVerified?: boolean;
}) {
  try {
    const artist = await prisma.artist.create({
      data: {
        name: data.name.trim(),
        bio: data.bio?.trim() || null,
        image: data.image?.trim() || null,
        genre: data.genre || 'Bollywood',
        isVerified: data.isVerified ?? true,
        monthlyListeners: 100000,
      },
    });
    return { success: true, artist };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Super Admin: Delete Artist
 */
export async function adminDeleteArtistAction(artistId: string) {
  try {
    await prisma.artist.delete({ where: { id: artistId } });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Super Admin: Create Album
 */
export async function adminCreateAlbumAction(data: {
  title: string;
  artistId: string;
  coverUrl?: string;
  releaseYear?: string;
  genre?: string;
  description?: string;
  isFeatured?: boolean;
}) {
  try {
    const album = await prisma.album.create({
      data: {
        title: data.title.trim(),
        artistId: data.artistId,
        coverUrl: data.coverUrl?.trim() || null,
        releaseYear: data.releaseYear || '2026',
        genre: data.genre || 'Bollywood',
        description: data.description?.trim() || null,
        isFeatured: !!data.isFeatured,
      },
    });
    return { success: true, album };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Super Admin: Delete Album
 */
export async function adminDeleteAlbumAction(albumId: string) {
  try {
    await prisma.album.delete({ where: { id: albumId } });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
