/*
  Warnings:

  - The values [OPEN,ONGOING,FINISHED] on the enum `BatchStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to alter the column `price` on the `Batch` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Integer`.
  - Added the required column `quota` to the `Batch` table without a default value. This is not possible if the table is not empty.
  - Made the column `phone_number` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "BatchStatus_new" AS ENUM ('ACTIVE', 'CLOSED');
ALTER TABLE "public"."Batch" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Batch" ALTER COLUMN "status" TYPE "BatchStatus_new" USING ("status"::text::"BatchStatus_new");
ALTER TYPE "BatchStatus" RENAME TO "BatchStatus_old";
ALTER TYPE "BatchStatus_new" RENAME TO "BatchStatus";
DROP TYPE "public"."BatchStatus_old";
ALTER TABLE "Batch" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterTable
ALTER TABLE "Batch" ADD COLUMN     "quota" INTEGER NOT NULL,
ALTER COLUMN "price" SET DATA TYPE INTEGER,
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "phone_number" SET NOT NULL;
