import type { FastifyInstance } from "fastify";

import { buildApp, type AppDependencies } from "../src/app/build-app.js";
import type { AppConfig } from "../src/config/types.js";

export function createTestConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return Object.freeze({
    nodeEnv: "test",
    apiHost: "127.0.0.1",
    apiPort: 0,
    logLevel: "silent",
    databaseUrl: "postgresql://reduc_to:reduc_to_dev_password@localhost:5432/reduc_to_test",
    redisUrl: "redis://localhost:6379",
    corsOrigins: Object.freeze(["http://localhost:5173"]),
    readinessTimeoutMs: 25,
    shutdownTimeoutMs: 100,
    ...overrides
  });
}

export function createFakeDependencies(
  input: {
    postgres?: () => Promise<void>;
    redis?: () => Promise<void>;
  } = {}
): AppDependencies {
  return {
    postgres: {
      ping: input.postgres ?? (() => Promise.resolve())
    },
    redis: {
      ping: input.redis ?? (() => Promise.resolve())
    }
  };
}

export async function buildTestApp(
  input: {
    config?: AppConfig;
    dependencies?: AppDependencies;
    configure?: Parameters<typeof buildApp>[0]["configure"];
  } = {}
): Promise<FastifyInstance> {
  const options: Parameters<typeof buildApp>[0] = {
    config: input.config ?? createTestConfig(),
    dependencies: input.dependencies ?? createFakeDependencies()
  };

  if (input.configure !== undefined) {
    options.configure = input.configure;
  }

  const app = await buildApp(options);
  await app.ready();
  return app;
}

export function neverResolves(): Promise<void> {
  return new Promise(() => undefined);
}
