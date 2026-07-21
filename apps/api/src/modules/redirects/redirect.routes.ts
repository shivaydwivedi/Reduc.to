import type { FastifyInstance } from "fastify";

import { RedirectType } from "../../generated/prisma/enums.js";
import { AppError } from "../../shared/errors/app-error.js";
import { errorCodes } from "../../shared/errors/error-codes.js";
import { generateUuidV7 } from "../../shared/ids/uuid-v7.js";
import type { LinkDatabase, LinkRecord } from "../links/link.types.js";

export async function registerRedirectRoutes(
  app: FastifyInstance,
  input: { database: unknown }
): Promise<void> {
  const database = input.database as LinkDatabase;

  app.get("/:key", async (request, reply) => {
    const { key } = request.params as { key: string };
    if (key === "api" || key === "health" || key === "ready") {
      throw routeNotFound();
    }

    const lookupKey = key.trim().toLowerCase();
    const link = await database.link.findUnique({ where: { lookupKey } });
    validateRedirectable(link);

    void database.clickEvent
      .create({
        data: {
          id: generateUuidV7(),
          linkId: link.id,
          occurredAt: new Date(),
          referrerHost: parseReferrerHost(request.headers.referer),
          isBot: false,
          source: "redirect"
        }
      })
      .catch((error: unknown) => {
        request.log.warn({ err: error, linkId: link.id }, "Click tracking failed");
      });

    return reply.redirect(
      link.destinationUrl,
      link.redirectType === RedirectType.PERMANENT_301 ? 301 : 302
    );
  });
}

function validateRedirectable(link: LinkRecord | null): asserts link is LinkRecord {
  if (link === null || link.deletedAt !== null) {
    throw linkNotFound();
  }
  if (!link.isActive) {
    throw linkNotFound();
  }
  if (link.expiresAt !== null && link.expiresAt <= new Date()) {
    throw new AppError({
      code: errorCodes.LINK_EXPIRED,
      message: "The requested link has expired.",
      statusCode: 410
    });
  }
}

function parseReferrerHost(referrer: string | undefined): string | null {
  if (referrer === undefined) {
    return null;
  }
  try {
    return new URL(referrer).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function linkNotFound(): AppError {
  return new AppError({
    code: errorCodes.LINK_NOT_FOUND,
    message: "The requested link was not found.",
    statusCode: 404
  });
}

function routeNotFound(): AppError {
  return new AppError({
    code: errorCodes.ROUTE_NOT_FOUND,
    message: "The requested route was not found.",
    statusCode: 404
  });
}
