/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `companies` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `password` to the `companies` table without a default value. This is not possible if the table is not empty.
  - Made the column `email` on table `companies` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "password" VARCHAR(255) NOT NULL,
ALTER COLUMN "email" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "companies_email_key" ON "companies"("email");
