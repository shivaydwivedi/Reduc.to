import type { createClient } from "redis";

export type RedisClientHandle = ReturnType<typeof createClient>;

export type RedisErrorReport = Readonly<{
  dependency: "redis";
  event: "error";
}>;

export type RedisErrorReporter = (report: RedisErrorReport) => void;

export type RedisClientLike = {
  readonly isOpen: boolean;
  connect: () => Promise<unknown>;
  ping: () => Promise<unknown>;
  quit: () => Promise<unknown>;
  on: (event: "error", listener: (error: unknown) => void) => RedisClientLike;
  off: (event: "error", listener: (error: unknown) => void) => RedisClientLike;
};

export type RedisDependency<TClient = RedisClientHandle> = {
  start: () => Promise<void>;
  ping: () => Promise<void>;
  close: () => Promise<void>;
  getClient: () => TClient;
};
