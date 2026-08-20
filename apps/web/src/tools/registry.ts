/**
 * TOLEE CENTRAL TOOL REGISTRY
 * 
 * Defines all official Tolee tools, routes, icons, categories, versions,
 * permissions, and status flags.
 */

export interface ToleeToolDefinition {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  route: string;
  category: 'Social' | 'Hyper-Local' | 'News & Media' | 'AI & Productivity' | 'Commerce' | 'Community' | 'Creator Suite';
  version: string;
  status: 'active' | 'beta' | 'maintenance' | 'deprecated';
  requiresAuth: boolean;
  requiredRole?: 'user' | 'creator' | 'admin' | 'superadmin';
  featureFlag?: string;
  tags: string[];
}

export const TOLEE_TOOLS_REGISTRY: Record<string, ToleeToolDefinition> = {
  'tolee-radar': {
    id: 'tolee-radar',
    name: 'Tolee Radar',
    tagline: 'Hyper-Local Neighborhood Alerts & Map',
    description: 'Real-time GPS neighborhood scanner for emergency alerts, secret food stalls, local events, flash deals, and anonymous Gupt Khabar.',
    icon: 'Radio',
    route: '/radar',
    category: 'Hyper-Local',
    version: '1.0.0',
    status: 'active',
    requiresAuth: true,
    featureFlag: 'TOLEE_RADAR_ENABLED',
    tags: ['gps', 'geo', 'neighborhood', 'alerts', 'food', 'deals', 'gupt-khabar']
  },
  'tolee-feed': {
    id: 'tolee-feed',
    name: 'Tolee Feed',
    tagline: 'Community Posts & Interactive Stories',
    description: 'Dynamic multimedia social feed with rich media, stories, reactions, comments, and neighborhood sharing.',
    icon: 'Home',
    route: '/feed',
    category: 'Social',
    version: '2.1.0',
    status: 'active',
    requiresAuth: true,
    tags: ['posts', 'stories', 'social', 'feed', 'reactions']
  },
  'tolee-reels': {
    id: 'tolee-reels',
    name: 'Tolee Reels',
    tagline: 'Vertical Video & Short Content',
    description: 'Seamless immersive vertical video player with high-speed HLS caching, creator music integration, and interaction tools.',
    icon: 'Film',
    route: '/reels',
    category: 'Creator Suite',
    version: '1.5.0',
    status: 'active',
    requiresAuth: false,
    tags: ['reels', 'video', 'shorts', 'creator', 'media']
  },
  'tolee-chat': {
    id: 'tolee-chat',
    name: 'Tolee Chat',
    tagline: 'Direct & Group Messaging with Calling',
    description: 'Real-time end-to-end encrypted messaging, voice/video calls, typing indicators, media sharing, and group chats.',
    icon: 'MessageCircle',
    route: '/chat',
    category: 'Social',
    version: '2.0.0',
    status: 'active',
    requiresAuth: true,
    tags: ['chat', 'messaging', 'calls', 'groups', 'realtime']
  },
  'tolee-news': {
    id: 'tolee-news',
    name: 'Tolee News',
    tagline: 'Local & Verified Community Journalism',
    description: 'Hyper-local news portal with AI-powered draft generation, verified journalists, citizen reporting, and breaking bulletins.',
    icon: 'Newspaper',
    route: '/news',
    category: 'News & Media',
    version: '1.2.0',
    status: 'active',
    requiresAuth: false,
    tags: ['news', 'bulletin', 'local', 'journalism', 'breaking']
  },
  'tolee-book': {
    id: 'tolee-book',
    name: 'Tolee Book',
    tagline: 'Digital Library & Smart Reader',
    description: 'Full-featured distraction-free digital book reader with automatic progress sync, bookmarks, highlights, and AI summaries.',
    icon: 'BookOpen',
    route: '/world/book',
    category: 'AI & Productivity',
    version: '1.0.0',
    status: 'active',
    requiresAuth: true,
    featureFlag: 'TOLEE_BOOK_ENABLED',
    tags: ['books', 'reader', 'library', 'progress', 'bookmarks', 'education']
  },
  'tolee-ai-manager': {
    id: 'tolee-ai-manager',
    name: 'Tolee AI Manager',
    tagline: 'Autonomous AI Agent & Voice Companion',
    description: 'Unified autonomous AI system orchestrating conversational tasks, voice interactions, reminders, tool execution, and memory.',
    icon: 'Bot',
    route: '/ai-manager',
    category: 'AI & Productivity',
    version: '2.0.0',
    status: 'active',
    requiresAuth: true,
    featureFlag: 'TOLEE_AI_ENABLED',
    tags: ['ai', 'voice', 'agents', 'orchestrator', 'reminders', 'automation']
  },
  'tolee-marketplace': {
    id: 'tolee-marketplace',
    name: 'Tolee Marketplace',
    tagline: 'Hyper-Local Classifieds & Buying/Selling',
    description: 'Community-driven local marketplace for selling pre-owned items, services, electronics, vehicles, and direct buyer contact.',
    icon: 'Store',
    route: '/marketplace',
    category: 'Commerce',
    version: '1.3.0',
    status: 'active',
    requiresAuth: false,
    tags: ['marketplace', 'buy', 'sell', 'classifieds', 'local-shop']
  },
  'tolee-ads': {
    id: 'tolee-ads',
    name: 'Tolee Ads & QuickBoost',
    tagline: 'Targeted Local Ad Campaign Manager',
    description: 'Self-serve advertising engine with wallet balance, geo-targeted post promotions, and real-time impression analytics.',
    icon: 'Megaphone',
    route: '/ads-manager',
    category: 'Creator Suite',
    version: '1.1.0',
    status: 'active',
    requiresAuth: true,
    tags: ['ads', 'campaigns', 'boost', 'promotions', 'wallet']
  },
  'tolee-live': {
    id: 'tolee-live',
    name: 'Tolee Live Studio',
    tagline: 'Interactive Live Streaming Broadcasts',
    description: 'Low-latency live streaming studio with interactive viewer chat, live questions, and audience engagement.',
    icon: 'Tv',
    route: '/live',
    category: 'Creator Suite',
    version: '1.0.0',
    status: 'active',
    requiresAuth: true,
    tags: ['live', 'stream', 'broadcast', 'studio', 'realtime']
  },
  'tolee-groups': {
    id: 'tolee-groups',
    name: 'Tolee Groups',
    tagline: 'Housing Societies, Clubs & Organizations',
    description: 'Dedicated managed group spaces with member roles, board meetings, announcements, notices, and rule moderation.',
    icon: 'Globe',
    route: '/my-tolees',
    category: 'Community',
    version: '2.0.0',
    status: 'active',
    requiresAuth: true,
    tags: ['groups', 'societies', 'clubs', 'tolees', 'community']
  },
  'tolee-screen': {
    id: 'tolee-screen',
    name: 'Tolee Screen',
    tagline: 'Long-Form Video Streaming & Channels',
    description: 'Long-form episodic video streaming platform with creator channels, playlists, and video monetization.',
    icon: 'Tv',
    route: '/screen',
    category: 'News & Media',
    version: '1.0.0',
    status: 'active',
    requiresAuth: false,
    tags: ['screen', 'video', 'longform', 'episodes', 'streaming']
  },
  'tolee-world': {
    id: 'tolee-world',
    name: 'Tolee World',
    tagline: 'Curated AI Apps & Productivity Suite',
    description: 'All-in-one suite featuring LinkedIn Talent Extractor, AI Resume Builder, Social Media Publisher, and WhatsApp Bulk Broadcaster.',
    icon: 'Globe',
    route: '/world',
    category: 'AI & Productivity',
    version: '1.4.0',
    status: 'active',
    requiresAuth: true,
    tags: ['world', 'productivity', 'resume', 'linkedin', 'whatsapp', 'publisher']
  }
};

/**
 * Returns all active tools in the registry.
 */
export function getAllTools(): ToleeToolDefinition[] {
  return Object.values(TOLEE_TOOLS_REGISTRY);
}

/**
 * Finds a tool definition by its unique identifier.
 */
export function getToolById(toolId: string): ToleeToolDefinition | undefined {
  return TOLEE_TOOLS_REGISTRY[toolId];
}

/**
 * Finds tools matching a specific category.
 */
export function getToolsByCategory(category: ToleeToolDefinition['category']): ToleeToolDefinition[] {
  return Object.values(TOLEE_TOOLS_REGISTRY).filter(tool => tool.category === category);
}
