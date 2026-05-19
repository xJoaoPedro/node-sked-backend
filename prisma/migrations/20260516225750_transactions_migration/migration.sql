/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `companies` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "revenue_transaction_status_enum" AS ENUM ('RECEIVED', 'PENDING', 'CANCELED');

-- CreateEnum
CREATE TYPE "revenue_transaction_origin_enum" AS ENUM ('MANUAL', 'APPOINTMENT');

-- CreateTable
CREATE TABLE "revenue_transactions" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "appointment_id" INTEGER NOT NULL,
    "service_id" INTEGER,
    "employee_id" INTEGER,
    "client_id" INTEGER,
    "description" VARCHAR(255),
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_method" "payment_method_enum" NOT NULL,
    "status" "revenue_transaction_status_enum" NOT NULL DEFAULT 'RECEIVED',
    "origin" "revenue_transaction_origin_enum" NOT NULL DEFAULT 'APPOINTMENT',
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "revenue_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "revenue_transactions_company_id_occurred_at_idx" ON "revenue_transactions"("company_id", "occurred_at");

-- CreateIndex
CREATE INDEX "revenue_transactions_appointment_id_idx" ON "revenue_transactions"("appointment_id");

-- CreateIndex
CREATE INDEX "revenue_transactions_client_id_idx" ON "revenue_transactions"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "companies_phone_key" ON "companies"("phone");

-- AddForeignKey
ALTER TABLE "revenue_transactions" ADD CONSTRAINT "revenue_transactions_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_transactions" ADD CONSTRAINT "revenue_transactions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_transactions" ADD CONSTRAINT "revenue_transactions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_transactions" ADD CONSTRAINT "revenue_transactions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_transactions" ADD CONSTRAINT "revenue_transactions_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
