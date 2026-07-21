import { describe, expect, it } from "vitest";

import { createDatabaseClient } from "../../src/infrastructure/database/database-client.js";
import type { PrismaClientHandle } from "../../src/infrastructure/database/types.js";
import { createTestConfig } from "../helpers.js";

describe("createDatabaseClient", () => {
  it("does not connect at construction and runs lifecycle calls explicitly", async () => {
    const events: string[] = [];
    const fakeClient = {
      $connect: async () => {
        events.push("client:connect");
      },
      $queryRaw: async (_strings: TemplateStringsArray) => {
        events.push("client:queryRaw");
        return [{ "?column?": 1 }];
      },
      $disconnect: async () => {
        events.push("client:disconnect");
      }
    } as unknown as PrismaClientHandle;

    const database = createDatabaseClient(createTestConfig(), {
      createClient: () => fakeClient
    });

    expect(events).toEqual([]);

    await database.start();
    await database.ping();
    expect(database.getClient()).toBe(fakeClient);
    await database.close();

    expect(events).toEqual(["client:connect", "client:queryRaw", "client:disconnect"]);
  });
});
