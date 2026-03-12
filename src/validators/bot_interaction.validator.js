import { z } from "zod";

const validator = z.object({
  company_id:   z.coerce.number(),
  client_id:    z.coerce.number(),
  type:         z.enum(["APPOINTMENT", "CANCELLATION", "REAPPOINTMENT", "INQUIRY", "OTHER"]),
  status:       z.enum(["IN_PROGRESS", "WAITING_PAYMENT", "SCHEDULED", "CANCELED", "OTHER"]),
  data:         z.json()
});

export const createBotInteractionValidator = validator;
export const updateBotInteractionValidator = validator.partial();
