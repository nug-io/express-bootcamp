-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "payment_ref" TEXT,
ADD COLUMN     "payment_status" TEXT NOT NULL DEFAULT 'PENDING';
