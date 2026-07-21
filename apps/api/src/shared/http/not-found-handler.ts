import type { FastifyInstance } from "fastify";

import { errorCodes } from "../errors/error-codes.js";

export function registerNotFoundHandler(app: FastifyInstance): void {
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: {
        code: errorCodes.ROUTE_NOT_FOUND,
        message: "The requested route was not found.",
        requestId: request.id
      }
    });
  });
}
