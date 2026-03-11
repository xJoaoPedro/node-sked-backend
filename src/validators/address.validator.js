import { z } from "zod";

const validator = z.object({
  company_id:   z.coerce.number(),
  cep:          z.string().max(255),
  street:       z.string().max(255),
  number:       z.string().max(20),
  complement:   z.string().nullable().optional(),
  neighborhood: z.string().max(255),
  city:         z.string().max(255),
  state:        z.string().max(2)
});

export const createAddressValidator = validator;
export const updateAddressValidator = validator.partial();
