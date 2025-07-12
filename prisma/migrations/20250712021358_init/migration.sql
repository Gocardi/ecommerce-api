/*
  Warnings:

  - Added the required column `percentage` to the `commissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `notifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `affiliate_price` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category_id` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category` to the `tutorials` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "affiliates" ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reference" VARCHAR(255);

-- AlterTable
ALTER TABLE "commissions" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "percentage" DECIMAL(5,2) NOT NULL,
ADD COLUMN     "status" VARCHAR(20) NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE "min_monthly_buys" ADD COLUMN     "achieved" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "title" VARCHAR(200) NOT NULL;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "delivered_at" TIMESTAMP(3),
ADD COLUMN     "scheduled_date" TIMESTAMP(3),
ADD COLUMN     "shipping_address_id" INTEGER,
ADD COLUMN     "shipping_cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "tracking_code" VARCHAR(100);

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "bcp_code" VARCHAR(50),
ADD COLUMN     "reference" VARCHAR(100);

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "affiliate_price" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "category_id" INTEGER NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "image_url" VARCHAR(500),
ADD COLUMN     "min_stock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "weight" DECIMAL(8,3);

-- AlterTable
ALTER TABLE "tutorials" ADD COLUMN     "category" VARCHAR(50) NOT NULL,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "last_login" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "categories" (
    "category_id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "carts" (
    "cart_id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "session_id" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("cart_id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "cart_item_id" SERIAL NOT NULL,
    "cart_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("cart_item_id")
);

-- CreateTable
CREATE TABLE "shipping_addresses" (
    "address_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "region" VARCHAR(100) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "address" VARCHAR(255) NOT NULL,
    "reference" VARCHAR(255),
    "is_default" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "shipping_addresses_pkey" PRIMARY KEY ("address_id")
);

-- CreateTable
CREATE TABLE "business_rules" (
    "rule_id" SERIAL NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "value" VARCHAR(500) NOT NULL,
    "type" VARCHAR(20) NOT NULL,

    CONSTRAINT "business_rules_pkey" PRIMARY KEY ("rule_id")
);

-- CreateTable
CREATE TABLE "rewards" (
    "reward_id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "points_required" INTEGER NOT NULL,
    "image_url" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "stock" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "rewards_pkey" PRIMARY KEY ("reward_id")
);

-- CreateTable
CREATE TABLE "admin_regions" (
    "admin_id" INTEGER NOT NULL,
    "region" VARCHAR(100) NOT NULL,

    CONSTRAINT "admin_regions_pkey" PRIMARY KEY ("admin_id","region")
);

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cart_id_product_id_key" ON "cart_items"("cart_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_rules_key_key" ON "business_rules"("key");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("cart_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_addresses" ADD CONSTRAINT "shipping_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_shipping_address_id_fkey" FOREIGN KEY ("shipping_address_id") REFERENCES "shipping_addresses"("address_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_regions" ADD CONSTRAINT "admin_regions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
