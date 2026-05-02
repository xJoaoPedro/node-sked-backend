/*
  Warnings:

  - You are about to drop the column `buffer_minutes` on the `services` table. All the data in the column will be lost.
  - Added the required column `commission` to the `services` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "service_category_enum" AS ENUM ('HAIR', 'BEARD', 'AESTHETIC', 'NAILS', 'MASSAGE', 'THERAPY', 'HEALTH', 'DENTAL', 'FITNESS', 'BEAUTY', 'AUTOMOTIVE', 'TECHNICAL', 'HOME_SERVICE', 'PET', 'CONSULTING', 'EDUCATION', 'OTHER');

-- AlterTable
ALTER TABLE "services" DROP COLUMN "buffer_minutes",
ADD COLUMN     "category" "service_category_enum" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "commission" DECIMAL(5,2) NOT NULL;
