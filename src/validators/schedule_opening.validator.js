import { z } from "zod";

const validator = z.object({
  company_id:  z.coerce.number(),
  employee_id: z.coerce.number(),
  week_day:    z.coerce.number().gte(0).lte(6),
  start_time:  z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  end_time:    z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
});

export const createScheduleOpeningValidator = validator;
export const updateScheduleOpeningValidator = validator.partial();
