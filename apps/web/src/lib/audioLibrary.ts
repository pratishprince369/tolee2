export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  mood: string;
  duration: number; // in seconds
  url: string;
  coverUrl?: string;
}

export const CURATED_AUDIO_LIBRARY: AudioTrack[] = [
  {
    id: 'lofi-chill-1',
    title: 'Lofi Chill Beats',
    artist: 'Tolee Vibes',
    mood: 'Chill / Study',
    duration: 124,
    url: 'https://cdn.freesound.org/previews/612/612644_5674468-lq.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'acoustic-morning-2',
    title: 'Acoustic Morning Breeze',
    artist: 'Indie Collective',
    mood: 'Acoustic / Warm',
    duration: 98,
    url: 'https://cdn.freesound.org/previews/573/573381_11861866-lq.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1445985543470-41fdd5c31447?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'urban-energy-3',
    title: 'Urban Groove & Bass',
    artist: 'Metro Pulse',
    mood: 'Trending / Reels',
    duration: 85,
    url: 'https://cdn.freesound.org/previews/462/462808_838627-lq.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'cinematic-ambient-4',
    title: 'Serene Sunset Ambient',
    artist: 'Soundscape Lab',
    mood: 'Peaceful / Travel',
    duration: 110,
    url: 'https://cdn.freesound.org/previews/568/568169_9497060-lq.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'devotional-darshan-5',
    title: 'Spiritual Temple Chants & Flute',
    artist: 'Divine Horizon',
    mood: 'Devotional / Darshan',
    duration: 140,
    url: 'https://cdn.freesound.org/previews/530/530415_1648170-lq.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1545239351-ef35f43d514b?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'festive-energy-6',
    title: 'Celebration Beat Drop',
    artist: 'Desi Rhythm',
    mood: 'Celebration / Wins',
    duration: 92,
    url: 'https://cdn.freesound.org/previews/458/458867_838627-lq.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=150&auto=format&fit=crop&q=80',
  }
];

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}
