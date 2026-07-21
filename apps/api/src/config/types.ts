export type NodeEnvironment = "development" | "test" | "production";

export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";

export type AppConfig = Readonly<{
  nodeEnv: NodeEnvironment;
  apiHost: string;
  apiPort: number;
  logLevel: LogLevel;
  databaseUrl: string;
  redisUrl: string;
  corsOrigins: readonly string[];
  readinessTimeoutMs: number;
  shutdownTimeoutMs: number;
}>;
