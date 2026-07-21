import type { FastifyInstance } from "fastify";

import type { AppConfig } from "../../config/types.js";
import type { HealthDependencies, HealthResponse } from "./health.types.js";
import { getReadiness } from "./health.service.js";

export async function registerHealthRoutes(
  app: FastifyInstance,
  options: { config: AppConfig; dependencies: HealthDependencies }
): Promise<void> {
  app.get("/health", async (request): Promise<HealthResponse> => {
    return {
      status: "ok",
      requestId: request.id
    };
  });

  app.get("/ready", async (request, reply) => {
    const result = await getReadiness({
      dependencies: options.dependencies,
      requestId: request.id,
      timeoutMs: options.config.readinessTimeoutMs
    });

    return reply.status(result.statusCode).send(result.response);
  });
}
