import { describe, expect, it } from "vitest";

import { registerSchema } from "../../src/modules/auth/auth.schemas.js";
import { hashPassword, verifyPassword } from "../../src/modules/auth/password.js";
import { createAccessToken, verifyAccessToken } from "../../src/modules/auth/tokens.js";
import { validateDestinationUrl } from "../../src/modules/links/destination-url.js";
import { generateShortKey } from "../../src/modules/links/key-generator.js";
import { AppError } from "../../src/shared/errors/app-error.js";
import { errorCodes } from "../../src/shared/errors/error-codes.js";
import { createTestConfig } from "../helpers.js";

describe("MVP security helpers", () => {
  it("generates lowercase Base36 short keys", () => {
    expect(generateShortKey()).toMatch(/^[0-9a-z]{7}$/);
    expect(generateShortKey(10)).toMatch(/^[0-9a-z]{10}$/);
  });

  it("validates destination URLs without fetching them", () => {
    expect(validateDestinationUrl("https://example.com/path?q=1#top")).toBe(
      "https://example.com/path?q=1#top"
    );
    expectUnsafeDestination(() => validateDestinationUrl("ftp://example.com"));
    expectUnsafeDestination(() => validateDestinationUrl("https://user:pass@example.com"));
    expectUnsafeDestination(() => validateDestinationUrl("http://127.0.0.1/test"));
    expectUnsafeDestination(() => validateDestinationUrl("http://192.168.1.20/test"));
  });

  it("enforces password length and verifies Argon2 hashes", async () => {
    expect(() =>
      registerSchema.parse({ email: "user@example.com", password: "too-short" })
    ).toThrow();

    const hash = await hashPassword("correct horse battery staple");

    expect(hash).not.toContain("correct horse battery staple");
    await expect(verifyPassword(hash, "correct horse battery staple")).resolves.toBe(true);
    await expect(verifyPassword(hash, "wrong password")).resolves.toBe(false);
  });

  it("creates verifiable access tokens with minimal claims", async () => {
    const config = createTestConfig();
    const token = await createAccessToken({ config, userId: "user-id", sessionId: "session-id" });
    const payload = await verifyAccessToken(config, token);

    expect(payload).toMatchObject({ sub: "user-id", sid: "session-id", typ: "access" });
    expect(payload.jti).toEqual(expect.any(String));
  });
});

function expectUnsafeDestination(operation: () => unknown): void {
  try {
    operation();
    throw new Error("Expected unsafe destination rejection.");
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe(errorCodes.UNSAFE_DESTINATION);
  }
}
