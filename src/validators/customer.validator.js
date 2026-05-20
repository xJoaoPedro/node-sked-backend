import { z } from "zod";

const validator = z.object({
  company_id: z.coerce.number(),
  name: z.string().min(1).max(255),
  phone: z.string().min(10).max(11),
});

export const createCustomerValidator = validator;
export const updateCustomerValidator = validator.partial();
