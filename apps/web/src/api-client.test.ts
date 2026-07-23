import { describe, expect, it } from "vitest";

import { ApiClient } from "./api-client.js";

describe("ApiClient", () => {
  it("refreshes once and retries the original request after a 401", async () => {
    const calls: string[] = [];
    const client = new ApiClient("https://api.example.test", async (input) => {
      const url = String(input);
      calls.push(url);
      if (url.endsWith("/api/v1/auth/me") && calls.length === 1) {
        return jsonResponse({ error: { code: "AUTHENTICATION_REQUIRED", message: "Nope" } }, 401);
      }
      if (url.endsWith("/api/v1/auth/refresh")) {
        return jsonResponse({ ok: true });
      }
      return jsonResponse({ user: { id: "u1", email: "owner@example.com" } });
    });

    await expect(client.me()).resolves.toEqual({
      user: { id: "u1", email: "owner@example.com" }
    });
    expect(calls).toEqual([
      "https://api.example.test/api/v1/auth/me",
      "https://api.example.test/api/v1/auth/refresh",
      "https://api.example.test/api/v1/auth/me"
    ]);
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
