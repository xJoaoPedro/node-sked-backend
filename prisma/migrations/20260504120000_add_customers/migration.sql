CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(11) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "company_customers" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_customers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customers_phone_key" ON "customers"("phone");
CREATE UNIQUE INDEX "company_customers_company_id_customer_id_key" ON "company_customers"("company_id", "customer_id");
CREATE INDEX "company_customers_company_id_idx" ON "company_customers"("company_id");
CREATE INDEX "company_customers_customer_id_idx" ON "company_customers"("customer_id");

INSERT INTO "customers" ("name", "phone", "created_at", "updated_at")
SELECT DISTINCT ON (u."phone")
    u."name",
    u."phone",
    u."created_at",
    NOW()
FROM "users" u
JOIN (
    SELECT "client_id" FROM "appointments"
    UNION
    SELECT "client_id" FROM "bot_interactions"
) refs ON refs."client_id" = u."id"
ORDER BY u."phone", u."created_at", u."id";

INSERT INTO "company_customers" ("company_id", "customer_id", "created_at", "updated_at")
SELECT DISTINCT
    src."company_id",
    c."id",
    NOW(),
    NOW()
FROM (
    SELECT "company_id", "client_id" FROM "appointments"
    UNION
    SELECT "company_id", "client_id" FROM "bot_interactions"
) src
JOIN "users" u
    ON u."id" = src."client_id"
JOIN "customers" c
    ON c."phone" = u."phone";

ALTER TABLE "appointments" DROP CONSTRAINT "appointments_client_id_fkey";
ALTER TABLE "bot_interactions" DROP CONSTRAINT "bot_interactions_client_id_fkey";

UPDATE "appointments" a
SET "client_id" = c."id"
FROM "users" u
JOIN "customers" c
    ON c."phone" = u."phone"
WHERE a."client_id" = u."id";

UPDATE "bot_interactions" b
SET "client_id" = c."id"
FROM "users" u
JOIN "customers" c
    ON c."phone" = u."phone"
WHERE b."client_id" = u."id";

ALTER TABLE "company_customers"
    ADD CONSTRAINT "company_customers_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "company_customers"
    ADD CONSTRAINT "company_customers_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "appointments"
    ADD CONSTRAINT "appointments_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "bot_interactions"
    ADD CONSTRAINT "bot_interactions_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
