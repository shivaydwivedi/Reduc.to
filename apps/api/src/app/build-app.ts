import fastify, { type FastifyInstance } from "fastify";

import type { AppConfig } from "../config/types.js";
import type { DatabaseDependency } from "../infrastructure/database/types.js";
import type { RedisDependency } from "../infrastructure/redis/types.js";
import { registerAuthRoutes } from "../modules/auth/auth.routes.js";
import { registerHealthRoutes } from "../modules/health/health.routes.js";
import { registerLinkRoutes } from "../modules/links/link.routes.js";
import { registerRedirectRoutes } from "../modules/redirects/redirect.routes.js";
import { registerErrorHandler } from "../shared/errors/error-handler.js";
import { registerNotFoundHandler } from "../shared/http/not-found-handler.js";
import { createRequestId, requestIdHeader } from "../shared/http/request-id.js";
import { createLoggerOptions } from "../shared/logging/logger-options.js";
import { registerOriginProtection } from "../shared/security/origin-protection.js";
import { registerCorePlugins } from "./register-core-plugins.js";

export type AppDependencies = {
  postgres: Pick<DatabaseDependency<unknown>, "ping" | "getClient">;
  redis: Pick<RedisDependency, "ping">;
};

export type BuildAppOptions = {
  config: AppConfig;
  dependencies: AppDependencies;
  configure?: (app: FastifyInstance) => void | Promise<void>;
};

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const app: FastifyInstance = fastify({
    bodyLimit: 1_048_576,
    genReqId: (request) => createRequestId(request.headers[requestIdHeader]),
    logger: createLoggerOptions(options.config),
    requestIdHeader: false
  });

  app.addHook("onRequest", async (request, reply) => {
    reply.header(requestIdHeader, request.id);
  });

  registerErrorHandler(app, options.config);
  await registerCorePlugins(app, options.config);
  registerOriginProtection(app, options.config);

  if (options.configure !== undefined) {
    await options.configure(app);
  }

  await registerAuthRoutes(app, {
    config: options.config,
    database: options.dependencies.postgres.getClient()
  });
  await registerLinkRoutes(app, {
    config: options.config,
    database: options.dependencies.postgres.getClient()
  });
  await registerHealthRoutes(app, {
    config: options.config,
    dependencies: options.dependencies
  });
  await registerRedirectRoutes(app, {
    database: options.dependencies.postgres.getClient()
  });
  registerNotFoundHandler(app);

  return app;
}
