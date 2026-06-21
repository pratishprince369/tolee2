import { prisma } from '@/lib/prisma';

// Curated high-quality mock data assets for realistic simulation
const MOCK_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
];

const MOCK_NAMES = [
  'Aarav Sharma', 'Ananya Iyer', 'Vihaan Patel', 'Diya Nair', 'Kabir Mehta',
  'Ishaan Roy', 'Aanya Gupta', 'Rohan Sen', 'Kavya Reddy', 'Aditya Deshmukh',
  'Siddharth Joshi', 'Meera Rao', 'Neha Verma', 'Arjun Malhotra', 'Priya Kapoor',
  'Rahul Bhatia', 'Riya Saxena', 'Karan Johar', 'Shreya Ghoshal', 'Vikram Seth',
  'Tanvi Hegde', 'Amit Trivedi', 'Sneha Paul', 'Devendra Fadnavis', 'Sunita Rao'
];

const MOCK_PROFESSIONS = [
  'UX Designer', 'Software Engineer', 'Startup Founder', 'Digital Marketer',
  'Product Manager', 'Real Estate Broker', 'Content Creator', 'Fitness Coach',
  'Investment Banker', 'Travel Blogger', 'Venture Capitalist', 'Data Scientist',
  'Creative Director', 'Public Speaker', 'Brand Strategist'
];

const MOCK_BIOS = [
  'Building the next big thing in Web3. 🚀',
  'Code is poetry. | Fullstack Engineer. 💻',
  'Passionate about scaling startups from 0 to 1.',
  'Helping brands tell stories that drive growth. 📈',
  'Gym is my therapy. | Online fitness advisor.',
  'Exploring the world, one coffee shop at a time. ✈️',
  'Simplifying real estate and property investments.',
  'Human-centered design is the future. 🎨',
  'Always learning, always creating. | Podcast Host.',
  'Investing in early-stage tech founders.',
  'Data speaks louder than opinions. 📊',
  'Living life in full resolution.',
];

const MOCK_LOCATIONS = [
  'Mumbai, Maharashtra', 'Bangalore, Karnataka', 'Pune, Maharashtra',
  'Delhi NCR', 'Hyderabad, Telangana', 'Chennai, Tamil Nadu', 'Kolkata, West Bengal'
];

const MOCK_VIDEOS = [
  'https://assets.mixkit.co/videos/preview/mixkit-keyboard-typing-in-a-dark-room-41981-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-holding-and-using-a-smartphone-41983-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-business-team-in-a-meeting-room-40502-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-man-working-on-his-laptop-in-a-cafe-40285-large.mp4',
];

const MOCK_COMMENTS = [
  'This is super helpful, thanks for sharing!',
  'Absolutely spot on. Consistency makes all the difference.',
  'Love the layout! What font did you use here?',
  'Incredible shot. Definitely adding this location to my list.',
  'Let’s connect! I am building a startup in a similar space.',
  'Amazing work! Keep pushing.',
  'Well written. Couldn’t agree more.',
  'Wow, this is so clean! Great setup.',
  'Very inspiring! 🔥',
  'Thanks for the motivation this morning.',
];

const HARDCODED_GROUPS: Record<string, number> = {
  'mumbai business group': 2400000,
  'startup india': 850000,
  'real estate investors': 5500000,
  'travel community': 120000,
  'fitness club': 2100000,
  'gurgaon real estate agents': 2125168,
  'flats for rent in noida': 760594,
  'property in dubai': 1634347,
  'gold jewellery design': 324100,
  'gorakhpur': 82300
};

