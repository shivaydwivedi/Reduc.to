import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import type { FastifyInstance } from "fastify";

import type { AppConfig } from "../config/types.js";
import { requestIdHeader } from "../shared/http/request-id.js";

export async function registerCorePlugins(app: FastifyInstance, config: AppConfig): Promise<void> {
  await app.register(helmet);
  await app.register(cors, {
    credentials: true,
    origin(origin, callback) {
      if (origin === undefined) {
        callback(null, true);
        return;
      }

      callback(null, config.corsOrigins.includes(origin));
    },
    allowedHeaders: ["content-type", requestIdHeader],
    exposedHeaders: [requestIdHeader]
  });
}
