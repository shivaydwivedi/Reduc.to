import fastify, { type FastifyInstance } from "fastify";

import type { AppConfig } from "../config/types.js";
import type { PostgresDependency } from "../infrastructure/postgres/types.js";
import type { RedisDependency } from "../infrastructure/redis/types.js";
import { registerHealthRoutes } from "../modules/health/health.routes.js";
import { registerErrorHandler } from "../shared/errors/error-handler.js";
import { registerNotFoundHandler } from "../shared/http/not-found-handler.js";
import { createRequestId, requestIdHeader } from "../shared/http/request-id.js";
import { createLoggerOptions } from "../shared/logging/logger-options.js";
import { registerCorePlugins } from "./register-core-plugins.js";

export type AppDependencies = {
  postgres: Pick<PostgresDependency, "ping">;
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

  if (options.configure !== undefined) {
    await options.configure(app);
  }

  await registerHealthRoutes(app, {
    config: options.config,
    dependencies: options.dependencies
  });
  registerNotFoundHandler(app);

  return app;
}
