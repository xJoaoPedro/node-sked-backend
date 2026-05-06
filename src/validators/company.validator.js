import { z } from "zod";

const validator = z.object({
  legal_name:    z.string().max(255).optional(),
  fantasy_name:  z.string().max(255).optional(),
  cnpj:          z.string().max(14).optional(),
  email:         z.email().max(255),
  password:      z.string().min(6).max(30),
  phone:         z.string().max(11).optional(),
  photo:         z.string().max(255).nullable().optional(),
  website:       z.url().max(255).nullable().optional(),
  accepted_payment_methods: z.array(
    z.enum(["PIX", "CREDIT", "DEBIT", "CASH"]),
  ).optional(),
  plan:          z.enum(["FREE", "PRO"]).nullable().optional(),
  status:        z.enum(["PENDING", "APPROVED", "DENIED"]).nullable().optional(),
  approve_date:  z.date().nullable().optional(),
});

export const createCompanyValidator = validator;
export const updateCompanyValidator = validator.partial();