// Returns simulation settings with default fallbacks
export async function getSimulationSettings() {
  try {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'global' },
    });
    if (!settings) {
      return {
        simulationMode: false,
        simulatedUsersCount: 100,
        simulatedPostsCount: 50,
        simulatedReelsCount: 50,
        minLikes: 100,
        maxLikes: 10000,
        minComments: 5,
        maxComments: 200,
        minViews: 1000,
        maxViews: 100000,
        minGroupMembers: 5000,
        maxGroupMembers: 5000000,
      };
    }
    return settings;
  } catch (error) {
    console.error('Error fetching simulation settings:', error);
    return {
      simulationMode: false,
      simulatedUsersCount: 100,
      simulatedPostsCount: 50,
      simulatedReelsCount: 50,
      minLikes: 100,
      maxLikes: 10000,
      minComments: 5,
      maxComments: 200,
      minViews: 1000,
      maxViews: 100000,
      minGroupMembers: 5000,
      maxGroupMembers: 5000000,
    };
  }
}

// Quick check if simulation mode is active
export async function getIsSimulationModeOn(): Promise<boolean> {
  const settings = await getSimulationSettings();
  return settings.simulationMode;
}

// Generate deterministic member count for a group
export function getGroupMemberCount(
  groupId: string,
  name: string,
  realCount: number,
  isSimulationOn: boolean,
  min: number,
  max: number
): number {
  if (!isSimulationOn) return realCount;
  const lowerName = name.toLowerCase().trim();
  if (HARDCODED_GROUPS[lowerName] !== undefined) {
    return HARDCODED_GROUPS[lowerName];
  }
  // Simple deterministic hash based on groupId to make the count consistent across reloads
  let hash = 0;
  for (let i = 0; i < groupId.length; i++) {
    hash = groupId.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);
  const range = max - min;
  return min + (hash % (range || 1));
}

// Deterministically format compact count strings
export function formatCompactNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}

// Upgraded Weighted distribution of engagement stats
export function getSimulatedEngagement(
  postId: string,
  minLikes?: number,
  maxLikes?: number,
  minComments?: number,
  maxComments?: number,
  minViews?: number,
  maxViews?: number
) {
  let hash = 0;
  for (let i = 0; i < postId.length; i++) {
    hash = postId.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);

  // Distribution roll
  const roll = hash % 100;
  
  let likes = 0;
  let comments = 0;
  let views = 0;
  let shares = 0;
  let saves = 0;

  if (roll < 2) {
    // Viral Post
    likes = 40000 + (hash % 60000);
    comments = 2000 + ((hash >> 2) % 4000);
    views = 1500000 + ((hash >> 4) % 3000000);
    shares = 2000 + ((hash >> 6) % 6000);
    saves = 1000 + ((hash >> 8) % 3000);
  } else if (roll < 10) {
    // Trending Post
    likes = 5000 + (hash % 5000);
    comments = 300 + ((hash >> 2) % 300);
    views = 100000 + ((hash >> 4) % 150000);
    shares = 300 + ((hash >> 6) % 600);
    saves = 200 + ((hash >> 8) % 500);
  } else if (roll < 35) {
    // Popular Post
    likes = 500 + (hash % 700);
    comments = 40 + ((hash >> 2) % 50);
    views = 10000 + ((hash >> 4) % 20000);
    shares = 30 + ((hash >> 6) % 70);
    saves = 20 + ((hash >> 8) % 60);
  } else {
    // Normal Post
    likes = 15 + (hash % 35);
    comments = 2 + ((hash >> 2) % 7);
    views = 500 + ((hash >> 4) % 1000);
    shares = 1 + ((hash >> 6) % 6);
    saves = 1 + ((hash >> 8) % 5);
  }

  if (views <= likes) {
    views = likes * 3 + (hash % 100);
  }

  return {
    likes,
    comments,
    views,
    shares,
    saves,
  };
}

