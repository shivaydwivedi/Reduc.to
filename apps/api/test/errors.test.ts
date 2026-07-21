import { describe, expect, it } from "vitest";
import { z } from "zod";

import { AppError } from "../src/shared/errors/app-error.js";
import { errorCodes } from "../src/shared/errors/error-codes.js";
import { buildTestApp } from "./helpers.js";

describe("error handling", () => {
  it("maps known AppError values to the error envelope", async () => {
    const app = await buildTestApp({
      configure(instance) {
        instance.get("/known-error", async () => {
          throw new AppError({
            code: errorCodes.DEPENDENCY_UNAVAILABLE,
            message: "A required dependency is unavailable.",
            statusCode: 503,
            details: { dependency: "postgres" }
          });
        });
      }
    });
    const response = await app.inject({ method: "GET", url: "/known-error" });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      error: {
        code: "DEPENDENCY_UNAVAILABLE",
        message: "A required dependency is unavailable.",
        details: { dependency: "postgres" },
        requestId: response.headers["x-request-id"]
      }
    });

    await app.close();
  });

  it("maps unknown errors to safe internal errors", async () => {
    const app = await buildTestApp({
      configure(instance) {
        instance.get("/unknown-error", async () => {
          throw new Error("postgresql://secret stack detail");
        });
      }
    });
    const response = await app.inject({ method: "GET", url: "/unknown-error" });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred.",
        requestId: response.headers["x-request-id"]
      }
    });
    expect(response.body).not.toContain("postgresql://secret");
    expect(response.body).not.toContain("stack");

    await app.close();
  });

  it("maps null throws to safe internal errors", async () => {
    const app = await buildTestApp({
      configure(instance) {
        instance.get("/null-error", async () => {
          throw null;
        });
      }
    });
    const response = await app.inject({ method: "GET", url: "/null-error" });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred.",
        requestId: response.headers["x-request-id"]
      }
    });

    await app.close();
  });

  it("maps primitive throws to safe internal errors", async () => {
    const app = await buildTestApp({
      configure(instance) {
        instance.get("/primitive-error", async () => {
          throw "redis://secret";
        });
      }
    });
    const response = await app.inject({ method: "GET", url: "/primitive-error" });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred.",
        requestId: response.headers["x-request-id"]
      }
    });
    expect(response.body).not.toContain("redis://secret");

    await app.close();
  });

  it("maps Zod validation failures to validation errors", async () => {
    const app = await buildTestApp({
      configure(instance) {
        instance.post("/validate", async (request) => {
          z.object({ name: z.string().min(1) }).parse(request.body);
          return { ok: true };
        });
      }
    });
    const response = await app.inject({
      method: "POST",
      url: "/validate",
      payload: { name: "" }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: {
        code: "VALIDATION_FAILED",
        message: "The request contains invalid input.",
        requestId: response.headers["x-request-id"]
      }
    });

    await app.close();
  });
});
