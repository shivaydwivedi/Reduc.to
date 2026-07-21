import { createClient } from "redis";

import type { AppConfig } from "../../config/types.js";
import type { RedisClientLike, RedisDependency, RedisErrorReporter } from "./types.js";

type RedisClientFactory = (options: {
  url: string;
  socket: {
    connectTimeout: number;
    reconnectStrategy: false;
  };
}) => RedisClientLike;

export function createRedisClient(
  config: AppConfig,
  options: {
    createClient?: RedisClientFactory;
    reportError?: RedisErrorReporter;
  } = {}
): RedisDependency<RedisClientLike> {
  const createClientImpl = options.createClient ?? (createClient as RedisClientFactory);
  const reportError = options.reportError ?? (() => undefined);
  const client = createClientImpl({
    url: config.redisUrl,
    socket: {
      connectTimeout: 2_000,
      reconnectStrategy: false
    }
  });
  const onRedisError = (_error: unknown): void => {
    try {
      reportError({
        dependency: "redis",
        event: "error"
      });
    } catch {
      // The Redis error listener exists to prevent unhandled driver events; reporting must stay best-effort.
    }
  };

  client.on("error", onRedisError);

  return {
    async start() {
      await client.connect();
    },
    async ping() {
      await client.ping();
    },
    async close() {
      try {
        if (client.isOpen) {
          await client.quit();
        }
      } finally {
        client.off("error", onRedisError);
      }
    },
    getClient() {
      return client;
    }
  };
}
