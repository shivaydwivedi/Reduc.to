import type { FastifyInstance } from "fastify";

import type { AppConfig } from "../../config/types.js";
import { clearAuthCookies, setAuthCookies } from "./cookies.js";
import { requireAuthenticatedUser } from "./auth.guard.js";
import { loginSchema, registerSchema } from "./auth.schemas.js";
import type { AuthDatabase } from "./auth.types.js";
import {
  getCurrentUser,
  loginUser,
  logoutSession,
  refreshSession,
  registerUser
} from "./auth.service.js";
import { authCookieNames } from "./tokens.js";

export async function registerAuthRoutes(
  app: FastifyInstance,
  input: { config: AppConfig; database: unknown }
): Promise<void> {
  const database = input.database as AuthDatabase;

  app.post("/api/v1/auth/register", async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const result = await registerUser({
      database,
      config: input.config,
      email: body.email,
      password: body.password,
      ...(body.displayName !== undefined ? { displayName: body.displayName } : {})
    });
    setAuthCookies(reply, input.config, result);
    return { user: result.user };
  });

  app.post("/api/v1/auth/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const result = await loginUser({ database, config: input.config, ...body });
    setAuthCookies(reply, input.config, result);
    return { user: result.user };
  });

  app.post("/api/v1/auth/refresh", async (request, reply) => {
    const result = await refreshSession({
      database,
      config: input.config,
      refreshToken: request.cookies[authCookieNames.refresh]
    });
    setAuthCookies(reply, input.config, result);
    return { ok: true };
  });

  app.post("/api/v1/auth/logout", async (request, reply) => {
    let auth: { userId: string; sessionId: string } | undefined;
    try {
      auth = await requireAuthenticatedUser(request, input.config);
    } catch {
      auth = undefined;
    }
    await logoutSession({
      database,
      ...(auth !== undefined ? { userId: auth.userId, sessionId: auth.sessionId } : {})
    });
    clearAuthCookies(reply, input.config);
    return { ok: true };
  });

  app.get("/api/v1/auth/me", async (request) => {
    const auth = await requireAuthenticatedUser(request, input.config);
    return { user: await getCurrentUser(database, auth.userId) };
  });
}
