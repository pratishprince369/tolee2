/**
 * Tolee Songs – Universal Music Streaming & Discovery Engine
 * 
 * Full song streaming & full podcast listening without 15-second snippet cutoffs.
 * Privacy & White-label Guarantee:
 * All third-party provider names and brandings are strictly sanitized.
 * Tracks and podcasts are presented exclusively under Tolee branding.
 */

import CryptoJS from 'crypto-js';
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
 * Decrypt JioSaavn encrypted_media_url to get 100% full song audio stream
 */
export function decryptSaavnMediaUrl(encrypted?: string): string {
  if (!encrypted) return '';
  try {
    const key = CryptoJS.enc.Utf8.parse('38346591');
    const decrypted = CryptoJS.DES.decrypt(
      { ciphertext: CryptoJS.enc.Base64.parse(encrypted) },
      key,
      { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
    );
    const decStr = decrypted.toString(CryptoJS.enc.Utf8);
    if (!decStr || !decStr.startsWith('http')) return '';

    // Upgrade to high-quality 160kbps/320kbps full track
    return decStr.replace('_96.mp4', '_160.mp4');
  } catch (e) {
    return '';
  }
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
    .replace(/apple\s*podcasts?/gi, 'Tolee Podcasts')
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
 * Fetch full songs from open primary catalog with DES decryption for full audio
 */
async function fetchSaavnTracks(query: string, limit = 20): Promise<ToleeTrack[]> {
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

      // 1. Try to get FULL song audio URL via DES decryption
      let audioUrl = decryptSaavnMediaUrl(moreInfo.encrypted_media_url);

      // 2. Fallback to vlink or preview only if decryption not available
      if (!audioUrl) {
        audioUrl = moreInfo.vlink || item.media_preview_url || '';
      }
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
      const duration = parseInt(moreInfo.duration || item.duration || '210', 10);
      const coverUrl = upgradeCoverUrl(item.image);
      const id = `tolee-s-${item.id}`;

      tracks.push({
        id,
        title,
        artistName,
        artist: { id: `artist-${encodeURIComponent(artistName.toLowerCase().replace(/[^a-z0-9]/g, '-'))}`, name: artistName },
        albumName,
        album: { id: `album-${encodeURIComponent(albumName.toLowerCase().replace(/[^a-z0-9]/g, '-'))}`, title: albumName, coverUrl },
        coverUrl,
        audioUrl,
        duration: isNaN(duration) || duration <= 0 ? 210 : duration,
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
 * Fetch full podcast episodes for listening
 */
export async function searchToleePodcasts(query = 'hindi stories', limit = 12): Promise<ToleeTrack[]> {
  try {
    const url = new URL('https://itunes.apple.com/search');
    url.searchParams.set('term', query);
    url.searchParams.set('entity', 'podcast');
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('country', 'IN');

    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ToleeMusic/1.0',
      },
      next: { revalidate: 600 },
    });

    if (!res.ok) return [];
    const data = await res.json();
    if (!data || !Array.isArray(data.results)) return [];

    const episodesList: ToleeTrack[] = [];

    // Parallel fetch episodes for the top found podcasts
    const lookups = data.results.slice(0, 5).map(async (pod: any) => {
      try {
        const epUrl = `https://itunes.apple.com/lookup?id=${pod.collectionId}&entity=podcastEpisode&limit=3`;
        const epRes = await fetch(epUrl, {
          headers: { Accept: 'application/json' },
          next: { revalidate: 600 },
        });
        if (!epRes.ok) return [];
        const epData = await epRes.json();
        const eps = (epData.results || []).slice(1);

        return eps.map((ep: any) => {
          if (!ep.episodeUrl) return null;
          const title = sanitizeMusicText(ep.trackName || pod.collectionName);
          const artistName = sanitizeMusicText(pod.artistName || 'Tolee Host');
          const albumName = sanitizeMusicText(pod.collectionName || 'Tolee Podcast Show');
          const coverUrl = upgradeCoverUrl(ep.artworkUrl600 || pod.artworkUrl600);
          const duration = ep.trackTimeMillis ? Math.round(ep.trackTimeMillis / 1000) : 1800;
          const id = `tolee-pod-${ep.trackId || pod.collectionId}`;

          return {
            id,
            title,
            artistName,
            artist: { id: `artist-${encodeURIComponent(artistName.toLowerCase().replace(/[^a-z0-9]/g, '-'))}`, name: artistName },
            albumName,
            album: { id: `album-${encodeURIComponent(albumName.toLowerCase().replace(/[^a-z0-9]/g, '-'))}`, title: albumName, coverUrl },
            coverUrl,
            audioUrl: ep.episodeUrl, // 100% full podcast episode audio
            duration,
            genre: 'Podcast',
            language: 'Hindi',
            waveform: JSON.stringify(generateWaveform(id + title)),
            playCount: 185000,
            likeCount: 39000,
            source: 'tolee',
            isFeatured: true,
          } as ToleeTrack;
        }).filter(Boolean);
      } catch {
        return [];
      }
    });

    const settled = await Promise.allSettled(lookups);
    for (const s of settled) {
      if (s.status === 'fulfilled' && Array.isArray(s.value)) {
        for (const ep of s.value) {
          if (ep) episodesList.push(ep);
        }
      }
    }

    return episodesList;
  } catch (err) {
    console.error('[Tolee Music API] Error searching podcasts:', err);
    return [];
  }
}

/**
 * Universal Search across full songs and podcasts
 */
export async function searchToleeMusic(query: string, limit = 24): Promise<ToleeTrack[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const isPodcastSearch = trimmed.toLowerCase().includes('podcast') || trimmed.toLowerCase().includes('show');

  if (isPodcastSearch) {
    const podcasts = await searchToleePodcasts(trimmed, limit);
    if (podcasts.length > 0) return podcasts;
  }

  // Fetch full songs
  const tracks = await fetchSaavnTracks(trimmed, limit);

  // If results are small, check podcasts as well
  if (tracks.length < 5) {
    const podcasts = await searchToleePodcasts(trimmed, 6);
    return [...tracks, ...podcasts].slice(0, limit);
  }

  return tracks.slice(0, limit);
}

/**
 * Fetch Trending Songs Feed with 100% Full Audio
 */
export async function fetchTrendingFeed(): Promise<ToleeTrack[]> {
  const queries = ['trending hindi', 'top bollywood songs', 'viral hits 2026', 'punjabi hits'];
  const randomQuery = queries[Math.floor(Math.random() * queries.length)];
  const tracks = await fetchSaavnTracks(randomQuery, 24);

  return tracks.map((t) => ({
    ...t,
    isTrending: true,
    isFeatured: true,
  }));
}

/**
 * Fetch Curated Full Podcasts Feed
 */
export async function fetchTrendingPodcasts(): Promise<ToleeTrack[]> {
  const podQueries = ['hindi stories podcast', 'Ranveer Show', 'motivation hindi', 'true crime hindi'];
  const q = podQueries[Math.floor(Math.random() * podQueries.length)];
  const pods = await searchToleePodcasts(q, 10);
  return pods;
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
