import { describe, expect, it } from "vitest";

import { generateUuidV7 } from "../../src/shared/ids/uuid-v7.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("generateUuidV7", () => {
  it("generates valid UUID v7 strings", () => {
    const id = generateUuidV7(new Date("2026-07-21T00:00:00.000Z"));

    expect(id).toMatch(uuidPattern);
    expect(id[14]).toBe("7");
    expect(["8", "9", "a", "b"]).toContain(id[19]);
  });

  it("generates unique values", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateUuidV7()));

    expect(ids.size).toBe(100);
  });

  it("sorts later deliberate timestamps after earlier deliberate timestamps", () => {
    const earlier = generateUuidV7(new Date("2026-07-21T00:00:00.000Z"));
    const later = generateUuidV7(new Date("2026-07-21T00:00:01.000Z"));

    expect(later > earlier).toBe(true);
  });
});
