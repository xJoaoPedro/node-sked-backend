/*
  Warnings:

  - You are about to alter the column `cnpj` on the `companies` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(14)`.

*/
-- AlterTable
ALTER TABLE "companies" ALTER COLUMN "cnpj" SET DATA TYPE VARCHAR(14);
