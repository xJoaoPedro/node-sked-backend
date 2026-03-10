import { z } from "zod";

const companyUserValidator = z.object({
  company_id: z.coerce.number(),
  user_id:    z.coerce.number(),
  role:       z.enum(["MANAGER", "EMPLOYEE"]),
  status:     z.enum(["ACTIVE", "DISABLED"]).nullable().optional(),
});

export const createCompanyUserValidator = companyUserValidator;
export const updateCompanyUserValidator = companyUserValidator.partial();
