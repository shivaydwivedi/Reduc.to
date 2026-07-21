import type { PrismaClient } from "../../generated/prisma/client.js";

export type PrismaClientHandle = PrismaClient;

export type DatabaseDependency<TClient = PrismaClientHandle> = {
  start: () => Promise<void>;
  ping: () => Promise<void>;
  close: () => Promise<void>;
  getClient: () => TClient;
};
