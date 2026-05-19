import { z } from "zod";

export const createRevenueTransactionValidator = z.object({
  appointment_id: z.coerce.number().int().positive(),
  description: z.string().trim().min(1).max(255).optional(),
  amount: z.coerce.number().positive(),
  payment_method: z.enum(["PIX", "CREDIT", "DEBIT", "CASH"]),
  status: z.enum(["RECEIVED", "PENDING", "CANCELED"]).default("RECEIVED"),
  occurred_at: z.coerce.date(),
});
