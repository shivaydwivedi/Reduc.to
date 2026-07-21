import type {
  DependencyName,
  DependencyStatus,
  HealthDependencies,
  ReadinessResponse
} from "./health.types.js";

export async function getReadiness(input: {
  dependencies: HealthDependencies;
  requestId: string;
  timeoutMs: number;
}): Promise<{ response: ReadinessResponse; statusCode: 200 | 503 }> {
  const [postgres, redis] = await Promise.all([
    checkDependency("postgres", input.dependencies.postgres.ping, input.timeoutMs),
    checkDependency("redis", input.dependencies.redis.ping, input.timeoutMs)
  ]);

  const dependencies = {
    postgres: postgres.status,
    redis: redis.status
  };
  const isReady = dependencies.postgres === "ready" && dependencies.redis === "ready";

  return {
    statusCode: isReady ? 200 : 503,
    response: {
      status: isReady ? "ready" : "not_ready",
      dependencies,
      requestId: input.requestId
    }
  };
}

async function checkDependency(
  name: DependencyName,
  ping: () => Promise<void>,
  timeoutMs: number
): Promise<{ name: DependencyName; status: DependencyStatus }> {
  try {
    await withTimeout(ping(), timeoutMs);
    return { name, status: "ready" };
  } catch {
    return { name, status: "unavailable" };
  }
}

function withTimeout(promise: Promise<void>, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Dependency readiness check timed out."));
    }, timeoutMs);

    promise.then(
      () => {
        clearTimeout(timeout);
        resolve();
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(error instanceof Error ? error : new Error("Dependency readiness check failed."));
      }
    );
  });
}
