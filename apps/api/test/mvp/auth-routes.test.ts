import { describe, expect, it } from "vitest";

import { errorCodes } from "../../src/shared/errors/error-codes.js";
import { buildTestApp, createFakeDependencies, createTestConfig } from "../helpers.js";
import { createFakePrismaClient } from "./fake-prisma.js";

describe("auth MVP routes", () => {
  it("registers users, sets auth cookies, and rejects duplicate email", async () => {
    const app = await buildTestApp();

    const first = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "USER@example.com",
        password: "correct horse battery staple",
        displayName: "User"
      }
    });
    const duplicate = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "user@example.com",
        password: "correct horse battery staple"
      }
    });

    expect(first.statusCode).toBe(200);
    expect(first.json()).toMatchObject({
      user: {
        email: "user@example.com",
        displayEmail: "USER@example.com",
        displayName: "User"
      }
    });
    expect(cookieHeader(first)).toContain("reduc_to_access=");
    expect(cookieHeader(first)).toContain("reduc_to_refresh=");
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json().error.code).toBe(errorCodes.EMAIL_ALREADY_EXISTS);

    await app.close();
  });

  it("uses configured SameSite, Secure, and Domain options for auth cookies", async () => {
    const app = await buildTestApp({
      config: createTestConfig({
        cookieSecure: true,
        cookieSameSite: "none",
        cookieDomain: ".example.com"
      })
    });

    const auth = await register(app);
    const logout = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      headers: { cookie: cookieHeader(auth) }
    });

    expect(setCookieHeaders(auth)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("SameSite=None"),
        expect.stringContaining("Secure"),
        expect.stringContaining("Domain=.example.com")
      ])
    );
    expect(setCookieHeaders(logout)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("reduc_to_access=;"),
        expect.stringContaining("Path=/"),
        expect.stringContaining("SameSite=None"),
        expect.stringContaining("Secure"),
        expect.stringContaining("Domain=.example.com"),
        expect.stringContaining("reduc_to_refresh=;"),
        expect.stringContaining("Path=/api/v1/auth")
      ])
    );

    await app.close();
  });

  it("logs in with valid credentials and returns generic invalid credentials otherwise", async () => {
    const app = await buildTestApp();
    await register(app);

    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "owner@example.com", password: "correct horse battery staple" }
    });
    const invalid = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "owner@example.com", password: "wrong password" }
    });

    expect(login.statusCode).toBe(200);
    expect(login.json().user.email).toBe("owner@example.com");
    expect(cookieHeader(login)).toContain("reduc_to_access=");
    expect(invalid.statusCode).toBe(401);
    expect(invalid.json().error.code).toBe(errorCodes.INVALID_CREDENTIALS);

    await app.close();
  });

  it("requires an access token for me", async () => {
    const app = await buildTestApp();

    const response = await app.inject({ method: "GET", url: "/api/v1/auth/me" });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe(errorCodes.AUTHENTICATION_REQUIRED);

    await app.close();
  });

  it("returns the current user when access cookie is valid", async () => {
    const app = await buildTestApp();
    const auth = await register(app);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { cookie: cookieHeader(auth) }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().user.email).toBe("owner@example.com");

    await app.close();
  });

  it("rotates refresh tokens and detects old token reuse", async () => {
    const app = await buildTestApp();
    const auth = await register(app);
    const oldRefreshCookie = singleCookie(auth, "reduc_to_refresh");

    const refreshed = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      headers: { cookie: cookieHeader(auth) }
    });
    const reused = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      headers: { cookie: oldRefreshCookie }
    });

    expect(refreshed.statusCode).toBe(200);
    expect(refreshed.json()).toEqual({ ok: true });
    expect(cookieHeader(refreshed)).toContain("reduc_to_refresh=");
    expect(reused.statusCode).toBe(401);
    expect(reused.json().error.code).toBe(errorCodes.TOKEN_REUSE_DETECTED);

    await app.close();
  });

  it("does not create a successor token when atomic refresh consumption loses", async () => {
    const database = createFakePrismaClient();
    const app = await buildTestApp({ dependencies: createFakeDependencies({ database }) });
    const auth = await register(app);
    database.__store.failNextRefreshTokenConsume = true;

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      headers: { cookie: cookieHeader(auth) }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe(errorCodes.TOKEN_REUSE_DETECTED);
    expect(database.__store.tokens).toHaveLength(1);
    expect(database.__store.sessions[0]?.revokedAt).toBeInstanceOf(Date);
    expect(database.__store.sessions[0]?.revocationReason).toBe("token_reuse");

    await app.close();
  });

  it("logs out idempotently and clears auth cookies", async () => {
    const app = await buildTestApp();
    const auth = await register(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      headers: { cookie: cookieHeader(auth) }
    });
    const second = await app.inject({ method: "POST", url: "/api/v1/auth/logout" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
    expect(cookieHeader(response)).toContain("reduc_to_access=;");
    expect(cookieHeader(response)).toContain("reduc_to_refresh=");
    expect(second.statusCode).toBe(200);

    await app.close();
  });
});

async function register(app: Awaited<ReturnType<typeof buildTestApp>>) {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    payload: { email: "owner@example.com", password: "correct horse battery staple" }
  });
  expect(response.statusCode).toBe(200);
  return response;
}

function cookieHeader(response: { headers: Record<string, unknown> }): string {
  return setCookieHeaders(response)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.split(";")[0])
    .join("; ");
}

function setCookieHeaders(response: { headers: Record<string, unknown> }): string[] {
  const header = response.headers["set-cookie"];
  return Array.isArray(header)
    ? header.filter((value): value is string => typeof value === "string")
    : typeof header === "string"
      ? [header]
      : [];
}

function singleCookie(response: { headers: Record<string, unknown> }, name: string): string {
  return cookieHeader(response)
    .split("; ")
    .find((cookie) => cookie.startsWith(`${name}=`))!;
}
