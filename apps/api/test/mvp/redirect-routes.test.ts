import { describe, expect, it } from "vitest";

import { RedirectType } from "../../src/generated/prisma/enums.js";
import { errorCodes } from "../../src/shared/errors/error-codes.js";
import { buildTestApp, createFakeDependencies } from "../helpers.js";
import { createFakePrismaClient } from "./fake-prisma.js";

describe("redirect MVP routes", () => {
  it("redirects with 302 and records a click event", async () => {
    const { app, database, cookie } = await buildRedirectApp();
    await createLink(app, cookie, "goto", "https://example.com/a");

    const response = await app.inject({
      method: "GET",
      url: "/GOTO",
      headers: { referer: "https://ref.example/path" }
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe("https://example.com/a");
    expect(database.__store.clickEvents).toHaveLength(1);
    expect(database.__store.clickEvents[0]?.referrerHost).toBe("ref.example");

    await app.close();
  });

  it("supports permanent redirects when the link is configured for 301", async () => {
    const { app, database, cookie } = await buildRedirectApp();
    await createLink(app, cookie, "permanent", "https://example.com/permanent");
    database.__store.links[0]!.redirectType = RedirectType.PERMANENT_301;

    const response = await app.inject({ method: "GET", url: "/permanent" });

    expect(response.statusCode).toBe(301);
    expect(response.headers.location).toBe("https://example.com/permanent");

    await app.close();
  });

  it("returns not found for missing, disabled, and deleted links", async () => {
    const { app, cookie } = await buildRedirectApp();
    const created = await createLink(app, cookie, "gone", "https://example.com/gone");
    const id = created.json().link.id;
    const missing = await app.inject({ method: "GET", url: "/missing" });

    await app.inject({
      method: "POST",
      url: `/api/v1/links/${id}/disable`,
      headers: { cookie }
    });
    const disabled = await app.inject({ method: "GET", url: "/gone" });

    await app.inject({
      method: "POST",
      url: `/api/v1/links/${id}/enable`,
      headers: { cookie }
    });
    await app.inject({
      method: "DELETE",
      url: `/api/v1/links/${id}`,
      headers: { cookie }
    });
    const deleted = await app.inject({ method: "GET", url: "/gone" });

    expect(missing.statusCode).toBe(404);
    expect(missing.json().error.code).toBe(errorCodes.LINK_NOT_FOUND);
    expect(disabled.statusCode).toBe(404);
    expect(disabled.json().error.code).toBe(errorCodes.LINK_NOT_FOUND);
    expect(deleted.statusCode).toBe(404);
    expect(deleted.json().error.code).toBe(errorCodes.LINK_NOT_FOUND);

    await app.close();
  });

  it("returns gone for expired links", async () => {
    const { app, database, cookie } = await buildRedirectApp();
    const created = await createLink(app, cookie, "expired", "https://example.com/expired");

    const link = database.__store.links.find((item) => item.id === created.json().link.id);
    expect(link).toBeDefined();
    link!.expiresAt = new Date("2020-01-01T00:00:00.000Z");
    const response = await app.inject({ method: "GET", url: "/expired" });

    expect(response.statusCode).toBe(410);
    expect(response.json().error.code).toBe(errorCodes.LINK_EXPIRED);

    await app.close();
  });

  it("does not block redirects when click tracking fails", async () => {
    const { app, database, cookie } = await buildRedirectApp();
    await createLink(app, cookie, "tracking-fails", "https://example.com/a");
    database.__store.failClickTracking = true;

    const response = await app.inject({ method: "GET", url: "/tracking-fails" });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe("https://example.com/a");

    await app.close();
  });
});

async function buildRedirectApp() {
  const database = createFakePrismaClient();
  const app = await buildTestApp({ dependencies: createFakeDependencies({ database }) });
  const cookie = await register(app);
  return { app, database, cookie };
}

async function register(app: Awaited<ReturnType<typeof buildTestApp>>): Promise<string> {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    payload: { email: "owner@example.com", password: "correct horse battery staple" }
  });
  expect(response.statusCode).toBe(200);
  return cookieHeader(response);
}

async function createLink(
  app: Awaited<ReturnType<typeof buildTestApp>>,
  cookie: string,
  alias: string,
  destinationUrl: string
) {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/links",
    headers: { cookie },
    payload: { destinationUrl, alias }
  });
  expect(response.statusCode).toBe(201);
  return response;
}

function cookieHeader(response: { headers: Record<string, unknown> }): string {
  const header = response.headers["set-cookie"];
  const values = Array.isArray(header) ? header : [header];
  return values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.split(";")[0])
    .join("; ");
}
