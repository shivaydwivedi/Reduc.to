import type { FastifyRequest } from "fastify";

import type { AppConfig } from "../../config/types.js";
import { authCookieNames, verifyAccessToken } from "./tokens.js";
import { authenticationRequired } from "./auth.service.js";

export async function requireAuthenticatedUser(
  request: FastifyRequest,
  config: AppConfig
): Promise<{ userId: string; sessionId: string }> {
  const token = request.cookies[authCookieNames.access];
  if (token === undefined) {
    throw authenticationRequired();
  }

  try {
    const payload = await verifyAccessToken(config, token);
    return {
      userId: payload.sub,
      sessionId: payload.sid
    };
  } catch {
    throw authenticationRequired();
  }
}
