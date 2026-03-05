/*
  Warnings:

  - A unique constraint covering the columns `[invoice_number]` on the table `Enrollment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "discount" INTEGER DEFAULT 0,
ADD COLUMN     "invoice_number" TEXT,
ADD COLUMN     "price" INTEGER,
ADD COLUMN     "total_paid" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_invoice_number_key" ON "Enrollment"("invoice_number");
