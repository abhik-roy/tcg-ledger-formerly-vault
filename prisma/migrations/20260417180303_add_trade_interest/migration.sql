-- CreateTable
CREATE TABLE "TradeInterest" (
    "id" TEXT NOT NULL,
    "holdingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" VARCHAR(512),
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeInterest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TradeInterest_holdingId_idx" ON "TradeInterest"("holdingId");

-- CreateIndex
CREATE INDEX "TradeInterest_userId_idx" ON "TradeInterest"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TradeInterest_holdingId_userId_key" ON "TradeInterest"("holdingId", "userId");

-- AddForeignKey
ALTER TABLE "TradeInterest" ADD CONSTRAINT "TradeInterest_holdingId_fkey" FOREIGN KEY ("holdingId") REFERENCES "Holding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeInterest" ADD CONSTRAINT "TradeInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "USER"("id") ON DELETE CASCADE ON UPDATE CASCADE;
