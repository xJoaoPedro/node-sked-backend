/*
  Warnings:

  - The values [CLIENT_REQUEST] on the enum `cancel_reason` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "payment_method_enum" AS ENUM ('PIX', 'CREDIT', 'DEBIT', 'CASH');

-- AlterEnum
BEGIN;
CREATE TYPE "cancel_reason_new" AS ENUM ('NO_SHOW', 'SCHEDULE_CONFLICT', 'ILLNESS', 'EMERGENCY', 'PROFESSIONAL_UNAVAILABLE', 'OTHER');
ALTER TABLE "appointments" ALTER COLUMN "cancel_reason" TYPE "cancel_reason_new" USING ("cancel_reason"::text::"cancel_reason_new");
ALTER TYPE "cancel_reason" RENAME TO "cancel_reason_old";
ALTER TYPE "cancel_reason_new" RENAME TO "cancel_reason";
DROP TYPE "public"."cancel_reason_old";
COMMIT;

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "payment_method" "payment_method_enum";
