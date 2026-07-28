import type { AppConfig } from "../../config/types.js";
import { RedirectType } from "../../generated/prisma/enums.js";
import { AppError } from "../../shared/errors/app-error.js";
import { errorCodes } from "../../shared/errors/error-codes.js";
import { generateUuidV7 } from "../../shared/ids/uuid-v7.js";
import { generateShortKey, isValidAlias, normalizeAlias } from "./key-generator.js";
import { validateDestinationUrl } from "./destination-url.js";
import type { LinkDatabase, LinkRecord, LinkResponse } from "./link.types.js";

const maxKeyAttempts = 8;

export async function createLink(input: {
  database: LinkDatabase;
  config: AppConfig;
  userId: string;
  destinationUrl: string;
  alias?: string;
  title?: string | null;
  expiresAt?: string | null;
}): Promise<LinkResponse> {
  const now = new Date();
  const key = await resolveKey(input.database, input.alias);
  const expiresAt = parseFutureExpiry(input.expiresAt);
  const link = await input.database.link.create({
    data: {
      id: generateUuidV7(now),
      userId: input.userId,
      displayKey: key,
      lookupKey: key,
      destinationUrl: validateDestinationUrl(input.destinationUrl),
      title: input.title ?? null,
      isActive: true,
      expiresAt: expiresAt ?? null,
      redirectType: RedirectType.TEMPORARY_302
    }
  });
  return toLinkResponse(input.database, input.config, link);
}

export async function listLinks(input: {
  database: LinkDatabase;
  config: AppConfig;
  userId: string;
  page: number;
  limit: number;
}): Promise<{ links: LinkResponse[]; total: number; page: number; limit: number }> {
  const where = { userId: input.userId, deletedAt: null };
  const [links, total] = await Promise.all([
    input.database.link.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.limit,
      take: input.limit
    }),
    input.database.link.count({ where })
  ]);

  return {
    links: await Promise.all(
      links.map((link) => toLinkResponse(input.database, input.config, link))
    ),
    total,
    page: input.page,
    limit: input.limit
  };
}

export async function getOwnedLink(input: {
  database: LinkDatabase;
  config: AppConfig;
  userId: string;
  linkId: string;
}): Promise<LinkResponse> {
  return toLinkResponse(
    input.database,
    input.config,
    await findOwnedLink(input.database, input.userId, input.linkId)
  );
}

export async function updateOwnedLink(input: {
  database: LinkDatabase;
  config: AppConfig;
  userId: string;
  linkId: string;
  destinationUrl?: string;
  title?: string | null;
  expiresAt?: string | null;
}): Promise<LinkResponse> {
  await findOwnedLink(input.database, input.userId, input.linkId);
  const data: Partial<LinkRecord> = {};
  if (input.destinationUrl !== undefined) {
    data.destinationUrl = validateDestinationUrl(input.destinationUrl);
  }
  if (input.title !== undefined) {
    data.title = input.title;
  }
  if (input.expiresAt !== undefined) {
    data.expiresAt = parseFutureExpiry(input.expiresAt);
  }

  const link = await input.database.link.update({ where: { id: input.linkId }, data });
  return toLinkResponse(input.database, input.config, link);
}

export async function setLinkActive(input: {
  database: LinkDatabase;
  config: AppConfig;
  userId: string;
  linkId: string;
  isActive: boolean;
}): Promise<LinkResponse> {
  await findOwnedLink(input.database, input.userId, input.linkId);
  const link = await input.database.link.update({
    where: { id: input.linkId },
    data: { isActive: input.isActive }
  });
  return toLinkResponse(input.database, input.config, link);
}

export async function softDeleteLink(input: {
  database: LinkDatabase;
  userId: string;
  linkId: string;
}): Promise<{ ok: true }> {
  await findOwnedLink(input.database, input.userId, input.linkId);
  await input.database.link.update({
    where: { id: input.linkId },
    data: { deletedAt: new Date() }
  });
  return { ok: true };
}

async function resolveKey(database: LinkDatabase, alias: string | undefined): Promise<string> {
  if (alias !== undefined) {
    const key = normalizeAlias(alias);
    if (!isValidAlias(key)) {
      throw aliasUnavailable();
    }
    if ((await database.link.findUnique({ where: { lookupKey: key } })) !== null) {
      throw aliasUnavailable();
    }
    return key;
  }

  for (let attempt = 0; attempt < maxKeyAttempts; attempt += 1) {
    const key = generateShortKey();
    if ((await database.link.findUnique({ where: { lookupKey: key } })) === null) {
      return key;
    }
  }

  throw aliasUnavailable();
}

async function findOwnedLink(
  database: LinkDatabase,
  userId: string,
  linkId: string
): Promise<LinkRecord> {
  const link = await database.link.findFirst({
    where: {
      id: linkId,
      userId,
      deletedAt: null
    }
  });
  if (link === null) {
    throw new AppError({
      code: errorCodes.LINK_NOT_FOUND,
      message: "The requested link was not found.",
      statusCode: 404
    });
  }
  return link;
}

async function toLinkResponse(
  database: LinkDatabase,
  config: AppConfig,
  link: LinkRecord
): Promise<LinkResponse> {
  const totalClicks = await database.clickEvent.count({ where: { linkId: link.id } });
  return {
    id: link.id,
    displayKey: link.displayKey,
    shortUrl: new URL(`/${link.displayKey}`, config.publicBaseUrl).toString(),
    destinationUrl: link.destinationUrl,
    title: link.title,
    isActive: link.isActive,
    expiresAt: link.expiresAt?.toISOString() ?? null,
    createdAt: link.createdAt.toISOString(),
    updatedAt: link.updatedAt.toISOString(),
    totalClicks
  };
}

function aliasUnavailable(): AppError {
  return new AppError({
    code: errorCodes.ALIAS_UNAVAILABLE,
    message: "The requested alias is unavailable.",
    statusCode: 409
  });
}

function parseFutureExpiry(value: string | null | undefined): Date | null {
  if (value === null || value === undefined) {
    return null;
  }

  const expiresAt = new Date(value);
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date()) {
    throw new AppError({
      code: errorCodes.INVALID_EXPIRY,
      message: "Expiry must be in the future.",
      statusCode: 400
    });
  }

  return expiresAt;
}
