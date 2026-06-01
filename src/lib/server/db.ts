import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// Validate DATABASE_URL at runtime (not during build)
if (process.env.NODE_ENV === "production" && typeof process !== "undefined") {
  if (!process.env.DATABASE_URL) {
    console.error("[FATAL] DATABASE_URL is not set. Please check your .env file.");
    process.exit(1);
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;