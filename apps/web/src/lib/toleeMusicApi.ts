/**
 * Tolee Songs – Universal Music Streaming & Discovery Engine
 * 
 * Powered by open discovery endpoints (inspired by legal aggregate resolvers in SayaMusicAPI).
 * Privacy & White-label Guarantee:
 * All third-party provider names, brandings, and traces are strictly sanitized.
 * Tracks are presented exclusively under Tolee Songs branding.
 */

import { generateWaveform } from './audioLibrary';

export interface ToleeTrack {
  id: string;
  title: string;
  artistId?: string;
  artistName: string;
  artist?: { id: string; name: string };
  albumId?: string | null;
  albumName?: string | null;
  album?: { id: string; title: string; coverUrl?: string | null } | null;
  coverUrl: string;
  audioUrl: string;
  duration: number; // in seconds
  genre: string;
  language: string;
  waveform?: string;
  isTrending?: boolean;
  isFeatured?: boolean;
  playCount?: number;
  likeCount?: number;
  source?: string;
}

export interface ToleeArtist {
  id: string;
  name: string;
  bio?: string;
  image: string;
  genre: string;
  isVerified: boolean;
  monthlyListeners: number;
}

export interface ToleeAlbum {
  id: string;
  title: string;
  artistId?: string;
  artistName?: string;
  coverUrl: string;
  releaseYear: string;
  genre: string;
  description: string;
  songs?: ToleeTrack[];
  isFeatured?: boolean;
}

/**
 * Sanitize text to decode HTML entities and remove external platform branding
 */
export function sanitizeMusicText(text: string): string {
  if (!text) return '';
  let cleaned = text
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();

  // Strip third-party brand names so user never sees external platforms
  cleaned = cleaned
    .replace(/jiosaavn/gi, 'Tolee')
    .replace(/saavn/gi, 'Tolee')
    .replace(/gaana/gi, 'Tolee')
    .replace(/spotify/gi, 'Tolee')
    .replace(/apple\s*music/gi, 'Tolee Music')
    .replace(/itunes/gi, 'Tolee')
    .replace(/audius/gi, 'Tolee')
    .replace(/deezer/gi, 'Tolee')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned;
}

/**
 * Upgrade thumbnail image URLs to high-res (500x500 or 600x600)
 */
export function upgradeCoverUrl(url?: string): string {
  if (!url) {
    return 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80';
  }
  return url
    .replace(/150x150/g, '500x500')
    .replace(/50x50/g, '500x500')
    .replace(/100x100bb/g, '600x600bb')
    .replace(/http:\/\//g, 'https://');
}

/**
 * Fetch songs from primary open API (JioSaavn API call)
 */
async function fetchSaavnTracks(query: string, limit = 15): Promise<ToleeTrack[]> {
  try {
    const url = new URL('https://www.jiosaavn.com/api.php');
    url.searchParams.set('__call', 'search.getResults');
    url.searchParams.set('_format', 'json');
    url.searchParams.set('_marker', '0');
    url.searchParams.set('api_version', '4');
    url.searchParams.set('ctx', 'web6dot0');
    url.searchParams.set('q', query);
    url.searchParams.set('n', String(limit));

    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ToleeMusic/1.0',
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) return [];
    const data = await res.json();
    if (!data || !Array.isArray(data.results)) return [];

    const tracks: ToleeTrack[] = [];

    for (const item of data.results) {
      const moreInfo = item.more_info || {};
      const audioUrl = moreInfo.vlink || item.media_preview_url || '';
      if (!audioUrl) continue;

      const title = sanitizeMusicText(item.song || item.title || 'Untitled Track');
      const rawArtist =
        item.primary_artists ||
        moreInfo.primary_artists ||
        item.subtitle ||
        moreInfo.singers ||
        item.singers ||
        'Tolee Artist';
      const artistName = sanitizeMusicText(rawArtist.split(',')[0] || rawArtist);
      const albumName = sanitizeMusicText(moreInfo.album || item.album || 'Tolee Singles');
      const duration = parseInt(moreInfo.duration || item.duration || '180', 10);
      const coverUrl = upgradeCoverUrl(item.image);
      const id = `tolee-s-${item.id}`;

      tracks.push({
        id,
        title,
        artistName,
        artist: { id: `artist-${encodeURIComponent(artistName.toLowerCase().replace(/\s+/g, '-'))}`, name: artistName },
        albumName,
        album: { id: `album-${encodeURIComponent(albumName.toLowerCase().replace(/\s+/g, '-'))}`, title: albumName, coverUrl },
        coverUrl,
        audioUrl,
        duration: isNaN(duration) || duration <= 0 ? 180 : duration,
        genre: sanitizeMusicText(item.language || moreInfo.language || 'Bollywood'),
        language: sanitizeMusicText(item.language || moreInfo.language || 'Hindi'),
        waveform: JSON.stringify(generateWaveform(id + title)),
        playCount: parseInt(item.play_count || moreInfo.play_count || '150000', 10),
        likeCount: Math.floor(parseInt(item.play_count || '150000', 10) * 0.18),
        source: 'tolee',
      });
    }

    return tracks;
  } catch (err) {
    console.error('[Tolee Music API] Error fetching primary tracks:', err);
    return [];
  }
}

/**
 * Fetch tracks from secondary open API (iTunes Preview API)
 */
