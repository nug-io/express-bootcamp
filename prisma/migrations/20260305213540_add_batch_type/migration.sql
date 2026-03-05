-- CreateEnum
CREATE TYPE "BatchType" AS ENUM ('LIVE', 'COURSE');

-- AlterTable
ALTER TABLE "Batch" ADD COLUMN     "type" "BatchType" NOT NULL DEFAULT 'LIVE';
