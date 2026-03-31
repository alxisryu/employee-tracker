import { PrismaClient } from "@prisma/client";
import { env } from "~/env/server";

// Prevent multiple Prisma Client instances in development (Next.js hot-reload
// would create a new instance on every module reload otherwise).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
