import { randomInt } from "node:crypto";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
const keyPattern = /^[0-9a-z]{7}$/;
const aliasPattern = /^[a-z0-9](?:[a-z0-9_-]{1,38}[a-z0-9])$/;

export function generateShortKey(length = 7): string {
  let key = "";
  for (let index = 0; index < length; index += 1) {
    key += alphabet[randomInt(alphabet.length)];
  }
  return key;
}

export function isGeneratedKey(value: string): boolean {
  return keyPattern.test(value);
}

export function normalizeAlias(alias: string): string {
  return alias.trim().toLowerCase();
}

export function isValidAlias(alias: string): boolean {
  return aliasPattern.test(alias);
}
