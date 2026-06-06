/*
  Warnings:

  - The `status` column on the `deliveries` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SHIPPED', 'ON_THE_WAY', 'DELIVERED', 'RECEIVED');

-- DropForeignKey
ALTER TABLE "purchase_orders" DROP CONSTRAINT "purchase_orders_quotation_id_fkey";

-- AlterTable
ALTER TABLE "approvals" ADD COLUMN     "selected_items" JSONB,
ALTER COLUMN "selected_quotation_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "deliveries" DROP COLUMN "status",
ADD COLUMN     "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "invoice_items" ADD COLUMN     "gst_percent" DECIMAL(5,2) NOT NULL DEFAULT 18;

-- AlterTable
ALTER TABLE "purchase_order_items" ADD COLUMN     "gst_percent" DECIMAL(5,2) NOT NULL DEFAULT 18;

-- AlterTable
ALTER TABLE "purchase_orders" ADD COLUMN     "approval_id" UUID,
ADD COLUMN     "delivery_status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "quotation_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "quotation_items" ADD COLUMN     "gst_percent" DECIMAL(5,2) NOT NULL DEFAULT 18;

-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "delivery_days" INTEGER;

-- AlterTable
ALTER TABLE "rfq_items" ADD COLUMN     "deadline" TIMESTAMP(3),
ADD COLUMN     "product_id" UUID;

-- AlterTable
ALTER TABLE "vendor_categories" ADD COLUMN     "default_gst_percent" DECIMAL(5,2) NOT NULL DEFAULT 18;

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category_id" UUID NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'pieces',
    "default_gst_pct" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rfq_item_vendors" (
    "id" UUID NOT NULL,
    "rfq_item_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'INVITED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rfq_item_vendors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rfq_item_vendors_rfq_item_id_vendor_id_key" ON "rfq_item_vendors"("rfq_item_id", "vendor_id");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "vendor_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_items" ADD CONSTRAINT "rfq_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_item_vendors" ADD CONSTRAINT "rfq_item_vendors_rfq_item_id_fkey" FOREIGN KEY ("rfq_item_id") REFERENCES "rfq_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_item_vendors" ADD CONSTRAINT "rfq_item_vendors_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
