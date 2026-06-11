import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding demo data to database...');

  // 1. Create Demo Users
  const user1 = await prisma.user.upsert({
    where: { email: 'sarah@example.com' },
    update: {},
    create: {
      username: 'Sarah Chen',
      email: 'sarah@example.com',
      name: 'Sarah Chen',
      avatar: 'https://i.pravatar.cc/150?u=41',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'rahul@example.com' },
    update: {},
    create: {
      username: 'Rahul Sharma',
      email: 'rahul@example.com',
      name: 'Rahul Sharma',
      avatar: 'https://i.pravatar.cc/150?u=42',
    },
  });

  // 2. Create Tolees
  const tolee1 = await prisma.tolee.upsert({
    where: { slug: 'ai-automation-society' },
    update: {},
    create: {
      name: 'AI Automation Society',
      slug: 'ai-automation-society',
      description: 'A community for AI automation enthusiasts',
      ownerId: user1.id,
    },
  });

  const tolee2 = await prisma.tolee.upsert({
    where: { slug: 'sabaka-mangal-ho' },
    update: {},
    create: {
      name: 'Sabaka Mangal Ho',
      slug: 'sabaka-mangal-ho',
      description: 'A community for spiritual growth',
      ownerId: user2.id,
    },
  });

  // 3. Create Tolee Members (Roles)
  await prisma.toleeMember.upsert({
    where: { userId_toleeId: { userId: user1.id, toleeId: tolee1.id } },
    update: {},
    create: {
      userId: user1.id,
      toleeId: tolee1.id,
      role: 'admin',
    },
  });

  await prisma.toleeMember.upsert({
    where: { userId_toleeId: { userId: user2.id, toleeId: tolee2.id } },
    update: {},
    create: {
      userId: user2.id,
      toleeId: tolee2.id,
      role: 'admin',
    },
  });

  // 4. Create Posts
  // Check if posts exist
  const existingPosts = await prisma.post.count();
  if (existingPosts === 0) {
    await prisma.post.create({
      data: {
        caption: 'Just closed my first $5k/mo client using the exact outreach strategy from Module 3! Unbelievable. Big thanks to the community for the feedback on my proposal. 🚀',
        postType: 'win',
        authorId: user1.id,
        tolees: {
          create: {
            toleeId: tolee1.id,
          },
        },
      },
    });

    await prisma.post.create({
      data: {
        caption: 'Morning meditation session was so powerful today. How many of you completed the 21-day challenge? Let me know in the comments!',
        postType: 'regular',
        mediaUrls: 'https://images.unsplash.com/photo-1593811167562-9cef47bfc4d7?auto=format&fit=crop&w=800&q=80',
        mediaTypes: 'image',
        authorId: user2.id,
        tolees: {
          create: {
            toleeId: tolee2.id,
          },
        },
      },
    });
    console.log('Created demo posts.');
  } else {
    console.log('Posts already exist.');
  }

  console.log('Database seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
