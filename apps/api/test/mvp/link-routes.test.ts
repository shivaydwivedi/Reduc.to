import { describe, expect, it } from "vitest";

import { errorCodes } from "../../src/shared/errors/error-codes.js";
import { buildTestApp } from "../helpers.js";

describe("link MVP routes", () => {
  it("creates generated keys and custom aliases", async () => {
    const app = await buildTestApp();
    const auth = await register(app);

    const generated = await createLink(app, auth, { destinationUrl: "https://example.com/a" });
    const alias = await createLink(app, auth, {
      destinationUrl: "https://example.com/b?x=1#top",
      alias: "Launch_01"
    });

    expect(generated.statusCode).toBe(201);
    expect(generated.json().link.displayKey).toMatch(/^[0-9a-z]{7}$/);
    expect(alias.statusCode).toBe(201);
    expect(alias.json().link.displayKey).toBe("launch_01");
    expect(alias.json().link.shortUrl).toBe("http://localhost:3000/launch_01");

    await app.close();
  });

  it("rejects alias conflicts in the shared namespace", async () => {
    const app = await buildTestApp();
    const auth = await register(app);
    await createLink(app, auth, { destinationUrl: "https://example.com/a", alias: "Launch" });

    const conflict = await createLink(app, auth, {
      destinationUrl: "https://example.com/b",
      alias: "launch"
    });

    expect(conflict.statusCode).toBe(409);
    expect(conflict.json().error.code).toBe(errorCodes.ALIAS_UNAVAILABLE);

    await app.close();
  });

  it("rejects past expiry on create with INVALID_EXPIRY", async () => {
    const app = await buildTestApp();
    const auth = await register(app);

    const response = await createLink(app, auth, {
      destinationUrl: "https://example.com/a",
      expiresAt: "2000-01-01T00:00:00.000Z"
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toMatchObject({
      code: errorCodes.INVALID_EXPIRY,
      message: "Expiry must be in the future."
    });

    await app.close();
  });

  it("accepts future expiry on create", async () => {
    const app = await buildTestApp();
    const auth = await register(app);
    const expiresAt = "2099-01-01T00:00:00.000Z";

    const response = await createLink(app, auth, {
      destinationUrl: "https://example.com/a",
      expiresAt
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().link.expiresAt).toBe(expiresAt);

    await app.close();
  });

  it("lists only the authenticated owner's links", async () => {
    const app = await buildTestApp();
    const owner = await register(app, "owner@example.com");
    const other = await register(app, "other@example.com");
    await createLink(app, owner, { destinationUrl: "https://example.com/a", alias: "owner-a" });
    await createLink(app, other, { destinationUrl: "https://example.com/b", alias: "other-b" });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/links",
      headers: { cookie: owner }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ total: 1, page: 1, limit: 20 });
    expect(response.json().links).toHaveLength(1);
    expect(response.json().links[0].displayKey).toBe("owner-a");

    await app.close();
  });

  it("masks links owned by another user", async () => {
    const app = await buildTestApp();
    const owner = await register(app, "owner@example.com");
    const other = await register(app, "other@example.com");
    const otherLink = await createLink(app, other, {
      destinationUrl: "https://example.com/b",
      alias: "other-b"
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/v1/links/${otherLink.json().link.id}`,
      headers: { cookie: owner }
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe(errorCodes.LINK_NOT_FOUND);

    await app.close();
  });

  it("updates allowed fields without changing aliases", async () => {
    const app = await buildTestApp();
    const auth = await register(app);
    const created = await createLink(app, auth, {
      destinationUrl: "https://example.com/a",
      alias: "editable"
    });

    const response = await app.inject({
      method: "PATCH",
      url: `/api/v1/links/${created.json().link.id}`,
      headers: { cookie: auth },
      payload: {
        destinationUrl: "https://example.com/updated",
        title: "Updated",
        expiresAt: null
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().link).toMatchObject({
      displayKey: "editable",
      destinationUrl: "https://example.com/updated",
      title: "Updated",
      expiresAt: null
    });

    await app.close();
  });

  it("rejects past expiry on update with INVALID_EXPIRY", async () => {
    const app = await buildTestApp();
    const auth = await register(app);
    const created = await createLink(app, auth, {
      destinationUrl: "https://example.com/a",
      alias: "expiry-edit"
    });

    const response = await app.inject({
      method: "PATCH",
      url: `/api/v1/links/${created.json().link.id}`,
      headers: { cookie: auth },
      payload: {
        expiresAt: "2000-01-01T00:00:00.000Z"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toMatchObject({
      code: errorCodes.INVALID_EXPIRY,
      message: "Expiry must be in the future."
    });

    await app.close();
  });

  it("enables, disables, and soft deletes owned links", async () => {
    const app = await buildTestApp();
    const auth = await register(app);
    const created = await createLink(app, auth, { destinationUrl: "https://example.com/a" });
    const id = created.json().link.id;

    const disabled = await app.inject({
      method: "POST",
      url: `/api/v1/links/${id}/disable`,
      headers: { cookie: auth }
    });
    const enabled = await app.inject({
      method: "POST",
      url: `/api/v1/links/${id}/enable`,
      headers: { cookie: auth }
    });
    const deleted = await app.inject({
      method: "DELETE",
      url: `/api/v1/links/${id}`,
      headers: { cookie: auth }
    });
    const getDeleted = await app.inject({
      method: "GET",
      url: `/api/v1/links/${id}`,
      headers: { cookie: auth }
    });

    expect(disabled.json().link.isActive).toBe(false);
    expect(enabled.json().link.isActive).toBe(true);
    expect(deleted.statusCode).toBe(200);
    expect(deleted.json()).toEqual({ ok: true });
    expect(getDeleted.statusCode).toBe(404);

    await app.close();
  });
});

async function register(
  app: Awaited<ReturnType<typeof buildTestApp>>,
  email = "owner@example.com"
): Promise<string> {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    payload: { email, password: "correct horse battery staple" }
  });
  expect(response.statusCode).toBe(200);
  return cookieHeader(response);
}

async function createLink(
  app: Awaited<ReturnType<typeof buildTestApp>>,
  cookie: string,
  payload: Record<string, unknown>
) {
  return app.inject({
    method: "POST",
    url: "/api/v1/links",
    headers: { cookie },
    payload
  });
}

function cookieHeader(response: { headers: Record<string, unknown> }): string {
  const header = response.headers["set-cookie"];
  const values = Array.isArray(header) ? header : [header];
  return values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.split(";")[0])
    .join("; ");
}
