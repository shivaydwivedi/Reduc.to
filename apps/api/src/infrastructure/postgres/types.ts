import type { Pool } from "pg";

export type DependencyStatus = "ready" | "unavailable";

export type PostgresDependency = {
  start: () => Promise<void>;
  ping: () => Promise<void>;
  close: () => Promise<void>;
  getPool: () => Pool;
};
