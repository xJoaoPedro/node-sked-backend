import { z } from "zod";

const validator = z.object({
  name:       z.string().max(255),
  email:      z.email().max(255),
  password:   z.string().min(6).max(30),
  phone:      z.string().min(10).max(11),
  status:     z.enum(["ACTIVE", "DISABLED"]),
  last_login: z.date().nullable().optional(),
});

export const createUserValidator = validator;
export const updateUserValidator = validator.partial();
