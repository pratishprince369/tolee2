export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  mood: string;
  duration: number; // in seconds
  url: string;
  coverUrl?: string;
  album?: string;
  genre?: string;
  source?: 'jamendo' | 'nuclear-stream' | 'curated';
  waveform?: number[];
  clipStart?: number;
  clipDuration?: number;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  releaseYear: string;
  genre: string;
  description: string;
  trackCount: number;
  tracks: AudioTrack[];
}

// Generate pseudo-waveform bars (40 bars between 0.1 and 1.0)
export function generateWaveform(seed: string): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  const bars: number[] = [];
  for (let i = 0; i < 48; i++) {
    const v = Math.abs(Math.sin((h + i * 13) * 0.15) * 0.7 + Math.cos((h + i * 7) * 0.25) * 0.3);
    bars.push(Math.max(0.15, Math.min(1.0, parseFloat(v.toFixed(2)))));
  }
  return bars;
}

export const CURATED_AUDIO_LIBRARY: AudioTrack[] = [
  {
    id: 'lofi-chill-1',
    title: 'Lofi Midnight Chai',
    artist: 'Tolee Vibes',
    mood: 'Chill / Study',
    album: 'Midnight Chai Lo-Fi',
    genre: 'Lo-Fi',
    duration: 124,
    url: 'https://cdn.freesound.org/previews/612/612644_5674468-lq.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&auto=format&fit=crop&q=80',
    waveform: generateWaveform('lofi-chill-1'),
  },
  {
    id: 'acoustic-morning-2',
    title: 'Acoustic Morning Breeze',
    artist: 'Indie Collective',
    mood: 'Acoustic / Warm',
    album: 'Mountain Acoustic Diaries',
    genre: 'Indie',
    duration: 98,
    url: 'https://cdn.freesound.org/previews/573/573381_11861866-lq.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1445985543470-41fdd5c31447?w=300&auto=format&fit=crop&q=80',
    waveform: generateWaveform('acoustic-morning-2'),
  },
  {
    id: 'urban-energy-3',
    title: 'Urban Groove & Bass',
    artist: 'Metro Pulse',
    mood: 'Trending / Reels',
    album: 'Desi Dhol & Urban Heat',
    genre: 'Punjabi',
    duration: 85,
    url: 'https://cdn.freesound.org/previews/462/462808_838627-lq.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80',
    waveform: generateWaveform('urban-energy-3'),
  },
  {
    id: 'cinematic-ambient-4',
    title: 'Serene Sunset Ambient',
    artist: 'Soundscape Lab',
    mood: 'Peaceful / Travel',
    album: 'Bollywood Cinematic Dreams',
    genre: 'Bollywood',
    duration: 110,
    url: 'https://cdn.freesound.org/previews/568/568169_9497060-lq.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80',
    waveform: generateWaveform('cinematic-ambient-4'),
  },
  {
    id: 'devotional-darshan-5',
    title: 'Spiritual Temple Chants & Flute',
    artist: 'Divine Horizon',
    mood: 'Devotional / Darshan',
    album: 'Maha Aarti & Vedic Chants',
    genre: 'Devotional',
    duration: 140,
    url: 'https://cdn.freesound.org/previews/530/530415_1648170-lq.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1545239351-ef35f43d514b?w=300&auto=format&fit=crop&q=80',
    waveform: generateWaveform('devotional-darshan-5'),
  },
  {
    id: 'festive-energy-6',
    title: 'Celebration Beat Drop',
    artist: 'Desi Rhythm',
    mood: 'Celebration / Wins',
    album: 'Club Tolee Party Anthem',
    genre: 'Party',
    duration: 92,
    url: 'https://cdn.freesound.org/previews/458/458867_838627-lq.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300&auto=format&fit=crop&q=80',
    waveform: generateWaveform('festive-energy-6'),
  },
  {
    id: 'punjabi-swag-7',
    title: 'Patiala Bassline & Tumbi',
    artist: 'Jatt Groove',
    mood: 'High Energy / Reels',
    album: 'Desi Dhol & Urban Heat',
    genre: 'Punjabi',
    duration: 105,
    url: 'https://cdn.freesound.org/previews/462/462808_838627-lq.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80',
    waveform: generateWaveform('punjabi-swag-7'),
  },
  {
    id: 'bollywood-romance-8',
    title: 'Sufi Rain Guitar Romance',
    artist: 'Awaaz Strings',
    mood: 'Romantic / Nostalgic',
    album: 'Bollywood Cinematic Dreams',
    genre: 'Bollywood',
    duration: 135,
    url: 'https://cdn.freesound.org/previews/573/573381_11861866-lq.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300&auto=format&fit=crop&q=80',
    waveform: generateWaveform('bollywood-romance-8'),
  },
  {
    id: 'darshan-om-9',
    title: 'Shiva Dhun & Bells Meditation',
    artist: 'Rishikesh Resonance',
    mood: 'Spiritual / Peace',
    album: 'Maha Aarti & Vedic Chants',
    genre: 'Devotional',
    duration: 160,
    url: 'https://cdn.freesound.org/previews/530/530415_1648170-lq.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1609137144813-7d9921338f24?w=300&auto=format&fit=crop&q=80',
    waveform: generateWaveform('darshan-om-9'),
  },
  {
    id: 'indie-monsoon-10',
    title: 'Pahadi Chai & Acoustic Strings',
    artist: 'Himachal Echoes',
    mood: 'Acoustic / Travel',
    album: 'Mountain Acoustic Diaries',
    genre: 'Indie',
    duration: 115,
    url: 'https://cdn.freesound.org/previews/568/568169_9497060-lq.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=300&auto=format&fit=crop&q=80',
    waveform: generateWaveform('indie-monsoon-10'),
  },
];

