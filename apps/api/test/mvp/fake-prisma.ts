import { RedirectType, UserRole } from "../../src/generated/prisma/enums.js";
import type {
  AuthDatabase,
  RefreshSessionRecord,
  RefreshTokenRecord,
  UserRecord
} from "../../src/modules/auth/auth.types.js";
import type {
  ClickEventCreateData,
  LinkDatabase,
  LinkRecord
} from "../../src/modules/links/link.types.js";

export type FakeDatabase = AuthDatabase &
  LinkDatabase & {
    __store: {
      users: UserRecord[];
      sessions: RefreshSessionRecord[];
      tokens: RefreshTokenRecord[];
      links: LinkRecord[];
      clickEvents: ClickEventCreateData[];
      failClickTracking: boolean;
      failNextRefreshTokenConsume: boolean;
    };
  };

export function createFakePrismaClient(): FakeDatabase {
  const users: UserRecord[] = [];
  const sessions: RefreshSessionRecord[] = [];
  const tokens: RefreshTokenRecord[] = [];
  const links: LinkRecord[] = [];
  const clickEvents: ClickEventCreateData[] = [];
  const store = {
    users,
    sessions,
    tokens,
    links,
    clickEvents,
    failClickTracking: false,
    failNextRefreshTokenConsume: false
  };

  const database: FakeDatabase = {
    __store: store,
    user: {
      async findUnique(input) {
        return (
          users.find((user) =>
            input.where.email !== undefined
              ? user.email === input.where.email
              : user.id === input.where.id
          ) ?? null
        );
      },
      async create(input) {
        const now = new Date();
        const user: UserRecord = {
          ...input.data,
          role: input.data.role ?? UserRole.USER,
          createdAt: now,
          updatedAt: now
        };
        users.push(user);
        return user;
      }
    },
    refreshSession: {
      async create(input) {
        const now = new Date();
        const session: RefreshSessionRecord = {
          ...input.data,
          revokedAt: null,
          revocationReason: null,
          createdAt: now,
          updatedAt: now
        };
        sessions.push(session);
        return session;
      },
      async updateMany(input) {
        let count = 0;
        for (const session of sessions) {
          if (
            session.id === input.where.id &&
            (input.where.userId === undefined || input.where.userId === session.userId)
          ) {
            session.revokedAt = input.data.revokedAt;
            session.revocationReason = input.data.revocationReason ?? null;
            session.updatedAt = new Date();
            count += 1;
          }
        }
        return { count };
      }
    },
    refreshToken: {
      async findUnique(input) {
        const token = tokens.find((item) => item.tokenHash === input.where.tokenHash) ?? null;
        if (token === null) {
          return null;
        }
        if (input.include?.session === true) {
          return {
            ...token,
            session: sessions.find((session) => session.id === token.sessionId)
          };
        }
        return token;
      },
      async create(input) {
        const token: RefreshTokenRecord = {
          ...input.data,
          consumedAt: null,
          revokedAt: null,
          replacedByTokenId: null
        };
        tokens.push(token);
        return token;
      },
      async updateMany(input) {
        if (store.failNextRefreshTokenConsume) {
          store.failNextRefreshTokenConsume = false;
          const token = tokens.find((item) => item.id === input.where.id);
          if (token !== undefined) {
            token.consumedAt = new Date();
          }
        }

        let count = 0;
        for (const token of tokens) {
          if (
            token.id === input.where.id &&
            token.consumedAt === input.where.consumedAt &&
            token.revokedAt === input.where.revokedAt
          ) {
            token.consumedAt = input.data.consumedAt;
            count += 1;
          }
        }
        return { count };
      },
      async update(input) {
        const token = tokens.find((item) => item.id === input.where.id);
        if (token === undefined) {
          throw new Error("Token not found.");
        }
        Object.assign(token, input.data);
        return token;
      }
    },
    link: {
      async findUnique(input) {
        return (
          links.find((link) =>
            input.where.lookupKey !== undefined
              ? link.lookupKey === input.where.lookupKey
              : link.id === input.where.id
          ) ?? null
        );
      },
      async findFirst(input) {
        return links.find((link) => matches(link, input.where)) ?? null;
      },
      async findMany(input) {
        return links
          .filter((link) => matches(link, input.where))
          .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
          .slice(input.skip ?? 0, (input.skip ?? 0) + (input.take ?? links.length));
      },
      async count(input) {
        return links.filter((link) => matches(link, input.where)).length;
      },
      async create(input) {
        if (links.some((link) => link.lookupKey === input.data.lookupKey)) {
          throw new Error("Unique lookup key conflict.");
        }
        const now = new Date();
        const link: LinkRecord = {
          ...input.data,
          redirectType: input.data.redirectType ?? RedirectType.TEMPORARY_302,
          createdAt: now,
          updatedAt: now,
          deletedAt: null
        };
        links.push(link);
        return link;
      },
      async update(input) {
        const link = links.find((item) => item.id === input.where.id);
        if (link === undefined) {
          throw new Error("Link not found.");
        }
        Object.assign(link, input.data, { updatedAt: new Date() });
        return link;
      }
    },
    clickEvent: {
      async count(input) {
        return clickEvents.filter((event) => event.linkId === input.where.linkId).length;
      },
      async create(input) {
        if (store.failClickTracking) {
          throw new Error("Click tracking failed.");
        }
        clickEvents.push(input.data);
        return input.data;
      }
    },
    async $transaction(callback) {
      return callback(database);
    }
  };

  return database;
}

function matches(link: LinkRecord, where: Partial<LinkRecord>): boolean {
  return Object.entries(where).every(([key, value]) => link[key as keyof LinkRecord] === value);
}
