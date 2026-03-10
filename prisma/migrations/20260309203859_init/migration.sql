/*
  Warnings:

  - You are about to drop the column `canceled` on the `signatures` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "addresses" ALTER COLUMN "complement" DROP NOT NULL;

-- AlterTable
ALTER TABLE "signatures" DROP COLUMN "canceled";
