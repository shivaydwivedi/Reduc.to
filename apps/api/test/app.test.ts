import { describe, expect, it } from "vitest";

import { buildTestApp } from "./helpers.js";

describe("application construction", () => {
  it("builds with fake dependencies and closes cleanly", async () => {
    const app = await buildTestApp();

    expect(app.server.listening).toBe(false);
    await expect(app.close()).resolves.toBeUndefined();
  });
});
