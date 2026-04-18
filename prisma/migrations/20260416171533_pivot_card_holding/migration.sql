-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FulfillmentType" AS ENUM ('PICKUP', 'SHIPPING');

-- CreateTable
CREATE TABLE "USER" (
    "id" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "image" TEXT,
    "name" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT NOT NULL DEFAULT 'USER',

    CONSTRAINT "USER_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_permissions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inventoryUpdatePrices" BOOLEAN NOT NULL DEFAULT true,
    "addCardsAccess" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "set" VARCHAR(255) NOT NULL,
    "setName" VARCHAR(255) NOT NULL,
    "collectorNumber" VARCHAR(64) NOT NULL,
    "finish" VARCHAR(32) NOT NULL,
    "game" VARCHAR(32) NOT NULL,
    "rarity" VARCHAR(32) NOT NULL,
    "imageSmall" VARCHAR(512),
    "imageNormal" VARCHAR(512),
    "scryfallId" TEXT,
    "tcgplayerId" TEXT,
    "marketPrice" INTEGER,
    "marketPriceAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holding" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "condition" VARCHAR(8) NOT NULL DEFAULT 'NM',
    "notes" VARCHAR(512),
    "listedForTrade" BOOLEAN NOT NULL DEFAULT false,
    "tradeNotes" VARCHAR(512),
    "idealQuantity" INTEGER NOT NULL DEFAULT 0,
    "maxQuantity" INTEGER NOT NULL DEFAULT 0,
    "acquiredPrice" INTEGER,
    "acquiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Holding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quantityLog" (
    "id" SERIAL NOT NULL,
    "cardname" VARCHAR(255) NOT NULL,
    "delta" INTEGER NOT NULL,
    "user" VARCHAR(255) NOT NULL,
    "time" TIMESTAMP(6) NOT NULL,
    "finish" TEXT,
    "userId" TEXT NOT NULL,
    "holdingId" TEXT,
    "cardSet" VARCHAR(255) NOT NULL,
    "reason" VARCHAR(255),
    "actorId" TEXT NOT NULL,

    CONSTRAINT "quantityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "priceLog" (
    "id" SERIAL NOT NULL,
    "cardname" VARCHAR(255) NOT NULL,
    "oldPrice" INTEGER NOT NULL,
    "newPrice" INTEGER NOT NULL,
    "user" VARCHAR(255) NOT NULL,
    "time" TIMESTAMP(6) NOT NULL,
    "cardId" TEXT NOT NULL,
    "source" VARCHAR(32) NOT NULL,

    CONSTRAINT "priceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "name" VARCHAR(255) NOT NULL,
    "set" VARCHAR(255) NOT NULL,
    "setname" VARCHAR(255) NOT NULL,
    "collectornumber" VARCHAR(255) NOT NULL,
    "rarity" VARCHAR(255) NOT NULL,
    "imagesmall" VARCHAR(255),
    "imagenormal" VARCHAR(255),
    "tcgplayerprice" INTEGER,
    "storeprice" INTEGER NOT NULL DEFAULT 0,
    "finish" VARCHAR(255),
    "game" VARCHAR(255),
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdat" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMP(6) NOT NULL,
    "id" SERIAL NOT NULL,
    "condition" VARCHAR(255) DEFAULT 'NM',
    "buyPrice" INTEGER NOT NULL DEFAULT 0,
    "idealQuantity" INTEGER NOT NULL DEFAULT 0,
    "maxQuantity" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "storeName" TEXT NOT NULL DEFAULT 'TCG Vault',
    "contactEmail" TEXT,
    "posExitPin" TEXT NOT NULL DEFAULT '1234',
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "shippingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "standardShippingRate" INTEGER NOT NULL DEFAULT 499,
    "expressShippingRate" INTEGER NOT NULL DEFAULT 1499,
    "freeShippingThreshold" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CUSTOMER" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "passwordResetToken" TEXT,
    "passwordResetExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CUSTOMER_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "customerEmail" VARCHAR(255) NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "tax" INTEGER NOT NULL DEFAULT 0,
    "shippingCost" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "fulfillment" "FulfillmentType" NOT NULL DEFAULT 'PICKUP',
    "paymentMethod" TEXT NOT NULL DEFAULT 'PAY_IN_STORE',
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "carrier" TEXT,
    "shippedAt" TIMESTAMP(3),
    "trackingNumber" TEXT,
    "stripeSessionId" TEXT,
    "idempotencyKey" TEXT,
    "customerId" TEXT,
    "emailConfirmationSent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "inventoryId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "setName" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "finish" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory2" (
    "name" VARCHAR(255),
    "set" VARCHAR(255),
    "setname" VARCHAR(255),
    "collectornumber" VARCHAR(255),
    "rarity" VARCHAR(255),
    "imagesmall" VARCHAR(255),
    "imagenormal" VARCHAR(255),
    "tcgplayerprice" INTEGER,
    "storeprice" INTEGER,
    "foiltype" VARCHAR(255),
    "game" VARCHAR(255),
    "quantity" INTEGER,
    "createdat" TIMESTAMP(6),
    "updatedat" TIMESTAMP(6),
    "id" INTEGER,
    "condition" VARCHAR(255),
    "buyprice" INTEGER,
    "idealquantity" INTEGER,
    "maxquantity" INTEGER,
    "tcgplayerid" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "USER_email_key" ON "USER"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_permissions_userId_key" ON "user_permissions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Card_scryfallId_key" ON "Card"("scryfallId");

-- CreateIndex
CREATE INDEX "Card_name_idx" ON "Card"("name");

-- CreateIndex
CREATE INDEX "Card_set_idx" ON "Card"("set");

-- CreateIndex
CREATE INDEX "Card_game_idx" ON "Card"("game");

-- CreateIndex
CREATE UNIQUE INDEX "Card_name_set_collectorNumber_finish_key" ON "Card"("name", "set", "collectorNumber", "finish");

-- CreateIndex
CREATE INDEX "Holding_userId_idx" ON "Holding"("userId");

-- CreateIndex
CREATE INDEX "Holding_cardId_idx" ON "Holding"("cardId");

-- CreateIndex
CREATE INDEX "Holding_listedForTrade_idx" ON "Holding"("listedForTrade");

-- CreateIndex
CREATE INDEX "Holding_userId_listedForTrade_idx" ON "Holding"("userId", "listedForTrade");

-- CreateIndex
CREATE UNIQUE INDEX "Holding_userId_cardId_condition_key" ON "Holding"("userId", "cardId", "condition");

-- CreateIndex
CREATE INDEX "quantityLog_userId_time_idx" ON "quantityLog"("userId", "time" DESC);

-- CreateIndex
CREATE INDEX "quantityLog_holdingId_idx" ON "quantityLog"("holdingId");

-- CreateIndex
CREATE INDEX "quantityLog_cardname_idx" ON "quantityLog"("cardname");

-- CreateIndex
CREATE INDEX "priceLog_cardId_time_idx" ON "priceLog"("cardId", "time" DESC);

-- CreateIndex
CREATE INDEX "priceLog_cardname_idx" ON "priceLog"("cardname");

-- CreateIndex
CREATE INDEX "inventory_name_idx" ON "inventory"("name");

-- CreateIndex
CREATE INDEX "inventory_setname_idx" ON "inventory"("setname");

-- CreateIndex
CREATE INDEX "inventory_game_idx" ON "inventory"("game");

-- CreateIndex
CREATE INDEX "inventory_idealQuantity_idx" ON "inventory"("idealQuantity");

-- CreateIndex
CREATE INDEX "inventory_game_quantity_idx" ON "inventory"("game", "quantity");

-- CreateIndex
CREATE INDEX "inventory_name_set_condition_finish_idx" ON "inventory"("name", "set", "condition", "finish");

-- CreateIndex
CREATE UNIQUE INDEX "CUSTOMER_email_key" ON "CUSTOMER"("email");

-- CreateIndex
CREATE UNIQUE INDEX "orders_stripeSessionId_key" ON "orders"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_idempotencyKey_key" ON "orders"("idempotencyKey");

-- CreateIndex
CREATE INDEX "orders_customerEmail_idx" ON "orders"("customerEmail");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_customerId_idx" ON "orders"("customerId");

-- CreateIndex
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "USER"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holding" ADD CONSTRAINT "Holding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "USER"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holding" ADD CONSTRAINT "Holding_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quantityLog" ADD CONSTRAINT "quantityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "USER"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "priceLog" ADD CONSTRAINT "priceLog_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CUSTOMER"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
