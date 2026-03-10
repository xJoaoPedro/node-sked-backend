import { z } from "zod";

const companyValidator = z.object({
  legal_name:    z.string().max(255),
  fantasy_name:  z.string().max(255),
  cnpj:          z.string().max(14),
  email:         z.email().max(255),
  phone:         z.string().max(11),
  interval_slot: z.number().nullable().optional(),
  plan:          z.enum(["FREE", "PRO"]),
  status:        z.enum(["PENDING", "APPROVED", "DENIED"]),
  approve_date:  z.date().nullable().optional(),
});

export const createCompanyValidator = companyValidator;
export const updateCompanyValidator = companyValidator.partial();
