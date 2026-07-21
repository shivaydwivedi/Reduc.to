import { PrismaPg } from "@prisma/adapter-pg";

import type { AppConfig } from "../../config/types.js";
import { PrismaClient } from "../../generated/prisma/client.js";
import type { DatabaseDependency, PrismaClientHandle } from "./types.js";

type PrismaClientFactory = () => PrismaClientHandle;

export function createDatabaseClient(
  config: AppConfig,
  options: {
    createClient?: PrismaClientFactory;
  } = {}
): DatabaseDependency {
  const client = options.createClient?.() ?? createPrismaClient(config);

  return {
    async start() {
      await client.$connect();
    },
    async ping() {
      await client.$queryRaw`SELECT 1`;
    },
    async close() {
      await client.$disconnect();
    },
    getClient() {
      return client;
    }
  };
}

function createPrismaClient(config: AppConfig): PrismaClientHandle {
  const adapter = new PrismaPg({
    connectionString: config.databaseUrl,
    connectionTimeoutMillis: 2_000,
    idleTimeoutMillis: 10_000,
    max: 10,
    query_timeout: 2_000
  });

  return new PrismaClient({ adapter });
}
