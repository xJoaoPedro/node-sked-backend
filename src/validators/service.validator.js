import { z } from "zod";

const validator = z.object({
  company_id:       z.coerce.number(),
  name:             z.string().max(255),
  description:      z.string().max(255).nullable().optional(),
  duration_minutes: z.coerce.number(),
  buffer_minutes:   z.coerce.number().optional(),
  price:            z.coerce.number().nonnegative(),
  status:           z.enum(["ACTIVE", "DISABLED"]).optional()
});

export const createServiceValidator = validator;
export const updateServiceValidator = validator.partial();
