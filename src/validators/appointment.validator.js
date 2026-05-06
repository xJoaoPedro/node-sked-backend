import { z } from "zod";

const baseValidator = z.object({
  company_id:   z.coerce.number(),
  service_id:   z.coerce.number(),
  employee_id:  z.coerce.number(),
  client_id:    z.coerce.number(),
  start_time:   z.coerce.date(),
  end_time:     z.coerce.date(),
  observations: z.string().max(255).nullable().optional(),
  status:       z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELED", "NO_SHOW"]).nullable().optional()
});

export const createAppointmentValidator = baseValidator.refine((data) => data.end_time > data.start_time, {
  message: "Horário de término deve ser maior que o horário de início",
  path: ["end_time"],
});

export const updateAppointmentValidator = baseValidator.partial().refine((data) => {
  if (!data.start_time || !data.end_time) return true;
  return data.end_time > data.start_time;
}, {
  message: "Horário de término deve ser maior que o horário de início",
  path: ["end_time"],
});