// Generate realistic simulated comments on the fly
export function generateDynamicComments(postId: string, count: number) {
  const list = [];
  const commentsPool = [
    'Amazing ❤️', 'Very useful.', 'Thanks for sharing.', 'Excellent information.',
    'Nice video 👏', 'Super 🔥', 'Keep posting.', 'Helpful.', 'Interesting.', 'Loved this.',
    'Absolutely spot on. Consistency makes all the difference.', 'Love the layout! What font did you use here?',
    'Incredible shot. Definitely adding this location to my list.', 'Let’s connect! I am building a startup in a similar space.',
    'Amazing work! Keep pushing.', 'Well written. Couldn’t agree more.', 'Wow, this is so clean! Great setup.',
    'Very inspiring! 🔥', 'Thanks for the motivation this morning.', 'Insightful share, thanks!',
    'Great point of view.', 'Keep it up! 🙌', 'This is exactly what I needed today.', 'Brilliant!',
    'Simple yet powerful.', 'Highly recommend reading this.', 'Love the vibe!'
  ];

  for (let i = 0; i < count; i++) {
    let seed = 0;
    const str = postId + i.toString();
    for (let j = 0; j < str.length; j++) {
      seed = str.charCodeAt(j) + ((seed << 5) - seed);
    }
    seed = Math.abs(seed);

    const authorIndex = seed % MOCK_NAMES.length;
    const name = MOCK_NAMES[authorIndex];
    const username = `sim_${name.toLowerCase().replace(/\s+/g, '')}_${seed % 100}`;
    const avatar = MOCK_AVATARS[seed % MOCK_AVATARS.length];
    const createdAt = new Date(Date.now() - (i + 1) * 35 * 60 * 1000);

    list.push({
      id: `sim-comment-${postId}-${i}`,
      postId,
      content: commentsPool[seed % commentsPool.length],
      createdAt,
      isSimulation: true,
      author: {
        id: `sim-user-${seed % 1000}`,
        name,
        username,
        avatar,
      }
    });
  }
  return list;
}

