import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(12).max(256),
  displayName: z.string().trim().min(1).max(80).optional()
});

export const loginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(256)
});
