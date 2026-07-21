import type { UserRole } from "../../generated/prisma/enums.js";

export type SafeUser = {
  id: string;
  email: string;
  displayEmail: string | null;
  displayName: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
};

export type AuthenticatedUser = {
  userId: string;
  sessionId: string;
};

export type AuthDatabase = {
  user: {
    findUnique: (input: { where: { email?: string; id?: string } }) => Promise<UserRecord | null>;
    create: (input: { data: UserCreateData }) => Promise<UserRecord>;
  };
  refreshSession: {
    create: (input: { data: RefreshSessionCreateData }) => Promise<RefreshSessionRecord>;
    updateMany: (input: {
      where: { id: string; userId?: string };
      data: { revokedAt: Date; revocationReason?: string };
    }) => Promise<{ count: number }>;
  };
  refreshToken: {
    findUnique: (input: {
      where: { tokenHash: string };
      include?: { session?: boolean };
    }) => Promise<RefreshTokenWithSession | null>;
    create: (input: { data: RefreshTokenCreateData }) => Promise<RefreshTokenRecord>;
    updateMany: (input: {
      where: { id: string; consumedAt: null; revokedAt: null };
      data: { consumedAt: Date };
    }) => Promise<{ count: number }>;
    update: (input: {
      where: { id: string };
      data: { consumedAt?: Date; revokedAt?: Date; replacedByTokenId?: string };
    }) => Promise<RefreshTokenRecord>;
  };
  $transaction: <T>(callback: (database: AuthDatabase) => Promise<T>) => Promise<T>;
};

export type UserRecord = {
  id: string;
  email: string;
  displayEmail: string | null;
  passwordHash: string;
  displayName: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
};

export type UserCreateData = Omit<UserRecord, "createdAt" | "updatedAt">;

export type RefreshSessionRecord = {
  id: string;
  userId: string;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  revocationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type RefreshSessionCreateData = Omit<
  RefreshSessionRecord,
  "revokedAt" | "revocationReason" | "createdAt" | "updatedAt"
>;

export type RefreshTokenRecord = {
  id: string;
  sessionId: string;
  tokenHash: string;
  issuedAt: Date;
  expiresAt: Date;
  consumedAt: Date | null;
  revokedAt: Date | null;
  replacedByTokenId: string | null;
};

export type RefreshTokenCreateData = Omit<
  RefreshTokenRecord,
  "consumedAt" | "revokedAt" | "replacedByTokenId"
>;

export type RefreshTokenWithSession = RefreshTokenRecord & {
  session?: RefreshSessionRecord | undefined;
};
