import argon2 from "argon2";

export function validatePassword(password: string): boolean {
  return password.length >= 12 && password.length <= 256;
}

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id
  });
}

export function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}
