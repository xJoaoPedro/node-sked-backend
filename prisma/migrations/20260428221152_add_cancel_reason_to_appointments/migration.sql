-- CreateEnum
CREATE TYPE "cancel_reason" AS ENUM ('CLIENT_REQUEST', 'NO_SHOW', 'SCHEDULE_CONFLICT', 'ILLNESS', 'EMERGENCY', 'PROFESSIONAL_UNAVAILABLE', 'OTHER');

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "cancel_reason" "cancel_reason";
