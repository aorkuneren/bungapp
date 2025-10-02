-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "depositAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "isManualPrice" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "remainingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;
