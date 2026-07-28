import { z } from "zod";

export const createLinkSchema = z.object({
  destinationUrl: z.string().trim().min(1).max(2048),
  alias: z.string().trim().min(3).max(40).optional(),
  title: z.string().trim().min(1).max(160).nullable().optional(),
  expiresAt: z.string().trim().min(1).nullable().optional()
});

export const updateLinkSchema = z.object({
  destinationUrl: z.string().trim().min(1).max(2048).optional(),
  title: z.string().trim().min(1).max(160).nullable().optional(),
  expiresAt: z.string().trim().min(1).nullable().optional()
});

export const listLinksSchema = z.object({
  page: z.coerce.number().int().positive().max(1000).default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
});
