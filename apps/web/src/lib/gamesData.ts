import {
  MultiplayerRepo,
  READY_MULTIPLAYER_REPOS,
  TOP_30_GITHUB_GAMES,
  ToleeGameItem,
} from './githubGamesData';

export type { MultiplayerRepo };
export { READY_MULTIPLAYER_REPOS };

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

export const TOLEE_GAMES: ToleeGame[] = [
  {
    "id": "claude-chess",
    "title": "Claude Chess",
    "description": "The README describes a complete browser chess game with Stockfish opponents, eight strengths, clocks, legal-move interaction, evaluation bar, post-game analysis, replay navigation, save/load and sound.",
    "genre": "Puzzle & Board",
    "playUrl": "https://mglass222.github.io/claude-chess-web/",
    "rating": 9.2,
    "technology": [
      "Vanilla JavaScript",
      "chess.js",
      "Stockfish 17.1 WebAssembly",
      "Vite"
    ],
    "modelAttribution": "Claude Fable 5",
    "githubUrl": "https://github.com/mglass222/claude-chess-web",
    "coverImage": "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=600&q=80",
    "featured": true,
    "playsCount": 18000,
    "badge": "Trending"
  },
  {
    "id": "brothers",
    "title": "Brothers",
    "description": "The README describes a playable browser puzzle game in which two tethered brothers are flung across arenas to reach goals, with walls, teleporters, zoom, pan and Tiled levels.",
    "genre": "Puzzle & Board",
    "playUrl": "https://brothers.dwheeler.com/",
    "rating": 9.3,
    "technology": [
      "Phaser 3",
      "Matter.js",
      "JavaScript",
      "Web Audio API"
    ],
    "modelAttribution": "Claude Fable 5",
    "githubUrl": "https://github.com/david-a-wheeler/brothers",
    "coverImage": "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=600&q=80",
    "featured": true,
    "playsCount": 91790,
    "badge": "Trending"
  },
  {
    "id": "platform-fighter",
    "title": "Platform Fighter",
    "description": "The README describes a playable Smash Bros-style platform fighter with local four-player matches, AI fighters, four hazard stages, a stage builder and input replay.",
    "genre": "Puzzle & Board",
    "playUrl": "https://lodevel.github.io/platform-fighter/",
    "rating": 9.4,
    "technology": [
      "Phaser 3",
      "Matter.js",
      "TypeScript",
      "Vite"
    ],
    "modelAttribution": "Claude Opus 4.8",
    "githubUrl": "https://github.com/lodevel/platform-fighter",
    "coverImage": "https://images.unsplash.com/photo-1586165368502-1bad197a6461?w=600&q=80",
    "featured": true,
    "playsCount": 29101,
    "badge": "Top Rated"
  },
  {
    "id": "wild-haggis-survivors",
    "title": "Wild Haggis Survivors",
    "description": "The README describes a playable bullet-heaven with a 3,000x3,000 moor, drifting input, seeded deterministic runs, 28 haggis variants, 36 weapons, 20 evolution recipes and 25 biomes.",
    "genre": "3D & Racing",
    "playUrl": "https://ha.ggis.xyz/wild/",
    "rating": 9.5,
    "technology": [
      "Phaser 4",
      "TypeScript",
      "Vite",
      "Browser"
    ],
    "modelAttribution": "Claude Fable 5",
    "githubUrl": "https://github.com/Giftedx/wild-haggis-survivors",
    "coverImage": "https://raw.githubusercontent.com/Giftedx/wild-haggis-survivors/a0c2c3581ea77c1495a41640761ff75f5e953f86/assets/screens/main-menu.png",
    "featured": true,
    "playsCount": 90120,
    "badge": "Top Rated"
  },
  {
    "id": "snek",
    "title": "snek",
    "description": "The README describes a playable browser snake.",
    "genre": "Puzzle & Board",
    "playUrl": "https://mccarrison.me/snek/",
    "rating": 9.2,
    "technology": [
      "Phaser 3",
      "TypeScript",
      "Vite",
      "Cloudflare Workers"
    ],
    "modelAttribution": "Claude Opus 4.7",
    "githubUrl": "https://github.com/scottmccarrison/snek",
    "coverImage": "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=600&q=80",
    "featured": true,
    "playsCount": 39952,
    "badge": "Trending"
  },
  {
    "id": "emblem-rogue",
    "title": "Emblem Rogue",
    "description": "The README identifies a browser tactical RPG with a full roguelike run loop, four acts, grid combat, shops, recruits and multiple difficulty modes.",
    "genre": "Action & Combat",
    "playUrl": "https://emblem-rogue.netlify.app/",
    "rating": 9.3,
    "technology": [
      "Phaser 3",
      "JavaScript",
      "Vite",
      "Netlify"
    ],
    "modelAttribution": "Claude Fable 5",
    "githubUrl": "https://github.com/virtu333/rogue-emblem",
    "coverImage": "https://images.unsplash.com/photo-1563089145-599997674d42?w=600&q=80",
    "featured": true,
    "playsCount": 86817,
    "badge": "Trending"
  },
  {
    "id": "gridwatch-match-web",
    "title": "GridWatch Match Web",
    "description": "The README identifies this repository as a playable cyberpunk match-3 browser game, documents the swap-and-match rules and lists the Phaser board renderer.",
    "genre": "Puzzle & Board",
    "playUrl": "https://GridWatchMatchWeb.warsignallabs.net/",
    "rating": 8.9,
    "technology": [
      "Phaser 4",
      "React 19",
      "TypeScript",
      "Vite"
    ],
    "modelAttribution": "Claude Fable 5",
    "githubUrl": "https://github.com/remeadows/GridWatchMatchWeb",
    "coverImage": "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=600&q=80",
    "featured": false,
    "playsCount": 50306,
    "badge": null
  },
  {
    "id": "mouse2",
    "title": "mouse2",
    "description": "The README is intentionally minimal, but the repository contains a menu with five selectable game entries in src/games.",
    "genre": "Arcade & Casual",
    "playUrl": "https://mouse2-0357d0.web.app/",
    "rating": 9,
    "technology": [
      "Phaser 3",
      "TypeScript",
      "Vite",
      "Firebase Hosting"
    ],
    "modelAttribution": "Claude Fable 5",
    "githubUrl": "https://github.com/hokita/mouse2",
    "coverImage": "https://raw.githubusercontent.com/hokita/mouse2/main/docs/screenshots/menu.png",
    "featured": false,
    "playsCount": 81956,
    "badge": "Trending"
  },
  {
    "id": "beyond-boring-death-march",
    "title": "Beyond Boring: Death March",
    "description": "The README describes an Oregon Trail parody game, lists controls, documents a Phaser 3 frontend, provides six gameplay screenshots and links to a live GitHub Pages build.",
    "genre": "Arcade & Casual",
    "playUrl": "https://kolatts.github.io/beyond-boring-death-march/",
    "rating": 9.4,
    "technology": [
      "Phaser 3",
      "TypeScript",
      "Vite",
      "Browser"
    ],
    "modelAttribution": "Claude Fable 5",
    "githubUrl": "https://github.com/kolatts/beyond-boring-death-march",
    "coverImage": "https://raw.githubusercontent.com/kolatts/beyond-boring-death-march/7f22c1f9aa8afa64b1fe84d9b91ecf6eaec14170/docs/screenshots/title.png",
    "featured": true,
    "playsCount": 59928,
    "badge": "Top Rated"
  },
  {
    "id": "aradama-survivors",
    "title": "Aradama Survivors",
    "description": "The README describes a playable 2D survivor-like game and provides a live GitHub Pages build with keyboard controls.",
    "genre": "Puzzle & Board",
    "playUrl": "https://eidas.github.io/aradama-survivors-proto/",
    "rating": 9.1,
    "technology": [
      "Phaser 3",
      "TypeScript",
      "Vite",
      "Browser"
    ],
    "modelAttribution": "Claude Fable 5",
    "githubUrl": "https://github.com/eidas/aradama-survivors-proto",
    "coverImage": "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=600&q=80",
    "featured": false,
    "playsCount": 75648,
    "badge": "Trending"
  },
  {
    "id": "pykombat",
    "title": "pyKombat",
    "description": "The README identifies pyKombat as a Pygame game with a browser build powered by pygbag/WebAssembly and a local `python main.",
    "genre": "Arcade & Casual",
    "playUrl": "https://vidalmatheus.github.io/pyKombat/",
    "rating": 8.5,
    "technology": [
      "Pygame",
      "Python",
      "pygbag",
      "WebAssembly"
    ],
    "modelAttribution": "Claude Fable 5",
    "githubUrl": "https://github.com/vidalmatheus/pyKombat",
    "coverImage": "https://raw.githubusercontent.com/vidalmatheus/pyKombat/master/res/Background/MainMenu01.png",
    "featured": false,
    "playsCount": 68602,
    "badge": null
  },
  {
    "id": "hollow-lullaby",
    "title": "Hollow Lullaby",
    "description": "The README identifies Hollow Lullaby as a Rust/Bevy game with Lua game logic, desktop, iOS and WebAssembly targets.",
    "genre": "Arcade & Casual",
    "playUrl": "https://maweis.com/rust_bevy_lua_game/",
    "rating": 8.7,
    "technology": [
      "Bevy 0.19",
      "Rust",
      "Lua 5.4",
      "Native desktop"
    ],
    "modelAttribution": "Claude Opus 4.8",
    "githubUrl": "https://github.com/maweis1981/rust_bevy_lua_game",
    "coverImage": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&q=80",
    "featured": false,
    "playsCount": 68035,
    "badge": null
  },
  {
    "id": "aliasing",
    "title": "Aliasing",
    "description": "The README describes a turn-based RPG vertical slice with main menu, overworld, random encounters, battle, persistent damage, victory, defeat and restart.",
    "genre": "Action & Combat",
    "playUrl": "https://aliasing.pages.dev",
    "rating": 8.5,
    "technology": [
      "Bevy 0.19",
      "Rust",
      "Native desktop",
      "WebAssembly"
    ],
    "modelAttribution": "Claude Opus 4.8",
    "githubUrl": "https://github.com/taearls/bevy-2d-rpg-game",
    "coverImage": "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&q=80",
    "featured": false,
    "playsCount": 76129,
    "badge": null
  },
  {
    "id": "fable-flight",
    "title": "Fable Flight",
    "description": "README, single-file source, and live page contain a scored browser flight trainer with voice instructor, circuits, terrain, night flying, and failures; description attributes it to Fable 5.",
    "genre": "3D & Racing",
    "playUrl": "https://arnie016.github.io/flight-simulator-fable5/",
    "rating": 8,
    "technology": [
      "HTML",
      "JavaScript",
      "Three.js"
    ],
    "modelAttribution": "Claude Fable 5",
    "githubUrl": "https://github.com/Arnie016/flight-simulator-fable5",
    "coverImage": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80",
    "featured": false,
    "playsCount": 59289,
    "badge": null
  },
  {
    "id": "tether",
    "title": "Tether",
    "description": "Playable grapple-swing precision platformer with 19 levels, three worlds, bosses, and GitHub Pages; creator Reddit source attributes the game to Fable 5.",
    "genre": "Arcade & Casual",
    "playUrl": "https://barabosik.github.io/tether-demo",
    "rating": 7.5,
    "technology": [
      "HTML",
      "JavaScript",
      "Canvas 2D"
    ],
    "modelAttribution": "Claude Fable 5",
    "githubUrl": "https://github.com/Barabosik/tether-demo",
    "coverImage": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&q=80",
    "featured": false,
    "playsCount": 82342,
    "badge": null
  },
  {
    "id": "driftlands",
    "title": "DRIFTLANDS",
    "description": "DRIFTLANDS - Instant web game crafted with Three.js and AI innovation.",
    "genre": "3D & Racing",
    "playUrl": "https://deadover.github.io/DRIFTLANDS/",
    "rating": 7,
    "technology": [
      "Three.js",
      "JavaScript",
      "Vite"
    ],
    "modelAttribution": "Claude Opus 5",
    "githubUrl": "https://github.com/DEADover/DRIFTLANDS",
    "coverImage": "https://raw.githubusercontent.com/DEADover/DRIFTLANDS/main/docs/banner.jpg",
    "featured": false,
    "playsCount": 49608,
    "badge": null
  },
  {
    "id": "origin-16-bit-arpg",
    "title": "Origin 16-bit ARPG",
    "description": "Playable browser action RPG with classes, combat, skills, items, bosses, quests, and GitHub Pages deployment; README names Fable 5.",
    "genre": "Action & Combat",
    "playUrl": "https://dfarm6.github.io/origin-16bit-arpg/",
    "rating": 7.5,
    "technology": [
      "HTML",
      "JavaScript",
      "Canvas 2D"
    ],
    "modelAttribution": "Claude Fable 5",
    "githubUrl": "https://github.com/DFarm6/origin-16bit-arpg",
    "coverImage": "https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=600&q=80",
    "featured": false,
    "playsCount": 87097,
    "badge": "Featured"
  },
  {
    "id": "turbo-kart-grand-prix",
    "title": "Turbo Kart Grand Prix",
    "description": "The creator's X post explicitly says Claude Fable 5.",
    "genre": "3D & Racing",
    "playUrl": "https://turbo-kart-grand-prix.vercel.app/",
    "rating": 8.5,
    "technology": [
      "Three.js",
      "JavaScript",
      "WebGL",
      "Web Audio API"
    ],
    "modelAttribution": "Claude Fable 5.1",
    "githubUrl": "https://github.com/Franklin-C/turbo-kart-grand-prix",
    "coverImage": "https://raw.githubusercontent.com/Franklin-C/turbo-kart-grand-prix/main/docs/race.jpg",
    "featured": false,
    "playsCount": 39212,
    "badge": null
  },
  {
    "id": "starfall-scavenger",
    "title": "Starfall Scavenger",
    "description": "Playable browser roguelite survivors game with four-act campaign, bosses, upgrades, controls, GitHub Pages play link, and explicit Opus 5 repository attribution.",
    "genre": "Action & Combat",
    "playUrl": "https://hanazar-games.github.io/claude-opus5-aigc-webgame-project/",
    "rating": 7.5,
    "technology": [
      "Canvas 2D",
      "JavaScript",
      "Web Audio API"
    ],
    "modelAttribution": "Claude Opus 5",
    "githubUrl": "https://github.com/Hanazar-Games/claude-opus5-aigc-webgame-project",
    "coverImage": "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&q=80",
    "featured": false,
    "playsCount": 90289,
    "badge": null
  },
  {
    "id": "super-fable-bros-world-1-1",
    "title": "Super Fable Bros. — World 1-1",
    "description": "Playable one-file platform game with level, physics, enemies, power-ups, controls, gameplay recording, and full Fable 5.",
    "genre": "Arcade & Casual",
    "playUrl": "https://inonono66.github.io/fable-5.1-mario/",
    "rating": 8.5,
    "technology": [
      "Canvas 2D",
      "JavaScript",
      "Web Audio API",
      "Browser"
    ],
    "modelAttribution": "Claude Fable 5.1",
    "githubUrl": "https://github.com/INONONO66/fable-5.1-mario",
    "coverImage": "https://raw.githubusercontent.com/INONONO66/fable-5.1-mario/main/docs/title.png",
    "featured": false,
    "playsCount": 28336,
    "badge": null
  },
  {
    "id": "customs-escape-raid",
    "title": "CUSTOMS — Escape Raid",
    "description": "Playable extraction shooter with hideout, raid, AI, ballistics, extraction, persistence, controls, tests, and explicit Fable 5.",
    "genre": "Action & Combat",
    "playUrl": "https://inonono66.github.io/tarkov-customs/",
    "rating": 8,
    "technology": [
      "HTML",
      "JavaScript",
      "Canvas 2D"
    ],
    "modelAttribution": "Claude Fable 5.1",
    "githubUrl": "https://github.com/INONONO66/tarkov-customs",
    "coverImage": "https://raw.githubusercontent.com/INONONO66/tarkov-customs/main/shots/raid.png",
    "featured": false,
    "playsCount": 91844,
    "badge": null
  },
  {
    "id": "mainspring",
    "title": "Mainspring",
    "description": "README, src, tests, and build files contain a playable clockwork engine-building roguelike with gear-loop rules and progression; README attributes it to Claude Fable 5.",
    "genre": "Strategy & RPG",
    "playUrl": "https://kelevera.github.io/mainspring/",
    "rating": 8,
    "technology": [
      "JavaScript",
      "HTML",
      "Canvas"
    ],
    "modelAttribution": "Claude Fable 5",
    "githubUrl": "https://github.com/Kelevera/mainspring",
    "coverImage": "https://images.unsplash.com/photo-1560253023-3ec5d502959f?w=600&q=80",
    "featured": false,
    "playsCount": 18773,
    "badge": null
  },
  {
    "id": "embervale",
    "title": "Embervale",
    "description": "Complete Zelda-like browser action adventure with controls, story, screenshots, and playable GitHub Pages build; README attributes it to Fable 5.",
    "genre": "Action & Combat",
    "playUrl": "https://nicholasaryelferreira.github.io/embervale/",
    "rating": 7.5,
    "technology": [
      "HTML5 Canvas",
      "JavaScript"
    ],
    "modelAttribution": "Claude Fable 5",
    "githubUrl": "https://github.com/NicholasAryelFerreira/embervale",
    "coverImage": "https://raw.githubusercontent.com/NicholasAryelFerreira/embervale/HEAD/screenshots/05-shop.png",
    "featured": false,
    "playsCount": 91728,
    "badge": null
  },
  {
    "id": "blocks",
    "title": "BLOCKS",
    "description": "Playable third-person open-world browser game with vehicles, shooting, police chase, missions, controls, tests, and explicit Fable 5.",
    "genre": "3D & Racing",
    "playUrl": "https://nipale-ai.github.io/blocks-openworld/spiel/",
    "rating": 8,
    "technology": [
      "Three.js",
      "JavaScript",
      "WebGL",
      "Blender"
    ],
    "modelAttribution": "Claude Fable 5.1",
    "githubUrl": "https://github.com/Nipale-ai/blocks-openworld",
    "coverImage": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80",
    "featured": false,
    "playsCount": 29865,
    "badge": null
  },
  {
    "id": "neon-warden",
    "title": "NEON WARDEN",
    "description": "The README documents a self-contained 3D browser game with a floating arena, mech movement, mouse aiming, cannon fire, phase dash, ten hostile waves, cores, upgrades, generated assets, audio and video.",
    "genre": "3D & Racing",
    "playUrl": "https://nipale-ai.github.io/fable-5-1-one-prompt-game/fable/",
    "rating": 9,
    "technology": [
      "Three.js",
      "GLTFLoader",
      "WebGL",
      "HTML"
    ],
    "modelAttribution": "Claude Fable 5.1",
    "githubUrl": "https://github.com/Nipale-ai/fable-5-1-one-prompt-game",
    "coverImage": "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&q=80",
    "featured": false,
    "playsCount": 89942,
    "badge": "Trending"
  },
  {
    "id": "operation-ironhold",
    "title": "Operation Ironhold",
    "description": "The SomethingBig games directory reports this as a Gauntlet Loop game.",
    "genre": "3D & Racing",
    "playUrl": "https://starknightt.github.io/operation-ironhold/",
    "rating": 7.5,
    "technology": [
      "Three.js",
      "HTML",
      "JavaScript"
    ],
    "modelAttribution": "Claude Opus 5",
    "githubUrl": "https://github.com/StarKnightt/operation-ironhold",
    "coverImage": "https://raw.githubusercontent.com/StarKnightt/operation-ironhold/main/screenshots/gameplay.jpg",
    "featured": false,
    "playsCount": 40689,
    "badge": null
  },
  {
    "id": "deephaul",
    "title": "Deephaul",
    "description": "Playable cooperative first-person scavenging game with seven moons, creatures, quota loop, browser deployment, tests, and Opus 5 in the repository identity.",
    "genre": "3D & Racing",
    "playUrl": "https://testyee-09.github.io/Deephaul-opus5-/",
    "rating": 7,
    "technology": [
      "Three.js",
      "TypeScript",
      "Node.js",
      "WebRTC"
    ],
    "modelAttribution": "Claude Opus 5",
    "githubUrl": "https://github.com/TESTYEE-09/Deephaul-opus5-",
    "coverImage": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80",
    "featured": false,
    "playsCount": 86529,
    "badge": null
  },
  {
    "id": "tabularis-run",
    "title": "Tabularis Run",
    "description": "Playable browser platformer with controls and a Super Mario-style loop; README documents a Fable 5 build and source/blog evidence.",
    "genre": "Arcade & Casual",
    "playUrl": "https://game.tabularis.dev",
    "rating": 7.5,
    "technology": [
      "Canvas 2D",
      "Web Audio API",
      "JavaScript"
    ],
    "modelAttribution": "Claude Fable 5",
    "githubUrl": "https://github.com/TabularisDB/game",
    "coverImage": "https://raw.githubusercontent.com/TabularisDB/game/main/docs/demo.gif",
    "featured": false,
    "playsCount": 51000,
    "badge": null
  },
  {
    "id": "kindle",
    "title": "KINDLE",
    "description": "The SomethingBig games directory reports this as a Gauntlet Loop game.",
    "genre": "3D & Racing",
    "playUrl": "https://tonydowney.github.io/kindle/",
    "rating": 7.5,
    "technology": [
      "WebGL2",
      "HTML",
      "JavaScript"
    ],
    "modelAttribution": "Claude Opus 5",
    "githubUrl": "https://github.com/TonyDowney/kindle",
    "coverImage": "https://raw.githubusercontent.com/TonyDowney/kindle/HEAD/docs/shots/05-beacon-lit.jpg",
    "featured": false,
    "playsCount": 81564,
    "badge": null
  },
  {
    "id": "clawd-pop-3d",
    "title": "Clawd Pop 3D",
    "description": "The SomethingBig games directory reports this as a Gauntlet Loop game.",
    "genre": "3D & Racing",
    "playUrl": "https://vibezzzcoder.github.io/clawd-pop/",
    "rating": 7.5,
    "technology": [
      "Three.js",
      "JavaScript",
      "Web Audio API"
    ],
    "modelAttribution": "Claude Opus 5",
    "githubUrl": "https://github.com/VibezZzCoder/clawd-pop",
    "coverImage": "https://raw.githubusercontent.com/VibezZzCoder/clawd-pop/main/media/clawd-pop-3d-gameplay.png",
    "featured": false,
    "playsCount": 60563,
    "badge": null
  },
  {
    "id": "dev-quest",
    "title": "DEV QUEST",
    "description": "Playable Phaser action game with four waves, bosses, skills, controls, screenshots, and explicit Claude Fable 5.",
    "genre": "Action & Combat",
    "playUrl": "https://dev-quest-nu.vercel.app/",
    "rating": 7.5,
    "technology": [
      "Phaser",
      "JavaScript",
      "Canvas 2D"
    ],
    "modelAttribution": "Claude Fable 5.1",
    "githubUrl": "https://github.com/agutierrezclab/dev-quest",
    "coverImage": "https://raw.githubusercontent.com/agutierrezclab/dev-quest/HEAD/docs/screens/wave4_deploy.png",
    "featured": false,
    "playsCount": 75160,
    "badge": null
  },
  {
    "id": "fable-katamari",
    "title": "Fable Katamari",
    "description": "README, source, docs, and live app describe a playable browser Katamari-style game with object absorption and world-scale progression; README identifies Fable 5 as the builder.",
    "genre": "3D & Racing",
    "playUrl": "https://fable-katamari.pages.dev",
    "rating": 8,
    "technology": [
      "JavaScript",
      "Vite",
      "Three.js"
    ],
    "modelAttribution": "Claude Fable 5",
    "githubUrl": "https://github.com/aieo-product/fableDemoGame",
    "coverImage": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80",
    "featured": false,
    "playsCount": 69163,
    "badge": null
  },
  {
    "id": "age-of-ops",
    "title": "Age of Ops",
    "description": "README names two dated games, Age of Ops and Gran Mayhem; both have separate browser source folders and a live games page, and the repository attributes them to one Claude Fable prompt.",
    "genre": "Arcade & Casual",
    "playUrl": "https://antebm.github.io/fabled-games/",
    "rating": 7,
    "technology": [
      "HTML",
      "JavaScript"
    ],
    "modelAttribution": "Claude Fable 5",
    "githubUrl": "https://github.com/antebm/fabled-games",
    "coverImage": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&q=80",
    "featured": false,
    "playsCount": 67462,
    "badge": "Featured"
  },
  {
    "id": "gauntlet-loop-unity-cli-2-5d-rpg",
    "title": "Gauntlet Loop × Unity CLI — 2.5D RPG",
    "description": "Gauntlet Loop × Unity CLI — 2.5D RPG - Instant web game crafted with Unity and AI innovation.",
    "genre": "Strategy & RPG",
    "playUrl": "https://claude.ai/code/artifact/f009240e-e3f7-4a28-99f4-6d23643b19a5",
    "rating": 7,
    "technology": [
      "Unity",
      "C#"
    ],
    "modelAttribution": "Claude Opus 5",
    "githubUrl": "https://github.com/az9713/gauntlet-loop-unity-cli-demo",
    "coverImage": "https://images.unsplash.com/photo-1560253023-3ec5d502959f?w=600&q=80",
    "featured": false,
    "playsCount": 76605,
    "badge": null
  },
  {
    "id": "tribal-gods",
    "title": "Tribal Gods",
    "description": "Tribal Gods - Instant web game crafted with TypeScript and AI innovation.",
    "genre": "3D & Racing",
    "playUrl": "https://br3nt.github.io/tribal-gods/",
    "rating": 8,
    "technology": [
      "TypeScript",
      "Three.js"
    ],
    "modelAttribution": "Claude Fable 5",
    "githubUrl": "https://github.com/br3nt/tribal-gods",
    "coverImage": "https://raw.githubusercontent.com/br3nt/tribal-gods/main/docs/hero.png",
    "featured": false,
    "playsCount": 58645,
    "badge": null
  },
  {
    "id": "apex-formula",
    "title": "Apex Formula",
    "description": "Full browser Formula 1 game with circuits, AI, physics, race weekend, tests, and explicit Fable 5.",
    "genre": "3D & Racing",
    "playUrl": "https://bridge-mind.github.io/apex-formula/",
    "rating": 8,
    "technology": [
      "Three.js",
      "TypeScript",
      "WebGL"
    ],
    "modelAttribution": "Claude Fable 5.1",
    "githubUrl": "https://github.com/bridge-mind/apex-formula",
    "coverImage": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80",
    "featured": false,
    "playsCount": 82720,
    "badge": null
  },
  {
    "id": "turbo-kart-rush",
    "title": "Turbo Kart Rush",
    "description": "The README documents a complete Three.",
    "genre": "3D & Racing",
    "playUrl": "https://bridge-mind.github.io/turbo-kart-rush/",
    "rating": 9,
    "technology": [
      "Three.js",
      "TypeScript",
      "Vite",
      "WebGL2"
    ],
    "modelAttribution": "Claude Fable 5.1",
    "githubUrl": "https://github.com/bridge-mind/turbo-kart-rush",
    "coverImage": "https://raw.githubusercontent.com/bridge-mind/turbo-kart-rush/main/docs/screenshots/title.jpg",
    "featured": false,
    "playsCount": 48908,
    "badge": "Trending"
  },
  {
    "id": "claude-of-duty",
    "title": "Claude of Duty",
    "description": "The SomethingBig games directory reports this as a Gauntlet Loop game.",
    "genre": "3D & Racing",
    "playUrl": "https://brynary.github.io/claude-of-duty/?bot=push&skill=average&seed=1337&run=90&quality=high&autostart=1&perf=1",
    "rating": 7.5,
    "technology": [
      "Three.js",
      "TypeScript",
      "Web Audio API"
    ],
    "modelAttribution": "Claude Opus 5",
    "githubUrl": "https://github.com/brynary/claude-of-duty",
    "coverImage": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80",
    "featured": false,
    "playsCount": 87370,
    "badge": null
  },
  {
    "id": "deck-shenanigans",
    "title": "Deck Shenanigans",
    "description": "Repository description and TypeScript source contain a playable card-guessing game written by Claude Code with Claude Opus 5.",
    "genre": "Puzzle & Board",
    "playUrl": "https://deck-shenanigans.vercel.app",
    "rating": 7,
    "technology": [
      "TypeScript",
      "Browser"
    ],
    "modelAttribution": "Claude Opus 5",
    "githubUrl": "https://github.com/burakTanBilgi/deck-shenanigans",
    "coverImage": "https://raw.githubusercontent.com/burakTanBilgi/deck-shenanigans/HEAD/docs/screenshots/deck-riso-noir.webp",
    "featured": false,
    "playsCount": 38471,
    "badge": null
  },
  {
    "id": "sakura-petals-of-the-everblossom",
    "title": "Sakura — Petals of the Everblossom",
    "description": "The SomethingBig games directory reports this game.",
    "genre": "3D & Racing",
    "playUrl": "https://sakura-idle.vercel.app",
    "rating": 8,
    "technology": [
      "Three.js",
      "JavaScript",
      "Web Audio API"
    ],
    "modelAttribution": "Claude Opus 5",
    "githubUrl": "https://github.com/danmana/sakura-idle",
    "coverImage": "https://raw.githubusercontent.com/danmana/sakura-idle/main/docs/hero.png",
    "featured": false,
    "playsCount": 90450,
    "badge": null
  },
  {
    "id": "thornmere-the-founding-song",
    "title": "THORNMERE: The Founding Song",
    "description": "README, src, data, tests, and live HTML implement a playable first-person dungeon crawler with maze rendering, enemies, items, and audio; README attributes it to Claude Fable 5.",
    "genre": "Arcade & Casual",
    "playUrl": "https://dgahagan.github.io/THORNMERE/",
    "rating": 8.5,
    "technology": [
      "JavaScript",
      "Canvas",
      "Web Audio API"
    ],
    "modelAttribution": "Claude Fable 5",
    "githubUrl": "https://github.com/dgahagan/THORNMERE",
    "coverImage": "https://raw.githubusercontent.com/dgahagan/THORNMERE/HEAD/docs/screenshots/adventurers-hall.png",
    "featured": false,
    "playsCount": 27570,
    "badge": "Featured"
  },
  {
    "id": "neon-precinct",
    "title": "Neon Precinct",
    "description": "Playable first-person cyberpunk exploration game; README links the build to a blind-critic Gauntlet Loop and records the score.",
    "genre": "3D & Racing",
    "playUrl": "https://dylanhsieh.github.io/neon-precinct/",
    "rating": 7,
    "technology": [
      "Three.js",
      "JavaScript",
      "WebGL"
    ],
    "modelAttribution": "Claude Opus 5",
    "githubUrl": "https://github.com/dylanhsieh/neon-precinct",
    "coverImage": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80",
    "featured": false,
    "playsCount": 91890,
    "badge": null
  },
  {
    "id": "whirlwind-ascension",
    "title": "Whirlwind Ascension",
    "description": "The SomethingBig games directory reports this as a Gauntlet Loop game.",
    "genre": "3D & Racing",
    "playUrl": "https://dylanhsieh.github.io/whirlwind-ascension/",
    "rating": 7.5,
    "technology": [
      "Three.js",
      "HTML",
      "JavaScript"
    ],
    "modelAttribution": "Claude Opus 5",
    "githubUrl": "https://github.com/dylanhsieh/whirlwind-ascension",
    "coverImage": "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&q=80",
    "featured": false,
    "playsCount": 19546,
    "badge": null
  },
  {
    "id": "starfall",
    "title": "Starfall",
    "description": "Playable Homeworld-style browser RTS; repo prompt adapts Matt Shumer's one-shot prompt with fan-out agents and critic loops.",
    "genre": "3D & Racing",
    "playUrl": "https://e01.ai/starfall/",
    "rating": 7,
    "technology": [
      "Three.js",
      "TypeScript",
      "Vite"
    ],
    "modelAttribution": "Claude Opus 5",
    "githubUrl": "https://github.com/e01-ai/starfall",
    "coverImage": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80",
    "featured": false,
    "playsCount": 91657,
    "badge": null
  },
  {
    "id": "sonar-maze",
    "title": "Sonar Maze",
    "description": "README and HTML source contain a playable maze game where the player uses sonar to navigate and avoid enemies; README says Claude Opus 5 created it from one prompt.",
    "genre": "Arcade & Casual",
    "playUrl": "https://endurovojta173.github.io/Sonar_Maze_Profiq_Contest/",
    "rating": 7.5,
    "technology": [
      "HTML",
      "JavaScript"
    ],
    "modelAttribution": "Claude Opus 5",
    "githubUrl": "https://github.com/endurovojta173/Sonar_Maze_Profiq_Contest",
    "coverImage": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&q=80",
    "featured": false,
    "playsCount": 30628,
    "badge": null
  },
  {
    "id": "operation-blackout",
    "title": "Operation Blackout",
    "description": "Playable browser FPS with controls, weapons, AI, procedural PBR pipeline, tests, and Opus 5 repository identity.",
    "genre": "3D & Racing",
    "playUrl": "https://call-of-duty-opus5.vercel.app",
    "rating": 7,
    "technology": [
      "Three.js",
      "WebGL",
      "JavaScript",
      "Web Audio API"
    ],
    "modelAttribution": "Claude Opus 5",
    "githubUrl": "https://github.com/erekjiang/call-of-duty-opus5",
    "coverImage": "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&q=80",
    "featured": false,
    "playsCount": 89757,
    "badge": null
  },
  {
    "id": "ink-rogue",
    "title": "Ink Rogue",
    "description": "Playable 2D class roguelike with four classes, rooms, enemies, upgrades, skills, controls, mobile UI, and Fable 5.",
    "genre": "Strategy & RPG",
    "playUrl": "https://evan-thedev.github.io/ink-rogue/",
    "rating": 7.5,
    "technology": [
      "Canvas 2D",
      "HTML",
      "JavaScript"
    ],
    "modelAttribution": "Claude Fable 5.1",
    "githubUrl": "https://github.com/evan-thedev/ink-rogue",
    "coverImage": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80",
    "featured": false,
    "playsCount": 41424,
    "badge": null
  },
  {
    "id": "bubble-wrap-simulator",
    "title": "Bubble Wrap Simulator",
    "description": "Playable first-person Three.",
    "genre": "3D & Racing",
    "playUrl": "https://bubble-wrap-simulator.vercel.app",
    "rating": 7.5,
    "technology": [
      "Three.js",
      "React",
      "Rapier",
      "Web Audio API"
    ],
    "modelAttribution": "GPT-6 Astra",
    "githubUrl": "https://github.com/finktheartist/bubble-wrap-simulator",
    "coverImage": "https://raw.githubusercontent.com/finktheartist/bubble-wrap-simulator/main/docs/gameplay-poster.jpg",
    "featured": false,
    "playsCount": 86233,
    "badge": null
  },
  {
    "id": "forest-pests",
    "title": "Forest Pests",
    "description": "Repository description and TypeScript source contain a Space Invaders-inspired game written by Claude Opus 4.",
    "genre": "Arcade & Casual",
    "playUrl": "https://fjzeit.github.io/arcade/forest-pests/",
    "rating": 7,
    "technology": [
      "TypeScript",
      "Browser"
    ],
    "modelAttribution": "Claude Opus 4.5",
    "githubUrl": "https://github.com/fjzeit/forest-pests",
    "coverImage": "https://images.unsplash.com/photo-1551103782-8ab07afd45c1?w=600&q=80",
    "featured": false,
    "playsCount": 51690,
    "badge": "Featured"
  },
  {
    "id": "iridium-reach",
    "title": "Iridium Reach",
    "description": "Repository README explicitly says the cockpit space-shooter was built by an AI-agent Gauntlet Loop and provides a playable demo.",
    "genre": "3D & Racing",
    "playUrl": "https://jason-c-dev.github.io/iridium-reach-demo/",
    "rating": 7,
    "technology": [
      "Three.js",
      "JavaScript",
      "Web Audio API"
    ],
    "modelAttribution": "Claude Opus 5",
    "githubUrl": "https://github.com/jason-c-dev/iridium-reach-demo",
    "coverImage": "https://raw.githubusercontent.com/jason-c-dev/iridium-reach-demo/main/screenshots/red-alert.png",
    "featured": false,
    "playsCount": 81164,
    "badge": null
  },
  {
    "id": "no-ai-s-sky",
    "title": "No AI's Sky",
    "description": "README and creator Reddit post describe a playable browser experiment with procedural universes, flight, atmospheric landing, on-foot exploration, scanning, optional combat, and a live demo.",
    "genre": "3D & Racing",
    "playUrl": "https://noaissky.vercel.app",
    "rating": 8,
    "technology": [
      "Three.js",
      "Vite",
      "JavaScript",
      "WebGL"
    ],
    "modelAttribution": "GPT-6 Astra",
    "githubUrl": "https://github.com/jesuscurreripa/noaissky",
    "coverImage": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80",
    "featured": false,
    "playsCount": 61193,
    "badge": null
  },
  {
    "id": "claude-zombies",
    "title": "Claude\\Zombies",
    "description": "The SomethingBig games directory reports this game.",
    "genre": "3D & Racing",
    "playUrl": "https://claude-zombies.pages.dev/",
    "rating": 7.5,
    "technology": [
      "Three.js",
      "TypeScript",
      "WebGL2",
      "Web Audio API"
    ],
    "modelAttribution": "Claude Opus 5",
    "githubUrl": "https://github.com/justinw916-sketch/claude-zombies",
    "coverImage": "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&q=80",
    "featured": false,
    "playsCount": 74666,
    "badge": null
  },
  {
    "id": "emberwood",
    "title": "Emberwood",
    "description": "Repository description and single-file Canvas source contain a playable Zelda-like top-down adventure with no external assets; description attributes it to Fable 5.",
    "genre": "Arcade & Casual",
    "playUrl": "https://karamvirr.github.io/fable5-canvas-game/",
    "rating": 7.5,
    "technology": [
      "HTML",
      "Canvas",
      "JavaScript"
    ],
    "modelAttribution": "Claude Fable 5",
    "githubUrl": "https://github.com/karamvirr/fable5-canvas-game",
    "coverImage": "https://github.com/user-attachments/assets/06a3e8c9-91fc-4db3-96b3-7ce5e02aa878",
    "featured": false,
    "playsCount": 69719,
    "badge": null
  },
  {
    "id": "beyond-boring-the-game",
    "title": "Beyond Boring: The Game",
    "description": "Playable browser voxel platformer with eight levels, controls, Three.",
    "genre": "3D & Racing",
    "playUrl": "https://kolatts.github.io/beyond-boring-the-game/",
    "rating": 7.5,
    "technology": [
      "Three.js",
      "TypeScript",
      "Vite"
    ],
    "modelAttribution": "Claude Fable 5",
    "githubUrl": "https://github.com/kolatts/beyond-boring-the-game",
    "coverImage": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80",
    "featured": false,
    "playsCount": 66884,
    "badge": null
  },
  {
    "id": "world-of-claudecraft",
    "title": "World of ClaudeCraft",
    "description": "Complete browser MMO with quests, classes, dungeons, raids, Three.",
    "genre": "3D & Racing",
    "playUrl": "https://worldofclaudecraft.com/",
    "rating": 7,
    "technology": [
      "Three.js",
      "JavaScript",
      "WebGL"
    ],
    "modelAttribution": "Claude Fable 5",
    "githubUrl": "https://github.com/levy-street/world-of-claudecraft",
    "coverImage": "https://raw.githubusercontent.com/levy-street/world-of-claudecraft/HEAD/docs/screenshots/amberfall-road.jpg",
    "featured": false,
    "playsCount": 77074,
    "badge": null
  },
  {
    "id": "bomberman-clone",
    "title": "Bomberman Clone",
    "description": "Playable browser Bomberman game with campaign and versus modes, touch controls, PWA support, and Fable 5.",
    "genre": "Arcade & Casual",
    "playUrl": "https://lifeofnicolas.github.io/bomberman-clone/",
    "rating": 7.5,
    "technology": [
      "HTML5 Canvas",
      "JavaScript",
      "Web Audio API"
    ],
    "modelAttribution": "Claude Fable 5.1",
    "githubUrl": "https://github.com/lifeofnicolas/bomberman-clone",
    "coverImage": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&q=80",
    "featured": false,
    "playsCount": 57997,
    "badge": null
  },
  {
    "id": "codex-of-duty",
    "title": "Codex of Duty",
    "description": "The SomethingBig games directory reports this as a Gauntlet Loop game.",
    "genre": "3D & Racing",
    "playUrl": "https://luongnv89.github.io/codex-of-duty/",
    "rating": 7.5,
    "technology": [
      "Three.js",
      "Rapier",
      "JavaScript",
      "WebGL2"
    ],
    "modelAttribution": "Claude Opus 5",
    "githubUrl": "https://github.com/luongnv89/codex-of-duty",
    "coverImage": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80",
    "featured": false,
    "playsCount": 83091,
    "badge": "Featured"
  },
  {
    "id": "cube-basher",
    "title": "Cube Basher",
    "description": "README and index.",
    "genre": "3D & Racing",
    "playUrl": "https://mreflow.github.io/cube-basher/",
    "rating": 8,
    "technology": [
      "HTML",
      "JavaScript",
      "Three.js"
    ],
    "modelAttribution": "Claude Fable 5",
    "githubUrl": "https://github.com/mreflow/cube-basher",
    "coverImage": "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&q=80",
    "featured": false,
    "playsCount": 48203,
    "badge": null
  },
  {
    "id": "joyride",
    "title": "Joyride",
    "description": "Playable open-world driving sandbox with vehicle theft, traffic, crash loop, physics, controls, capture harness, and explicit Fable 5.",
    "genre": "3D & Racing",
    "playUrl": "https://nitzan.games/OneShotGTA.html",
    "rating": 8,
    "technology": [
      "Three.js",
      "JavaScript",
      "Web Audio API"
    ],
    "modelAttribution": "Claude Fable 5.1",
    "githubUrl": "https://github.com/nitzangames/joyride",
    "coverImage": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80",
    "featured": false,
    "playsCount": 87636,
    "badge": null
  },
  {
    "id": "astrohop",
    "title": "AstroHop",
    "description": "Repository description identifies a playable Phaser platformer and a Claude Fable 5 capability experiment; source and Vite files were present at verification.",
    "genre": "Arcade & Casual",
    "playUrl": "https://nunoamorim99.github.io/AstroHop/",
    "rating": 7,
    "technology": [
      "JavaScript",
      "Phaser 3",
      "Vite"
    ],
    "modelAttribution": "Claude Fable 5",
    "githubUrl": "https://github.com/nunoamorim99/AstroHop",
    "coverImage": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&q=80",
    "featured": false,
    "playsCount": 37726,
    "badge": null
  },
  {
    "id": "reablo-2",
    "title": "Reablo 2",
    "description": "Playable browser action RPG with accounts, characters, items, combat, co-op, tests, and explicit one-shot Claude Fable 5.",
    "genre": "Action & Combat",
    "playUrl": "https://diablo-2-web.fly.dev/",
    "rating": 8,
    "technology": [
      "TypeScript",
      "Canvas 2D",
      "Bun",
      "WebSocket"
    ],
    "modelAttribution": "Claude Fable 5.1",
    "githubUrl": "https://github.com/oeo/reablo-2",
    "coverImage": "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&q=80",
    "featured": false,
    "playsCount": 90604,
    "badge": null
  },
  {
    "id": "renderwolf-chart-toppers",
    "title": "Renderwolf Chart Toppers",
    "description": "README documents fifteen touch-first playable web prototypes and states that Claude Fable 5 generated the game code.",
    "genre": "Arcade & Casual",
    "playUrl": "https://pawanp3.github.io/renderwolf-fable5-chart-toppers/",
    "rating": 8.5,
    "technology": [
      "HTML",
      "JavaScript",
      "Canvas 2D"
    ],
    "modelAttribution": "Claude Fable 5",
    "githubUrl": "https://github.com/pawanp3/renderwolf-fable5-chart-toppers",
    "coverImage": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&q=80",
    "featured": false,
    "playsCount": 26803,
    "badge": null
  },
  {
    "id": "gogh-strike",
    "title": "Gogh Strike",
    "description": "Playable six-versus-six browser shooter with bots, weapons, controls, screenshots, and live demo; Astra attribution is recorded in the catalog trail.",
    "genre": "3D & Racing",
    "playUrl": "https://gogh-strike.petergostev.chatgpt.site/",
    "rating": 7.5,
    "technology": [
      "Three.js",
      "WebGL",
      "JavaScript"
    ],
    "modelAttribution": "GPT-6 Astra",
    "githubUrl": "https://github.com/petergpt/gogh-strike",
    "coverImage": "https://raw.githubusercontent.com/petergpt/gogh-strike/main/docs/screenshots/gameplay.png",
    "featured": false,
    "playsCount": 91928,
    "badge": null
  },
  {
    "id": "sunset-hollow",
    "title": "Sunset Hollow",
    "description": "README and TypeScript source contain a playable browser zombie-wave survival game with objectives, waves, and controls; repository description names Claude Opus 5.",
    "genre": "3D & Racing",
    "playUrl": "https://sunset-down.vercel.app/",
    "rating": 7.5,
    "technology": [
      "TypeScript",
      "Three.js",
      "Vite"
    ],
    "modelAttribution": "Claude Opus 5",
    "githubUrl": "https://github.com/sajalrajhans1/Sunset-Down",
    "coverImage": "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&q=80",
    "featured": false,
    "playsCount": 20319,
    "badge": null
  },
  {
    "id": "claude-fable-5-3d-games",
    "title": "Claude Fable 5 3D Games",
    "description": "Repository README identifies seven browser-playable games, Three.",
    "genre": "3D & Racing",
    "playUrl": "https://shironagasu-ai.github.io/claude-fable5-3D-games/games/airlock-escape/",
    "rating": 8.5,
    "technology": [
      "Three.js",
      "cannon-es",
      "JavaScript"
    ],
    "modelAttribution": "Claude Fable 5",
    "githubUrl": "https://github.com/shironagasu-ai/claude-fable5-3D-games",
    "coverImage": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80",
    "featured": false,
    "playsCount": 91579,
    "badge": "Featured"
  },
  {
    "id": "fable-arcade",
    "title": "Fable Arcade",
    "description": "The repository README lists eight separate single-file HTML games, each with its own folder, source index.",
    "genre": "Arcade & Casual",
    "playUrl": "https://sorrycc.github.io/fable-arcade/games/flappy-bird/",
    "rating": 8,
    "technology": [
      "HTML",
      "JavaScript",
      "Browser"
    ],
    "modelAttribution": "Claude Fable 5.1",
    "githubUrl": "https://github.com/sorrycc/fable-arcade",
    "coverImage": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&q=80",
    "featured": false,
    "playsCount": 31389,
    "badge": null
  },
  {
    "id": "nerd-of-duty",
    "title": "Nerd of Duty",
    "description": "The SomethingBig games directory reports this game.",
    "genre": "3D & Racing",
    "playUrl": "https://nerd-of-duty.vercel.app",
    "rating": 7.5,
    "technology": [
      "Three.js",
      "JavaScript",
      "WebGL2"
    ],
    "modelAttribution": "Claude Opus 5",
    "githubUrl": "https://github.com/sytaylor/nerd-of-duty",
    "coverImage": "https://raw.githubusercontent.com/sytaylor/nerd-of-duty/nerdcon/docs/hero.png",
    "featured": false,
    "playsCount": 89565,
    "badge": null
  },
  {
    "id": "operation-blackout-67",
    "title": "Operation Blackout",
    "description": "The SomethingBig games directory reports this as a Gauntlet Loop game.",
    "genre": "3D & Racing",
    "playUrl": "https://taozhuo.github.io/operation-blackout/",
    "rating": 7.5,
    "technology": [
      "Three.js",
      "WebGL2",
      "JavaScript"
    ],
    "modelAttribution": "Claude Opus 5",
    "githubUrl": "https://github.com/taozhuo/operation-blackout",
    "coverImage": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80",
    "featured": false,
    "playsCount": 42156,
    "badge": null
  },
  {
    "id": "mirror-breakout",
    "title": "Mirror Breakout",
    "description": "README and single-file source contain a playable Canvas Breakout variant generated one-shot by Claude Opus 4.",
    "genre": "Arcade & Casual",
    "playUrl": "https://claude.ai/public/artifacts/0648b320-04c3-47f0-876a-7fa3b5c2bf03",
    "rating": 7,
    "technology": [
      "HTML",
      "Canvas",
      "JavaScript"
    ],
    "modelAttribution": "Claude Opus 4.7",
    "githubUrl": "https://github.com/tbensonwest/claude-4-7-breakout-oneshot-demo",
    "coverImage": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&q=80",
    "featured": false,
    "playsCount": 85930,
    "badge": null
  },
  {
    "id": "a-thousand-skies",
    "title": "A Thousand Skies",
    "description": "Playable endless 3D carpet-flying arcade game with combat, bosses, races, controls, tests, and repository description naming GPT-6 Astra.",
    "genre": "3D & Racing",
    "playUrl": "https://threapchills.github.io/MagicCarpetWizard/",
    "rating": 7.5,
    "technology": [
      "Three.js",
      "Vite",
      "WebGL",
      "Web Audio API"
    ],
    "modelAttribution": "GPT-6 Astra",
    "githubUrl": "https://github.com/threapchills/MagicCarpetWizard",
    "coverImage": "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&q=80",
    "featured": false,
    "playsCount": 52377,
    "badge": null
  },
  {
    "id": "celadon-the-long-ash",
    "title": "Celadon: The Long Ash",
    "description": "README, source, and browser entry point contain a playable 3D pottery game with clay, glaze, kiln, and computed textures; repository description attributes it to Claude Opus 5.",
    "genre": "3D & Racing",
    "playUrl": "https://winchxyz.github.io/celadon/",
    "rating": 8,
    "technology": [
      "JavaScript",
      "WebGL",
      "Canvas"
    ],
    "modelAttribution": "Claude Opus 5",
    "githubUrl": "https://github.com/winchxyz/celadon",
    "coverImage": "https://raw.githubusercontent.com/winchxyz/celadon/master/docs/hero.jpg",
    "featured": false,
    "playsCount": 80758,
    "badge": null
  },
  {
    "id": "korovany",
    "title": "Korovany",
    "description": "README and browser source contain a playable 3D action game with an elf, village, raids, skeleton ambushes, and a mountain-fort villain; README identifies it as a Fable 5 experiment.",
    "genre": "3D & Racing",
    "playUrl": "https://yunit00.github.io/game-corovans/",
    "rating": 7.5,
    "technology": [
      "HTML",
      "JavaScript",
      "Three.js"
    ],
    "modelAttribution": "Claude Fable 5",
    "githubUrl": "https://github.com/yunit00/game-corovans",
    "coverImage": "https://raw.githubusercontent.com/yunit00/game-corovans/HEAD/docs/screenshots/05-world-map.jpg",
    "featured": false,
    "playsCount": 61819,
    "badge": null
  },
  {
    "id": "hellgrid",
    "title": "HELLGRID",
    "description": "README and single-file source contain a playable Doom-style first-person shooter with procedural textures, sprites, audio, levels, and Three.",
    "genre": "3D & Racing",
    "playUrl": "https://hellgrid.pages.dev/",
    "rating": 8,
    "technology": [
      "HTML",
      "JavaScript",
      "Three.js"
    ],
    "modelAttribution": "Claude Fable 5",
    "githubUrl": "https://github.com/markcastle/hellgrid",
    "coverImage": "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&q=80",
    "featured": false,
    "playsCount": 74165,
    "badge": "Featured"
  },
  {
    "id": "abstracts",
    "title": "Abstracts",
    "description": "README and browser source contain a playable summoning card game where concepts take form; repository description says it was created with Claude Fable 5.",
    "genre": "Puzzle & Board",
    "playUrl": "https://alex-caian.github.io/abstracts/",
    "rating": 7,
    "technology": [
      "JavaScript",
      "Browser"
    ],
    "modelAttribution": "Claude Fable 5",
    "githubUrl": "https://github.com/Alex-Caian/abstracts",
    "coverImage": "https://raw.githubusercontent.com/Alex-Caian/abstracts/main/screenshots/abstracts1.png",
    "featured": false,
    "playsCount": 70269,
    "badge": null
  },
  {
    "id": "snaketris",
    "title": "Snaketris",
    "description": "README and browser source contain a hybrid Snake/Tetris game designed by Claude Fable 5.",
    "genre": "Puzzle & Board",
    "playUrl": "https://markstent.github.io/snaketris/",
    "rating": 7,
    "technology": [
      "JavaScript",
      "Browser"
    ],
    "modelAttribution": "Claude Fable 5",
    "githubUrl": "https://github.com/markstent/snaketris",
    "coverImage": "https://raw.githubusercontent.com/markstent/snaketris/main/screenshot.png",
    "featured": false,
    "playsCount": 66301,
    "badge": null
  },
  {
    "id": "the-free-game",
    "title": "The Free Game",
    "description": "README documents a playable medieval village-building game with roads, autonomous workers, production chains, browser export, controls, source, tests, and local run instructions.",
    "genre": "3D & Racing",
    "playUrl": "https://vale-dos-vinhedos.lucas579686.chatgpt.site/",
    "rating": 8.5,
    "technology": [
      "Godot 4.7.2",
      "GDScript",
      "Web export",
      "3D simulation"
    ],
    "modelAttribution": "GPT-6 Astra",
    "githubUrl": "https://github.com/LucasMarquesShiva/the-free-game",
    "coverImage": "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&q=80",
    "featured": false,
    "playsCount": 77536,
    "badge": null
  },
  {
    "id": "emberlight",
    "title": "Emberlight",
    "description": "README documents a playable survivors-like with a public GitHub Pages build, Three.",
    "genre": "3D & Racing",
    "playUrl": "https://leigaorobot.github.io/emberlight/",
    "rating": 8.5,
    "technology": [
      "Three.js",
      "JavaScript",
      "WebGL",
      "Blender"
    ],
    "modelAttribution": "GPT-6 Astra",
    "githubUrl": "https://github.com/LeiGaoRobot/emberlight",
    "coverImage": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80",
    "featured": false,
    "playsCount": 57344,
    "badge": null
  },
  {
    "id": "astra-air-combat",
    "title": "ASTRA AIR COMBAT",
    "description": "The repository description identifies this as a GPT-6 Astra game demo.",
    "genre": "3D & Racing",
    "playUrl": "https://flying37520.github.io/astra-air-combat/",
    "rating": 9,
    "technology": [
      "TypeScript",
      "Three.js",
      "WebGL",
      "Vite"
    ],
    "modelAttribution": "GPT-6 Astra",
    "githubUrl": "https://github.com/FLYING37520/astra-air-combat",
    "coverImage": "https://raw.githubusercontent.com/FLYING37520/astra-air-combat/main/artifacts/cockpit-rain-high.jpg",
    "featured": false,
    "playsCount": 83456,
    "badge": "Trending"
  },
  {
    "id": "the-simpsons-hit-run-browser-reconstruction",
    "title": "The Simpsons: Hit & Run — Browser Reconstruction",
    "description": "The creator's X post explicitly says GPT-6 Astra built the open-source browser reconstruction and links to this repository.",
    "genre": "3D & Racing",
    "playUrl": "https://vheissu.github.io/hit-and-run-web/",
    "rating": 9.5,
    "technology": [
      "TypeScript",
      "Three.js",
      "WebGL",
      "Vite"
    ],
    "modelAttribution": "GPT-6 Astra",
    "githubUrl": "https://github.com/Vheissu/hit-and-run-web",
    "coverImage": "https://raw.githubusercontent.com/Vheissu/hit-and-run-web/main/docs/media/homer-and-marge.jpg",
    "featured": true,
    "playsCount": 47496,
    "badge": "Top Rated"
  },
  {
    "id": "saber-descent",
    "title": "Saber / Descent",
    "description": "The creator's X post says the dungeon crawler used GPT-6 Astra and that the code is open source.",
    "genre": "3D & Racing",
    "playUrl": "https://vheissu.github.io/saber-battle/",
    "rating": 9,
    "technology": [
      "TypeScript",
      "Three.js",
      "WebGL2",
      "Vite"
    ],
    "modelAttribution": "GPT-6 Astra",
    "githubUrl": "https://github.com/Vheissu/saber-battle",
    "coverImage": "https://raw.githubusercontent.com/Vheissu/saber-battle/main/screenshots/01-saber-descent-temple.png",
    "featured": false,
    "playsCount": 87893,
    "badge": "Trending"
  },
  {
    "id": "the-long-silence",
    "title": "THE LONG SILENCE",
    "description": "The repository is a public, playable browser space-exploration game with Three.",
    "genre": "3D & Racing",
    "playUrl": "https://longsilence.anshu.dev/",
    "rating": 9.5,
    "technology": [
      "Three.js",
      "WebGL2",
      "GLSL",
      "JavaScript"
    ],
    "modelAttribution": "Claude Opus 5",
    "githubUrl": "https://github.com/achimala/TheLongSilence",
    "coverImage": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80",
    "featured": true,
    "playsCount": 36980,
    "badge": "Top Rated"
  },
  {
    "id": "blackwater-silent-harbor",
    "title": "BLACKWATER — Silent Harbor",
    "description": "The creator's X post explicitly says GPT-6 Astra one-shotted the Call of Duty-style game and the follow-up post links the source repository.",
    "genre": "3D & Racing",
    "playUrl": "https://blackwater-roan.vercel.app/",
    "rating": 8.5,
    "technology": [
      "Three.js",
      "React",
      "TypeScript",
      "WebGL"
    ],
    "modelAttribution": "GPT-6 Astra",
    "githubUrl": "https://github.com/Hiraeth010/blackwater",
    "coverImage": "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&q=80",
    "featured": false,
    "playsCount": 90749,
    "badge": null
  },
  {
    "id": "blacksite",
    "title": "BLACKSITE",
    "description": "The creator's X post says Claude Fable 5.",
    "genre": "3D & Racing",
    "playUrl": "https://blacksite-one.vercel.app/",
    "rating": 8.5,
    "technology": [
      "Three.js",
      "TypeScript",
      "Vite",
      "Rapier"
    ],
    "modelAttribution": "Claude Fable 5.1",
    "githubUrl": "https://github.com/Hiraeth010/blacksite",
    "coverImage": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80",
    "featured": false,
    "playsCount": 26035,
    "badge": null
  },
  {
    "id": "calude-kodo",
    "title": "CALUDE KODO (狩人行動)",
    "description": "The repository contains a real side-scrolling Famicom action game built from scratch in 6502 assembly, a game.",
    "genre": "Action & Combat",
    "playUrl": "https://goroman.github.io/cluade-famicom-emu/?pin=0&debug=1&rom=https://raw.githubusercontent.com/GOROman/calude-famicom-game/main/roms/50-coin-shine.nes",
    "rating": 8.5,
    "technology": [
      "6502 Assembly",
      "C",
      "cc65",
      "NES / Famicom"
    ],
    "modelAttribution": "Claude Fable 5",
    "githubUrl": "https://github.com/GOROman/calude-famicom-game",
    "coverImage": "https://raw.githubusercontent.com/GOROman/calude-famicom-game/main/docs/title_screen.png",
    "featured": false,
    "playsCount": 91958,
    "badge": null
  },
  {
    "id": "alesha-benchmark-portal-astra-fable-opus-games",
    "title": "Alesha Benchmark Portal — Astra/Fable/Opus Games",
    "description": "The repository is a static portal that also contains self-contained game source, not a catalog-only link list.",
    "genre": "3D & Racing",
    "playUrl": "https://alesha-pro.github.io/bench-portal/games/voidrunner-astra/",
    "rating": 8.5,
    "technology": [
      "Three.js",
      "WebGL2",
      "GLSL",
      "JavaScript"
    ],
    "modelAttribution": "GPT-6 Astra",
    "githubUrl": "https://github.com/alesha-pro/bench-portal",
    "coverImage": "https://raw.githubusercontent.com/alesha-pro/bench-portal/main/games/overrun-claude-opus-5.5/cover.webp",
    "featured": false,
    "playsCount": 21092,
    "badge": null
  },
  {
    "id": "azura-l-le-aux-toits-d-argile",
    "title": "AZURA — L'île aux toits d'argile",
    "description": "The README explicitly describes a one-file 3D exploration game, credits GPT-6 Astra for the island design and Claude Code for the game engine, rendering and quests, and links a GitHub Pages build.",
    "genre": "3D & Racing",
    "playUrl": "https://orgxsm.github.io/azura/",
    "rating": 8.7,
    "technology": [
      "WebGL2",
      "HTML",
      "JavaScript",
      "Python build script"
    ],
    "modelAttribution": "GPT-6 Astra",
    "githubUrl": "https://github.com/Orgxsm/azura",
    "coverImage": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80",
    "featured": false,
    "playsCount": 91493,
    "badge": null
  },
  {
    "id": "seabright-a-coastal-city-builder",
    "title": "SEABRIGHT — A Coastal City Builder",
    "description": "The README explicitly describes a playable Unity demo built with Codex and GPT-6 Astra.",
    "genre": "Action & Combat",
    "playUrl": "https://codersusu.github.io/game-city-skylines/",
    "rating": 9,
    "technology": [
      "Unity 6.0.0f1",
      "C#",
      "Native macOS",
      "Metal"
    ],
    "modelAttribution": "GPT-6 Astra",
    "githubUrl": "https://github.com/codersusu/game-city-skylines",
    "coverImage": "https://raw.githubusercontent.com/codersusu/game-city-skylines/main/Artifacts/01-starter-settlement.png",
    "featured": false,
    "playsCount": 32149,
    "badge": "Trending"
  },
  {
    "id": "citymaker-3d-landmark-2048",
    "title": "CityMaker — 3D Landmark 2048",
    "description": "The canonical repository is derek-wangpch/OpenCityMaker; the stale derek-wang/OpenCityMaker search result was rejected separately.",
    "genre": "Puzzle & Board",
    "playUrl": "https://citymaker.0to1app.com/",
    "rating": 9,
    "technology": [
      "Three.js",
      "TypeScript",
      "React",
      "Vite"
    ],
    "modelAttribution": "GPT-6 Astra",
    "githubUrl": "https://github.com/derek-wangpch/OpenCityMaker",
    "coverImage": "https://raw.githubusercontent.com/derek-wangpch/OpenCityMaker/master/docs/images/citymaker-game.png",
    "featured": false,
    "playsCount": 89364,
    "badge": "Trending"
  },
  {
    "id": "little-flock",
    "title": "Little Flock · 小羊慢慢",
    "description": "The README explicitly states that GPT-6 Astra created this cooperative sheep-farming game one-shot in Codex.",
    "genre": "Arcade & Casual",
    "playUrl": "https://sharpherd.song.work/",
    "rating": 9,
    "technology": [
      "React 19",
      "TypeScript",
      "React Three Fiber",
      "Drei"
    ],
    "modelAttribution": "GPT-6 Astra",
    "githubUrl": "https://github.com/songkeys/little-flock",
    "coverImage": "https://raw.githubusercontent.com/songkeys/little-flock/main/docs/demo-poster.jpg",
    "featured": false,
    "playsCount": 42886,
    "badge": "Trending"
  },
  {
    "id": "mechapede",
    "title": "Mechapede",
    "description": "The README explicitly credits GPT-6 Astra and describes a mechanical Centipede-style arcade game.",
    "genre": "Arcade & Casual",
    "playUrl": "https://davbachman.github.io/Mechapede/",
    "rating": 8.8,
    "technology": [
      "HTML",
      "JavaScript",
      "Canvas 2D",
      "Web Audio API"
    ],
    "modelAttribution": "GPT-6 Astra",
    "githubUrl": "https://github.com/davbachman/Mechapede",
    "coverImage": "https://raw.githubusercontent.com/davbachman/Mechapede/main/assets/machine-interior.png",
    "featured": false,
    "playsCount": 85620,
    "badge": null
  },
  {
    "id": "neural-sight",
    "title": "Neural Sight",
    "description": "The README explicitly describes a playable first-person browser game built over roughly 24 hours with GPT-6 Astra.",
    "genre": "Puzzle & Board",
    "playUrl": "https://monstercameron.github.io/Neural-Sight/",
    "rating": 9.2,
    "technology": [
      "PlayCanvas",
      "WebGPU",
      "Gaussian splatting",
      "JavaScript"
    ],
    "modelAttribution": "GPT-6 Astra",
    "githubUrl": "https://github.com/monstercameron/Neural-Sight",
    "coverImage": "https://raw.githubusercontent.com/monstercameron/Neural-Sight/main/docs/images/nelson-ghost-town.jpg",
    "featured": true,
    "playsCount": 53059,
    "badge": "Trending"
  },
  {
    "id": "mangoidiots-solitaire",
    "title": "Mangoidiots Solitaire",
    "description": "The README explicitly states that GPT-6 Astra generated the offline-first Draw 1 Klondike game.",
    "genre": "Puzzle & Board",
    "playUrl": "https://solitaire.mangoidiots.com/",
    "rating": 9.1,
    "technology": [
      "Phaser",
      "TypeScript",
      "Vite",
      "IndexedDB"
    ],
    "modelAttribution": "GPT-6 Astra",
    "githubUrl": "https://github.com/venkatarangan/mangoidiots-solitaire",
    "coverImage": "https://raw.githubusercontent.com/venkatarangan/mangoidiots-solitaire/main/screenshots/mangoidiots-solitaire-cover.png",
    "featured": false,
    "playsCount": 80345,
    "badge": "Trending"
  },
  {
    "id": "rift-chess",
    "title": "Rift Chess",
    "description": "The README describes an offline 3D chess variant on fourteen sliding tiles and explicitly credits GPT-6 Astra for implementation and review.",
    "genre": "Puzzle & Board",
    "playUrl": "https://haileystorm.github.io/rift-chess/",
    "rating": 9.3,
    "technology": [
      "Three.js",
      "TypeScript",
      "Vite",
      "WebGL"
    ],
    "modelAttribution": "GPT-6 Astra",
    "githubUrl": "https://github.com/HaileyStorm/rift-chess",
    "coverImage": "https://raw.githubusercontent.com/HaileyStorm/rift-chess/main/docs/evidence/overhaul/gallery.png",
    "featured": true,
    "playsCount": 62439,
    "badge": "Trending"
  },
  {
    "id": "fan-re-created-red-alert-2",
    "title": "Fan Re-created Red Alert 2",
    "description": "The README identifies this as an independent browser RTS recreation created in a one-shot GPT-6 Astra experiment.",
    "genre": "3D & Racing",
    "playUrl": "https://xinbenlv.github.io/ra2-gpt-6-astra-2026-09-04/",
    "rating": 9,
    "technology": [
      "TypeScript",
      "Vite",
      "Canvas/WebGL",
      "Web Workers"
    ],
    "modelAttribution": "GPT-6 Astra",
    "githubUrl": "https://github.com/xinbenlv/ra2-gpt-6-astra-2026-09-04",
    "coverImage": "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&q=80",
    "featured": false,
    "playsCount": 73659,
    "badge": "Trending"
  },
  {
    "id": "nullspace",
    "title": "NULLSPACE",
    "description": "The README explicitly credits GPT-6 Astra through Codex and identifies NULLSPACE as a single-player first-person survival-horror game.",
    "genre": "Arcade & Casual",
    "playUrl": "https://github.marius4lui.dev/NULLSPACE/",
    "rating": 9.3,
    "technology": [
      "Godot 4.7.2",
      "GDScript",
      "Blender",
      "GLB/glTF"
    ],
    "modelAttribution": "GPT-6 Astra",
    "githubUrl": "https://github.com/marius4lui/NULLSPACE",
    "coverImage": "https://raw.githubusercontent.com/marius4lui/NULLSPACE/main/docs/images/environment-preview.png",
    "featured": true,
    "playsCount": 70814,
    "badge": "Trending"
  },
  {
    "id": "reigns-ceo-gpt-6-astra-founder",
    "title": "Reigns CEO — GPT 6 Astra Founder",
    "description": "The README provides a dedicated GPT-6 Astra version and source path, separate from the original and Claude versions.",
    "genre": "Puzzle & Board",
    "playUrl": "https://gaintenemycrabburger.github.io/reigns-ceo/gpt-6-astra/",
    "rating": 8.6,
    "technology": [
      "HTML",
      "CSS",
      "JavaScript",
      "Browser"
    ],
    "modelAttribution": "GPT-6 Astra",
    "githubUrl": "https://github.com/GaintEnemyCrabBurger/reigns-ceo",
    "coverImage": "https://images.unsplash.com/photo-1586165368502-1bad197a6461?w=600&q=80",
    "featured": false,
    "playsCount": 65713,
    "badge": null
  },
  {
    "id": "decwar",
    "title": "DECWAR",
    "description": "The README explicitly credits OpenAI GPT-6 Astra and describes a playable multiplayer space-battle game ported to TypeScript.",
    "genre": "Action & Combat",
    "playUrl": "https://decwar.org",
    "rating": 8.7,
    "technology": [
      "TypeScript",
      "Node.js",
      "TCP/Telnet",
      "Terminal"
    ],
    "modelAttribution": "GPT-6 Astra",
    "githubUrl": "https://github.com/erictfree/DECWAR",
    "coverImage": "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&q=80",
    "featured": false,
    "playsCount": 77992,
    "badge": "Featured"
  },
  {
    "id": "agentic-apar-demo",
    "title": "Agentic APAR Demo",
    "description": "The README documents a Unity 3D fire-extinguisher mission with three fires, a 60-second timer, extinguisher pickup, directional spray, scoring, an exit door and complete/failed states.",
    "genre": "3D & Racing",
    "playUrl": "https://fathahnoor.github.io/AgenticAPARDemo/",
    "rating": 8.7,
    "technology": [
      "Unity 6.0.6f1",
      "C#",
      "URP 17.6",
      "Unity WebGL"
    ],
    "modelAttribution": "GPT-6 Astra",
    "githubUrl": "https://github.com/fathahnoor/AgenticAPARDemo",
    "coverImage": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80",
    "featured": false,
    "playsCount": 56687,
    "badge": null
  },
  {
    "id": "7-minutes-city-crisis",
    "title": "7 Minutes — City Crisis",
    "description": "The README explicitly identifies a real-time 3D browser strategy game created as a GPT-6 coding capability experiment.",
    "genre": "3D & Racing",
    "playUrl": "https://hlforever11.github.io/gpt6-city-crisis/",
    "rating": 9.3,
    "technology": [
      "Three.js",
      "TypeScript",
      "Vite",
      "Web Audio API"
    ],
    "modelAttribution": "GPT-6",
    "githubUrl": "https://github.com/hlforever11/gpt6-city-crisis",
    "coverImage": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80",
    "featured": true,
    "playsCount": 83813,
    "badge": "Trending"
  },
  {
    "id": "microstride-run-on-shoes",
    "title": "MICROSTRIDE — Run on Shoes",
    "description": "The README explicitly identifies a React/TypeScript/Three.",
    "genre": "3D & Racing",
    "playUrl": "https://565353780.github.io/run-on-shoes/",
    "rating": 8.9,
    "technology": [
      "React",
      "TypeScript",
      "Three.js",
      "Vite"
    ],
    "modelAttribution": "GPT-6",
    "githubUrl": "https://github.com/565353780/run-on-shoes",
    "coverImage": "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&q=80",
    "featured": false,
    "playsCount": 46785,
    "badge": null
  },
  {
    "id": "aperture-fly-around-sculpture",
    "title": "APERTURE — Fly Around Sculpture",
    "description": "The README explicitly identifies a React/TypeScript/Three.",
    "genre": "Puzzle & Board",
    "playUrl": "https://565353780.github.io/fly-around-sculpture/",
    "rating": 8.9,
    "technology": [
      "React",
      "TypeScript",
      "Three.js",
      "Vite"
    ],
    "modelAttribution": "GPT-6",
    "githubUrl": "https://github.com/565353780/fly-around-sculpture",
    "coverImage": "https://raw.githubusercontent.com/565353780/fly-around-sculpture/main/public/references/sculpture.png",
    "featured": false,
    "playsCount": 88144,
    "badge": null
  },
  {
    "id": "gpt-6-astra-one-shot-games-melon-lab-and-mosswing",
    "title": "GPT-6 Astra One-Shot Games — Melon Lab and Mosswing",
    "description": "The README documents two separate one-shot games and preserves each prompt, HTML artifact and source directory.",
    "genre": "3D & Racing",
    "playUrl": "https://melon-game.jack-514.chatgpt.site/",
    "rating": 8.4,
    "technology": [
      "HTML",
      "CSS",
      "JavaScript",
      "Canvas 2D"
    ],
    "modelAttribution": "GPT-6 Astra",
    "githubUrl": "https://github.com/Ayi1337/gpt6-astra-one-shot-games",
    "coverImage": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80",
    "featured": false,
    "playsCount": 36232,
    "badge": null
  },
  {
    "id": "silent-meridian",
    "title": "Silent Meridian",
    "description": "The README explicitly credits GPT-6 Astra in Codex and documents an original bilingual browser puzzle game with four playable chapters, thirteen puzzles, two time states, two endings, autosave, keyboard/touch controls, optional WebGL depth effects and reduced-motion support.",
    "genre": "Puzzle & Board",
    "playUrl": "https://silent-meridian.stackloom.org/",
    "rating": 9.1,
    "technology": [
      "HTML",
      "CSS",
      "JavaScript",
      "WebGL"
    ],
    "modelAttribution": "GPT-6 Astra",
    "githubUrl": "https://github.com/stackloomdev/silent-meridian",
    "coverImage": "https://raw.githubusercontent.com/stackloomdev/silent-meridian/main/docs/screenshots/depth-observatory.png",
    "featured": false,
    "playsCount": 90887,
    "badge": "Trending"
  },
  {
    "id": "failure-is-not-an-option",
    "title": "Failure is Not an Option",
    "description": "The README identifies a playable browser narrative strategy game and provides a public demo.",
    "genre": "Strategy & RPG",
    "playUrl": "https://finaogame.com/demo/",
    "rating": 9,
    "technology": [
      "TypeScript",
      "Vite",
      "HTML/CSS",
      "Browser"
    ],
    "modelAttribution": "GPT-6 Astra",
    "githubUrl": "https://github.com/dan-lee-odinson/failure-is-not-an-option",
    "coverImage": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80",
    "featured": false,
    "playsCount": 25266,
    "badge": "Trending"
  },
  {
    "id": "skysprout",
    "title": "SkySprout",
    "description": "The README explicitly credits GPT-6 Astra in GitHub Copilot CLI and states that SkySprout is an original playable browser platformer, not a video or mockup.",
    "genre": "Puzzle & Board",
    "playUrl": "https://dubsopenhub.github.io/skysprout/",
    "rating": 8.9,
    "technology": [
      "HTML",
      "CSS",
      "JavaScript",
      "Canvas 2D"
    ],
    "modelAttribution": "GPT-6 Astra",
    "githubUrl": "https://github.com/DUBSOpenHub/skysprout",
    "coverImage": "https://raw.githubusercontent.com/DUBSOpenHub/skysprout/main/docs/images/skysprout-meadow.png",
    "featured": false,
    "playsCount": 91980,
    "badge": "Featured"
  },
  {
    "id": "choplifter-rescue-operations",
    "title": "Choplifter — Rescue Operations",
    "description": "The repository preserves four browser-game attempts from one Choplifter brief.",
    "genre": "Arcade & Casual",
    "playUrl": "https://www.danielpradilla.info/projects/choplifter/choplifter-6-astra/",
    "rating": 8.8,
    "technology": [
      "JavaScript",
      "Phaser",
      "HTML/CSS",
      "Canvas"
    ],
    "modelAttribution": "GPT-6 Astra",
    "githubUrl": "https://github.com/danielpradilla/choplifter",
    "coverImage": "https://images.unsplash.com/photo-1551103782-8ab07afd45c1?w=600&q=80",
    "featured": false,
    "playsCount": 21864,
    "badge": null
  },
  {
    "id": "trial-gpt-6-astra-game-builds",
    "title": "Trial GPT-6 Astra Game Builds",
    "description": "Trial is a benchmark repository, but its GPT-6 Astra results contain five separate source-backed browser games, each with a direct index.",
    "genre": "Puzzle & Board",
    "playUrl": "https://trial-by-pyro.netlify.app/",
    "rating": 9,
    "technology": [
      "HTML",
      "CSS",
      "JavaScript",
      "Canvas 2D"
    ],
    "modelAttribution": "GPT-6 Astra",
    "githubUrl": "https://github.com/pyros-projects/Trial",
    "coverImage": "https://raw.githubusercontent.com/pyros-projects/Trial/main/results/gpt-6_astra/10-stealth-heist/evidence/screenshots/27-delivered-desktop.png",
    "featured": false,
    "playsCount": 91398,
    "badge": "Trending"
  },
  {
    "id": "dig-deep-descent",
    "title": "Dig: Deep Descent",
    "description": "The README explicitly states that GPT-6 Astra High updated version 0.",
    "genre": "Arcade & Casual",
    "playUrl": "https://aaronshaver.github.io/dig-deep-descent/",
    "rating": 8.1,
    "technology": [
      "JavaScript",
      "Canvas 2D",
      "Browser"
    ],
    "modelAttribution": "GPT-6 Astra",
    "githubUrl": "https://github.com/aaronshaver/dig-deep-descent",
    "coverImage": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&q=80",
    "featured": false,
    "playsCount": 32907,
    "badge": null
  },
  {
    "id": "silent-hill-native-pc-port",
    "title": "Silent Hill — Native PC Port",
    "description": "The README explicitly says the native PC port is heavily AI-assisted with Claude Opus 4.",
    "genre": "Action & Combat",
    "playUrl": "https://sh1pc.com",
    "rating": 8.8,
    "technology": [
      "C",
      "C++",
      "PsyCross",
      "SDL2"
    ],
    "modelAttribution": "Claude Opus 4.6",
    "githubUrl": "https://github.com/SlickAmogus/silent-hill-decomp",
    "coverImage": "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&q=80",
    "featured": false,
    "playsCount": 89156,
    "badge": null
  },
  {
    "id": "dungeon-of-opus",
    "title": "Dungeon of Opus",
    "description": "The README explicitly says Claude Opus 4.",
    "genre": "Action & Combat",
    "playUrl": "https://wiz.jock.pl/experiments/dungeon-of-opus",
    "rating": 8.4,
    "technology": [
      "React",
      "TypeScript",
      "Tailwind CSS",
      "Vite"
    ],
    "modelAttribution": "Claude Opus 4.6",
    "githubUrl": "https://github.com/joozio/dungeon-of-opus",
    "coverImage": "https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=600&q=80",
    "featured": false,
    "playsCount": 43613,
    "badge": null
  },
  {
    "id": "buildyourtown",
    "title": "BuildYourTown",
    "description": "The README provides a live demo and Docker run instructions for an isometric city-builder with roads, rails, zoning, electricity, water, budget, services, traffic, population unlocks, monthly simulation, disasters, three difficulty levels, bankruptcy and browser save state.",
    "genre": "Arcade & Casual",
    "playUrl": "https://buildyourtown.com",
    "rating": 9,
    "technology": [
      "TypeScript",
      "Vite",
      "Canvas 2D",
      "Docker"
    ],
    "modelAttribution": "Claude Fable 5.1",
    "githubUrl": "https://github.com/Rapsody09/buildyourtown",
    "coverImage": "https://raw.githubusercontent.com/Rapsody09/buildyourtown/main/docs/screenshots/overview.png",
    "featured": false,
    "playsCount": 85302,
    "badge": "Trending"
  },
  {
    "id": "sql-boss-battle-game",
    "title": "SQL Boss Battle Game",
    "description": "The README links a live browser game with an eight-boss, 72-puzzle campaign, real SQL checking against an in-browser database, an endless SQL-lane runner, a daily boss, sandbox mode, streaks and leaderboard support.",
    "genre": "Puzzle & Board",
    "playUrl": "https://raishaldhawan23.github.io/SQL-Boss-Battle-Game-/",
    "rating": 8.8,
    "technology": [
      "HTML",
      "JavaScript",
      "Canvas",
      "sql.js"
    ],
    "modelAttribution": "Claude Fable 5.1",
    "githubUrl": "https://github.com/raishaldhawan23/SQL-Boss-Battle-Game-",
    "coverImage": "https://github.com/user-attachments/assets/f1986481-3d0b-4d7f-9240-9a5be77148d9",
    "featured": false,
    "playsCount": 53738,
    "badge": null
  },
  {
    "id": "glup-nila-y-el-pez-gato",
    "title": "GLUP — Nila y el pez gato",
    "description": "The README links a live PWA and documents a complete 2D pixel-platformer with four themed levels, checkpoints, collectible abilities, suction and projectile combat, destructible terrain, moving platforms, hazards, health, a heron boss, level summaries, progress and saved best times.",
    "genre": "Action & Combat",
    "playUrl": "https://gavilanbe.github.io/glup/",
    "rating": 8.9,
    "technology": [
      "HTML",
      "JavaScript",
      "Canvas 2D",
      "Web Audio API"
    ],
    "modelAttribution": "Claude Fable 5.1",
    "githubUrl": "https://github.com/gavilanbe/glup",
    "coverImage": "https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=600&q=80",
    "featured": false,
    "playsCount": 79925,
    "badge": "Featured"
  },
  {
    "id": "neon-snake-fable-baseline",
    "title": "Neon Snake — Fable baseline",
    "description": "The repository contains four independent builds of one game specification.",
    "genre": "Puzzle & Board",
    "playUrl": "https://kinncj.github.io/neon-snake/claude-code-fable/",
    "rating": 8.7,
    "technology": [
      "Phaser 4",
      "TypeScript",
      "Tone.js",
      "Canvas"
    ],
    "modelAttribution": "Claude Fable 5.1",
    "githubUrl": "https://github.com/kinncj/neon-snake",
    "coverImage": "https://images.unsplash.com/photo-1586165368502-1bad197a6461?w=600&q=80",
    "featured": false,
    "playsCount": 63055,
    "badge": null
  },
  {
    "id": "spice-a-card-game-for-couples",
    "title": "SPICE — a card game for couples",
    "description": "The repository README links a live offline PWA and documents a complete two-player card-game loop with 500 questions and dares, three escalating levels, seven card formats, ten categories, pass handling, turn switching, saved favorites, custom decks and end-of-session review.",
    "genre": "Puzzle & Board",
    "playUrl": "https://couples-card-game.hiberius.workers.dev",
    "rating": 8.6,
    "technology": [
      "HTML",
      "CSS",
      "JavaScript ES modules",
      "PWA"
    ],
    "modelAttribution": "Claude Fable 5.1",
    "githubUrl": "https://github.com/Hiberius/couples-card-game",
    "coverImage": "https://raw.githubusercontent.com/Hiberius/couples-card-game/main/docs/media/phones.png",
    "featured": false,
    "playsCount": 73146,
    "badge": null
  },
  {
    "id": "pac-clone",
    "title": "PAC-CLONE",
    "description": "The README explicitly says the entire repository was written by Claude Code using Claude Fable 5.",
    "genre": "Puzzle & Board",
    "playUrl": "https://boromisp.github.io/pacman-clone/",
    "rating": 8.5,
    "technology": [
      "HTML",
      "JavaScript",
      "Canvas 2D",
      "Web Audio API"
    ],
    "modelAttribution": "Claude Fable 5.1",
    "githubUrl": "https://github.com/boromisp/pacman-clone",
    "coverImage": "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=600&q=80",
    "featured": false,
    "playsCount": 71352,
    "badge": null
  },
  {
    "id": "my-snowboard",
    "title": "My Snowboard",
    "description": "The README links a live browser build and documents a complete snowboarding game loop: name and mode selection, hill difficulty, weather, trick choice, charge-and-release launch, timed landing, health, game over, coins, chalet food, permanent gear upgrades, trick combos and a local leaderboard.",
    "genre": "Puzzle & Board",
    "playUrl": "https://my-snowboard.vercel.app/",
    "rating": 8.4,
    "technology": [
      "HTML",
      "JavaScript",
      "Canvas 2D",
      "Web Audio API"
    ],
    "modelAttribution": "Claude Opus 4.6",
    "githubUrl": "https://github.com/petersomerville/mysnowboard",
    "coverImage": "https://images.unsplash.com/photo-1586165368502-1bad197a6461?w=600&q=80",
    "featured": false,
    "playsCount": 65119,
    "badge": null
  },
  {
    "id": "pixel-tactical-shooter",
    "title": "Pixel Tactical Shooter",
    "description": "The repository README identifies a browser-playable 3D tactical shooter built with Three.",
    "genre": "3D & Racing",
    "playUrl": "https://vadaski.github.io/pixel-tactical-shooter/",
    "rating": 8.8,
    "technology": [
      "TypeScript",
      "Three.js",
      "WebGL",
      "Browser"
    ],
    "modelAttribution": "Claude Opus 4.6",
    "githubUrl": "https://github.com/Vadaski/pixel-tactical-shooter",
    "coverImage": "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&q=80",
    "featured": false,
    "playsCount": 78441,
    "badge": null
  },
  {
    "id": "claude-playground-ai-games-arcade",
    "title": "Claude Playground AI Games Arcade",
    "description": "The repository README describes a browser-based arcade mostly written with Claude Code and provides a live GitHub Pages site.",
    "genre": "Arcade & Casual",
    "playUrl": "https://vi-o-al-ai.github.io/claude_playground/",
    "rating": 8,
    "technology": [
      "HTML",
      "JavaScript",
      "Vite",
      "Canvas"
    ],
    "modelAttribution": "Claude Opus 4.6",
    "githubUrl": "https://github.com/vi-o-al-ai/claude_playground",
    "coverImage": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&q=80",
    "featured": false,
    "playsCount": 56026,
    "badge": null
  },
  {
    "id": "finops-odyssey",
    "title": "FinOps Odyssey",
    "description": "The README describes an 8-bit space arcade game where players pilot a rocket, dodge cloud waste, answer FinOps decisions, collect a combo and reach a win state.",
    "genre": "Arcade & Casual",
    "playUrl": "https://finops-odyssey.vercel.app/game.html",
    "rating": 8.6,
    "technology": [
      "HTML",
      "JavaScript",
      "Canvas",
      "Supabase"
    ],
    "modelAttribution": "Claude Opus 4.8",
    "githubUrl": "https://github.com/chfinops/finops-odyssey",
    "coverImage": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&q=80",
    "featured": false,
    "playsCount": 84163,
    "badge": null
  },
  {
    "id": "kamikakushi-an-incremental-rpg",
    "title": "KamiKakushi — An Incremental RPG",
    "description": "The public repository is an incremental RPG with story, campaign, quests, areas, equipment, crafting, combat, economy and autoplay systems.",
    "genre": "Action & Combat",
    "playUrl": "https://raynos.github.io/kami-kakushi/",
    "rating": 9.3,
    "technology": [
      "TypeScript",
      "Vite",
      "HTML/CSS",
      "Browser"
    ],
    "modelAttribution": "Claude Opus",
    "githubUrl": "https://github.com/Raynos/kami-kakushi",
    "coverImage": "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&q=80",
    "featured": true,
    "playsCount": 46071,
    "badge": "Trending"
  },
  {
    "id": "breakneck-baseball",
    "title": "Breakneck Baseball",
    "description": "The README documents a playable Rust/Bevy/Rapier 3D baseball game with native desktop and browser WASM builds, one-player versus CPU and two-player modes, nine-inning or shortened games, five pitches, Magnus-effect ball flight, steals and pickoffs, tag-ups, double plays, dropped third strike, HBP, caught pops, multiple cameras, synthesized audio, team/field themes, substitutions, settings, pause and a live GitHub Pages demo.",
    "genre": "3D & Racing",
    "playUrl": "https://hynding.github.io/breakneck-baseball/",
    "rating": 9.4,
    "technology": [
      "Rust",
      "Bevy 0.15",
      "Rapier",
      "wgpu"
    ],
    "modelAttribution": "Claude Fable 5",
    "githubUrl": "https://github.com/hynding/breakneck-baseball",
    "coverImage": "https://raw.githubusercontent.com/hynding/breakneck-baseball/main/docs/agent/playtest/2026-08-21/23-live-gameplay.png",
    "featured": true,
    "playsCount": 88386,
    "badge": "Top Rated"
  },
  {
    "id": "wolfsbane",
    "title": "Wolfsbane",
    "description": "The public repository is a browser third-person action RPG inspired by The Witcher 3.",
    "genre": "Action & Combat",
    "playUrl": "https://oivindth.github.io/wolfsbane/",
    "rating": 9.5,
    "technology": [
      "Babylon.js",
      "Havok",
      "Svelte 5",
      "TypeScript"
    ],
    "modelAttribution": "Claude Fable 5",
    "githubUrl": "https://github.com/oivindth/wolfsbane",
    "coverImage": "https://images.unsplash.com/photo-1563089145-599997674d42?w=600&q=80",
    "featured": true,
    "playsCount": 35481,
    "badge": "Top Rated"
  },
  {
    "id": "the-fallen-citadel",
    "title": "The Fallen Citadel",
    "description": "The public source mirror documents a 3-D quarter-view hack-and-slash roguelike made in Unity WebGL for the Next AI Network 2026 hackathon.",
    "genre": "3D & Racing",
    "playUrl": "https://nansu0425.github.io/nan2026-game/",
    "rating": 9.4,
    "technology": [
      "Unity",
      "C#",
      "WebGL",
      "Browser"
    ],
    "modelAttribution": "Claude Opus 5",
    "githubUrl": "https://github.com/nansu0425/nan2026-game-src",
    "coverImage": "https://raw.githubusercontent.com/nansu0425/nan2026-game-src/main/Documentation/images/title-screen.jpg",
    "featured": true,
    "playsCount": 91016,
    "badge": "Top Rated"
  },
  {
    "id": "ha-ggis-hub",
    "title": "ha·ggis Hub",
    "description": "The creator profile links this public repository as a playable Highland-games arcade lobby.",
    "genre": "Puzzle & Board",
    "playUrl": "https://ha.ggis.xyz",
    "rating": 8.9,
    "technology": [
      "Rust",
      "WebAssembly",
      "TypeScript",
      "Canvas2D"
    ],
    "modelAttribution": "Claude Fable 5",
    "githubUrl": "https://github.com/Giftedx/ha-ggis-hub",
    "coverImage": "https://raw.githubusercontent.com/Giftedx/ha-ggis-hub/main/assets/screens/bothy-idle.png",
    "featured": false,
    "playsCount": 24496,
    "badge": null
  },
  {
    "id": "just-five-more-minutes",
    "title": "Just Five More Minutes",
    "description": "The creator profile links this public repository as a playable browser game.",
    "genre": "Puzzle & Board",
    "playUrl": "https://ha.ggis.xyz/just-five-more-minutes/",
    "rating": 9.5,
    "technology": [
      "Three.js",
      "Canvas2D",
      "TypeScript",
      "Vite"
    ],
    "modelAttribution": "Claude Fable 5",
    "githubUrl": "https://github.com/Giftedx/just-five-more-minutes",
    "coverImage": "https://raw.githubusercontent.com/Giftedx/just-five-more-minutes/master/docs/screenshots/title.png",
    "featured": true,
    "playsCount": 91994,
    "badge": "Top Rated"
  },
  {
    "id": "the-wandering-inn-rpg",
    "title": "The Wandering Inn RPG",
    "description": "The public repository is a top-down pixel RPG with a Godot 4.",
    "genre": "Action & Combat",
    "playUrl": "https://gabrielglevine.github.io/wandering-inn-rpg/",
    "rating": 9.5,
    "technology": [
      "Godot 4.7",
      "GDScript",
      "Pixel art",
      "Web export"
    ],
    "modelAttribution": "Claude Fable 5.1",
    "githubUrl": "https://github.com/GabrielGLevine/wandering-inn-rpg",
    "coverImage": "https://raw.githubusercontent.com/GabrielGLevine/wandering-inn-rpg/main/docs/steam/screenshots/01_inn.png",
    "featured": true,
    "playsCount": 22636,
    "badge": "Top Rated"
  },
  {
    "id": "p-doom",
    "title": "P(DOOM)",
    "description": "The README explicitly credits GPT-6 Astra with Codex, Three.",
    "genre": "3D & Racing",
    "playUrl": "https://p-doom.transitivebullsh.it",
    "rating": 9.3,
    "technology": [
      "Next.js",
      "React",
      "TypeScript",
      "Three.js 0.185.1"
    ],
    "modelAttribution": "GPT-6 Astra",
    "githubUrl": "https://github.com/transitive-bullshit/ai-safety-doom",
    "coverImage": "https://raw.githubusercontent.com/transitive-bullshit/ai-safety-doom/main/docs/images/arrival.jpg",
    "featured": true,
    "playsCount": 91296,
    "badge": "Trending"
  },
  {
    "id": "osrs-tower-defense",
    "title": "OSRS Tower Defense",
    "description": "The repository README describes a browser tower-defense game with placing and upgrading OSRS-themed towers, winding roads, escalating waves, gold, bosses, prayers, traps, fusions, achievements, saves and a collection log.",
    "genre": "Strategy & RPG",
    "playUrl": "https://hamilton-junior.github.io/osrs-tower-defense/",
    "rating": 9.1,
    "technology": [
      "Next.js",
      "React",
      "TypeScript",
      "Canvas 2D"
    ],
    "modelAttribution": "Claude Opus 5",
    "githubUrl": "https://github.com/hamilton-junior/osrs-tower-defense",
    "coverImage": "https://images.unsplash.com/photo-1519669011783-4eaa95fa1b7d?w=600&q=80",
    "featured": false,
    "playsCount": 33664,
    "badge": "Trending"
  },
  {
    "id": "treant-arcade",
    "title": "Treant Arcade",
    "description": "The repository contains a real browser arcade, not only an MCTS library: docs/src/components/arcade/games/index.",
    "genre": "Puzzle & Board",
    "playUrl": "https://mcts.dev/arcade/",
    "rating": 9.6,
    "technology": [
      "Rust",
      "WebAssembly",
      "TypeScript",
      "React"
    ],
    "modelAttribution": "Claude Fable 5",
    "githubUrl": "https://github.com/patricker/treant",
    "coverImage": "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=600&q=80",
    "featured": true,
    "playsCount": 88939,
    "badge": "Top Rated"
  },
  {
    "id": "starcluster",
    "title": "Starcluster",
    "description": "The README documents a runnable C++/SDL2 game with a deterministic 8,192-star cluster, local markets, NPC factions, traders, patrols, colonists, scouts, pirates, contracts, colonies, shares, fleet autopilot, first-person local flight, save/load, HUD windows and smoke tests.",
    "genre": "3D & Racing",
    "playUrl": "https://Jirnyak.github.io/starcluster/",
    "rating": 9.4,
    "technology": [
      "C++",
      "SDL2",
      "Native desktop",
      "Native Android"
    ],
    "modelAttribution": "Claude Opus",
    "githubUrl": "https://github.com/Jirnyak/starcluster",
    "coverImage": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80",
    "featured": true,
    "playsCount": 44337,
    "badge": "Top Rated"
  },
  {
    "id": "roshambo-26",
    "title": "Roshambo 26",
    "description": "The repository contains a real Roblox/Rojo project with a declared DataModel, client and server entry points, shared game rules, round coordination, player profiles, arena spawn, remote events, on-site 3D stage assets, economy, progression, fireworks, shops, HUD, WebSocket-backed multiplayer and a large Luau test suite.",
    "genre": "3D & Racing",
    "playUrl": "https://playroshambo.com",
    "rating": 9.2,
    "technology": [
      "Roblox Engine",
      "Luau",
      "Rojo",
      "Native game platform"
    ],
    "modelAttribution": "Claude Fable 5.1",
    "githubUrl": "https://github.com/jonlabrie/roshambo_26",
    "coverImage": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80",
    "featured": true,
    "playsCount": 84977,
    "badge": "Trending"
  },
  {
    "id": "windy-10v10-ai",
    "title": "Windy 10v10 AI",
    "description": "The README identifies this repository as a published PVE Dota 2 custom game and links its Steam Workshop publication.",
    "genre": "Arcade & Casual",
    "playUrl": "https://steamcommunity.com/sharedfiles/filedetails/?id=2307479570",
    "rating": 9.3,
    "technology": [
      "Dota 2 Source 2",
      "Dota 2 Workshop Tools",
      "VScript TypeScript",
      "Lua"
    ],
    "modelAttribution": "Claude Opus 5",
    "githubUrl": "https://github.com/windy10v10ai/game",
    "coverImage": "https://raw.githubusercontent.com/windy10v10ai/game/develop/content/materials/overviews/dota.png",
    "featured": true,
    "playsCount": 54414,
    "badge": "Trending"
  },
  {
    "id": "deepshaft",
    "title": "Deepshaft",
    "description": "The README documents Deepshaft as a playable first-person raycast crawl through a procedural mine.",
    "genre": "Arcade & Casual",
    "playUrl": "https://deepshaft.benrichardson.dev",
    "rating": 9.5,
    "technology": [
      "TypeScript",
      "Vite",
      "Canvas 2D raycaster",
      "WebRTC"
    ],
    "modelAttribution": "Claude Opus 5",
    "githubUrl": "https://github.com/ben-gy/deepshaft",
    "coverImage": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&q=80",
    "featured": true,
    "playsCount": 79498,
    "badge": "Top Rated"
  },
  {
    "id": "gloamrun",
    "title": "Gloamrun",
    "description": "The README documents Gloamrun as a playable endless co-op dungeon crawl with procedural floors, auto-fire nearest-monster combat, movement, dash invulnerability, upgrade drafting, escalating monster waves, bosses, downed-player revival and 2–4 player peer-to-peer rooms.",
    "genre": "Puzzle & Board",
    "playUrl": "https://gloamrun.benrichardson.dev",
    "rating": 9.4,
    "technology": [
      "TypeScript",
      "Vite",
      "Canvas 2D",
      "WebRTC"
    ],
    "modelAttribution": "Claude Opus 4.8",
    "githubUrl": "https://github.com/ben-gy/gloamrun",
    "coverImage": "https://images.unsplash.com/photo-1586165368502-1bad197a6461?w=600&q=80",
    "featured": true,
    "playsCount": 63666,
    "badge": "Top Rated"
  },
  {
    "id": "scrapwall",
    "title": "Scrapwall",
    "description": "The README documents Scrapwall as a playable co-op grid base-defense game.",
    "genre": "Puzzle & Board",
    "playUrl": "https://scrapwall.benrichardson.dev",
    "rating": 9.3,
    "technology": [
      "TypeScript",
      "Vite",
      "Canvas 2D",
      "Weighted-Dijkstra pathfinding"
    ],
    "modelAttribution": "Claude Opus 4.8",
    "githubUrl": "https://github.com/ben-gy/scrapwall",
    "coverImage": "https://raw.githubusercontent.com/ben-gy/scrapwall/main/public/og.png",
    "featured": true,
    "playsCount": 72628,
    "badge": "Trending"
  },
  {
    "id": "lastlight",
    "title": "Lastlight",
    "description": "The README documents Lastlight as a playable browser settlement-survival game on a hex map.",
    "genre": "Puzzle & Board",
    "playUrl": "https://lastlight.benrichardson.dev",
    "rating": 9.4,
    "technology": [
      "TypeScript",
      "Vite",
      "Canvas 2D",
      "DOM/CSS HUD"
    ],
    "modelAttribution": "Claude Opus 4.8",
    "githubUrl": "https://github.com/ben-gy/lastlight",
    "coverImage": "https://raw.githubusercontent.com/ben-gy/lastlight/main/public/og.png",
    "featured": true,
    "playsCount": 71885,
    "badge": "Top Rated"
  },
  {
    "id": "recess-sports",
    "title": "Recess Sports",
    "description": "The README documents Recess Sports v1 as a shipped browser baseball game: draft 9 of 30 neighborhood characters, then play a short pitch-and-swing game.",
    "genre": "Puzzle & Board",
    "playUrl": "https://srgirsky.github.io/recess-sports/",
    "rating": 9.1,
    "technology": [
      "TypeScript",
      "Phaser 3",
      "Vite",
      "Canvas/WebGL"
    ],
    "modelAttribution": "Claude Fable 5",
    "githubUrl": "https://github.com/srgirsky/recess-sports",
    "coverImage": "https://images.unsplash.com/photo-1586165368502-1bad197a6461?w=600&q=80",
    "featured": false,
    "playsCount": 64520,
    "badge": "Trending"
  },
  {
    "id": "lera-birthday-mini-games",
    "title": "Lera Birthday Mini-Games",
    "description": "The repository is a family birthday page that embeds four real mini-games.",
    "genre": "Puzzle & Board",
    "playUrl": "https://vitalirasin-web.github.io/valeriabirthday/",
    "rating": 8.2,
    "technology": [
      "HTML",
      "CSS",
      "JavaScript",
      "DOM"
    ],
    "modelAttribution": "Claude Fable 5",
    "githubUrl": "https://github.com/vitalirasin-web/valeriabirthday",
    "coverImage": "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=600&q=80",
    "featured": false,
    "playsCount": 78884,
    "badge": null
  },
  {
    "id": "zombie-shooter",
    "title": "Zombie Shooter",
    "description": "The repository was created on 2026-09-10.",
    "genre": "Puzzle & Board",
    "playUrl": "https://poralmi233-spec.github.io/zombie-shooter/",
    "rating": 8.7,
    "technology": [
      "HTML",
      "CSS",
      "JavaScript",
      "Canvas 2D"
    ],
    "modelAttribution": "Claude Opus 5",
    "githubUrl": "https://github.com/poralmi233-spec/zombie-shooter",
    "coverImage": "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=600&q=80",
    "featured": false,
    "playsCount": 55360,
    "badge": null
  },
  {
    "id": "gabriel-s-animation-studio",
    "title": "Gabriel's Animation Studio",
    "description": "The README documents a single-file browser/iPad game where the player draws a stick figure and plays eight mini-games.",
    "genre": "Puzzle & Board",
    "playUrl": "https://gberry747-lab.github.io/gabriels-animation-studio/",
    "rating": 9.5,
    "technology": [
      "HTML",
      "JavaScript",
      "Canvas 2D",
      "Web Audio"
    ],
    "modelAttribution": "Claude Fable 5.1",
    "githubUrl": "https://github.com/gberry747-lab/gabriels-animation-studio",
    "coverImage": "https://images.unsplash.com/photo-1586165368502-1bad197a6461?w=600&q=80",
    "featured": true,
    "playsCount": 84505,
    "badge": "Top Rated"
  },
  {
    "id": "skylark-run",
    "title": "Skylark Run",
    "description": "The README documents an open-cockpit browser flight game with a monoplane ring course over countryside and a helicopter hover course over a night city.",
    "genre": "Puzzle & Board",
    "playUrl": "https://skylark-run.vercel.app",
    "rating": 9.6,
    "technology": [
      "JavaScript",
      "Three.js",
      "WebGL",
      "Web Audio"
    ],
    "modelAttribution": "Claude Opus 5",
    "githubUrl": "https://github.com/jackpepper-vibe/SkylarkRun",
    "coverImage": "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=600&q=80",
    "featured": true,
    "playsCount": 45354,
    "badge": "Top Rated"
  },
  {
    "id": "unfit-for-print",
    "title": "Unfit for Print",
    "description": "The README identifies Unfit for Print as a browser party game: players create or join a lobby, take turns judging, submit white cards to black-card prompts, score rounds and race to a target.",
    "genre": "Puzzle & Board",
    "playUrl": "https://unfit.cards",
    "rating": 9.7,
    "technology": [
      "TypeScript",
      "Nuxt 4",
      "Vue 3",
      "Yjs CRDT"
    ],
    "modelAttribution": "Claude Opus 5",
    "githubUrl": "https://github.com/PPO-GG/unfit-for-print",
    "coverImage": "https://raw.githubusercontent.com/PPO-GG/unfit-for-print/main/.github/assets/main_menu.webp",
    "featured": true,
    "playsCount": 88621,
    "badge": "Top Rated"
  },
  {
    "id": "chess3dastra",
    "title": "chess3dastra",
    "description": "The README explicitly identifies chess3dastra as a fully playable 3D and 2D chess game built end-to-end with GPT-6 Astra.",
    "genre": "Puzzle & Board",
    "playUrl": "https://yortch.github.io/chess3dastra/",
    "rating": 9.6,
    "technology": [
      "HTML",
      "JavaScript",
      "Three.js",
      "WebGL"
    ],
    "modelAttribution": "GPT-6 Astra",
    "githubUrl": "https://github.com/yortch/chess3dastra",
    "coverImage": "https://raw.githubusercontent.com/yortch/chess3dastra/main/docs/screenshots/3d-dark.png",
    "featured": true,
    "playsCount": 34729,
    "badge": "Top Rated"
  },
  {
    "id": "tic-tac-totem",
    "title": "Tic Tac Totem",
    "description": "The repository contains a real Unity/Photon WebGL online board game.",
    "genre": "Puzzle & Board",
    "playUrl": "https://leandromagonza.github.io/TicTacTotem/",
    "rating": 8.8,
    "technology": [
      "Unity",
      "C#",
      "Photon PUN",
      "WebGL"
    ],
    "modelAttribution": "Claude Opus 5",
    "githubUrl": "https://github.com/LeandroMagonza/TicTacTotem",
    "coverImage": "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=600&q=80",
    "featured": false,
    "playsCount": 91138,
    "badge": "Featured"
  },
  {
    "id": "airgap",
    "title": "Airgap",
    "description": "The repository is a browser PWA/library of independent two-player games whose moves are exchanged by sound or QR.",
    "genre": "Puzzle & Board",
    "playUrl": "https://jakeave.github.io/airgap/",
    "rating": 9,
    "technology": [
      "TypeScript",
      "Deno",
      "HTML",
      "CSS"
    ],
    "modelAttribution": "Claude Fable 5.1",
    "githubUrl": "https://github.com/JakeAve/airgap",
    "coverImage": "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=600&q=80",
    "featured": false,
    "playsCount": 23725,
    "badge": "Trending"
  },
  {
    "id": "tic-tac-toe-mcp-game",
    "title": "Tic-Tac-Toe MCP Game",
    "description": "The README documents a real two-player tic-tac-toe game rendered inside Claude, ChatGPT or VS Code through MCP Apps.",
    "genre": "Puzzle & Board",
    "playUrl": "https://tic-tac-toe-mcp-game.baziewi.cz/mcp",
    "rating": 8.6,
    "technology": [
      "TypeScript",
      "React",
      "Vite",
      "MCP Apps"
    ],
    "modelAttribution": "Claude Fable 5.1",
    "githubUrl": "https://github.com/worgho2/tic-tac-toe-mcp-game",
    "coverImage": "https://raw.githubusercontent.com/worgho2/tic-tac-toe-mcp-game/main/docs/media/game.png",
    "featured": false,
    "playsCount": 91999,
    "badge": null
  },
  {
    "id": "gridwatch-signal-breach",
    "title": "GridWatch: Signal Breach",
    "description": "The README identifies GridWatch: Signal Breach as a static browser-playable cyberpunk signal-routing defense game.",
    "genre": "Strategy & RPG",
    "playUrl": "https://GridWatch-SignalBreach.warsignallabs.net",
    "rating": 9.1,
    "technology": [
      "Vite",
      "TypeScript",
      "HTML5 Canvas 2D",
      "Cloudflare Pages"
    ],
    "modelAttribution": "Claude Fable 5.1",
    "githubUrl": "https://github.com/remeadows/gridwatch-signal-breach",
    "coverImage": "https://raw.githubusercontent.com/remeadows/gridwatch-signal-breach/main/src/assets/board/phase6/gw-phase6-core-board-v1.webp",
    "featured": false,
    "playsCount": 23407,
    "badge": "Trending"
  },
  {
    "id": "top-10-tension",
    "title": "Top-10 Tension",
    "description": "The repository is a live football-trivia game platform with four independently playable modes: daily Top-10 category guessing, Club Run, Teammate Tell and Roll of Honour.",
    "genre": "Puzzle & Board",
    "playUrl": "https://top-10-tension.cuong-luu.workers.dev",
    "rating": 8.9,
    "technology": [
      "React",
      "Vite",
      "TypeScript",
      "Hono"
    ],
    "modelAttribution": "Claude Fable 5.1",
    "githubUrl": "https://github.com/cuongluu8/tenable",
    "coverImage": "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=600&q=80",
    "featured": false,
    "playsCount": 91186,
    "badge": null
  },
  {
    "id": "turbo-kart-rally",
    "title": "Turbo Kart Rally",
    "description": "Arcade 3D kart racer with steering and drifting input, seven AI rivals, laps, items, race state, finish results, and procedural assets.",
    "genre": "3D & Racing",
    "playUrl": "https://bridge-mind.github.io/turbo-kart-rally/",
    "rating": 9.3,
    "technology": [
      "Three.js",
      "JavaScript",
      "WebGL",
      "Browser"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/bridge-mind/turbo-kart-rally",
    "coverImage": "https://raw.githubusercontent.com/bridge-mind/turbo-kart-rally/main/docs/screenshots/race.jpg",
    "featured": true,
    "playsCount": 34418,
    "badge": "Trending"
  },
  {
    "id": "claude-opus-5-5-one-shot-three-js-games",
    "title": "Claude Opus 5.5 one-shot Three.js games",
    "description": "Three distinct source games: coastal cycling with fish and achievements; FPS ship-map bot combat; multi-track drifting racer.",
    "genre": "3D & Racing",
    "playUrl": "https://claude-opus-5-5.riba2534.cn/",
    "rating": 9,
    "technology": [
      "Three.js",
      "JavaScript",
      "esbuild",
      "WebGL"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/riba2534/claude-opus-5-5-demo",
    "coverImage": "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&q=80",
    "featured": false,
    "playsCount": 88715,
    "badge": "Trending"
  },
  {
    "id": "terrabrowser",
    "title": "Terrabrowser",
    "description": "Browser sandbox action-adventure with movement, mining, crafting, combat, bosses, progression, world generation and saves.",
    "genre": "Action & Combat",
    "playUrl": "https://terrabrowser.vercel.app",
    "rating": 9.1,
    "technology": [
      "JavaScript",
      "Canvas 2D",
      "Web Audio",
      "Browser"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/Wimmboo2/Terrabrowser",
    "coverImage": "https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=600&q=80",
    "featured": false,
    "playsCount": 45058,
    "badge": "Trending"
  },
  {
    "id": "palmera-bay",
    "title": "Palmera Bay",
    "description": "Playable free-roam driving prototype with keyboard controls, a fast convertible, coastal city, road reset, camera options, nitro and procedural audio.",
    "genre": "Puzzle & Board",
    "playUrl": "https://cahlik.net/palmera-bay/",
    "rating": 8.2,
    "technology": [
      "Three.js",
      "JavaScript",
      "WebGL",
      "Browser"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/vcahlik/palmera-bay",
    "coverImage": "https://raw.githubusercontent.com/theolundqvist/frontier-games/main/media/palmera-bay/preview.webp",
    "featured": false,
    "playsCount": 84644,
    "badge": "Featured"
  },
  {
    "id": "fishslop",
    "title": "Fishslop",
    "description": "Underwater reef-keeping game with submarine movement, fish feeding, coin collection, upgrade economy, sonar discovery and progression tiers.",
    "genre": "3D & Racing",
    "playUrl": "https://vasu-devs.github.io/FishSlop_Opus5.5/",
    "rating": 9.1,
    "technology": [
      "Three.js",
      "TypeScript",
      "WebGL",
      "Browser"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/vasu-devs/FishSlop_Opus5.5",
    "coverImage": "https://raw.githubusercontent.com/vasu-devs/FishSlop_Opus5.5/main/docs/screens/03-sonar.png",
    "featured": false,
    "playsCount": 55085,
    "badge": "Trending"
  },
  {
    "id": "web-grand-prix",
    "title": "Web Grand Prix",
    "description": "F1-style browser race with player controls, AI rivals, 6–8 km circuits, weather, tyres, pit stops, lap/race classification and results.",
    "genre": "3D & Racing",
    "playUrl": "https://f1-demo.gatoartstudio.com/",
    "rating": 9,
    "technology": [
      "Next.js 16",
      "React 19",
      "TypeScript",
      "Three.js"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/GatoArtStudio/f1-opus-5.5",
    "coverImage": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80",
    "featured": false,
    "playsCount": 79065,
    "badge": "Trending"
  },
  {
    "id": "slide-rush",
    "title": "Slide Rush",
    "description": "3D waterslide race with steering/jump input, 12 AI rivals, shortcut, finish and falling-out states, practice checkpoints, and saved results.",
    "genre": "3D & Racing",
    "playUrl": "https://kjlkurt.github.io/waterslide-game-opus-5.5/",
    "rating": 9,
    "technology": [
      "Three.js",
      "Vite",
      "JavaScript",
      "PWA"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/KJLKurt/waterslide-game-opus-5.5",
    "coverImage": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80",
    "featured": false,
    "playsCount": 64272,
    "badge": "Trending"
  },
  {
    "id": "catgirl-pachinko",
    "title": "Catgirl Pachinko",
    "description": "Playable browser pachinko with ball physics, prize pockets, payout/odds rules, editor, autoplay and results.",
    "genre": "3D & Racing",
    "playUrl": "https://maoku.github.io/Opus55CatgirlPachi/",
    "rating": 8.3,
    "technology": [
      "TypeScript",
      "WebGL2",
      "Rapier 2D",
      "Vite"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/Maoku/Opus55CatgirlPachi",
    "coverImage": "https://raw.githubusercontent.com/Maoku/Opus55CatgirlPachi/main/Opus55CatgirlPachi.jpg",
    "featured": false,
    "playsCount": 72103,
    "badge": null
  },
  {
    "id": "twilight-crossing-neural-rts",
    "title": "Twilight Crossing — Neural RTS",
    "description": "Creator reports porting the Unity RTS to the web with Opus 5.",
    "genre": "3D & Racing",
    "playUrl": "https://mattitynka.github.io/JEV-RTS/",
    "rating": 8,
    "technology": [
      "Three.js",
      "JavaScript",
      "WebGL",
      "Browser"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/MattiTynka/JEV-RTS",
    "coverImage": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80",
    "featured": false,
    "playsCount": 72412,
    "badge": null
  },
  {
    "id": "claude-opus-5-5-browser-games-17-projects",
    "title": "Claude Opus 5.5 Browser Games — 17 Projects",
    "description": "The collection README states that Claude Opus 5.",
    "genre": "Puzzle & Board",
    "playUrl": "https://swan4er.github.io/opus-100-projects/002-chess-mind/",
    "rating": 9.2,
    "technology": [
      "JavaScript",
      "HTML",
      "Three.js",
      "WebGL"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/swan4er/opus-100-projects",
    "coverImage": "https://raw.githubusercontent.com/swan4er/opus-100-projects/main/002-chess-mind/preview.jpg",
    "featured": true,
    "playsCount": 63917,
    "badge": "Trending"
  },
  {
    "id": "claude-opus-5-5-browser-games-3-projects",
    "title": "Claude Opus 5.5 Browser Games — 3 Projects",
    "description": "Count three distinct browser games: Neon Siege, Mortal Clash, and Rooftop Sniper: Last Light.",
    "genre": "3D & Racing",
    "playUrl": "https://promptengineer48.github.io/claude-opus-5.5-games/neon-siege/",
    "rating": 7.9,
    "technology": [
      "Three.js",
      "JavaScript",
      "WebGL",
      "Browser"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/PromptEngineer48/claude-opus-5.5-games",
    "coverImage": "https://raw.githubusercontent.com/theolundqvist/frontier-games/main/media/neon-siege/preview.webp",
    "featured": false,
    "playsCount": 79320,
    "badge": null
  },
  {
    "id": "nova-lancer",
    "title": "Nova Lancer",
    "description": "A Star Fox-inspired browser rail shooter with player flight controls, enemy formations, bosses, and procedurally generated terrain, models, music, and effects.",
    "genre": "3D & Racing",
    "playUrl": "https://tanuu5.github.io/nova-lancer/",
    "rating": 8.7,
    "technology": [
      "Three.js",
      "JavaScript",
      "WebGL",
      "Browser"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/tanuu5/nova-lancer",
    "coverImage": "https://raw.githubusercontent.com/tanuu5/nova-lancer/main/docs/screenshots/hero.jpg",
    "featured": false,
    "playsCount": 54691,
    "badge": "Featured"
  },
  {
    "id": "claude-opus-5-5-one-shot-3d-games-3-projects",
    "title": "Claude Opus 5.5 One-Shot 3D Games — 3 Projects",
    "description": "Count three separately playable Three.",
    "genre": "3D & Racing",
    "playUrl": "https://games.xdullboy.com/pelican/",
    "rating": 8.8,
    "technology": [
      "Three.js",
      "JavaScript",
      "WebGL",
      "Browser"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/xiiyioozzz/opus55-3d-games",
    "coverImage": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80",
    "featured": false,
    "playsCount": 84841,
    "badge": null
  },
  {
    "id": "pixelartgameopus-new-meridian-games",
    "title": "PixelArtGameOpus — New Meridian Games",
    "description": "Count The Hourglass City and The Black Sedan as two distinct playable units: a point-and-click detective adventure and a separate real-time driving-and-combat test-level prototype.",
    "genre": "Action & Combat",
    "playUrl": "https://odiriuss.github.io/PixelArtGameOpus/hourglass_city.html",
    "rating": 8.9,
    "technology": [
      "JavaScript",
      "Canvas 2D",
      "Browser"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/Odiriuss/PixelArtGameOpus",
    "coverImage": "https://raw.githubusercontent.com/Odiriuss/PixelArtGameOpus/main/docs/city_title.png",
    "featured": false,
    "playsCount": 44634,
    "badge": null
  },
  {
    "id": "fall-line",
    "title": "Fall Line",
    "description": "Count Fall Line as the portfolio’s player-driven freeride snowboard/ski game.",
    "genre": "Puzzle & Board",
    "playUrl": "https://nipale-ai.github.io/opus-5-5-overnight-builds/fall-line/",
    "rating": 9,
    "technology": [
      "Three.js",
      "JavaScript",
      "WebGL",
      "Browser"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/Nipale-ai/opus-5-5-overnight-builds",
    "coverImage": "https://raw.githubusercontent.com/Nipale-ai/opus-5-5-overnight-builds/main/vorschau-fall-line.jpg",
    "featured": false,
    "playsCount": 88848,
    "badge": "Trending"
  },
  {
    "id": "f1-racing-game",
    "title": "F1 Racing Game",
    "description": "F1 Racing Game - Instant web game crafted with Three.js and AI innovation.",
    "genre": "3D & Racing",
    "playUrl": "https://vibe-f1-racing.pages.dev",
    "rating": 8.3,
    "technology": [
      "Three.js",
      "JavaScript",
      "WebGL",
      "Browser"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/hirosichen/ai-f1-racing-game",
    "coverImage": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80",
    "featured": false,
    "playsCount": 33975,
    "badge": null
  },
  {
    "id": "sky-rings",
    "title": "Sky Rings",
    "description": "Sky Rings - Instant web game crafted with Three.js and AI innovation.",
    "genre": "3D & Racing",
    "playUrl": "https://vibe-sky-rings.pages.dev",
    "rating": 8.4,
    "technology": [
      "Three.js",
      "JavaScript",
      "WebGL",
      "Browser"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/hirosichen/ai-sky-rings-game",
    "coverImage": "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&q=80",
    "featured": false,
    "playsCount": 91252,
    "badge": null
  },
  {
    "id": "harbor-master",
    "title": "Harbor Master",
    "description": "A superyacht docking simulator with twin-engine and thruster controls, wind, collision penalties and a position-and-heading docking goal.",
    "genre": "3D & Racing",
    "playUrl": "https://vibe-harbor-master.pages.dev",
    "rating": 8.2,
    "technology": [
      "Three.js",
      "JavaScript",
      "WebGL",
      "Browser"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/hirosichen/ai-harbor-master-game",
    "coverImage": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80",
    "featured": false,
    "playsCount": 22954,
    "badge": null
  },
  {
    "id": "long-wind",
    "title": "Long Wind",
    "description": "A three-chapter wuxia action game with player combat, enemy AI, bosses, parries and progression.",
    "genre": "3D & Racing",
    "playUrl": "https://jbang2004.github.io/long-wind/",
    "rating": 9,
    "technology": [
      "Three.js",
      "JavaScript",
      "WebGL",
      "Browser"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/jbang2004/long-wind",
    "coverImage": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80",
    "featured": false,
    "playsCount": 91997,
    "badge": "Trending"
  },
  {
    "id": "vibe-games-arcade",
    "title": "Vibe Games Arcade",
    "description": "Four source-separated browser games: a MOBA simulation, voxel sandbox, lane-defense game and card roguelike.",
    "genre": "Puzzle & Board",
    "playUrl": "https://icebear0828.github.io/vibe-games/lol/",
    "rating": 8.1,
    "technology": [
      "React",
      "TypeScript",
      "Vite",
      "Canvas"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/icebear0828/vibe-games",
    "coverImage": "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=600&q=80",
    "featured": false,
    "playsCount": 24178,
    "badge": "Featured"
  },
  {
    "id": "gpt-6-astra-one-sentence-games",
    "title": "GPT-6 Astra One-Sentence Games",
    "description": "Two browser game projects: a Greek civilization turn-based strategy game and a real-time naval battle.",
    "genre": "3D & Racing",
    "playUrl": "https://astra-civilization-v-hellas.pages.dev",
    "rating": 8.5,
    "technology": [
      "Three.js",
      "JavaScript",
      "WebGL",
      "Browser"
    ],
    "modelAttribution": "GPT-6 Astra",
    "githubUrl": "https://github.com/MXMX0811/gpt-6-astra-game",
    "coverImage": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80",
    "featured": false,
    "playsCount": 91067,
    "badge": null
  },
  {
    "id": "ponpoko-kart",
    "title": "Ponpoko Kart",
    "description": "A three-course, eight-kart browser racer with steering, drifting, items, gliding and lap progression.",
    "genre": "3D & Racing",
    "playUrl": "https://tanuu5.github.io/ponpoko-kart/",
    "rating": 8.8,
    "technology": [
      "Three.js",
      "JavaScript",
      "WebGL",
      "Browser"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/tanuu5/ponpoko-kart",
    "coverImage": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80",
    "featured": false,
    "playsCount": 35171,
    "badge": null
  },
  {
    "id": "gunbros",
    "title": "GunBros",
    "description": "A turn-based 2D artillery game for 2 to 8 players online: players pick one of 18 mobiles, charge shots with angle and power, and read the wind; destructible terrain, items, weather, sudden death, bots and a delay-based turn order.",
    "genre": "Arcade & Casual",
    "playUrl": "https://play.gunbros.luquematte.com/",
    "rating": 8,
    "technology": [
      "TypeScript",
      "Canvas 2D",
      "Vite",
      "Node.js"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/skelzer/gunbros-public",
    "coverImage": "https://raw.githubusercontent.com/skelzer/gunbros-public/main/docs/ui/maps/temple_desktop.png",
    "featured": false,
    "playsCount": 88484,
    "badge": null
  },
  {
    "id": "lethal-company-opus-edition",
    "title": "Lethal Company: Opus Edition",
    "description": "Collect scrap, avoid monsters, return to the ship and meet escalating profit quotas before the deadline; includes PeerJS co-op and keyboard/mouse controls.",
    "genre": "Puzzle & Board",
    "playUrl": "https://testyee-09.github.io/opus5.5Lethal/",
    "rating": 8,
    "technology": [
      "Three.js",
      "JavaScript",
      "WebGL",
      "Browser"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/TESTYEE-09/opus5.5Lethal",
    "coverImage": "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=600&q=80",
    "featured": false,
    "playsCount": 45776,
    "badge": null
  },
  {
    "id": "lumenrift",
    "title": "LUMENRIFT",
    "description": "Build towers and walls around the Beacon, manage upgrades and survive thirty nights; source implements enemy damage, victory and defeat.",
    "genre": "Action & Combat",
    "playUrl": "https://lumenrift.wbg.gg/",
    "rating": 8,
    "technology": [
      "TypeScript",
      "Canvas 2D",
      "Browser"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/WhiteBlackGoose/Lumenrift",
    "coverImage": "https://raw.githubusercontent.com/WhiteBlackGoose/Lumenrift/56517f60a44d49ef14e0e51b5df93d933b1a4f20/docs/img/hero.jpg",
    "featured": false,
    "playsCount": 84305,
    "badge": null
  },
  {
    "id": "arkanoid-neon",
    "title": "Arkanoid Neon",
    "description": "Control a paddle, break neon bricks, collect power-up capsules and advance through eight stages; score, lives and game-over states are implemented.",
    "genre": "Action & Combat",
    "playUrl": "https://jack-c3l2w.github.io/arkanoid-neon/",
    "rating": 7.5,
    "technology": [
      "JavaScript",
      "Canvas 2D",
      "Web Audio",
      "Browser"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/Jack-c3l2w/arkanoid-neon",
    "coverImage": "https://raw.githubusercontent.com/Jack-c3l2w/arkanoid-neon/70e416d2320d3f7fb726384c8da99403be1a8ca4/screenshots/title.png",
    "featured": false,
    "playsCount": 55752,
    "badge": null
  },
  {
    "id": "crabhouse-v2",
    "title": "Crabhouse v2",
    "description": "Tap to earn crab power, build combos, enter fever mode, buy upgrades and nurture a persistent crab collection.",
    "genre": "Action & Combat",
    "playUrl": "https://kamibukuro18.github.io/opuscrabhouse/",
    "rating": 7.5,
    "technology": [
      "JavaScript",
      "Canvas 2D",
      "Web Audio",
      "Browser"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/kamibukuro18/opuscrabhouse",
    "coverImage": "https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=600&q=80",
    "featured": false,
    "playsCount": 78625,
    "badge": null
  },
  {
    "id": "emberwake",
    "title": "Emberwake",
    "description": "Move and dash, collect embers, choose blessings and light braziers while surviving until dawn against a boss and enemy waves.",
    "genre": "3D & Racing",
    "playUrl": "https://emberwake.mogita.rocks",
    "rating": 8,
    "technology": [
      "Three.js",
      "JavaScript",
      "WebGL",
      "Browser"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/mogita/emberwake",
    "coverImage": "https://raw.githubusercontent.com/mogita/emberwake/46ebdb8574c2a87d9fcc8e2eddd77e1bfb91a0a5/docs/title.jpg",
    "featured": false,
    "playsCount": 64873,
    "badge": "Featured"
  },
  {
    "id": "claudejump",
    "title": "ClaudeJump",
    "description": "Move and jump in a local versus arena and knock the other player into the sea.",
    "genre": "Arcade & Casual",
    "playUrl": "https://claudejump.netlify.app",
    "rating": 7,
    "technology": [
      "JavaScript",
      "Canvas 2D",
      "Web Audio",
      "Browser"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/PrabhjotSodhi/ClaudeJump",
    "coverImage": "https://images.unsplash.com/photo-1551103782-8ab07afd45c1?w=600&q=80",
    "featured": false,
    "playsCount": 71573,
    "badge": null
  },
  {
    "id": "driftwing",
    "title": "DRIFTWING",
    "description": "Steer a glider through seeded procedural worlds with flight controls, wind and an optional AI copilot.",
    "genre": "3D & Racing",
    "playUrl": "https://kylebuildsai.github.io/driftwing/",
    "rating": 7.5,
    "technology": [
      "Three.js",
      "JavaScript",
      "WebGPU",
      "WebGL2"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/KyleBuildsAI/driftwing",
    "coverImage": "https://raw.githubusercontent.com/KyleBuildsAI/driftwing/ec17f78a9c3615adf90ecedc57f606143f1862d4/docs/screenshot.jpg",
    "featured": false,
    "playsCount": 72933,
    "badge": null
  },
  {
    "id": "deep-dive",
    "title": "Deep Dive",
    "description": "Explore an underwater station and complete interactive learning challenges about tokenization, prediction, memory and tools; scoring and task progression are distinct from the explanatory text.",
    "genre": "3D & Racing",
    "playUrl": "https://deep-dive-rosy.vercel.app",
    "rating": 7.5,
    "technology": [
      "React",
      "React Three Fiber",
      "Three.js",
      "TypeScript"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/chichiroxursox-droid/deep-dive",
    "coverImage": "https://raw.githubusercontent.com/chichiroxursox-droid/deep-dive/1871bd392880ffe7179eb7c75054d105fc55ab4d/docs/station.png",
    "featured": false,
    "playsCount": 63308,
    "badge": null
  },
  {
    "id": "pet-island",
    "title": "Pet Island",
    "description": "Explore an island with a pet, gather objects, fulfill villager quests, earn accessories and build a persistent bond.",
    "genre": "3D & Racing",
    "playUrl": "https://pet-island.vercel.app",
    "rating": 8,
    "technology": [
      "React",
      "React Three Fiber",
      "Three.js",
      "TypeScript"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/tahcin/pet-island",
    "coverImage": "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&q=80",
    "featured": false,
    "playsCount": 79750,
    "badge": null
  },
  {
    "id": "forja-abisal",
    "title": "Forja Abisal",
    "description": "Fight through retro FPS levels using several weapons, collect keys, find secrets and manage health and armor.",
    "genre": "3D & Racing",
    "playUrl": "https://carte1972.github.io/forja-abisal/",
    "rating": 8,
    "technology": [
      "Three.js",
      "TypeScript",
      "WebGL",
      "Browser"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/Carte1972/forja-abisal",
    "coverImage": "https://raw.githubusercontent.com/Carte1972/forja-abisal/7e9477a2c04a2ac28fee6a5b6a4ee6dab70149ac/docs/capturas/nivel_3_lago_de_lava.jpg",
    "featured": false,
    "playsCount": 54017,
    "badge": null
  },
  {
    "id": "tempora",
    "title": "Tempora",
    "description": "Choose a life across historical eras, advance years, work, build relationships and continue a dynasty; the simulation records life scores and generational progression.",
    "genre": "Arcade & Casual",
    "playUrl": "https://mofferato.github.io/tempora/",
    "rating": 7.5,
    "technology": [
      "JavaScript",
      "HTML",
      "Browser"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/Mofferato/tempora",
    "coverImage": "https://raw.githubusercontent.com/Mofferato/tempora/a9874dda365d0b21a3e046ca2b81fb866920de81/assets/screenshot.png",
    "featured": false,
    "playsCount": 85169,
    "badge": null
  },
  {
    "id": "out-of-the-box",
    "title": "OUT OF THE BOX",
    "description": "Evade guards, cameras, drones, scans and lasers to reach an escape portal; checkpoint bulletin boards preserve progress between failed attempts.",
    "genre": "Puzzle & Board",
    "playUrl": "https://tanuu5.github.io/out-of-the-box/",
    "rating": 8,
    "technology": [
      "Three.js",
      "TypeScript",
      "WebGL",
      "Browser"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/tanuu5/out-of-the-box",
    "coverImage": "https://raw.githubusercontent.com/tanuu5/out-of-the-box/31f6147c463b329bf6c554026857e9d133c6f65d/docs/screenshots/archive.jpg",
    "featured": false,
    "playsCount": 43911,
    "badge": null
  },
  {
    "id": "kaiju-dokan",
    "title": "KAIJU DOKAN!",
    "description": "Control a giant monster, destroy buildings for score and energy, fight tanks and helicopters and meet stage destruction goals before time or health runs out.",
    "genre": "3D & Racing",
    "playUrl": "https://tanuu5.github.io/kaiju-dokan/",
    "rating": 8,
    "technology": [
      "Three.js",
      "TypeScript",
      "WebGL",
      "Browser"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/tanuu5/kaiju-dokan",
    "coverImage": "https://raw.githubusercontent.com/tanuu5/kaiju-dokan/d245060aa3784c30cf2bea885a842edb9f74e37c/docs/images/title.jpg",
    "featured": false,
    "playsCount": 89067,
    "badge": "Featured"
  },
  {
    "id": "radikal-riders",
    "title": "Radikal Riders",
    "description": "Race a pizza-delivery motorbike through city stages, avoid obstacles and pass checkpoints before time expires; source tracks score, results and progression.",
    "genre": "3D & Racing",
    "playUrl": "https://javichur.github.io/radikal-bikers/leoGjAW41OH-fIkg/",
    "rating": 8,
    "technology": [
      "Three.js",
      "TypeScript",
      "WebGL",
      "Browser"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/javichur/radikal-bikers",
    "coverImage": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80",
    "featured": false,
    "playsCount": 33219,
    "badge": null
  },
  {
    "id": "survive-coders",
    "title": "Survive Coders",
    "description": "Platform through San Francisco, fight coding-themed enemies and defeat the Context Rot Hydra; speech powers also have keyboard and touch alternatives.",
    "genre": "Puzzle & Board",
    "playUrl": "https://survive-coders.vercel.app",
    "rating": 7.5,
    "technology": [
      "Phaser",
      "JavaScript",
      "Browser"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/travisstephenfraser/survive-coders",
    "coverImage": "https://raw.githubusercontent.com/travisstephenfraser/survive-coders/1ebffbf0079989ebd1333766f38b682b880fc58e/docs/screenshots/01-title.png",
    "featured": false,
    "playsCount": 91357,
    "badge": null
  },
  {
    "id": "pro-skater-the-warehouse",
    "title": "Pro Skater: The Warehouse",
    "description": "Skate two parks, chain tricks and combos, recover from bails and complete scored two-minute goals.",
    "genre": "Action & Combat",
    "playUrl": "https://skate-game-opus-5-5-blush.vercel.app/",
    "rating": 8.5,
    "technology": [
      "Godot 4",
      "GDScript",
      "Native desktop",
      "Browser"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/3D-Stories/skate-game-opus-5-5",
    "coverImage": "https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=600&q=80",
    "featured": false,
    "playsCount": 22182,
    "badge": null
  },
  {
    "id": "ombres",
    "title": "Ombres",
    "description": "Control a creature by phone, keyboard or gamepad; paint territory, strike opponents and score across timed party-game rounds.",
    "genre": "Puzzle & Board",
    "playUrl": "https://ombres.deploy.breizhware.com/",
    "rating": 8,
    "technology": [
      "React",
      "Three.js",
      "TypeScript",
      "WebGL"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/briossant/ombres",
    "coverImage": "https://images.unsplash.com/photo-1586165368502-1bad197a6461?w=600&q=80",
    "featured": false,
    "playsCount": 91987,
    "badge": null
  },
  {
    "id": "casa-de-gemas",
    "title": "Casa de Gemas",
    "description": "Interact with a seasonal garden, water and shake objects to find five gems per season and reach the final state.",
    "genre": "Action & Combat",
    "playUrl": "https://deepujain.github.io/casadegema/",
    "rating": 7.5,
    "technology": [
      "HTML",
      "JavaScript",
      "Canvas 2D",
      "Web Audio"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/deepujain/casadegema",
    "coverImage": "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&q=80",
    "featured": false,
    "playsCount": 24948,
    "badge": null
  },
  {
    "id": "felt-world",
    "title": "Felt World",
    "description": "Explore a procedural felt world by walking, driving, flying and diving; switch vehicles and animal forms and collect interactive music buttons.",
    "genre": "3D & Racing",
    "playUrl": "https://az9713.github.io/opus-5.5-open-world-game/feltworld/",
    "rating": 7.6,
    "technology": [
      "Three.js",
      "JavaScript",
      "WebGL",
      "Browser"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/az9713/opus-5.5-open-world-game",
    "coverImage": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80",
    "featured": false,
    "playsCount": 90941,
    "badge": null
  },
  {
    "id": "pok-mon-claude-red",
    "title": "Pokémon Claude Red",
    "description": "Travel Kanto, battle trainers, capture creatures, earn eight badges and defeat the Elite Four and Champion; save party progress.",
    "genre": "Action & Combat",
    "playUrl": "https://claudered.dev/",
    "rating": 8.4,
    "technology": [
      "JavaScript",
      "HTML",
      "Canvas 2D",
      "Browser"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/levy-street/pokemon-claude-red",
    "coverImage": "https://images.unsplash.com/photo-1563089145-599997674d42?w=600&q=80",
    "featured": false,
    "playsCount": 35923,
    "badge": null
  },
  {
    "id": "scribble-impostor",
    "title": "Scribble: Impostor",
    "description": "Host a 3–8-player drawing room and choose 3–20 rounds.",
    "genre": "Puzzle & Board",
    "playUrl": "https://scribble-impostor.onrender.com/",
    "rating": 7.9,
    "technology": [
      "Node.js",
      "Express",
      "Socket.io",
      "JavaScript"
    ],
    "modelAttribution": "Claude Opus",
    "githubUrl": "https://github.com/Anshul1336/scribble-impostor",
    "coverImage": "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=600&q=80",
    "featured": false,
    "playsCount": 88244,
    "badge": "Featured"
  },
  {
    "id": "first-person-blackjack",
    "title": "First-Person Blackjack",
    "description": "Inspect betting, six-deck settlement, hit/stand/double/split, dealer rules, bankroll persistence and rule tests.",
    "genre": "3D & Racing",
    "playUrl": "https://findahuman.github.io/ClaudeBlackJack/",
    "rating": 8.2,
    "technology": [
      "JavaScript",
      "CSS 3D",
      "Web Audio"
    ],
    "modelAttribution": "Claude Sonnet 5.5",
    "githubUrl": "https://github.com/FinDaHuman/ClaudeBlackJack",
    "coverImage": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80",
    "featured": false,
    "playsCount": 46491,
    "badge": null
  },
  {
    "id": "putt-quest-adventure-mini-golf",
    "title": "Putt Quest — Adventure Mini Golf",
    "description": "Inspect nine themed golf holes, aim/charge/putt input, collision physics, penalty strokes, scorecards and the headless solver.",
    "genre": "Puzzle & Board",
    "playUrl": "https://3d-golf-sonnet.vercel.app/",
    "rating": 8.5,
    "technology": [
      "Three.js",
      "JavaScript",
      "Vite",
      "Web Audio"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/leonvanzyl/3d-golf-sonnet",
    "coverImage": "https://images.unsplash.com/photo-1586165368502-1bad197a6461?w=600&q=80",
    "featured": false,
    "playsCount": 83958,
    "badge": null
  },
  {
    "id": "dynamite-mole-sunset-rush",
    "title": "Dynamite Mole / SUNSET RUSH",
    "description": "Inspect two separately scoped games: Dynamite Mole implements bombs, flame propagation, enemies, lives, five stages and exits; SUNSET RUSH implements steering, traffic, checkpoints, a timer, three stages and ending ranks.",
    "genre": "Arcade & Casual",
    "playUrl": "https://daikikobayashi.github.io/sonnet-5-5-web-game-samples/games/dynamite-mole/max/",
    "rating": 8.5,
    "technology": [
      "JavaScript",
      "Canvas 2D",
      "Web Audio"
    ],
    "modelAttribution": "Claude Sonnet 5.5",
    "githubUrl": "https://github.com/DaikiKobayashi/sonnet-5-5-web-game-samples",
    "coverImage": "https://images.unsplash.com/photo-1551103782-8ab07afd45c1?w=600&q=80",
    "featured": false,
    "playsCount": 56415,
    "badge": null
  },
  {
    "id": "yet-another-voxelcraft",
    "title": "Yet Another VoxelCraft",
    "description": "Inspect survival health/hunger, mining, crafting, tools, mobs, farming, creative controls and save slots.",
    "genre": "3D & Racing",
    "playUrl": "https://goldwinxs.github.io/YetAnotherVoxelCraft/",
    "rating": 8.3,
    "technology": [
      "Three.js",
      "JavaScript",
      "Web Audio"
    ],
    "modelAttribution": "Claude Sonnet 5.5",
    "githubUrl": "https://github.com/GoldwinXS/YetAnotherVoxelCraft",
    "coverImage": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80",
    "featured": false,
    "playsCount": 78178,
    "badge": null
  },
  {
    "id": "splash-rush",
    "title": "Splash Rush",
    "description": "Inspect steering, jump timing, sliding/airborne/falling/finished states, twelve NPCs, checkpoints, shortcut landing, finish order and offline PWA tests.",
    "genre": "3D & Racing",
    "playUrl": "https://kjlkurt.github.io/waterslide-game-sonnet-5.5/",
    "rating": 8.5,
    "technology": [
      "Three.js",
      "JavaScript",
      "Vite",
      "PWA"
    ],
    "modelAttribution": "Claude Sonnet 5.5",
    "githubUrl": "https://github.com/KJLKurt/waterslide-game-sonnet-5.5",
    "coverImage": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80",
    "featured": false,
    "playsCount": 65469,
    "badge": null
  },
  {
    "id": "slipstream",
    "title": "Slipstream",
    "description": "Inspect a separately implemented waterslide racer with twelve NPCs, steering, ramps, a shortcut gap, falling/DNF, checkpoint practice and finish ranking.",
    "genre": "3D & Racing",
    "playUrl": "https://kjlkurt.github.io/waterslide-game-gpt-6.1-sol/",
    "rating": 8.5,
    "technology": [
      "Three.js",
      "JavaScript",
      "Vite",
      "PWA"
    ],
    "modelAttribution": "GPT-6.1 Sol",
    "githubUrl": "https://github.com/KJLKurt/waterslide-game-gpt-6.1-sol",
    "coverImage": "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&q=80",
    "featured": false,
    "playsCount": 71036,
    "badge": null
  },
  {
    "id": "core-business",
    "title": "Core Business",
    "description": "Inspect the Motherload-inspired 2.",
    "genre": "3D & Racing",
    "playUrl": "https://leichtbier.github.io/core-business/",
    "rating": 8.3,
    "technology": [
      "Three.js",
      "JavaScript",
      "Web Audio"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/Leichtbier/core-business",
    "coverImage": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80",
    "featured": false,
    "playsCount": 73448,
    "badge": null
  },
  {
    "id": "last-courier",
    "title": "Last Courier",
    "description": "Inspect the delivery robot, cargo balance, terrain scanning, rivers, ladder bridges, threats and seven delivery destinations.",
    "genre": "3D & Racing",
    "playUrl": "https://tanuu5.github.io/last-courier/",
    "rating": 8.6,
    "technology": [
      "Three.js",
      "JavaScript",
      "Web Audio"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/tanuu5/last-courier",
    "coverImage": "https://raw.githubusercontent.com/tanuu5/last-courier/54c03e750419218b7fb42f545a9e23e061c80747/docs/screenshots/gameplay.webp",
    "featured": false,
    "playsCount": 62694,
    "badge": "Featured"
  },
  {
    "id": "neon-bay",
    "title": "Neon Bay",
    "description": "Inspect driving input, rigid-body vehicles, collisions, traffic, car switching and wanted/police-chase systems; count the playable driving sandbox once, not its older v1 folder separately.",
    "genre": "3D & Racing",
    "playUrl": "https://l1vsun.github.io/NEONBAY/",
    "rating": 8.3,
    "technology": [
      "Three.js",
      "JavaScript",
      "WebGL"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/L1vsun/NEONBAY",
    "coverImage": "https://raw.githubusercontent.com/L1vsun/NEONBAY/baac38fecd1698c67dcf75ccffb1a82592798e9c/screenshots/drift.jpg",
    "featured": false,
    "playsCount": 80173,
    "badge": null
  },
  {
    "id": "adventure-mini-golf",
    "title": "Adventure Mini Golf",
    "description": "Inspect a distinct golf implementation with course loading, putt input, hazards, hole completion, scorecards and local best rounds; count its nine holes as one game.",
    "genre": "Puzzle & Board",
    "playUrl": "https://3d-golf-opus.vercel.app/",
    "rating": 8.4,
    "technology": [
      "Three.js",
      "JavaScript",
      "Vite",
      "Web Audio"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/leonvanzyl/3d-golf-opus",
    "coverImage": "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=600&q=80",
    "featured": false,
    "playsCount": 53340,
    "badge": null
  },
  {
    "id": "outpace",
    "title": "Outpace",
    "description": "Inspect typing-to-run input, jumps, creature collisions, health, adaptive chase wave, sprint/chase outcomes and score validation.",
    "genre": "Arcade & Casual",
    "playUrl": "https://outpace.ethanplus.ai/",
    "rating": 8.6,
    "technology": [
      "JavaScript",
      "Canvas 2D",
      "Node.js"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/ethanplusai/outpace",
    "coverImage": "https://raw.githubusercontent.com/ethanplusai/outpace/9500d7d52279c1b770257c979847e3559196d99a/docs/screenshots/hero.png",
    "featured": false,
    "playsCount": 85490,
    "badge": null
  },
  {
    "id": "open-backrooms",
    "title": "Open Backrooms",
    "description": "Inspect FPS movement, three procedural horror levels, hostile entities, health/death, exploration currency, safe-zone interactions and an offline AI mode.",
    "genre": "3D & Racing",
    "playUrl": "https://awn3x.github.io/Open-Backrooms/",
    "rating": 8.5,
    "technology": [
      "Three.js",
      "TypeScript",
      "Vite",
      "WebSocket"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/awn3x/Open-Backrooms",
    "coverImage": "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&q=80",
    "featured": false,
    "playsCount": 43186,
    "badge": null
  },
  {
    "id": "elden-kart",
    "title": "Elden Kart",
    "description": "Inspect eight racers, four circuits, ten items, Grand Prix, kart input, AI and finish ranking.",
    "genre": "3D & Racing",
    "playUrl": "https://elden-kart.vercel.app/",
    "rating": 8.5,
    "technology": [
      "Three.js",
      "JavaScript",
      "Vite",
      "Web Audio"
    ],
    "modelAttribution": "Claude Sonnet 5.5",
    "githubUrl": "https://github.com/Manoz/elden-kart",
    "coverImage": "https://raw.githubusercontent.com/Manoz/elden-kart/17d7212e143c88a47bc0e2d396d7247b4a8e033d/docs/banner.webp",
    "featured": false,
    "playsCount": 89279,
    "badge": null
  },
  {
    "id": "mall-action-model-benchmark",
    "title": "Mall Action — Model Benchmark",
    "description": "Inspect the opus-5-5, sonnet-5-5 and gpt-6-1-sol branches, not the README-only main branch.",
    "genre": "Action & Combat",
    "playUrl": "https://rlorca.github.io/mall-action/opus-5.5/",
    "rating": 8.5,
    "technology": [
      "TypeScript",
      "Canvas 2D",
      "Vite",
      "Web Audio"
    ],
    "modelAttribution": "Claude Opus 5.5",
    "githubUrl": "https://github.com/rlorca/mall-action",
    "coverImage": "https://raw.githubusercontent.com/rlorca/mall-action/sonnet-5-5/docs/mall.png",
    "featured": false,
    "playsCount": 32462,
    "badge": null
  },
  {
    "id": "particle-workshop",
    "title": "Particle Workshop",
    "description": "Inspect implemented atom-building controls, identity/star rules, periodic-table tasks, molecules, ion work, orders, quizzes and ending progression.",
    "genre": "Puzzle & Board",
    "playUrl": "https://snug-matter-composition-game.vercel.app/",
    "rating": 8,
    "technology": [
      "Next.js",
      "React",
      "TypeScript",
      "Phaser"
    ],
    "modelAttribution": "Claude Sonnet 5.5",
    "githubUrl": "https://github.com/tgtec26/snug-matter-composition-game",
    "coverImage": "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=600&q=80",
    "featured": false,
    "playsCount": 91455,
    "badge": null
  },
  {
    "id": "alice-in-the-watercolor-garden",
    "title": "Alice in the Watercolor Garden",
    "description": "Inspect third-person movement, jumping, paint shots that defeat card soldiers, bottle collection and completion after three DRINK ME bottles.",
    "genre": "Puzzle & Board",
    "playUrl": "https://hatakoma.github.io/cc_alice/",
    "rating": 7.8,
    "technology": [
      "Three.js",
      "JavaScript",
      "Web Audio"
    ],
    "modelAttribution": "Claude Sonnet 5.5",
    "githubUrl": "https://github.com/hatakoma/cc_alice",
    "coverImage": "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=600&q=80",
    "featured": false,
    "playsCount": 21410,
    "badge": "Featured"
  },
  {
    "id": "buzzword-dash",
    "title": "Buzzword Dash",
    "description": "Inspect a 3D medical-study endless runner with lane/swipe input, diagnostic answer gates, jumping/sliding, obstacles, lives, coins, streaks and study/endless modes.",
    "genre": "Puzzle & Board",
    "playUrl": "https://pathomnemonic.github.io/buzzword-dash-v2/",
    "rating": 8.3,
    "technology": [
      "Three.js",
      "JavaScript",
      "Vite"
    ],
    "modelAttribution": "Claude Sonnet 5.5",
    "githubUrl": "https://github.com/pathomnemonic/buzzword-dash-v2",
    "coverImage": "https://images.unsplash.com/photo-1586165368502-1bad197a6461?w=600&q=80",
    "featured": false,
    "playsCount": 91968,
    "badge": null
  }
];

export const COMBINED_GAMES: ToleeGame[] = [
  ...TOP_30_GITHUB_GAMES,
  ...TOLEE_GAMES,
];

export function getAllGames(): ToleeGame[] {
  return COMBINED_GAMES;
}

export function getMultiplayerRepos(): MultiplayerRepo[] {
  return READY_MULTIPLAYER_REPOS;
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
