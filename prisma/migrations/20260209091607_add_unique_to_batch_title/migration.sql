/*
  Warnings:

  - A unique constraint covering the columns `[title]` on the table `Batch` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Batch_title_key" ON "Batch"("title");