const CATEGORY_TEMPLATES: Record<string, {
  captions: string[];
  images: string[];
  videos: string[];
  polls: { question: string; options: string[] }[];
  questions: string[];
  events: string[];
  announcements: string[];
}> = {
  tech: {
    captions: [
      "Just built a beautiful Glassmorphism dashboard mockup. What do you think? #ux #webdev",
      "Is TypeScript really necessary for small projects? Let's discuss in the comments below. #programming",
      "A clean desk is a must for writing clean code! 💻☕ #desksetup #developer",
      "Here are my top 5 SaaS growth hacks that helped us scale 40% last month. Check them out! 🚀 #saas #marketing",
      "Exploring WebAssembly and its performance implications for next-gen web apps. #webassembly #tech"
    ],
    images: [
      'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80'
    ],
    videos: [
      'https://assets.mixkit.co/videos/preview/mixkit-keyboard-typing-in-a-dark-room-41981-large.mp4',
      'https://assets.mixkit.co/videos/preview/mixkit-man-working-on-his-laptop-in-a-cafe-40285-large.mp4'
    ],
    polls: [
      { question: "What is your primary backend language of choice?", options: ["Node.js / TS", "Python", "Go", "Rust"] },
      { question: "How do you manage frontend state in large React apps?", options: ["Zustand", "Redux Toolkit", "Context API", "Signal / Jotai"] }
    ],
    questions: [
      "What is the single most important programming language a beginner should learn in 2026?",
      "How do you handle error boundaries and crash reporting in Next.js applications?"
    ],
    events: [
      "Friday Tech Talk: Architecting AI Agents with LLMs! Register now.",
      "Hackathon 2026: Build a collaborative tool in 48 hours. Kickoff this Saturday at 10 AM!"
    ],
    announcements: [
      "🚀 Tolee Tech community is now officially live! Let's build together.",
      "📢 We've added a resource library channel. Post your guides and templates!"
    ]
  },
  money: {
    captions: [
      "Real estate investments in metro cities are booming. Here is a breakdown of the top areas to watch. #investing #realestate",
      "Always invest in relationships and networking before you need them. #business #growth",
      "How do you allocate your portfolio? Sharing my personal asset allocation model today. 📈 #finance #wealth",
      "Bootstrapping a startup from 0 to profitable is hard, but it is the most rewarding journey. #startups #indiehacker",
      "Mastering sales is the single most valuable skill in business. Here are 3 frameworks. #sales #business"
    ],
    images: [
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&fit=crop&q=80'
    ],
    videos: [
      'https://assets.mixkit.co/videos/preview/mixkit-business-team-in-a-meeting-room-40502-large.mp4',
      'https://assets.mixkit.co/videos/preview/mixkit-holding-and-using-a-smartphone-41983-large.mp4'
    ],
    polls: [
      { question: "Where are you investing most of your capital right now?", options: ["Real Estate", "Mutual Funds / Stocks", "Gold / Sovereign Bonds", "Crypto / Startups"] },
      { question: "What is your main financial goal for this year?", options: ["Increase Passive Income", "Clear All Debts", "Buy Property", "Start a Business"] }
    ],
    questions: [
      "What is the best way to get seed funding for a SaaS startup in India?",
      "How do you evaluate rental yield versus capital appreciation when buying real estate?"
    ],
    events: [
      "Startup Pitch Day: Meet 10 active angel investors this Wednesday!",
      "Masterclass: Wealth building through commercial real estate. Saturday 4 PM."
    ],
    announcements: [
      "📢 Mumbai Business Group just hit 2.4M members! Thank you all for joining.",
      "🚀 Premium investment guides section is now unlocked for all joined members!"
    ]
  },
  health: {
    captions: [
      "5 simple morning habits to boost your energy levels and focus. #health #wellness",
      "Consistency is key. 5 AM workouts hit different. Who else is up? 💪🔥 #fitness #motivation",
      "Eat your greens, stay hydrated, and sleep at least 7 hours. Simple advice, rarely followed. #lifestyle #nutrition",
      "Mental health is just as important as physical health. Take a break if you need it. 🧘‍♂️ #mindfulness",
      "Had an amazing workout session today. Your body can stand almost anything, it is your mind you have to convince."
    ],
    images: [
      'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80'
    ],
    videos: [
      'https://assets.mixkit.co/videos/preview/mixkit-holding-and-using-a-smartphone-41983-large.mp4',
      'https://assets.mixkit.co/videos/preview/mixkit-man-working-on-his-laptop-in-a-cafe-40285-large.mp4'
    ],
    polls: [
      { question: "What is your favorite form of physical exercise?", options: ["Weight Training", "Running / Cycling", "Yoga / Pilates", "Swimming / Sports"] },
      { question: "How many hours of sleep do you get on average?", options: ["Under 6 hours", "6 - 7 hours", "7 - 8 hours", "8+ hours"] }
    ],
    questions: [
      "What is the best diet plan for sustained energy throughout the day?",
      "How do you manage stress and burnout during busy work weeks?"
    ],
    events: [
      "Live Q&A: Ask Dr. Aarav anything about longevity and health! Saturday 5 PM.",
      "Online Bootcamp: High-Intensity Interval Training (HIIT) session this Sunday morning."
    ],
    announcements: [
      "📢 Welcome to the Doctors Community! Please read the verification rules pinned at the top.",
      "🚀 We are launching a weekly newsletter sharing curated healthcare tips next month!"
    ]
  },
  music: {
    captions: [
      "Just dropped a new acoustic cover! Let me know what you think in the comments. 🎵✨ #cover #acoustic",
      "A clean studio setup leads to beautiful melodies. Ready to create! 🎹🎧 #musicproducer #studio",
      "Music is the language of the soul. Sharing some tracks I've been working on. #indie #creator",
      "Practice makes perfect. Spending 2 hours on scales today. #musicianlife",
      "Listening to old vinyl records tonight. The warmth of analog sound is unmatched. 📻❤️ #vinyl #music"
    ],
    images: [
      'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&auto=format&fit=crop&q=80'
    ],
    videos: [
      'https://assets.mixkit.co/videos/preview/mixkit-keyboard-typing-in-a-dark-room-41981-large.mp4',
      'https://assets.mixkit.co/videos/preview/mixkit-man-working-on-his-laptop-in-a-cafe-40285-large.mp4'
    ],
    polls: [
      { question: "Which DAW do you prefer for music production?", options: ["Ableton Live", "FL Studio", "Logic Pro", "Pro Tools / Reaper"] },
      { question: "What is your favorite genre to listen to while working?", options: ["Lo-Fi / Chillhop", "Classical / Ambient", "Synthwave / Techno", "Rock / Indie"] }
    ],
    questions: [
      "How do you overcome writer's block when composing a new song?",
      "What is the best budget microphone for home studio vocal recording?"
    ],
    events: [
      "Virtual Jam Session: Join in with your instrument this Thursday at 8 PM!",
      "Workshop: Electronic Music Production for Beginners. Saturday afternoon."
    ],
    announcements: [
      "🚀 Our collaborative Spotify playlist is open for submissions! Add your tracks.",
      "📢 Weekly Creator Program spotlight is now open. Submit your work to get featured!"
    ]
  },
  general: {
    captions: [
      "Had an incredible brainstorming session today with the team! Excited for what we are building. #tolee #community",
      "Taking some time off to recharge by the lake. Nature is the best cure for burnout. 🌲🧘‍♂️ #peace #nature",
      "Sharing some daily wisdom: consistency is more important than intensity. #motivation #quotes",
      "An amazing view of the city skyline tonight. The city never sleeps! 🏙️❤️ #mumbai #skyline",
      "Had a wonderful conversation with a new friend today. Connect with people!"
    ],
    images: [
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&auto=format&fit=crop&q=80'
    ],
    videos: [
      'https://assets.mixkit.co/videos/preview/mixkit-holding-and-using-a-smartphone-41983-large.mp4',
      'https://assets.mixkit.co/videos/preview/mixkit-business-team-in-a-meeting-room-40502-large.mp4'
    ],
    polls: [
      { question: "How do you plan your day?", options: ["Notion / Digital Apps", "Paper Planner / Journal", "To-Do list on sticky notes", "No planning, go with the flow"] },
      { question: "What is your favorite time of day to be productive?", options: ["Early Morning", "Afternoon", "Late Night", "Whenever inspiration strikes"] }
    ],
    questions: [
      "What is the single best advice you've ever received in your life?",
      "How do you organize your digital life to avoid information overload?"
    ],
    events: [
      "Goal Setting Workshop: Let's design our 2026 roadmap this Sunday!",
      "Community Meetup: Coffee & networking. Next Friday at 6 PM."
    ],
    announcements: [
      "📢 Community updates: new layout and badges are now live! Check them out.",
      "🚀 Share your wins in the main feed. Let's celebrate our achievements!"
    ]
  }
};

