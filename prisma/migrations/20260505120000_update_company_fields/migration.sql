ALTER TABLE "companies"
DROP COLUMN "interval_slot",
ADD COLUMN "photo" VARCHAR(255),
ADD COLUMN "website" VARCHAR(255),
ADD COLUMN "accepted_payment_methods" "payment_method_enum"[] NOT NULL DEFAULT ARRAY[]::"payment_method_enum"[];
