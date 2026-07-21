import { describe, expect, it } from "vitest";

import { buildTestApp, createFakeDependencies, neverResolves } from "./helpers.js";

describe("health routes", () => {
  it("GET /health returns process liveness without dependency checks", async () => {
    const app = await buildTestApp();
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["x-request-id"]).toEqual(expect.any(String));
    expect(response.json()).toEqual({
      status: "ok",
      requestId: response.headers["x-request-id"]
    });

    await app.close();
  });

  it("GET /ready returns ready when all fake dependencies are ready", async () => {
    const app = await buildTestApp();
    const response = await app.inject({ method: "GET", url: "/ready" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ready",
      dependencies: {
        postgres: "ready",
        redis: "ready"
      },
      requestId: response.headers["x-request-id"]
    });

    await app.close();
  });

  it("GET /ready returns 503 when PostgreSQL is unavailable", async () => {
    const app = await buildTestApp({
      dependencies: createFakeDependencies({
        postgres: () => Promise.reject(new Error("connection string secret should not leak"))
      })
    });
    const response = await app.inject({ method: "GET", url: "/ready" });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      status: "not_ready",
      dependencies: {
        postgres: "unavailable",
        redis: "ready"
      },
      requestId: response.headers["x-request-id"]
    });
    expect(response.body).not.toContain("connection string");

    await app.close();
  });

  it("GET /ready returns 503 when Redis is unavailable", async () => {
    const app = await buildTestApp({
      dependencies: createFakeDependencies({
        redis: () => Promise.reject(new Error("redis://secret@localhost should not leak"))
      })
    });
    const response = await app.inject({ method: "GET", url: "/ready" });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      status: "not_ready",
      dependencies: {
        postgres: "ready",
        redis: "unavailable"
      }
    });
    expect(response.body).not.toContain("redis://secret");

    await app.close();
  });

  it("GET /ready returns 503 when both dependencies are unavailable", async () => {
    const app = await buildTestApp({
      dependencies: createFakeDependencies({
        postgres: () => Promise.reject(new Error("postgres failed")),
        redis: () => Promise.reject(new Error("redis failed"))
      })
    });
    const response = await app.inject({ method: "GET", url: "/ready" });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      status: "not_ready",
      dependencies: {
        postgres: "unavailable",
        redis: "unavailable"
      }
    });

    await app.close();
  });

  it("GET /ready times out dependency checks without hanging", async () => {
    const app = await buildTestApp({
      dependencies: createFakeDependencies({
        postgres: () => neverResolves()
      })
    });
    const response = await app.inject({ method: "GET", url: "/ready" });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      status: "not_ready",
      dependencies: {
        postgres: "unavailable",
        redis: "ready"
      }
    });

    await app.close();
  });
});
