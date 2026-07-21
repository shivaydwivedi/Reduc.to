import { randomUUID } from "node:crypto";

export const requestIdHeader = "x-request-id";

const requestIdPattern = /^[A-Za-z0-9_-]{8,64}$/;

export function createRequestId(candidate: string | string[] | undefined): string {
  const value = Array.isArray(candidate) ? candidate[0] : candidate;

  if (value !== undefined && isValidRequestId(value)) {
    return value;
  }

  return randomUUID();
}

export function isValidRequestId(value: string): boolean {
  return requestIdPattern.test(value);
}
