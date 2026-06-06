import { z } from "zod";

const optionalText = (maxLength) => z
  .union([z.string().trim().max(maxLength), z.literal("")])
  .optional()
  .transform((value) => {
    if (!value) return undefined;

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  });

const optionalEmail = z
  .union([z.string().trim().email().max(255), z.literal("")])
  .optional()
  .transform((value) => {
    if (!value) return undefined;

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  });

export const contactValidator = z.object({
  name: optionalText(255),
  email: optionalEmail,
  message: z.string().trim().min(1).max(5000),
});
