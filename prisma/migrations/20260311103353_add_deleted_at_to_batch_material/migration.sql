/*
  Warnings:

  - A unique constraint covering the columns `[batch_id,order]` on the table `Material` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Batch" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Material" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Batch_deleted_at_idx" ON "Batch"("deleted_at");

-- CreateIndex
CREATE INDEX "BatchMentor_deleted_at_idx" ON "BatchMentor"("deleted_at");

-- CreateIndex
CREATE INDEX "Material_deleted_at_idx" ON "Material"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "Material_batch_id_order_key" ON "Material"("batch_id", "order");

-- CreateIndex
CREATE INDEX "User_deleted_at_idx" ON "User"("deleted_at");
