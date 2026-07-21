import { createHash, randomBytes, randomUUID } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";

import type { AppConfig } from "../../config/types.js";

export type AccessTokenPayload = {
  sub: string;
  sid: string;
  jti: string;
  typ: "access";
};

const accessCookieName = "reduc_to_access";
const refreshCookieName = "reduc_to_refresh";

export const authCookieNames = {
  access: accessCookieName,
  refresh: refreshCookieName
} as const;

export async function createAccessToken(input: {
  config: AppConfig;
  userId: string;
  sessionId: string;
}): Promise<string> {
  return new SignJWT({ typ: "access", sid: input.sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(input.userId)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${input.config.accessTokenTtlMinutes}m`)
    .sign(secretKey(input.config.accessTokenSecret));
}

export async function verifyAccessToken(
  config: AppConfig,
  token: string
): Promise<AccessTokenPayload> {
  const result = await jwtVerify(token, secretKey(config.accessTokenSecret));
  const sid = result.payload.sid;
  const typ = result.payload.typ;

  if (typeof result.payload.sub !== "string" || typeof sid !== "string" || typ !== "access") {
    throw new Error("Invalid access token payload.");
  }

  return {
    sub: result.payload.sub,
    sid,
    jti: typeof result.payload.jti === "string" ? result.payload.jti : "",
    typ: "access"
  };
}

export function createRawRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashRefreshToken(token: string, secret: string): string {
  return createHash("sha256").update(`${secret}:${token}`).digest("hex");
}

function secretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}
