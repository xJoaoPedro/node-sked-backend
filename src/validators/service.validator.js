import { z } from "zod";

const validator = z.object({
  company_id:       z.coerce.number(),
  name:             z.string().max(255),
  description:      z.string().max(255).nullable().optional(),
  duration_minutes: z.coerce.number(),
  commission:       z.coerce.number().nonnegative().min(0).max(100),
  category:         z.enum(['HAIR', 'BEARD', 'AESTHETIC', 'NAILS', 'MASSAGE', 'THERAPY', 'HEALTH', 'DENTAL', 'FITNESS', 'BEAUTY', 'AUTOMOTIVE', 'TECHNICAL', 'HOME_SERVICE', 'PET', 'CONSULTING', 'EDUCATION', 'OTHER']).optional(),
  price:            z.coerce.number().nonnegative(),
  status:           z.enum(["ACTIVE", "DISABLED"]).optional()
});

export const createServiceValidator = validator;
export const updateServiceValidator = validator.partial();
