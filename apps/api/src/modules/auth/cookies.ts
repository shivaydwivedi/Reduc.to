import type { FastifyReply } from "fastify";

import type { AppConfig } from "../../config/types.js";
import { authCookieNames } from "./tokens.js";

export function setAuthCookies(
  reply: FastifyReply,
  config: AppConfig,
  input: { accessToken: string; refreshToken: string }
): void {
  reply.setCookie(authCookieNames.access, input.accessToken, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    path: "/",
    maxAge: config.accessTokenTtlMinutes * 60,
    ...(config.cookieDomain !== undefined ? { domain: config.cookieDomain } : {})
  });
  reply.setCookie(authCookieNames.refresh, input.refreshToken, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    path: "/api/v1/auth",
    maxAge: config.refreshTokenTtlDays * 24 * 60 * 60,
    ...(config.cookieDomain !== undefined ? { domain: config.cookieDomain } : {})
  });
}

export function clearAuthCookies(reply: FastifyReply, config: AppConfig): void {
  const options = {
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    ...(config.cookieDomain !== undefined ? { domain: config.cookieDomain } : {})
  };
  reply.clearCookie(authCookieNames.access, { path: "/", ...options });
  reply.clearCookie(authCookieNames.refresh, { path: "/api/v1/auth", ...options });
}
