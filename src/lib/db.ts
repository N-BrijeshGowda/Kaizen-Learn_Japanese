import "server-only";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";
import { mariadbConfig } from "@/lib/db-config";

// The MariaDB adapter speaks to both MySQL 8 (production) and MariaDB (XAMPP, development).
function createClient() {
  return new PrismaClient({ adapter: new PrismaMariaDb(mariadbConfig(5)) });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
