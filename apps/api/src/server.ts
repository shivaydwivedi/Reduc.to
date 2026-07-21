import { pathToFileURL } from "node:url";
import { ZodError } from "zod";

import { buildApp } from "./app/build-app.js";
import type { AppDependencies } from "./app/build-app.js";
import { loadConfig } from "./config/env.js";
import type { AppConfig } from "./config/types.js";
import { createDatabaseClient } from "./infrastructure/database/database-client.js";
import type { DatabaseDependency } from "./infrastructure/database/types.js";
import { createRedisClient } from "./infrastructure/redis/redis-client.js";
import type { RedisDependency } from "./infrastructure/redis/types.js";

type ServerApp = {
  listen: (options: { host: string; port: number }) => Promise<unknown>;
  close: () => Promise<void>;
  log: {
    error: (input: unknown, message: string) => void;
    warn: (input: unknown, message: string) => void;
  };
};

type SignalName = "SIGINT" | "SIGTERM";

type SignalTarget = {
  once: (signal: SignalName, handler: () => void) => unknown;
  off: (signal: SignalName, handler: () => void) => unknown;
};

type ServerDependencies = {
  postgres: DatabaseDependency<unknown>;
  redis: RedisDependency<unknown>;
};

export type ServerHandle = {
  close: () => Promise<void>;
};

export type BootstrapServerOptions = {
  config: AppConfig;
  dependencies: ServerDependencies;
  createApp: (dependencies: AppDependencies) => Promise<ServerApp>;
  signalTarget?: SignalTarget;
};

export async function startServer(): Promise<ServerHandle> {
  const config = loadConfig();
  const postgres = createDatabaseClient(config);
  const redis = createRedisClient(config, {
    reportError(report) {
      process.stderr.write(`${JSON.stringify(report)}\n`);
    }
  });

  return bootstrapServer({
    config,
    dependencies: { postgres, redis },
    createApp(dependencies) {
      return buildApp({
        config,
        dependencies
      });
    },
    signalTarget: process
  });
}

export async function bootstrapServer(options: BootstrapServerOptions): Promise<ServerHandle> {
  const { config, dependencies } = options;
  const signalTarget = options.signalTarget;
  let app: ServerApp | undefined;
  let closeStarted = false;
  let signalsRegistered = false;

  const removeSignalHandlers = (): void => {
    if (!signalsRegistered || signalTarget === undefined) {
      return;
    }

    signalTarget.off("SIGINT", handleSigint);
    signalTarget.off("SIGTERM", handleSigterm);
    signalsRegistered = false;
  };

  const close = async (): Promise<void> => {
    if (closeStarted) {
      return;
    }

    closeStarted = true;
    removeSignalHandlers();

    await withTimeout(
      closeOrderedResources([
        ["fastify", () => app?.close() ?? Promise.resolve()],
        ["redis", dependencies.redis.close],
        ["postgres", dependencies.postgres.close]
      ]).then((failures) => {
        if (failures.length > 0) {
          app?.log.error(
            { failures: failures.map((failure) => ({ resource: failure.resource })) },
            "Shutdown completed with cleanup failures"
          );
          throw new Error("Shutdown completed with cleanup failures.");
        }
      }),
      config.shutdownTimeoutMs
    );
  };

  const handleSignalShutdown = (): void => {
    void close().catch((error: unknown) => {
      app?.log.error({ err: error }, "Graceful shutdown failed");
      process.exitCode = 1;
    });
  };

  function handleSigint(): void {
    handleSignalShutdown();
  }

  function handleSigterm(): void {
    handleSignalShutdown();
  }

  try {
    await dependencies.postgres.start();
    await dependencies.redis.start();

    app = await options.createApp({
      postgres: dependencies.postgres,
      redis: dependencies.redis
    });

    await app.listen({ host: config.apiHost, port: config.apiPort });

    if (signalTarget !== undefined) {
      signalTarget.once("SIGINT", handleSigint);
      signalTarget.once("SIGTERM", handleSigterm);
      signalsRegistered = true;
    }

    return { close };
  } catch (error) {
    removeSignalHandlers();
    const failures = await closeOrderedResources([
      ["fastify", () => app?.close() ?? Promise.resolve()],
      ["redis", dependencies.redis.close],
      ["postgres", dependencies.postgres.close]
    ]);
    if (failures.length > 0) {
      app?.log.warn(
        { failures: failures.map((failure) => ({ resource: failure.resource })) },
        "Startup cleanup completed with cleanup failures"
      );
    }
    throw error;
  }
}

type CleanupFailure = {
  resource: string;
  error: unknown;
};

async function closeOrderedResources(
  operations: Array<readonly [resource: string, close: () => Promise<void>]>
): Promise<CleanupFailure[]> {
  const failures: CleanupFailure[] = [];

  for (const [resource, close] of operations) {
    try {
      await close();
    } catch (error) {
      failures.push({ resource, error });
    }
  }

  return failures;
}

function withTimeout(promise: Promise<void>, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Shutdown timed out."));
    }, timeoutMs);

    promise.then(
      () => {
        clearTimeout(timeout);
        resolve();
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(error instanceof Error ? error : new Error("Shutdown failed."));
      }
    );
  });
}

export function formatStartupFailure(error: unknown, nodeEnv: string | undefined): string {
  if (nodeEnv === "production") {
    return "API startup failed.\n";
  }

  if (error instanceof ZodError) {
    const names = error.issues
      .map((issue) => issue.path[0])
      .filter((name): name is string => typeof name === "string");
    const suffix = names.length > 0 ? ` Invalid environment variables: ${names.join(", ")}.` : "";
    return `API startup failed.${suffix}\n`;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return `API startup failed. ${redactStartupDiagnostic(error.message)}\n`;
  }

  return "API startup failed.\n";
}

function redactStartupDiagnostic(message: string): string {
  return message
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted-url]")
    .replace(/redis:\/\/\S+/gi, "[redacted-url]")
    .replace(/\/\/[^:\s/]+:[^@\s/]+@/g, "//[redacted-credentials]@")
    .replace(/password[=:]\S+/gi, "password=[redacted]")
    .replace(/token[=:]\S+/gi, "token=[redacted]");
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer().catch((error: unknown) => {
    process.stderr.write(formatStartupFailure(error, process.env.NODE_ENV));
    process.exitCode = 1;
  });
}