export const TOLEE_ALBUMS: Album[] = [
  {
    id: 'album-bollywood-dreams',
    title: 'Bollywood Cinematic Dreams',
    artist: 'Soundscape Lab & Awaaz Strings',
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=80',
    releaseYear: '2026',
    genre: 'Bollywood',
    description: 'Soulful cinematic melodies, monsoon string ballads and trending romantic vibes.',
    trackCount: 2,
    tracks: [CURATED_AUDIO_LIBRARY[3], CURATED_AUDIO_LIBRARY[7]],
  },
  {
    id: 'album-punjabi-heat',
    title: 'Desi Dhol & Urban Heat',
    artist: 'Metro Pulse & Jatt Groove',
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80',
    releaseYear: '2026',
    genre: 'Punjabi',
    description: 'Electrifying 808s paired with authentic Punjabi dhol beats, ideal for high-energy Reels.',
    trackCount: 2,
    tracks: [CURATED_AUDIO_LIBRARY[2], CURATED_AUDIO_LIBRARY[6]],
  },
  {
    id: 'album-lofi-chai',
    title: 'Midnight Chai Lo-Fi',
    artist: 'Tolee Vibes Collective',
    coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&auto=format&fit=crop&q=80',
    releaseYear: '2026',
    genre: 'Lo-Fi',
    description: 'Warm vinyl crackles and smooth piano loops for late-night editing, coding, and chill stories.',
    trackCount: 1,
    tracks: [CURATED_AUDIO_LIBRARY[0]],
  },
  {
    id: 'album-darshan-vedic',
    title: 'Maha Aarti & Vedic Chants',
    artist: 'Divine Horizon & Rishikesh Resonance',
    coverUrl: 'https://images.unsplash.com/photo-1545239351-ef35f43d514b?w=400&auto=format&fit=crop&q=80',
    releaseYear: '2026',
    genre: 'Devotional',
    description: 'Authentic temple bells, bansuri flute, and transcendent mantras for morning posts and darshan.',
    trackCount: 2,
    tracks: [CURATED_AUDIO_LIBRARY[4], CURATED_AUDIO_LIBRARY[8]],
  },
  {
    id: 'album-mountain-acoustic',
    title: 'Mountain Acoustic Diaries',
    artist: 'Indie Collective & Himachal Echoes',
    coverUrl: 'https://images.unsplash.com/photo-1445985543470-41fdd5c31447?w=400&auto=format&fit=crop&q=80',
    releaseYear: '2026',
    genre: 'Indie',
    description: 'Raw acoustic fingerpicking and mountain breeze soundscapes for travel vloggers.',
    trackCount: 2,
    tracks: [CURATED_AUDIO_LIBRARY[1], CURATED_AUDIO_LIBRARY[9]],
  },
  {
    id: 'album-club-tolee',
    title: 'Club Tolee Party Anthem',
    artist: 'Desi Rhythm',
    coverUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&auto=format&fit=crop&q=80',
    releaseYear: '2026',
    genre: 'Party',
    description: 'High-voltage club bangers and dance drops crafted for viral celebrations.',
    trackCount: 1,
    tracks: [CURATED_AUDIO_LIBRARY[5]],
  },
];

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

import { searchNuclearMusic } from './nuclearApi';

// Multi-source music resolver (inspired by Nuclear music architecture)
export async function searchMusic(query: string, genre?: string): Promise<AudioTrack[]> {
  const normalized = query.trim().toLowerCase();
  const localResults = CURATED_AUDIO_LIBRARY.filter((track) => {
    const matchesQuery =
      !normalized ||
      track.title.toLowerCase().includes(normalized) ||
      track.artist.toLowerCase().includes(normalized) ||
      (track.album && track.album.toLowerCase().includes(normalized)) ||
      track.mood.toLowerCase().includes(normalized);
    const matchesGenre =
      !genre || genre === 'All' || track.genre?.toLowerCase() === genre.toLowerCase();
    return matchesQuery && matchesGenre;
  });

  // If user searched for something specific and local library is small, dynamically resolve via Nuclear stream providers
  if (normalized.length >= 2) {
    try {
      const nuclearTracks = await searchNuclearMusic(query);
      const converted: AudioTrack[] = nuclearTracks.map((nt) => ({
        id: nt.id,
        title: nt.title,
        artist: nt.artist,
        mood: 'Streaming',
        album: nt.album || 'Nuclear Stream',
        genre: genre !== 'All' ? genre : 'Pop',
        duration: nt.duration || 120,
        url: nt.streamUrl,
        coverUrl: nt.thumbnailUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300',
        source: 'nuclear-stream',
        waveform: generateWaveform(nt.id),
      }));
      return [...localResults, ...converted];
    } catch {
      return localResults;
    }
  }

  return localResults;
}
