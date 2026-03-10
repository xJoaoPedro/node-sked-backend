import { z } from "zod";

const userValidator = z.object({
  name: z.string().min(2),
  email: z.email(),
  password: z.string().min(6),
  phone: z.string().min(10)
});

export const createUserValidator = userValidator;
export const updateUserValidator = userValidator.partial()