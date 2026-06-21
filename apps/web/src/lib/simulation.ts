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

const MOCK_CAPTIONS = [
  'Had an incredible brainstorming session today with the team! Excited for what we are building. #startup #buildinpublic',
  'Just dropped a new design concept! What do you think about this glassmorphism layout? 🎨✨ #ux #design',
  'Consistency is key. 5 AM workouts hit different. Who else is up? 💪🔥 #fitness #motivation',
  'Taking some time off to recharge by the lake. Nature is the best cure for burnout. 🌲🧘‍♂️ #travel #peace',
  'Sharing my top 5 SaaS growth hacks that helped us scale 40% last month. Check the thread! 🚀 #marketing #growth',
  'A clean desk makes for clean code. Ready to crush this week! 💻☕ #programmer #desksetup',
  'An amazing view of the city skyline tonight. Mumbai never sleeps! 🏙️❤️ #mumbai #citylife',
  'Always invest in relationships before you need them. Networking done right. #business #career',
];

const MOCK_IMAGES = [
  'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80',
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

  // Cap the actual database records to a lightweight pool to prevent timeouts/crashes
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
      image: avatar, // standard next-auth field
      bio,
      profession,
      location,
      isVerified: i % 4 === 0, // 25% verified accounts
      isSimulation: true,
    });
  }

  // Batch insert users
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
  // regular posts
  for (let i = 0; i < actualPostsCount; i++) {
    const author = createdUsers[i % createdUsers.length];
    const isImage = i % 3 !== 0; // 66% image, 33% text posts
    const mediaUrls = isImage ? MOCK_IMAGES[i % MOCK_IMAGES.length] : null;
    const mediaTypes = isImage ? 'image' : null;
    const caption = MOCK_CAPTIONS[i % MOCK_CAPTIONS.length];
    
    postsToCreate.push({
      authorId: author.id,
      caption,
      mediaUrls,
      mediaTypes,
      postType: 'regular',
      visibility: 'public',
      isSimulation: true,
      createdAt: new Date(Date.now() - i * 4 * 3600 * 1000), // staggered timestamps
      updatedAt: new Date(Date.now() - i * 4 * 3600 * 1000),
    });
  }

  // reels posts
  for (let i = 0; i < actualReelsCount; i++) {
    const author = createdUsers[(i + 5) % createdUsers.length];
    const mediaUrls = MOCK_VIDEOS[i % MOCK_VIDEOS.length];
    const mediaTypes = 'video';
    const caption = `🔥 simulated reel: ${MOCK_CAPTIONS[i % MOCK_CAPTIONS.length].slice(0, 30)}...`;

    postsToCreate.push({
      authorId: author.id,
      caption,
      mediaUrls,
      mediaTypes,
      postType: 'reel',
      visibility: 'public',
      isSimulation: true,
      createdAt: new Date(Date.now() - i * 2 * 3600 * 1000), // staggered reels
      updatedAt: new Date(Date.now() - i * 2 * 3600 * 1000),
    });
  }

  // Insert posts
  await prisma.post.createMany({ data: postsToCreate });
  const createdPosts = await prisma.post.findMany({
    where: { isSimulation: true },
    select: { id: true, authorId: true }
  });

  // Link posts to Tolees/Groups (required schema rule)
  const postToleeRelations = [];
  for (let i = 0; i < createdPosts.length; i++) {
    // assign each post to 1 or 2 groups
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

  // 4. Generate simulated comments
  const commentsToCreate = [];
  for (let i = 0; i < createdPosts.length; i++) {
    const post = createdPosts[i];
    // Add 2 to 5 random comments to each post
    const commentCount = 2 + (i % 4);
    for (let j = 0; j < commentCount; j++) {
      const commenter = createdUsers[(i + j + 3) % createdUsers.length];
      if (commenter.id === post.authorId) continue; // no self comment to make it look realistic
      
      commentsToCreate.push({
        postId: post.id,
        authorId: commenter.id,
        content: MOCK_COMMENTS[(i + j) % MOCK_COMMENTS.length],
        isSimulation: true,
        createdAt: new Date(post.createdAt.getTime() + (j + 1) * 20 * 60 * 1000), // staggered comments
      });
    }
  }
  await prisma.comment.createMany({ data: commentsToCreate });

  return { success: true, message: `Simulation mode turned ON. Seeded ${settings.simulatedUsersCount} users, ${settings.simulatedPostsCount} posts, ${settings.simulatedReelsCount} reels, and comments.` };
}

// Deterministically generate engagement metrics for a post
export function getSimulatedEngagement(
  postId: string,
  minLikes: number,
  maxLikes: number,
  minComments: number,
  maxComments: number,
  minViews: number,
  maxViews: number
) {
  let hash = 0;
  for (let i = 0; i < postId.length; i++) {
    hash = postId.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);

  const likesRange = maxLikes - minLikes;
  const likes = minLikes + (hash % (likesRange || 1));

  const commentsRange = maxComments - minComments;
  const comments = minComments + ((hash >> 2) % (commentsRange || 1));

  const viewsRange = maxViews - minViews;
  const views = minViews + ((hash >> 4) % (viewsRange || 1));

  // views must be greater than likes
  const finalViews = views > likes ? views : likes * 3;

  const shares = Math.floor(likes * 0.15) + (hash % 10);

  return {
    likes,
    comments,
    views: finalViews,
    shares,
  };
}
