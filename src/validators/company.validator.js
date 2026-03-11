import { z } from "zod";

const validator = z.object({
  legal_name:    z.string().max(255),
  fantasy_name:  z.string().max(255),
  cnpj:          z.string().max(14),
  email:         z.email().max(255),
  phone:         z.string().max(11),
  interval_slot: z.number().nullable().optional(),
  plan:          z.enum(["FREE", "PRO"]).nullable().optional(),
  status:        z.enum(["PENDING", "APPROVED", "DENIED"]).nullable().optional(),
  approve_date:  z.date().nullable().optional(),
});

export const createCompanyValidator = validator;
export const updateCompanyValidator = validator.partial();
