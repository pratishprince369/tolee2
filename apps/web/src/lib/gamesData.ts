export interface ToleeGame {
  id: string;
  title: string;
  description: string;
  genre: string;
  category?: string;
  playUrl: string;
  rating: number;
  technology: string[];
  modelAttribution: string;
  developer?: string;
  githubUrl: string | null;
  coverImage: string;
  featured: boolean;
  trending?: boolean;
  isNew?: boolean;
  playsCount: number;
  badge?: string | null;
  license?: string;
  multiplayer?: 'Single Player' | '2 Player' | 'Online Multiplayer';
  mobileSupported?: boolean;
  controls?: string;
}

export const GAME_CATEGORIES = [
  { id: 'All', label: 'All Games', icon: '🎮' },
  { id: 'Featured', label: 'Featured', icon: '🏆' },
  { id: 'Trending', label: 'Trending', icon: '🔥' },
  { id: 'New', label: 'New Games', icon: '🆕' },
  { id: 'Arcade', label: 'Arcade', icon: '🕹️' },
  { id: 'Racing', label: 'Racing', icon: '🏎️' },
  { id: 'Puzzle', label: 'Puzzle', icon: '🧩' },
  { id: 'Board', label: 'Board', icon: '♟️' },
  { id: 'Classic', label: 'Classic', icon: '🐍' },
  { id: 'Sports', label: 'Sports', icon: '⚽' },
  { id: 'Quiz', label: 'Quiz', icon: '🧠' },
  { id: 'Shooting', label: 'Shooting', icon: '🔫' },
  { id: 'Multiplayer', label: 'Multiplayer', icon: '👥' },
  { id: 'Mobile', label: 'Mobile Games', icon: '📱' },
] as const;

export type GameCategory = (typeof GAME_CATEGORIES)[number]['id'];

export const GAME_GENRES = [
  'All',
  '3D & Racing',
  'Action & Combat',
  'Puzzle & Board',
  'Arcade & Casual',
  'Strategy & RPG',
  'Sports',
  'Multiplayer',
] as const;

export type GameGenre = (typeof GAME_GENRES)[number];

export const TOLEE_GAMES: ToleeGame[] = [];

export const COMBINED_GAMES: ToleeGame[] = TOLEE_GAMES;

export function getAllGames(): ToleeGame[] {
  return TOLEE_GAMES;
}

export function getGameById(id: string): ToleeGame | undefined {
  return COMBINED_GAMES.find((g) => g.id === id);
}

export function getFeaturedGames(): ToleeGame[] {
  return COMBINED_GAMES.filter((g) => g.featured || g.rating >= 9.3).slice(0, 15);
}

export function getTrendingGames(): ToleeGame[] {
  return [...COMBINED_GAMES].sort((a, b) => b.playsCount - a.playsCount).slice(0, 15);
}

export function getGamesByCategory(category: string): ToleeGame[] {
  if (!category || category === 'All') return COMBINED_GAMES;
  if (category === 'Featured') return getFeaturedGames();
  if (category === 'Trending') return getTrendingGames();
  if (category === 'New') return COMBINED_GAMES.filter((g) => g.isNew || g.rating >= 9.2).slice(0, 20);
  if (category === 'Multiplayer') {
    return COMBINED_GAMES.filter(
      (g) =>
        g.multiplayer === 'Online Multiplayer' ||
        g.multiplayer === '2 Player' ||
        g.category === 'Multiplayer' ||
        (g.title + ' ' + g.description).toLowerCase().includes('multiplayer') ||
        (g.title + ' ' + g.description).toLowerCase().includes('2 player') ||
        (g.title + ' ' + g.description).toLowerCase().includes('arena')
    );
  }
  if (category === 'Mobile') {
    return COMBINED_GAMES.filter((g) => g.mobileSupported !== false);
  }

  const catLower = category.toLowerCase();
  return COMBINED_GAMES.filter((g) => {
    if (g.category && g.category.toLowerCase() === catLower) return true;
    const text = (g.genre + ' ' + g.title + ' ' + g.description).toLowerCase();
    return text.includes(catLower);
  });
}

export function getGamesByGenre(genre: string): ToleeGame[] {
  if (!genre || genre === 'All') return COMBINED_GAMES;
  return getGamesByCategory(genre);
}

export function getRelatedGames(gameId: string, limit = 6): ToleeGame[] {
  const current = getGameById(gameId);
  if (!current) return COMBINED_GAMES.slice(0, limit);
  return COMBINED_GAMES.filter(
    (g) => g.id !== current.id && (g.genre === current.genre || g.category === current.category)
  ).slice(0, limit);
}

export function searchGames(query: string, category: string = 'All'): ToleeGame[] {
  const q = query.trim().toLowerCase();
  let list = category === 'All' ? COMBINED_GAMES : getGamesByCategory(category);
  if (!q) return list;

  return list.filter((g) =>
    g.title.toLowerCase().includes(q) ||
    g.description.toLowerCase().includes(q) ||
    (g.category && g.category.toLowerCase().includes(q)) ||
    g.genre.toLowerCase().includes(q) ||
    g.technology.some((t) => t.toLowerCase().includes(q)) ||
    g.modelAttribution.toLowerCase().includes(q)
  );
}
