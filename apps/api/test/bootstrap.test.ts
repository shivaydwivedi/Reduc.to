import { EventEmitter } from "node:events";

import { describe, expect, it } from "vitest";

import { bootstrapServer, formatStartupFailure } from "../src/server.js";
import type { AppConfig } from "../src/config/types.js";
import type { PostgresDependency } from "../src/infrastructure/postgres/types.js";
import type { RedisDependency } from "../src/infrastructure/redis/types.js";
import { createTestConfig, neverResolves } from "./helpers.js";

type SignalName = "SIGINT" | "SIGTERM";

class FakeSignalTarget extends EventEmitter {
  override once(signal: SignalName, handler: () => void): this {
    return super.once(signal, handler);
  }

  override off(signal: SignalName, handler: () => void): this {
    return super.off(signal, handler);
  }
}

function createLifecycleDependency(
  name: "postgres" | "redis",
  events: string[],
  overrides: {
    start?: () => Promise<void>;
    close?: () => Promise<void>;
  } = {}
): PostgresDependency | RedisDependency {
  return {
    async start() {
      events.push(`${name}:start`);
      await overrides.start?.();
    },
    async ping() {
      events.push(`${name}:ping`);
    },
    async close() {
      events.push(`${name}:close`);
      await overrides.close?.();
    },
    getPool() {
      return undefined;
    },
    getClient() {
      return undefined;
    }
  } as unknown as PostgresDependency | RedisDependency;
}

function createApp(events: string[], overrides: { close?: () => Promise<void> } = {}) {
  const errors: unknown[] = [];
  const warnings: unknown[] = [];

  return {
    app: {
      async listen() {
        events.push("fastify:listen");
      },
      async close() {
        events.push("fastify:close");
        await overrides.close?.();
      },
      log: {
        error(input: unknown) {
          errors.push(input);
        },
        warn(input: unknown) {
          warnings.push(input);
        }
      }
    },
    errors,
    warnings
  };
}

async function startFakeServer(input: {
  config?: AppConfig;
  postgres?: PostgresDependency;
  redis?: RedisDependency;
  app?: ReturnType<typeof createApp>["app"];
  signalTarget?: FakeSignalTarget;
}) {
  const events: string[] = [];
  const createdApp = input.app ?? createApp(events).app;
  const postgres =
    input.postgres ?? (createLifecycleDependency("postgres", events) as PostgresDependency);
  const redis = input.redis ?? (createLifecycleDependency("redis", events) as RedisDependency);
  const options: Parameters<typeof bootstrapServer>[0] = {
    config: input.config ?? createTestConfig(),
    dependencies: { postgres, redis },
    createApp: async () => createdApp
  };

  if (input.signalTarget !== undefined) {
    options.signalTarget = input.signalTarget;
  }

  const server = await bootstrapServer(options);

  return { server, events };
}

