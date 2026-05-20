import { z } from "zod";

const scheduleOpeningSchema = z.object({
  id: z.coerce.number().optional(),
  company_id: z.coerce.number().optional(),
  employee_id: z.coerce.number().optional(),
  week_day: z.coerce.number().min(0).max(6),

  start_time: z
    .union([
      z.string(), // "09:00"
      z.string().datetime(), // ISO
    ])
    .optional()
    .nullable(),

  end_time: z
    .union([
      z.string(),
      z.string().datetime(),
    ])
    .optional()
    .nullable(),
});

const validator = z.object({
  company_id: z.coerce.number(),
  user_id: z.coerce.number().optional().nullable(),

  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  phone: z.string().min(10).max(11),

  role: z.enum(["MANAGER", "EMPLOYEE"]),
  status: z.enum(["ACTIVE", "DISABLED"]).optional().nullable(),

  services: z.array(z.coerce.number()).optional(),

  scheduleOpenings: z.array(scheduleOpeningSchema).optional(),
});

export const createProfessionalValidator = validator;
export const updateProfessionalValidator = validator.partial();
