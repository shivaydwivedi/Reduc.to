import type { ErrorCode } from "./error-codes.js";

export type ErrorDetails = Record<string, unknown>;

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: ErrorDetails;

  constructor(input: {
    code: ErrorCode;
    message: string;
    statusCode: number;
    details?: ErrorDetails;
    cause?: unknown;
  }) {
    super(input.message, { cause: input.cause });
    this.name = "AppError";
    this.code = input.code;
    this.statusCode = input.statusCode;
    if (input.details !== undefined) {
      this.details = input.details;
    }
  }
}
