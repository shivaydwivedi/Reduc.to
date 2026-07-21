import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const schema = readFileSync(new URL("../../prisma/schema.prisma", import.meta.url), "utf8");

function modelBlock(name: string): string {
  const match = schema.match(new RegExp(`model ${name} \\{[\\s\\S]*?\\n\\}`));
  if (match === null) {
    throw new Error(`Missing model ${name}`);
  }
  return match[0];
}

describe("Prisma schema static assertions", () => {
  it("uses PostgreSQL and defines exactly the six Phase 4 models", () => {
    expect(schema).toContain('provider = "postgresql"');
    expect([...schema.matchAll(/^model\s+(\w+)/gm)].map((match) => match[1])).toEqual([
      "User",
      "Link",
      "RefreshSession",
      "RefreshToken",
      "ClickEvent",
      "DailyLinkStatistic"
    ]);
  });

  it("does not include forbidden sensitive fields", () => {
    expect(schema).not.toMatch(/\b(rawIp|ipAddress|userAgent|previousTokenHash)\b/);
    expect(modelBlock("RefreshToken")).not.toMatch(/\braw(Token|RefreshToken)?\b/i);
  });

  it("declares required unique constraints and indexes", () => {
    expect(modelBlock("User")).toContain("email           String           @unique");
    expect(modelBlock("Link")).toContain("lookupKey           String               @unique");
    expect(modelBlock("RefreshToken")).toContain("tokenHash             String         @unique");
    expect(modelBlock("DailyLinkStatistic")).toContain(
      '@@unique([linkId, date], map: "daily_link_statistics_link_id_date_key")'
    );
    expect(modelBlock("Link")).toContain(
      '@@index([userId, isActive, createdAt(sort: Desc)], map: "links_user_id_is_active_created_at_idx")'
    );
    expect(modelBlock("ClickEvent")).toContain(
      '@@index([linkId, visitorHash, occurredAt], map: "click_events_link_id_visitor_hash_occurred_at_idx")'
    );
  });

  it("uses application-supplied UUID primary keys without database UUID defaults", () => {
    for (const name of [
      "User",
      "Link",
      "RefreshSession",
      "RefreshToken",
      "ClickEvent",
      "DailyLinkStatistic"
    ]) {
      const block = modelBlock(name);
      expect(block).toContain("id");
      expect(block).toContain("@id @db.Uuid");
      expect(block).not.toContain("@default(uuid())");
      expect(block).not.toContain("@default(dbgenerated");
    }
  });
});
