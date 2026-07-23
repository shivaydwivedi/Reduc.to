export type NodeEnvironment = "development" | "test" | "production";

export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";

export type CookieSameSite = "lax" | "none";

export type AppConfig = Readonly<{
  nodeEnv: NodeEnvironment;
  apiHost: string;
  apiPort: number;
  logLevel: LogLevel;
  databaseUrl: string;
  redisUrl?: string;
  corsOrigins: readonly string[];
  readinessTimeoutMs: number;
  shutdownTimeoutMs: number;
  accessTokenSecret: string;
  refreshTokenSecret: string;
  accessTokenTtlMinutes: number;
  refreshTokenTtlDays: number;
  cookieSecure: boolean;
  cookieSameSite: CookieSameSite;
  cookieDomain?: string;
  publicBaseUrl: string;
  frontendUrl: string;
}>;
