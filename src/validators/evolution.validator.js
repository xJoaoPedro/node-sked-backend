import { z } from "zod";

const booleanish = z
  .union([z.boolean(), z.enum(["true", "false"])])
  .transform((value) => value === true || value === "true");

export const createEvolutionInstanceValidator = z.object({
  company_id: z.coerce.number(),
  instanceName: z.string().min(1).optional(),
  qrcode: booleanish.optional(),
});

export const connectEvolutionInstanceValidator = z.object({
  company_id: z.coerce.number(),
  instanceName: z.string().min(1).optional(),
});

export const evolutionConnectionStateValidator = z.object({
  company_id: z.coerce.number(),
  instanceName: z.string().min(1).optional(),
});

export const sendEvolutionTextValidator = z.object({
  company_id: z.coerce.number(),
  instanceName: z.string().min(1).optional(),
  number: z.string().min(8),
  text: z.string().min(1),
  delay: z.coerce.number().int().nonnegative().optional(),
  linkPreview: booleanish.optional(),
});