describe("bootstrapServer", () => {
  it("starts PostgreSQL before Redis and Redis before listening", async () => {
    const events: string[] = [];
    const app = createApp(events);

    await bootstrapServer({
      config: createTestConfig(),
      dependencies: {
        postgres: createLifecycleDependency("postgres", events) as PostgresDependency,
        redis: createLifecycleDependency("redis", events) as RedisDependency
      },
      createApp: async () => app.app
    });

    expect(events).toEqual(["postgres:start", "redis:start", "fastify:listen"]);
  });

  it("does not start Redis when PostgreSQL startup fails and still attempts safe cleanup", async () => {
    const events: string[] = [];

    await expect(
      bootstrapServer({
        config: createTestConfig(),
        dependencies: {
          postgres: createLifecycleDependency("postgres", events, {
            start: () => Promise.reject(new Error("postgres failed"))
          }) as PostgresDependency,
          redis: createLifecycleDependency("redis", events) as RedisDependency
        },
        createApp: async () => createApp(events).app
      })
    ).rejects.toThrow("postgres failed");

    expect(events).toEqual(["postgres:start", "redis:close", "postgres:close"]);
  });

  it("closes PostgreSQL when Redis startup fails", async () => {
    const events: string[] = [];

    await expect(
      bootstrapServer({
        config: createTestConfig(),
        dependencies: {
          postgres: createLifecycleDependency("postgres", events) as PostgresDependency,
          redis: createLifecycleDependency("redis", events, {
            start: () => Promise.reject(new Error("redis failed"))
          }) as RedisDependency
        },
        createApp: async () => createApp(events).app
      })
    ).rejects.toThrow("redis failed");

    expect(events).toEqual(["postgres:start", "redis:start", "redis:close", "postgres:close"]);
  });

  it("closes Fastify before Redis and PostgreSQL on successful shutdown", async () => {
    const { server, events } = await startFakeServer({});

    await server.close();

    expect(events).toEqual([
      "postgres:start",
      "redis:start",
      "fastify:listen",
      "fastify:close",
      "redis:close",
      "postgres:close"
    ]);
  });

  it("continues to PostgreSQL close when Redis close fails", async () => {
    const events: string[] = [];
    const app = createApp(events);
    const server = await bootstrapServer({
      config: createTestConfig(),
      dependencies: {
        postgres: createLifecycleDependency("postgres", events) as PostgresDependency,
        redis: createLifecycleDependency("redis", events, {
          close: () => Promise.reject(new Error("redis close failed"))
        }) as RedisDependency
      },
      createApp: async () => app.app
    });

    await expect(server.close()).rejects.toThrow("Shutdown completed with cleanup failures.");

    expect(events).toEqual([
      "postgres:start",
      "redis:start",
      "fastify:listen",
      "fastify:close",
      "redis:close",
      "postgres:close"
    ]);
    expect(app.errors).toEqual([{ failures: [{ resource: "redis" }] }]);
  });

  it("performs cleanup only once when close is called twice", async () => {
    const { server, events } = await startFakeServer({});

    await server.close();
    await server.close();

    expect(events).toEqual([
      "postgres:start",
      "redis:start",
      "fastify:listen",
      "fastify:close",
      "redis:close",
      "postgres:close"
    ]);
  });

  it("removes signal listeners after manual close", async () => {
    const signalTarget = new FakeSignalTarget();
    const { server } = await startFakeServer({ signalTarget });

    expect(signalTarget.listenerCount("SIGINT")).toBe(1);
    expect(signalTarget.listenerCount("SIGTERM")).toBe(1);

    await server.close();

    expect(signalTarget.listenerCount("SIGINT")).toBe(0);
    expect(signalTarget.listenerCount("SIGTERM")).toBe(0);
  });

  it("enforces the bounded shutdown timeout", async () => {
    const events: string[] = [];
    const app = createApp(events, { close: () => neverResolves() });
    const server = await bootstrapServer({
      config: createTestConfig({ shutdownTimeoutMs: 5 }),
      dependencies: {
        postgres: createLifecycleDependency("postgres", events) as PostgresDependency,
        redis: createLifecycleDependency("redis", events) as RedisDependency
      },
      createApp: async () => app.app
    });

    await expect(server.close()).rejects.toThrow("Shutdown timed out.");
    expect(events).toEqual(["postgres:start", "redis:start", "fastify:listen", "fastify:close"]);
  });
});

describe("formatStartupFailure", () => {
  it("hides driver details in production", () => {
    expect(
      formatStartupFailure(
        new Error("connect ECONNREFUSED redis://secret@localhost:6379"),
        "production"
      )
    ).toBe("API startup failed.\n");
  });

  it("sanitizes diagnostics outside production", () => {
    expect(
      formatStartupFailure(
        new Error("connect failed for postgresql://user:password@localhost:5432/reduc"),
        "development"
      )
    ).toBe("API startup failed. connect failed for [redacted-url]\n");
  });
});
