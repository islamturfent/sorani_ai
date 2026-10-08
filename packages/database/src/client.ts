import { getConfig } from '@sorani/shared';

/**
 * Singleton Prisma client. The rest of the platform depends on repository
 * interfaces; this package supplies the production Persistence-layer backing.
 */
export async function createPrismaClient() {
  const { PrismaClient } = await import('@prisma/client');
  const config = getConfig();
  const client = new PrismaClient({ datasources: { db: { url: config.databaseUrl } } });
  return client;
}

export type PrismaClientLike = any;
