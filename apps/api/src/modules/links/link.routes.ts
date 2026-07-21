import type { FastifyInstance } from "fastify";

import type { AppConfig } from "../../config/types.js";
import { requireAuthenticatedUser } from "../auth/auth.guard.js";
import { createLinkSchema, listLinksSchema, updateLinkSchema } from "./link.schemas.js";
import type { LinkDatabase } from "./link.types.js";
import {
  createLink,
  getOwnedLink,
  listLinks,
  setLinkActive,
  softDeleteLink,
  updateOwnedLink
} from "./link.service.js";

export async function registerLinkRoutes(
  app: FastifyInstance,
  input: { config: AppConfig; database: unknown }
): Promise<void> {
  const database = input.database as LinkDatabase;

  app.post("/api/v1/links", async (request, reply) => {
    const auth = await requireAuthenticatedUser(request, input.config);
    const body = createLinkSchema.parse(request.body);
    const link = await createLink({
      database,
      config: input.config,
      userId: auth.userId,
      destinationUrl: body.destinationUrl,
      ...(body.alias !== undefined ? { alias: body.alias } : {}),
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.expiresAt !== undefined ? { expiresAt: body.expiresAt } : {})
    });
    return reply.status(201).send({ link });
  });

  app.get("/api/v1/links", async (request) => {
    const auth = await requireAuthenticatedUser(request, input.config);
    const query = listLinksSchema.parse(request.query);
    return listLinks({ database, config: input.config, userId: auth.userId, ...query });
  });

  app.get("/api/v1/links/:linkId", async (request) => {
    const auth = await requireAuthenticatedUser(request, input.config);
    const { linkId } = request.params as { linkId: string };
    return {
      link: await getOwnedLink({ database, config: input.config, userId: auth.userId, linkId })
    };
  });

  app.patch("/api/v1/links/:linkId", async (request) => {
    const auth = await requireAuthenticatedUser(request, input.config);
    const { linkId } = request.params as { linkId: string };
    const body = updateLinkSchema.parse(request.body);
    return {
      link: await updateOwnedLink({
        database,
        config: input.config,
        userId: auth.userId,
        linkId,
        ...(body.destinationUrl !== undefined ? { destinationUrl: body.destinationUrl } : {}),
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.expiresAt !== undefined ? { expiresAt: body.expiresAt } : {})
      })
    };
  });

  app.post("/api/v1/links/:linkId/enable", async (request) => {
    const auth = await requireAuthenticatedUser(request, input.config);
    const { linkId } = request.params as { linkId: string };
    return {
      link: await setLinkActive({
        database,
        config: input.config,
        userId: auth.userId,
        linkId,
        isActive: true
      })
    };
  });

  app.post("/api/v1/links/:linkId/disable", async (request) => {
    const auth = await requireAuthenticatedUser(request, input.config);
    const { linkId } = request.params as { linkId: string };
    return {
      link: await setLinkActive({
        database,
        config: input.config,
        userId: auth.userId,
        linkId,
        isActive: false
      })
    };
  });

  app.delete("/api/v1/links/:linkId", async (request) => {
    const auth = await requireAuthenticatedUser(request, input.config);
    const { linkId } = request.params as { linkId: string };
    return softDeleteLink({ database, userId: auth.userId, linkId });
  });
}
