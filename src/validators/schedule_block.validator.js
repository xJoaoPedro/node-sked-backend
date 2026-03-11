import { z } from "zod";

const validator = z.object({
  company_id:  z.coerce.number(),
  employee_id: z.coerce.number(),
  start_time:  z.coerce.date(),
  end_time:    z.coerce.date().nullable().optional(),
  reason:      z.string().max(255)
});

export const createScheduleBlockValidator = validator;
export const updateScheduleBlockValidator = validator.partial();
