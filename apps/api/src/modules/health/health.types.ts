export type DependencyName = "postgres" | "redis";
export type HealthStatus = "ok";
export type ReadinessStatus = "ready" | "not_ready";
export type DependencyStatus = "ready" | "unavailable";

export type HealthResponse = {
  status: HealthStatus;
  requestId: string;
};

export type ReadinessResponse = {
  status: ReadinessStatus;
  dependencies: Record<DependencyName, DependencyStatus>;
  requestId: string;
};

export type HealthDependencies = {
  postgres: {
    ping: () => Promise<void>;
  };
  redis: {
    ping: () => Promise<void>;
  };
};
