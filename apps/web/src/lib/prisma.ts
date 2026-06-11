import { PrismaClient } from '@prisma/client';
import { MonitoringService } from './monitoring';

const globalForPrisma = globalThis as unknown as {
  prisma: any;
};

if (!globalForPrisma.prisma) {
  const basePrisma = new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'stdout', level: 'error' },
      { emit: 'stdout', level: 'warn' },
    ],
  });

  basePrisma.$on('query', (e: any) => {
    MonitoringService.logPerformance("prisma_query", e.duration, {
      query: e.query,
      params: e.params,
      target: e.target,
    });
  });

  globalForPrisma.prisma = basePrisma;
}

export const prisma = globalForPrisma.prisma;
