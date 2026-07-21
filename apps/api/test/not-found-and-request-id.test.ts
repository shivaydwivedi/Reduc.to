import { describe, expect, it } from "vitest";

import { buildTestApp } from "./helpers.js";

describe("not-found and request IDs", () => {
  it("returns ROUTE_NOT_FOUND for unknown API routes", async () => {
    const app = await buildTestApp();
    const response = await app.inject({ method: "GET", url: "/api/v1/missing" });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: "ROUTE_NOT_FOUND",
        message: "The requested route was not found.",
        requestId: response.headers["x-request-id"]
      }
    });

    await app.close();
  });

  it("accepts a valid incoming request ID", async () => {
    const app = await buildTestApp();
    const requestId = "request_12345";
    const response = await app.inject({
      method: "GET",
      url: "/health",
      headers: {
        "x-request-id": requestId
      }
    });

    expect(response.headers["x-request-id"]).toBe(requestId);
    expect(response.json()).toMatchObject({ requestId });

    await app.close();
  });

  it("replaces an invalid incoming request ID", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "GET",
      url: "/health",
      headers: {
        "x-request-id": "not safe because it contains spaces and is far too long".repeat(3)
      }
    });

    expect(response.headers["x-request-id"]).toEqual(expect.any(String));
    expect(response.headers["x-request-id"]).not.toContain(" ");
    expect(response.json()).toMatchObject({
      requestId: response.headers["x-request-id"]
    });

    await app.close();
  });
});
