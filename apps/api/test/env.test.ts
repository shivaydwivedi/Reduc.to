import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { loadConfig } from "../src/config/env.js";

const validEnv = {
  NODE_ENV: "development",
  API_HOST: "127.0.0.1",
  API_PORT: "3000",
  LOG_LEVEL: "debug",
  DATABASE_URL: "postgresql://reduc_to:reduc_to_dev_password@localhost:5432/reduc_to_dev",
  REDIS_URL: "redis://localhost:6379",
  CORS_ORIGINS: "http://localhost:5173,http://127.0.0.1:5173"
};

describe("loadConfig", () => {
  it("returns an immutable config for a valid development environment", () => {
    const config = loadConfig(validEnv);

    expect(config).toMatchObject({
      nodeEnv: "development",
      apiHost: "127.0.0.1",
      apiPort: 3000,
      logLevel: "debug",
      databaseUrl: validEnv.DATABASE_URL,
      redisUrl: validEnv.REDIS_URL,
      corsOrigins: ["http://localhost:5173", "http://127.0.0.1:5173"]
    });
    expect(Object.isFrozen(config)).toBe(true);
  });

  it("rejects an invalid NODE_ENV", () => {
    expect(() => loadConfig({ ...validEnv, NODE_ENV: "staging" })).toThrow(ZodError);
  });

  it("accepts port 0 in test", () => {
    const config = loadConfig({
      ...validEnv,
      NODE_ENV: "test",
      API_PORT: "0"
    });

    expect(config.apiPort).toBe(0);
  });

  it("rejects port 0 in development", () => {
    expect(() => loadConfig({ ...validEnv, API_PORT: "0" })).toThrow(ZodError);
  });

  it("rejects port 0 in production", () => {
    expect(() =>
      loadConfig({
        ...validEnv,
        NODE_ENV: "production",
        API_PORT: "0",
        CORS_ORIGINS: "https://app.reduc.to"
      })
    ).toThrow(ZodError);
  });

  it("rejects port 65536", () => {
    expect(() => loadConfig({ ...validEnv, API_PORT: "65536" })).toThrow(ZodError);
  });

  it("accepts valid normal ports", () => {
    const config = loadConfig({ ...validEnv, API_PORT: "65535" });

    expect(config.apiPort).toBe(65535);
  });

  it("rejects an invalid port", () => {
    expect(() => loadConfig({ ...validEnv, API_PORT: "70000" })).toThrow(ZodError);
  });

  it("requires DATABASE_URL", () => {
    const { DATABASE_URL: _databaseUrl, ...env } = validEnv;

    expect(() => loadConfig(env)).toThrow(ZodError);
  });

  it("requires REDIS_URL", () => {
    const { REDIS_URL: _redisUrl, ...env } = validEnv;

    expect(() => loadConfig(env)).toThrow(ZodError);
  });

  it("requires explicit CORS origins in production", () => {
    expect(() =>
      loadConfig({
        ...validEnv,
        NODE_ENV: "production",
        CORS_ORIGINS: ""
      })
    ).toThrow(ZodError);
  });
});