function getCategoryKey(category: string): string {
  const norm = category.toLowerCase().trim();
  if (norm.includes('tech') || norm.includes('developer') || norm.includes('coding') || norm.includes('titans')) return 'tech';
  if (norm.includes('money') || norm.includes('business') || norm.includes('finance') || norm.includes('real estate') || norm.includes('startup') || norm.includes('invest') || norm.includes('india') || norm.includes('property') || norm.includes('dubai')) return 'money';
  if (norm.includes('health') || norm.includes('doctor') || norm.includes('medical') || norm.includes('fit') || norm.includes('wellness') || norm.includes('gym')) return 'health';
  if (norm.includes('music') || norm.includes('song') || norm.includes('audio') || norm.includes('soul')) return 'music';
  return 'general';
}

// Generate dynamic group posts mixed with real posts, shuffling on 15s time block
export function generateDynamicGroupPosts(
  toleeId: string,
  toleeName: string,
  category: string,
  realPosts: any[] = []
): any[] {
  const lowerName = toleeName.toLowerCase().trim();
  const slug = toleeName.replace(/\s+/g, '-').toLowerCase();
  
  let targetCount = 200;
  if (lowerName.includes('mumbai business') || lowerName.includes('mumbai_business') || slug.includes('mumbai-business')) {
    targetCount = 350;
  } else if (lowerName.includes('startup india') || lowerName.includes('startup_india') || slug.includes('startup-india')) {
    targetCount = 120;
  } else if (lowerName.includes('doctors community') || lowerName.includes('doctors_community') || slug.includes('doctors-community')) {
    targetCount = 500;
  } else if (lowerName.includes('real estate') || lowerName.includes('real_estate') || slug.includes('real-estate') || slug.includes('property')) {
    targetCount = 900;
  } else {
    let hash = 0;
    for (let i = 0; i < toleeId.length; i++) {
      hash = toleeId.charCodeAt(i) + ((hash << 5) - hash);
    }
    hash = Math.abs(hash);
    targetCount = 50 + (hash % 901); // 50 to 950
  }

  const catKey = getCategoryKey(category || toleeName);
  const templates = CATEGORY_TEMPLATES[catKey] || CATEGORY_TEMPLATES.general;

  // Time block rotates every 15 seconds
  const timeBlock = Math.floor(Date.now() / 15000);

  // Return up to 60 dynamic posts at once to ensure fast performance
  const activeCount = Math.min(targetCount, 60);
  const startIndex = timeBlock % targetCount;

  const simPosts: any[] = [];

  for (let i = 0; i < activeCount; i++) {
    const postIndex = (startIndex + i) % targetCount;
    const postId = `sim-post-${toleeId}-${postIndex}`;

    let postSeed = 0;
    for (let j = 0; j < postId.length; j++) {
      postSeed = postId.charCodeAt(j) + ((postSeed << 5) - postSeed);
    }
    postSeed = Math.abs(postSeed);

    const authorIdx = (postSeed + i) % MOCK_NAMES.length;
    const authorName = MOCK_NAMES[authorIdx];
    const username = `sim_${authorName.toLowerCase().replace(/\s+/g, '')}_${postSeed % 100}`;
    const avatar = MOCK_AVATARS[authorIdx % MOCK_AVATARS.length];
    const profession = MOCK_PROFESSIONS[authorIdx % MOCK_PROFESSIONS.length];
    const location = MOCK_LOCATIONS[postSeed % MOCK_LOCATIONS.length];

    const typeRoll = postSeed % 100;
    let postType = 'regular';
    let content = '';
    let mediaUrls: string | null = null;
    let mediaTypes: string | null = null;

    if (typeRoll < 12) {
      postType = 'poll';
      const pollTpl = templates.polls[postSeed % templates.polls.length];
      content = `📊 POLL: ${pollTpl.question}\n\nOptions:\n` + pollTpl.options.map((o, idx) => `  [ ] ${o}`).join('\n');
    } else if (typeRoll < 22) {
      postType = 'event';
      content = `📅 EVENT: ${templates.events[postSeed % templates.events.length]}`;
    } else if (typeRoll < 32) {
      postType = 'announcement';
      content = `📢 ANNOUNCEMENT: ${templates.announcements[postSeed % templates.announcements.length]}`;
    } else if (typeRoll < 47) {
      postType = 'question';
      content = `❓ QUESTION: ${templates.questions[postSeed % templates.questions.length]}`;
    } else {
      postType = 'regular';
      content = templates.captions[postSeed % templates.captions.length];
      
      const mediaRoll = (postSeed >> 2) % 100;
      if (mediaRoll < 45) {
        mediaUrls = templates.images[postSeed % templates.images.length];
        mediaTypes = 'image';
      } else if (mediaRoll < 65) {
        mediaUrls = templates.videos[postSeed % templates.videos.length];
        mediaTypes = 'video';
      }
    }

    // Stagger timestamp
    const createdAt = new Date(Date.now() - (i * 25 * 60 * 1000) - (timeBlock % 10) * 15 * 1000);

    const eng = getSimulatedEngagement(postId);

    simPosts.push({
      post: {
        id: postId,
        caption: content,
        mediaUrls,
        mediaTypes,
        postType,
        visibility: 'public',
        shareCount: eng.shares,
        location,
        subLocation: profession,
        createdAt,
        updatedAt: createdAt,
        isSimulation: true,
        author: {
          id: `sim-user-${authorIdx}`,
          name: authorName,
          username,
          avatar,
          isPrivate: false
        },
        tolees: [
          {
            tolee: {
              id: toleeId,
              name: toleeName,
              slug
            }
          }
        ],
        likes: [],
        savedBy: [],
        reposts: [],
        _count: {
          likes: eng.likes,
          comments: eng.comments,
          reposts: eng.shares,
          views: eng.views,
          saves: eng.saves
        },
        savesCount: eng.saves,
        comments: generateDynamicComments(postId, Math.min(eng.comments, 4))
      }
    });
  }

  // Interleave real posts and simulated posts in a natural 2 fakes, 1 real mix
  const mixed: any[] = [];
  let simIdx = 0;
  let realIdx = 0;

  while (simIdx < simPosts.length || realIdx < realPosts.length) {
    for (let k = 0; k < 2 && simIdx < simPosts.length; k++) {
      mixed.push(simPosts[simIdx]);
      simIdx++;
    }
    if (realIdx < realPosts.length) {
      mixed.push(realPosts[realIdx]);
      realIdx++;
    }
  }

  return mixed;
}

