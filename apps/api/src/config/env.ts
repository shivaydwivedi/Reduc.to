import { z } from "zod";

import type { AppConfig, CookieSameSite, LogLevel, NodeEnvironment } from "./types.js";

type RawEnv = Record<string, string | undefined>;

const nodeEnvironments = ["development", "test", "production"] as const;
const logLevels = ["fatal", "error", "warn", "info", "debug", "trace", "silent"] as const;

const portSchema = z.coerce.number().int().min(0).max(65535);

const envSchema = z.object({
  NODE_ENV: z.enum(nodeEnvironments).default("development"),
  API_HOST: z.string().trim().min(1).optional(),
  API_PORT: portSchema.optional(),
  LOG_LEVEL: z.enum(logLevels).optional(),
  DATABASE_URL: z.string().trim().url(),
  REDIS_URL: z.string().trim().url(),
  ACCESS_TOKEN_SECRET: z.string().min(32).optional(),
  REFRESH_TOKEN_SECRET: z.string().min(32).optional(),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().max(60).default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().max(30).default(7),
  COOKIE_SECURE: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
  COOKIE_SAME_SITE: z.enum(["lax", "none"]).default("lax"),
  COOKIE_DOMAIN: z.string().trim().min(1).optional(),
  PUBLIC_BASE_URL: z.string().trim().url().optional(),
  FRONTEND_URL: z.string().trim().url().optional(),
  CORS_ORIGINS: z.string().optional(),
  READINESS_TIMEOUT_MS: z.coerce.number().int().positive().max(30_000).default(1_000),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().max(30_000).default(10_000)
});

const localCorsOrigins = Object.freeze(["http://localhost:5173", "http://127.0.0.1:5173"]);

export function loadConfig(rawEnv: RawEnv = process.env): AppConfig {
  const parsed = envSchema.parse(rawEnv);
  const nodeEnv = parsed.NODE_ENV satisfies NodeEnvironment;
  const corsOrigins = parseCorsOrigins(parsed.CORS_ORIGINS);
  const apiPort = parsed.API_PORT ?? (nodeEnv === "test" ? 0 : 3000);

  if (nodeEnv === "production" && corsOrigins.length === 0) {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        path: ["CORS_ORIGINS"],
        message: "CORS_ORIGINS is required in production."
      }
    ]);
  }

  if (nodeEnv !== "test" && apiPort === 0) {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        path: ["API_PORT"],
        message: "API_PORT must be greater than 0 outside test."
      }
    ]);
  }

  const accessTokenSecret =
    parsed.ACCESS_TOKEN_SECRET ?? "development-access-token-secret-change-before-production";
  const refreshTokenSecret =
    parsed.REFRESH_TOKEN_SECRET ?? "development-refresh-token-secret-change-before-production";
  const cookieSecure = parsed.COOKIE_SECURE ?? nodeEnv === "production";
  const cookieSameSite = parsed.COOKIE_SAME_SITE satisfies CookieSameSite;

  if (
    nodeEnv === "production" &&
    (parsed.ACCESS_TOKEN_SECRET === undefined || parsed.REFRESH_TOKEN_SECRET === undefined)
  ) {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        path: ["ACCESS_TOKEN_SECRET", "REFRESH_TOKEN_SECRET"],
        message: "Production token secrets are required."
      }
    ]);
  }

  if (cookieSameSite === "none" && !cookieSecure) {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        path: ["COOKIE_SAME_SITE", "COOKIE_SECURE"],
        message: "COOKIE_SAME_SITE=none requires COOKIE_SECURE=true."
      }
    ]);
  }

  return Object.freeze({
    nodeEnv,
    apiHost: parsed.API_HOST ?? "127.0.0.1",
    apiPort,
    logLevel: parsed.LOG_LEVEL ?? defaultLogLevel(nodeEnv),
    databaseUrl: parsed.DATABASE_URL,
    redisUrl: parsed.REDIS_URL,
    corsOrigins: corsOrigins.length > 0 ? Object.freeze(corsOrigins) : localCorsOrigins,
    readinessTimeoutMs: parsed.READINESS_TIMEOUT_MS,
    shutdownTimeoutMs: parsed.SHUTDOWN_TIMEOUT_MS,
    accessTokenSecret,
    refreshTokenSecret,
    accessTokenTtlMinutes: parsed.ACCESS_TOKEN_TTL_MINUTES,
    refreshTokenTtlDays: parsed.REFRESH_TOKEN_TTL_DAYS,
    cookieSecure,
    cookieSameSite,
    ...(parsed.COOKIE_DOMAIN !== undefined ? { cookieDomain: parsed.COOKIE_DOMAIN } : {}),
    publicBaseUrl: parsed.PUBLIC_BASE_URL ?? "http://localhost:3000",
    frontendUrl: parsed.FRONTEND_URL ?? "http://localhost:5173"
  });
}

function defaultLogLevel(nodeEnv: NodeEnvironment): LogLevel {
  if (nodeEnv === "test") {
    return "silent";
  }

  if (nodeEnv === "production") {
    return "info";
  }

  return "debug";
}

function parseCorsOrigins(value: string | undefined): string[] {
  if (value === undefined || value.trim() === "") {
    return [];
  }

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
    .map((origin) => z.string().url().parse(origin));
}
