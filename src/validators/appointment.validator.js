import { z } from "zod";

const validator = z.object({
  company_id:   z.coerce.number(),
  service_id:   z.coerce.number(),
  employee_id:  z.coerce.number(),
  client_id:    z.coerce.number(),
  start_time:   z.coerce.date(),
  end_time:     z.coerce.date(),
  observations: z.string().max(255).nullable().optional(),
  status:       z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELED", "NO_SHOW"]).nullable().optional()
});

export const createAppointmentValidator = validator;
export const updateAppointmentValidator = validator.partial();
