import { PrismaClient } from '@prisma/client';

// Cache Prisma on globalThis in all environments — in Vercel serverless a warm
// container reuses the globals between invocations, saving ~500ms of client init
// plus the DB connection handshake on every subsequent request.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'],
  });

globalForPrisma.prisma = prisma;
