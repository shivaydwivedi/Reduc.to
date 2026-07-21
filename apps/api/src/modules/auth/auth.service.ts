import type { AppConfig } from "../../config/types.js";
import { UserRole } from "../../generated/prisma/enums.js";
import { AppError } from "../../shared/errors/app-error.js";
import { errorCodes } from "../../shared/errors/error-codes.js";
import { generateUuidV7 } from "../../shared/ids/uuid-v7.js";
import type { AuthDatabase, RefreshSessionRecord, SafeUser, UserRecord } from "./auth.types.js";
import { hashPassword, verifyPassword } from "./password.js";
import { createAccessToken, createRawRefreshToken, hashRefreshToken } from "./tokens.js";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function toSafeUser(user: UserRecord): SafeUser {
  return {
    id: user.id,
    email: user.email,
    displayEmail: user.displayEmail,
    displayName: user.displayName,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
}

export async function registerUser(input: {
  database: AuthDatabase;
  config: AppConfig;
  email: string;
  password: string;
  displayName?: string;
}): Promise<{ user: SafeUser; accessToken: string; refreshToken: string }> {
  const email = normalizeEmail(input.email);
  const existing = await input.database.user.findUnique({ where: { email } });
  if (existing !== null) {
    throw new AppError({
      code: errorCodes.EMAIL_ALREADY_EXISTS,
      message: "The email address cannot be used.",
      statusCode: 409
    });
  }

  const now = new Date();
  const user = await input.database.user.create({
    data: {
      id: generateUuidV7(now),
      email,
      displayEmail: input.email.trim(),
      passwordHash: await hashPassword(input.password),
      displayName: input.displayName ?? null,
      role: UserRole.USER
    }
  });

  return issueSession(input.database, input.config, user);
}

export async function loginUser(input: {
  database: AuthDatabase;
  config: AppConfig;
  email: string;
  password: string;
}): Promise<{ user: SafeUser; accessToken: string; refreshToken: string }> {
  const user = await input.database.user.findUnique({
    where: { email: normalizeEmail(input.email) }
  });
  if (user === null || !(await verifyPassword(user.passwordHash, input.password))) {
    throw invalidCredentials();
  }

  return issueSession(input.database, input.config, user);
}

export async function refreshSession(input: {
  database: AuthDatabase;
  config: AppConfig;
  refreshToken: string | undefined;
}): Promise<{ accessToken: string; refreshToken: string }> {
  if (input.refreshToken === undefined) {
    throw sessionExpired();
  }

  const tokenHash = hashRefreshToken(input.refreshToken, input.config.refreshTokenSecret);
  const token = await input.database.refreshToken.findUnique({
    where: { tokenHash },
    include: { session: true }
  });
  const now = new Date();

  if (token === null || token.session === undefined) {
    throw sessionExpired();
  }

  if (token.consumedAt !== null || token.revokedAt !== null) {
    await input.database.refreshSession.updateMany({
      where: { id: token.sessionId },
      data: { revokedAt: now, revocationReason: "token_reuse" }
    });
    throw new AppError({
      code: errorCodes.TOKEN_REUSE_DETECTED,
      message: "The session is no longer valid.",
      statusCode: 401
    });
  }

  if (
    token.expiresAt <= now ||
    token.session.expiresAt <= now ||
    token.session.revokedAt !== null
  ) {
    throw sessionExpired();
  }

  const rawRefreshToken = createRawRefreshToken();
  const newTokenHash = hashRefreshToken(rawRefreshToken, input.config.refreshTokenSecret);
  const newTokenId = generateUuidV7(now);

  const rotated = await input.database.$transaction(async (tx) => {
    const consumed = await tx.refreshToken.updateMany({
      where: { id: token.id, consumedAt: null, revokedAt: null },
      data: { consumedAt: now }
    });

    if (consumed.count !== 1) {
      await tx.refreshSession.updateMany({
        where: { id: token.sessionId },
        data: { revokedAt: now, revocationReason: "token_reuse" }
      });
      return false;
    }

    await tx.refreshToken.create({
      data: {
        id: newTokenId,
        sessionId: token.sessionId,
        tokenHash: newTokenHash,
        issuedAt: now,
        expiresAt: token.expiresAt
      }
    });
    await tx.refreshToken.update({
      where: { id: token.id },
      data: { replacedByTokenId: newTokenId }
    });

    return true;
  });

  if (!rotated) {
    throw new AppError({
      code: errorCodes.TOKEN_REUSE_DETECTED,
      message: "The session is no longer valid.",
      statusCode: 401
    });
  }

  return {
    accessToken: await createAccessToken({
      config: input.config,
      userId: token.session.userId,
      sessionId: token.sessionId
    }),
    refreshToken: rawRefreshToken
  };
}

export async function logoutSession(input: {
  database: AuthDatabase;
  userId?: string;
  sessionId?: string;
}): Promise<void> {
  if (input.sessionId === undefined) {
    return;
  }

  await input.database.refreshSession.updateMany({
    where: { id: input.sessionId, ...(input.userId !== undefined ? { userId: input.userId } : {}) },
    data: { revokedAt: new Date(), revocationReason: "logout" }
  });
}

export async function getCurrentUser(database: AuthDatabase, userId: string): Promise<SafeUser> {
  const user = await database.user.findUnique({ where: { id: userId } });
  if (user === null) {
    throw authenticationRequired();
  }

  return toSafeUser(user);
}

async function issueSession(
  database: AuthDatabase,
  config: AppConfig,
  user: UserRecord
): Promise<{ user: SafeUser; accessToken: string; refreshToken: string }> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
  const session = await createSession(database, user.id, now, expiresAt);
  const rawRefreshToken = createRawRefreshToken();

  await database.refreshToken.create({
    data: {
      id: generateUuidV7(now),
      sessionId: session.id,
      tokenHash: hashRefreshToken(rawRefreshToken, config.refreshTokenSecret),
      issuedAt: now,
      expiresAt
    }
  });

  return {
    user: toSafeUser(user),
    accessToken: await createAccessToken({ config, userId: user.id, sessionId: session.id }),
    refreshToken: rawRefreshToken
  };
}

function createSession(
  database: AuthDatabase,
  userId: string,
  now: Date,
  expiresAt: Date
): Promise<RefreshSessionRecord> {
  return database.refreshSession.create({
    data: {
      id: generateUuidV7(now),
      userId,
      familyId: generateUuidV7(now),
      expiresAt
    }
  });
}

export function authenticationRequired(): AppError {
  return new AppError({
    code: errorCodes.AUTHENTICATION_REQUIRED,
    message: "Authentication is required.",
    statusCode: 401
  });
}

function invalidCredentials(): AppError {
  return new AppError({
    code: errorCodes.INVALID_CREDENTIALS,
    message: "Invalid email or password.",
    statusCode: 401
  });
}

function sessionExpired(): AppError {
  return new AppError({
    code: errorCodes.SESSION_EXPIRED,
    message: "The session has expired.",
    statusCode: 401
  });
}
