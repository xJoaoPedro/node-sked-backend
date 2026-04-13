import { z } from "zod";

const validator = z.object({
  legal_name:    z.string().max(255).optional(),
  fantasy_name:  z.string().max(255).optional(),
  cnpj:          z.string().max(14).optional(),
  email:         z.email().max(255),
  password:      z.string().min(6).max(30),
  phone:         z.string().max(11).optional(),
  interval_slot: z.number().nullable().optional(),
  plan:          z.enum(["FREE", "PRO"]).nullable().optional(),
  status:        z.enum(["PENDING", "APPROVED", "DENIED"]).nullable().optional(),
  approve_date:  z.date().nullable().optional(),
});

export const createCompanyValidator = validator;
export const updateCompanyValidator = validator.partial();
