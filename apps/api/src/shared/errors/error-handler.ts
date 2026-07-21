import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

import type { AppConfig } from "../../config/types.js";
import { AppError } from "./app-error.js";
import { errorCodes } from "./error-codes.js";

type ErrorPayload = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId: string;
  };
};

export function registerErrorHandler(app: FastifyInstance, config: AppConfig): void {
  app.setErrorHandler((error, request, reply) => {
    handleError(error, request, reply, config);
  });
}

function handleError(
  error: unknown,
  request: FastifyRequest,
  reply: FastifyReply,
  config: AppConfig
): void {
  const appError = normalizeError(error);
  const payload: ErrorPayload = {
    error: {
      code: appError.code,
      message: appError.message,
      requestId: request.id
    }
  };

  if (appError.details !== undefined && Object.keys(appError.details).length > 0) {
    payload.error.details = appError.details;
  }

  const logPayload = {
    err: error,
    code: appError.code,
    statusCode: appError.statusCode,
    exposeDetails: config.nodeEnv !== "production"
  };

  if (appError.statusCode >= 500) {
    request.log.error(logPayload, "Request failed");
  } else {
    request.log.warn(logPayload, "Request failed");
  }

  reply.status(appError.statusCode).send(payload);
}

function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof ZodError) {
    return new AppError({
      code: errorCodes.VALIDATION_FAILED,
      message: "The request contains invalid input.",
      statusCode: 400,
      details: {
        fields: error.flatten().fieldErrors
      },
      cause: error
    });
  }

  if (isFastifyValidationLikeError(error)) {
    return new AppError({
      code: errorCodes.VALIDATION_FAILED,
      message: "The request contains invalid input.",
      statusCode: 400,
      cause: error
    });
  }

  return new AppError({
    code: errorCodes.INTERNAL_ERROR,
    message: "An unexpected error occurred.",
    statusCode: 500,
    cause: error
  });
}

function isFastifyValidationLikeError(error: unknown): boolean {
  if (!isRecord(error)) {
    return false;
  }

  return error.validation !== undefined || error.statusCode === 400;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
