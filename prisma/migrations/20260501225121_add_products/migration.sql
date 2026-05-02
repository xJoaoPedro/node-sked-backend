/*
  Warnings:

  - The `category` column on the `services` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "category_enum" AS ENUM ('HAIR', 'BEARD', 'AESTHETIC', 'NAILS', 'MASSAGE', 'THERAPY', 'HEALTH', 'DENTAL', 'FITNESS', 'BEAUTY', 'AUTOMOTIVE', 'TECHNICAL', 'HOME_SERVICE', 'PET', 'CONSULTING', 'EDUCATION', 'OTHER');

-- AlterTable
ALTER TABLE "services" DROP COLUMN "category",
ADD COLUMN     "category" "category_enum" NOT NULL DEFAULT 'OTHER';

-- DropEnum
DROP TYPE "service_category_enum";

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "category" "category_enum" NOT NULL DEFAULT 'OTHER',
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "cost_price" DECIMAL(10,2) NOT NULL,
    "status" "status_enum" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "products_company_id_idx" ON "products"("company_id");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
