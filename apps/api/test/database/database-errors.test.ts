import { describe, expect, it } from "vitest";

import { classifyDatabaseError } from "../../src/infrastructure/database/database-errors.js";

describe("classifyDatabaseError", () => {
  it("classifies known Prisma uniqueness errors without leaking low-level messages", () => {
    const result = classifyDatabaseError({
      code: "P2002",
      message: "Unique failed on users.email"
    });

    expect(result).toEqual({
      classification: "unique_constraint_conflict",
      safeMessage: "A database uniqueness constraint was violated."
    });
    expect(result.safeMessage).not.toContain("users.email");
  });

  it("classifies known Prisma foreign-key errors", () => {
    expect(classifyDatabaseError({ code: "P2003" }).classification).toBe("foreign_key_conflict");
  });

  it("classifies known Prisma record-not-found errors", () => {
    expect(classifyDatabaseError({ code: "P2025" }).classification).toBe("record_not_found");
  });

  it("classifies database availability errors", () => {
    expect(classifyDatabaseError({ code: "P1001" }).classification).toBe("dependency_unavailable");
  });

  it("classifies unknown errors safely", () => {
    const result = classifyDatabaseError(new Error("SELECT * FROM users"));

    expect(result).toEqual({
      classification: "unknown",
      safeMessage: "An unexpected database error occurred."
    });
  });
});
