import { z } from "zod";

const validator = z.object({
  name:       z.string().max(255).nullable().optional(),
  email:      z.email().max(255),
  password:   z.string().min(6).max(30),
  phone:      z.string().min(10).max(11).nullable().optional(),
  status:     z.enum(["ACTIVE", "DISABLED"]).nullable().optional(),
  last_login: z.date().nullable().optional(),
});

export const createUserValidator = validator;
export const updateUserValidator = validator.partial();
