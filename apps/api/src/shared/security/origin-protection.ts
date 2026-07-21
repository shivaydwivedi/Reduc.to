import type { FastifyInstance } from "fastify";

import type { AppConfig } from "../../config/types.js";
import { AppError } from "../errors/app-error.js";
import { errorCodes } from "../errors/error-codes.js";

const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function registerOriginProtection(app: FastifyInstance, config: AppConfig): void {
  app.addHook("preHandler", async (request) => {
    if (!unsafeMethods.has(request.method)) {
      return;
    }

    const origin = request.headers.origin;
    if (origin === undefined) {
      return;
    }

    const allowed = new Set([...config.corsOrigins, config.frontendUrl]);
    if (!allowed.has(origin)) {
      throw new AppError({
        code: errorCodes.AUTHENTICATION_REQUIRED,
        message: "The request origin is not allowed.",
        statusCode: 401
      });
    }
  });
}
