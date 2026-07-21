import { EventEmitter } from "node:events";

import { describe, expect, it } from "vitest";

import { createRedisClient } from "../src/infrastructure/redis/redis-client.js";
import type { RedisClientLike } from "../src/infrastructure/redis/types.js";
import { createTestConfig } from "./helpers.js";

class FakeRedisClient extends EventEmitter implements RedisClientLike {
  isOpen = false;
  connectCalls = 0;
  pingCalls = 0;
  quitCalls = 0;

  async connect(): Promise<void> {
    this.connectCalls += 1;
    this.isOpen = true;
  }

  async ping(): Promise<void> {
    this.pingCalls += 1;
  }

  async quit(): Promise<void> {
    this.quitCalls += 1;
    this.isOpen = false;
  }

  override on(event: "error", listener: (error: unknown) => void): this {
    return super.on(event, listener);
  }

  override off(event: "error", listener: (error: unknown) => void): this {
    return super.off(event, listener);
  }
}

describe("createRedisClient", () => {
  it("handles Redis error events with safe structured context and removes the listener on close", async () => {
    const fakeClient = new FakeRedisClient();
    const reports: unknown[] = [];
    const redis = createRedisClient(createTestConfig(), {
      createClient: () => fakeClient,
      reportError(report) {
        reports.push(report);
      }
    });

    expect(fakeClient.listenerCount("error")).toBe(1);

    fakeClient.emit("error", new Error("redis://secret@localhost:6379"));

    expect(reports).toEqual([
      {
        dependency: "redis",
        event: "error"
      }
    ]);

    await redis.start();
    await redis.ping();
    await redis.close();

    expect(fakeClient.connectCalls).toBe(1);
    expect(fakeClient.pingCalls).toBe(1);
    expect(fakeClient.quitCalls).toBe(1);
    expect(fakeClient.listenerCount("error")).toBe(0);
  });
});