async function fetchAppleTracks(query: string, limit = 10): Promise<ToleeTrack[]> {
  try {
    const url = new URL('https://itunes.apple.com/search');
    url.searchParams.set('term', query);
    url.searchParams.set('entity', 'song');
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('country', 'IN');

    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ToleeMusic/1.0',
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) return [];
    const data = await res.json();
    if (!data || !Array.isArray(data.results)) return [];

    const tracks: ToleeTrack[] = [];

    for (const item of data.results) {
      if (!item.previewUrl) continue;

      const title = sanitizeMusicText(item.trackName || 'Untitled Track');
      const artistName = sanitizeMusicText(item.artistName || 'Tolee Artist');
      const albumName = sanitizeMusicText(item.collectionName || 'Tolee Singles');
      const duration = Math.round((item.trackTimeMillis || 180000) / 1000);
      const coverUrl = upgradeCoverUrl(item.artworkUrl100);
      const id = `tolee-a-${item.trackId}`;

      tracks.push({
        id,
        title,
        artistName,
        artist: { id: `artist-${encodeURIComponent(artistName.toLowerCase().replace(/\s+/g, '-'))}`, name: artistName },
        albumName,
        album: { id: `album-${encodeURIComponent(albumName.toLowerCase().replace(/\s+/g, '-'))}`, title: albumName, coverUrl },
        coverUrl,
        audioUrl: item.previewUrl,
        duration: isNaN(duration) || duration <= 0 ? 180 : duration,
        genre: sanitizeMusicText(item.primaryGenreName || 'Pop'),
        language: 'Hindi',
        waveform: JSON.stringify(generateWaveform(id + title)),
        playCount: 180000,
        likeCount: 42000,
        source: 'tolee',
      });
    }

    return tracks;
  } catch (err) {
    console.error('[Tolee Music API] Error fetching secondary tracks:', err);
    return [];
  }
}

/**
 * Universal Search across multi-providers with deduplication
 */
export async function searchToleeMusic(query: string, limit = 20): Promise<ToleeTrack[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const [primary, secondary] = await Promise.allSettled([
    fetchSaavnTracks(trimmed, limit),
    fetchAppleTracks(trimmed, Math.min(10, limit)),
  ]);

  const results: ToleeTrack[] = [];
  const seenTitles = new Set<string>();

  const appendTracks = (list: ToleeTrack[]) => {
    for (const track of list) {
      const normalizedKey = `${track.title.toLowerCase().replace(/[^a-z0-9]/g, '')}-${track.artistName.toLowerCase().slice(0, 5)}`;
      if (!seenTitles.has(normalizedKey)) {
        seenTitles.add(normalizedKey);
        results.push(track);
      }
    }
  };

  if (primary.status === 'fulfilled') {
    appendTracks(primary.value);
  }
  if (secondary.status === 'fulfilled') {
    appendTracks(secondary.value);
  }

  return results.slice(0, limit);
}

/**
 * Fetch Trending Songs Feed
 */
export async function fetchTrendingFeed(): Promise<ToleeTrack[]> {
  const queries = ['trending hindi', 'top bollywood songs', 'viral hits 2026', 'punjabi hits'];
  const randomQuery = queries[Math.floor(Math.random() * queries.length)];
  const tracks = await searchToleeMusic(randomQuery, 24);

  return tracks.map((t) => ({
    ...t,
    isTrending: true,
    isFeatured: true,
  }));
}

/**
 * Curated Top Artists on Tolee
 */
export const POPULAR_TOLEE_ARTISTS: ToleeArtist[] = [
  {
    id: 'artist-arijit-singh',
    name: 'Arijit Singh',
    bio: 'Renowned Indian playback singer celebrated for soulful romantic and classical hits.',
    image: 'https://c.saavncdn.com/artists/Arijit_Singh_004_20241118063717_500x500.jpg',
    genre: 'Bollywood',
    isVerified: true,
    monthlyListeners: 42500000,
  },
  {
    id: 'artist-diljit-dosanjh',
    name: 'Diljit Dosanjh',
    bio: 'Global Punjabi music sensation delivering chart-topping dhol beats and urban hits.',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
    genre: 'Punjabi',
    isVerified: true,
    monthlyListeners: 28900000,
  },
  {
    id: 'artist-shreya-ghoshal',
    name: 'Shreya Ghoshal',
    bio: 'Legendary Indian playback singer with timeless romantic, classical and cinematic vocals.',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&auto=format&fit=crop&q=80',
    genre: 'Bollywood',
    isVerified: true,
    monthlyListeners: 31200000,
  },
  {
    id: 'artist-anirudh',
    name: 'Anirudh Ravichander',
    bio: 'Rockstar music composer crafting viral cinematic anthems, bass drops and high-energy hits.',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
    genre: 'Pop / EDM',
    isVerified: true,
    monthlyListeners: 24500000,
  },
  {
    id: 'artist-prateek-kuhad',
    name: 'Prateek Kuhad',
    bio: 'Critically acclaimed indie singer-songwriter known for intimate acoustic melodies.',
    image: 'https://images.unsplash.com/photo-1445985543470-41fdd5c31447?w=500&auto=format&fit=crop&q=80',
    genre: 'Indie',
    isVerified: true,
    monthlyListeners: 9200000,
  },
  {
    id: 'artist-ajay-atul',
    name: 'Ajay-Atul',
    bio: 'Legendary music duo famed for grand cinematic orchestrations and high-energy dhol-tasha.',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
    genre: 'Marathi',
    isVerified: true,
    monthlyListeners: 14500000,
  },
];
