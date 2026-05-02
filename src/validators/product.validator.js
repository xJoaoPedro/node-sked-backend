import { z } from "zod";

const validator = z.object({
  company_id:       z.coerce.number(),
  name:             z.string().max(255),
  category:         z.enum(['HAIR', 'BEARD', 'AESTHETIC', 'NAILS', 'MASSAGE', 'THERAPY', 'HEALTH', 'DENTAL', 'FITNESS', 'BEAUTY', 'AUTOMOTIVE', 'TECHNICAL', 'HOME_SERVICE', 'PET', 'CONSULTING', 'EDUCATION', 'OTHER']).optional(),
  quantity:         z.coerce.number().min(0).max(999),
  cost_price:       z.coerce.number().nonnegative(),
});

export const createProductValidator = validator;
export const updateProductValidator = validator.partial();
