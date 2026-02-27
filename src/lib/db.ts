/**
 * db.ts — Database client configuration
 * 
 * Exports a singleton Prisma client instance with proper development/production handling.
 * Prevents multiple client instances in Next.js development mode.
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