// Seed or update the pool of simulated users, posts, and comments
export async function syncSimulationData() {
  const settings = await getSimulationSettings();
  
  // 1. Clear existing simulated content to match exact configured counts cleanly
  await prisma.comment.deleteMany({ where: { isSimulation: true } });
  await prisma.postTolee.deleteMany({ where: { post: { isSimulation: true } } });
  await prisma.post.deleteMany({ where: { isSimulation: true } });
  await prisma.user.deleteMany({ where: { isSimulation: true } });

  if (!settings.simulationMode) {
    return { success: true, message: 'Simulation mode is OFF. Cleaned up simulated data.' };
  }

  // Cap database seeding to lightweight pools to keep admin interface fast and prevent requests timeouts
  const actualUsersCount = Math.min(settings.simulatedUsersCount, 150);
  const actualPostsCount = Math.min(settings.simulatedPostsCount, 100);
  const actualReelsCount = Math.min(settings.simulatedReelsCount, 100);

  // Fetch some active groups/Tolees to tag simulated posts to
  const activeTolees = await prisma.tolee.findMany({ select: { id: true } });
  if (activeTolees.length === 0) {
    return { success: false, error: 'No active groups (Tolees) found in the database to link simulated posts to.' };
  }

  // 2. Generate simulated users
  const usersToCreate = [];
  for (let i = 0; i < actualUsersCount; i++) {
    const name = MOCK_NAMES[i % MOCK_NAMES.length] + ' ' + (Math.floor(i / MOCK_NAMES.length) || '');
    const username = `sim_${name.toLowerCase().replace(/\s+/g, '_')}_${i}`;
    const email = `${username}@simulatedtolee.com`;
    const avatar = MOCK_AVATARS[i % MOCK_AVATARS.length];
    const profession = MOCK_PROFESSIONS[i % MOCK_PROFESSIONS.length];
    const bio = MOCK_BIOS[i % MOCK_BIOS.length] + ` | ${profession}`;
    const location = MOCK_LOCATIONS[i % MOCK_LOCATIONS.length];
    
    usersToCreate.push({
      username,
      name,
      email,
      avatar,
      image: avatar,
      bio,
      profession,
      location,
      isVerified: i % 4 === 0,
      isSimulation: true,
    });
  }

  await prisma.user.createMany({ data: usersToCreate });
  const createdUsers = await prisma.user.findMany({
    where: { isSimulation: true },
    select: { id: true }
  });

  if (createdUsers.length === 0) {
    return { success: false, error: 'Failed to retrieve seeded simulated users.' };
  }

  // 3. Generate simulated posts
  const postsToCreate = [];
  for (let i = 0; i < actualPostsCount; i++) {
    const author = createdUsers[i % createdUsers.length];
    const isImage = i % 3 !== 0;
    const mediaUrls = isImage ? CATEGORY_TEMPLATES.general.images[i % CATEGORY_TEMPLATES.general.images.length] : null;
    const mediaTypes = isImage ? 'image' : null;
    const caption = CATEGORY_TEMPLATES.general.captions[i % CATEGORY_TEMPLATES.general.captions.length];
    
    postsToCreate.push({
      authorId: author.id,
      caption,
      mediaUrls,
      mediaTypes,
      postType: 'regular',
      visibility: 'public',
      isSimulation: true,
      createdAt: new Date(Date.now() - i * 4 * 3600 * 1000),
      updatedAt: new Date(Date.now() - i * 4 * 3600 * 1000),
    });
  }

  for (let i = 0; i < actualReelsCount; i++) {
    const author = createdUsers[(i + 5) % createdUsers.length];
    const mediaUrls = MOCK_VIDEOS[i % MOCK_VIDEOS.length];
    const mediaTypes = 'video';
    const caption = `🔥 simulated reel: ${CATEGORY_TEMPLATES.general.captions[i % CATEGORY_TEMPLATES.general.captions.length].slice(0, 30)}...`;

    postsToCreate.push({
      authorId: author.id,
      caption,
      mediaUrls,
      mediaTypes,
      postType: 'reel',
      visibility: 'public',
      isSimulation: true,
      createdAt: new Date(Date.now() - i * 2 * 3600 * 1000),
      updatedAt: new Date(Date.now() - i * 2 * 3600 * 1000),
    });
  }

  await prisma.post.createMany({ data: postsToCreate });
  const createdPosts = await prisma.post.findMany({
    where: { isSimulation: true },
    select: { id: true, authorId: true }
  });

  const postToleeRelations = [];
  for (let i = 0; i < createdPosts.length; i++) {
    const post = createdPosts[i];
    const toleeIndex = i % activeTolees.length;
    postToleeRelations.push({
      postId: post.id,
      toleeId: activeTolees[toleeIndex].id,
      isPinned: false
    });

    if (activeTolees.length > 1 && i % 2 === 0) {
      const secondToleeIndex = (i + 1) % activeTolees.length;
      postToleeRelations.push({
        postId: post.id,
        toleeId: activeTolees[secondToleeIndex].id,
        isPinned: false
      });
    }
  }
  await prisma.postTolee.createMany({ data: postToleeRelations });

  // 4. Seeding static comments pool
  const commentsToCreate = [];
  for (let i = 0; i < createdPosts.length; i++) {
    const post = createdPosts[i];
    const commentCount = 2 + (i % 4);
    for (let j = 0; j < commentCount; j++) {
      const commenter = createdUsers[(i + j + 3) % createdUsers.length];
      if (commenter.id === post.authorId) continue;
      
      commentsToCreate.push({
        postId: post.id,
        authorId: commenter.id,
        content: MOCK_COMMENTS[ (i + j) % MOCK_COMMENTS.length ],
        isSimulation: true,
        createdAt: new Date(post.createdAt.getTime() + (j + 1) * 20 * 60 * 1000),
      });
    }
  }
  await prisma.comment.createMany({ data: commentsToCreate });

  return { success: true, message: `Simulation mode turned ON. Seeded database users, posts, and comments.` };
}
