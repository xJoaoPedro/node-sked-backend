import { z } from "zod";

const validator = z.object({
  company_id:        z.coerce.number(),
  plan:              z.enum(["FREE", "PRO"]).nullable().optional(),
  status:            z.enum(["PENDING", "ACTIVE", "EXPIRED", "CANCELED"]).nullable().optional(),
  start_date:        z.coerce.date(),
  renovation_date:   z.coerce.date(),
  cancellation_date: z.coerce.date().nullable().optional(),
  paid:              z.boolean().nullable().optional()
});

export const createSignatureValidator = validator;
export const updateSignatureValidator = validator.partial();
