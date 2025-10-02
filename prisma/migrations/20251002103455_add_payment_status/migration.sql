-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('NONE', 'PARTIAL', 'COMPLETED');

-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PARTIAL';
