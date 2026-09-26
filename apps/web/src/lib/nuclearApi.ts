/**
 * Nuclear Music Player API Preservation & Stream Resolvers
 * 
 * Based on open-source Nuclear architecture (https://github.com/nukeop/nuclear).
 * Encapsulates multi-source audio resolvers, open metadata APIs,
 * and audio segmenting stream methods for Tolee Songs & Reels.
 */

export interface NuclearStreamSource {
  name: 'jamendo' | 'invidious' | 'fma' | 'audius' | 'archive';
  displayName: string;
  baseUrl: string;
  enabled: boolean;
}

export interface NuclearTrackResult {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number; // in seconds
  streamUrl: string;
  thumbnailUrl?: string;
  source: string;
  waveformUrl?: string;
}

export const NUCLEAR_STREAM_PROVIDERS: NuclearStreamSource[] = [
  {
    name: 'jamendo',
    displayName: 'Jamendo Music API',
    baseUrl: 'https://api.jamendo.com/v3.0',
    enabled: true,
  },
  {
    name: 'invidious',
    displayName: 'Invidious Open Audio Streams',
    baseUrl: 'https://inv.nadeko.net/api/v1',
    enabled: true,
  },
  {
    name: 'audius',
    displayName: 'Audius Decentralized Audio Protocol',
    baseUrl: 'https://discoveryprovider.audius.co/v1',
    enabled: true,
  },
  {
    name: 'archive',
    displayName: 'Internet Archive Audio Collection',
    baseUrl: 'https://archive.org/advancedsearch.php',
    enabled: true,
  },
];

/**
 * Jamendo Open API Resolver
 * Allows free streaming of royalty-free songs with CC licenses.
 */
export async function searchJamendoTracks(
  query: string,
  clientId = 'c4d162fc', // Public open developer key
  limit = 10
): Promise<NuclearTrackResult[]> {
  try {
    const params = new URLSearchParams({
      client_id: clientId,
      format: 'json',
      namesearch: query,
      limit: String(limit),
      include: 'musicinfo',
      audioformat: 'mp32',
    });

    const res = await fetch(`https://api.jamendo.com/v3.0/tracks/?${params.toString()}`);
    if (!res.ok) return [];

    const data = await res.json();
    if (!data.results || !Array.isArray(data.results)) return [];

    return data.results.map((item: any) => ({
      id: `jamendo-${item.id}`,
      title: item.name,
      artist: item.artist_name,
      album: item.album_name,
      duration: item.duration,
      streamUrl: item.audio,
      thumbnailUrl: item.album_image || item.image,
      source: 'jamendo',
      waveformUrl: item.waveform,
    }));
  } catch (err) {
    console.error('[Nuclear API] Jamendo search error:', err);
    return [];
  }
}

/**
 * Invidious Audio Stream Resolver
 * Resolves audio-only streams without heavy video payloads.
 */
export async function searchInvidiousAudio(
  query: string,
  limit = 5
): Promise<NuclearTrackResult[]> {
  try {
    const res = await fetch(`https://inv.nadeko.net/api/v1/search?q=${encodeURIComponent(query)}&type=video`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.slice(0, limit).map((item: any) => ({
      id: `invidious-${item.videoId}`,
      title: item.title,
      artist: item.author,
      duration: item.lengthSeconds,
      streamUrl: `https://inv.nadeko.net/latest_version?id=${item.videoId}&itag=140`, // itag 140 is AAC 128k audio
      thumbnailUrl: item.videoThumbnails?.[0]?.url,
      source: 'invidious',
    }));
  } catch (err) {
    console.error('[Nuclear API] Invidious search error:', err);
    return [];
  }
}

import { searchToleeMusic } from './toleeMusicApi';

/**
 * Universal Multi-source Music Search
 * Queries Tolee universal music discovery with jamendo fallback.
 */
export async function searchNuclearMusic(query: string): Promise<NuclearTrackResult[]> {
  if (!query.trim()) return [];

  try {
    const toleeTracks = await searchToleeMusic(query, 15);
    if (toleeTracks.length > 0) {
      return toleeTracks.map((t) => ({
        id: t.id,
        title: t.title,
        artist: t.artistName,
        album: t.albumName || 'Tolee Audio',
        duration: t.duration,
        streamUrl: t.audioUrl,
        thumbnailUrl: t.coverUrl,
        source: 'tolee',
      }));
    }
  } catch (err) {
    console.error('[Music API] searchToleeMusic error in nuclearApi:', err);
  }

  const [jamendoResults] = await Promise.allSettled([
    searchJamendoTracks(query),
  ]);

  const results: NuclearTrackResult[] = [];
  if (jamendoResults.status === 'fulfilled') {
    results.push(
      ...jamendoResults.value.map((item) => ({
        ...item,
        source: 'tolee',
      }))
    );
  }

  return results;
}
