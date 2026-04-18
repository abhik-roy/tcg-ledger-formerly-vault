/*
  Warnings:

  - You are about to drop the `TradeInterest` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "TradeInterest" DROP CONSTRAINT "TradeInterest_holdingId_fkey";

-- DropForeignKey
ALTER TABLE "TradeInterest" DROP CONSTRAINT "TradeInterest_userId_fkey";

-- AlterTable
ALTER TABLE "Holding" ADD COLUMN     "askType" VARCHAR(32),
ADD COLUMN     "askValue" INTEGER;

-- DropTable
DROP TABLE "TradeInterest";

-- CreateTable
CREATE TABLE "TradeOffer" (
    "id" TEXT NOT NULL,
    "holdingId" TEXT NOT NULL,
    "offerUserId" TEXT NOT NULL,
    "cashAmount" INTEGER NOT NULL DEFAULT 0,
    "message" VARCHAR(512),
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "declineMessage" VARCHAR(512),
    "completedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeOfferCard" (
    "id" TEXT NOT NULL,
    "tradeOfferId" TEXT NOT NULL,
    "holdingId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "TradeOfferCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TradeOffer_holdingId_idx" ON "TradeOffer"("holdingId");

-- CreateIndex
CREATE INDEX "TradeOffer_offerUserId_idx" ON "TradeOffer"("offerUserId");

-- CreateIndex
CREATE INDEX "TradeOffer_status_idx" ON "TradeOffer"("status");

-- CreateIndex
CREATE INDEX "TradeOfferCard_tradeOfferId_idx" ON "TradeOfferCard"("tradeOfferId");

-- AddForeignKey
ALTER TABLE "TradeOffer" ADD CONSTRAINT "TradeOffer_holdingId_fkey" FOREIGN KEY ("holdingId") REFERENCES "Holding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeOffer" ADD CONSTRAINT "TradeOffer_offerUserId_fkey" FOREIGN KEY ("offerUserId") REFERENCES "USER"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeOfferCard" ADD CONSTRAINT "TradeOfferCard_tradeOfferId_fkey" FOREIGN KEY ("tradeOfferId") REFERENCES "TradeOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeOfferCard" ADD CONSTRAINT "TradeOfferCard_holdingId_fkey" FOREIGN KEY ("holdingId") REFERENCES "Holding"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
