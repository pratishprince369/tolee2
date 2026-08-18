import { PrismaClient } from '@prisma/client';

/**
 * 🛡️ Prisma AI Client — Connects to tolee-1 Neon Database
 * 
 * This separate database is used EXCLUSIVELY for AI-generated content:
 * - Auto-published news posts (Hindi, Marathi, English)
 * - YouTube video posts
 * - Coverr stock video posts
 * - Simulation data
 * 
 * This keeps the main database (DATABASE_URL) clean and lightweight,
 * reserved ONLY for real user data (login, chat, follow, posts, etc.)
 * 
 * Network Transfer is divided between 2 databases:
 * - Main DB: Real users only (~0.3 GB/month)
 * - AI DB (tolee-1): AI content only (~0.5 GB/month)
 */

const globalForPrismaAI = globalThis as unknown as {
  prismaAI: PrismaClient | undefined;
};

if (!globalForPrismaAI.prismaAI) {
  const dbUrl = process.env.DATABASE_URL_AI || process.env.DATABASE_URL;
  globalForPrismaAI.prismaAI = new PrismaClient({
    ...(dbUrl ? { datasources: { db: { url: dbUrl } } } : {}),
    log: [
      { emit: 'stdout', level: 'error' },
      { emit: 'stdout', level: 'warn' },
    ],
  });
}

export const prismaAI = globalForPrismaAI.prismaAI;
