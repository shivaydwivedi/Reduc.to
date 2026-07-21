import { Pool } from "pg";

import type { AppConfig } from "../../config/types.js";
import type { PostgresDependency } from "./types.js";

export function createPostgresClient(config: AppConfig): PostgresDependency {
  const pool = new Pool({
    connectionString: config.databaseUrl,
    connectionTimeoutMillis: 2_000,
    idleTimeoutMillis: 10_000,
    max: 10,
    query_timeout: 2_000
  });

  return {
    async start() {
      const client = await pool.connect();
      client.release();
    },
    async ping() {
      await pool.query("SELECT 1");
    },
    async close() {
      await pool.end();
    },
    getPool() {
      return pool;
    }
  };
}
