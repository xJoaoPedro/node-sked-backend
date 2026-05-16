import { z } from "zod";

const paymentMethodsSchema = z.array(
  z.enum(["PIX", "CREDIT", "DEBIT", "CASH"]),
).optional();

const amenitiesSchema = z.array(
  z.enum([
    "ACCEPTS_CHILDREN",
    "WIFI",
    "PARKING",
    "ACCEPTS_AUTISTIC",
    "ACCESSIBILITY",
    "PET_FRIENDLY",
  ]),
).optional();

const companyLoginSchema = z.object({
  email: z.email().max(255),
  password: z.string().min(6).max(30),
});

const companySchema = z.object({
  legal_name:    z.string().trim().min(1).max(255),
  fantasy_name:  z.string().trim().min(1).max(255),
  cnpj:          z.string().length(14),
  email:         z.email().max(255),
  password:      z.string().min(6).max(30),
  phone:         z.string().min(10).max(11),
  photo:         z.string().max(255).nullable().optional(),
  website:       z.url().max(255).nullable().optional(),
  accepted_payment_methods: paymentMethodsSchema,
  acceptedPaymentMethods: paymentMethodsSchema,
  amenities: amenitiesSchema,
  low_stock_threshold: z.coerce.number().int().min(0).max(999).optional(),
  lowStockThreshold: z.coerce.number().int().min(0).max(999).optional(),
  plan:          z.enum(["FREE", "PRO"]).nullable().optional(),
  status:        z.enum(["PENDING", "APPROVED", "DENIED"]).nullable().optional(),
  approve_date:  z.date().nullable().optional(),
});

const normalizeCompanyPayload = (schema) => schema.transform((data) => {
  const {
    acceptedPaymentMethods,
    lowStockThreshold,
    ...rest
  } = data;

  return {
  ...rest,
  accepted_payment_methods:
    data.accepted_payment_methods ?? data.acceptedPaymentMethods,
  low_stock_threshold:
    data.low_stock_threshold ?? data.lowStockThreshold,
  };
});

export const createCompanyValidator = normalizeCompanyPayload(companySchema);
export const updateCompanyValidator = normalizeCompanyPayload(companySchema.partial());
export const loginCompanyValidator = companyLoginSchema;
