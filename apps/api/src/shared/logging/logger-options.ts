import type { FastifyServerOptions } from "fastify";

import type { AppConfig } from "../../config/types.js";

export function createLoggerOptions(
  config: AppConfig
): Exclude<FastifyServerOptions["logger"], undefined> {
  if (config.logLevel === "silent") {
    return false;
  }

  return {
    level: config.logLevel,
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "res.headers.set-cookie",
        "*.password",
        "*.passwordHash",
        "*.token",
        "*.accessToken",
        "*.refreshToken",
        "*.tokenHash",
        "*.databaseUrl",
        "*.redisUrl",
        "DATABASE_URL",
        "REDIS_URL"
      ],
      censor: "[redacted]"
    }
  };
}
