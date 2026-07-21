import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  new URL(
    "../../prisma/migrations/20260721181500_initial_database_foundation/migration.sql",
    import.meta.url
  ),
  "utf8"
);

describe("initial migration SQL static assertions", () => {
  it("creates the six approved tables", () => {
    for (const tableName of [
      "users",
      "links",
      "refresh_sessions",
      "refresh_tokens",
      "click_events",
      "daily_link_statistics"
    ]) {
      expect(migrationSql).toContain(`CREATE TABLE "${tableName}"`);
    }
  });

  it("contains required unique constraints and foreign keys", () => {
    expect(migrationSql).toContain('CREATE UNIQUE INDEX "users_email_key"');
    expect(migrationSql).toContain('CREATE UNIQUE INDEX "links_lookup_key_key"');
    expect(migrationSql).toContain('CREATE UNIQUE INDEX "refresh_tokens_token_hash_key"');
    expect(migrationSql).toContain('CREATE UNIQUE INDEX "daily_link_statistics_link_id_date_key"');
    expect(migrationSql).toContain('REFERENCES "users"("id") ON DELETE RESTRICT');
    expect(migrationSql).toContain('REFERENCES "links"("id") ON DELETE RESTRICT');
    expect(migrationSql).not.toContain("ON DELETE CASCADE");
  });

  it("uses timezone-aware timestamps and PostgreSQL dates", () => {
    expect(migrationSql).toContain('"created_at" TIMESTAMPTZ(3)');
    expect(migrationSql).toContain('"occurred_at" TIMESTAMPTZ(3)');
    expect(migrationSql).toContain('"date" DATE NOT NULL');
  });

  it("contains required check constraints", () => {
    for (const constraintName of [
      "users_email_non_empty_check",
      "links_lookup_key_lowercase_check",
      "links_lookup_key_non_empty_check",
      "links_display_key_non_empty_check",
      "links_expires_at_after_created_at_check",
      "refresh_sessions_expires_at_after_created_at_check",
      "refresh_sessions_revoked_at_after_created_at_check",
      "refresh_tokens_expires_at_after_issued_at_check",
      "refresh_tokens_consumed_at_after_issued_at_check",
      "refresh_tokens_revoked_at_after_issued_at_check",
      "daily_link_statistics_total_clicks_non_negative_check",
      "daily_link_statistics_approximate_unique_visitors_non_negative_check"
    ]) {
      expect(migrationSql).toContain(constraintName);
    }
  });

  it("does not include forbidden sensitive columns", () => {
    expect(migrationSql).not.toMatch(/\b(raw_ip|ip_address|user_agent|previous_token_hash)\b/);
    expect(migrationSql).not.toMatch(/\braw_refresh_token\b/);
  });
});
