import { randomBytes } from "node:crypto";

export function generateUuidV7(date: Date = new Date()): string {
  const timestampMs = BigInt(date.getTime());

  if (timestampMs < 0n || timestampMs > 0xffff_ffff_ffffn) {
    throw new RangeError("UUID v7 timestamp is outside the supported 48-bit range.");
  }

  const bytes = randomBytes(16);

  bytes[0] = Number((timestampMs >> 40n) & 0xffn);
  bytes[1] = Number((timestampMs >> 32n) & 0xffn);
  bytes[2] = Number((timestampMs >> 24n) & 0xffn);
  bytes[3] = Number((timestampMs >> 16n) & 0xffn);
  bytes[4] = Number((timestampMs >> 8n) & 0xffn);
  bytes[5] = Number(timestampMs & 0xffn);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

  return [
    bytes.toString("hex", 0, 4),
    bytes.toString("hex", 4, 6),
    bytes.toString("hex", 6, 8),
    bytes.toString("hex", 8, 10),
    bytes.toString("hex", 10, 16)
  ].join("-");
}
