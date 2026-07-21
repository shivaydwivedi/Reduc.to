export type DatabaseErrorClassification =
  | "unique_constraint_conflict"
  | "foreign_key_conflict"
  | "record_not_found"
  | "dependency_unavailable"
  | "unknown";

export type ClassifiedDatabaseError = Readonly<{
  classification: DatabaseErrorClassification;
  safeMessage: string;
}>;

export function classifyDatabaseError(error: unknown): ClassifiedDatabaseError {
  const code = readStringProperty(error, "code");

  if (code === "P2002") {
    return {
      classification: "unique_constraint_conflict",
      safeMessage: "A database uniqueness constraint was violated."
    };
  }

  if (code === "P2003") {
    return {
      classification: "foreign_key_conflict",
      safeMessage: "A database relationship constraint was violated."
    };
  }

  if (code === "P2025") {
    return {
      classification: "record_not_found",
      safeMessage: "The requested database record was not found."
    };
  }

  if (code === "P1001" || code === "P1002" || code === "P1008") {
    return {
      classification: "dependency_unavailable",
      safeMessage: "The database dependency is unavailable."
    };
  }

  return {
    classification: "unknown",
    safeMessage: "An unexpected database error occurred."
  };
}

function readStringProperty(value: unknown, property: string): string | undefined {
  if (typeof value !== "object" || value === null || !(property in value)) {
    return undefined;
  }

  const candidate = (value as Record<string, unknown>)[property];
  return typeof candidate === "string" ? candidate : undefined;
}
