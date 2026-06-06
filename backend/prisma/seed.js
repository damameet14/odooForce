require("dotenv").config();
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const passwordHash = () => bcrypt.hash("password123", 12);

async function main() {
  for (const role of ["ADMIN", "PROCUREMENT_OFFICER", "FINANCE_OFFICER", "VENDOR"]) {
    await prisma.roleDefinition.upsert({ where: { name: role }, update: {}, create: { name: role, description: role.replaceAll("_", " ").toLowerCase() } });
  }
  const users = {};
  for (const data of [
    ["admin", "Admin User", "admin@vendorbridge.com", "ADMIN"],
    ["procurement", "Priya Procurement", "procurement@vendorbridge.com", "PROCUREMENT_OFFICER"],
    ["finance", "Farhan Finance", "finance@vendorbridge.com", "FINANCE_OFFICER"],
    ["vendor", "Vikram Vendor", "vendor@vendorbridge.com", "VENDOR"],
  ]) {
    users[data[0]] = await prisma.user.upsert({ where: { email: data[2] }, update: {}, create: { name: data[1], email: data[2], role: data[3], passwordHash: await passwordHash() } });
  }
  const categories = {};
  for (const name of ["Raw Materials", "Packaging", "Logistics", "IT Services", "Office Supplies"]) {
    categories[name] = await prisma.vendorCategory.upsert({ where: { name }, update: {}, create: { name, description: `${name} suppliers` } });
  }
  const vendorData = [
    ["Acme Industrial Supplies", "vendor@vendorbridge.com", "Raw Materials", users.vendor.id, 4.7],
    ["PackRight Solutions", "sales@packright.example", "Packaging", null, 4.4],
    ["SwiftRoute Logistics", "ops@swiftroute.example", "Logistics", null, 4.8],
    ["NexaTech Services", "hello@nexatech.example", "IT Services", null, 4.6],
    ["DeskHub Office Supply", "orders@deskhub.example", "Office Supplies", null, 4.2],
  ];
  const vendors = [];
  for (const [companyName, email, category, userId, rating] of vendorData) {
    let vendor = await prisma.vendor.findFirst({ where: { companyName } });
    if (!vendor) vendor = await prisma.vendor.create({ data: { companyName, contactPerson: companyName.split(" ")[0], email, categoryId: categories[category].id, userId, rating, gstNumber: `GST-${String(vendors.length + 1).padStart(4, "0")}`, address: "Bengaluru, Karnataka" } });
    vendors.push(vendor);
  }
  if (!(await prisma.rfq.count())) {
    const deadline = new Date(Date.now() + 14 * 86400000);
    const rfq = await prisma.rfq.create({
      data: {
        rfqNumber: `RFQ-${new Date().getFullYear()}-0001`, title: "Production raw material requirement", description: "Quarterly materials procurement", createdBy: users.procurement.id, deadline, expectedDeliveryDate: new Date(Date.now() + 30 * 86400000), status: "QUOTATIONS_RECEIVED",
        items: { create: [{ itemName: "Industrial resin", description: "Grade A resin", quantity: 500, unit: "kg", specifications: "ISO certified" }, { itemName: "Steel fasteners", description: "M8 galvanized fasteners", quantity: 2000, unit: "pieces", specifications: "Corrosion resistant" }] },
        invites: { create: [{ vendorId: vendors[0].id }, { vendorId: vendors[1].id }] },
      }, include: { items: true },
    });
    const quote = await prisma.quotation.create({
      data: {
        quotationNumber: `QUO-${new Date().getFullYear()}-0001`, rfqId: rfq.id, vendorId: vendors[0].id, deliveryTimeline: "12 days", paymentTerms: "Net 30", subtotal: 182000, taxAmount: 32760, grandTotal: 214760,
        items: { create: [
          { rfqItemId: rfq.items[0].id, unitPrice: 320, quantity: 500, taxPercentage: 18, taxAmount: 28800, totalAmount: 188800 },
          { rfqItemId: rfq.items[1].id, unitPrice: 11, quantity: 2000, taxPercentage: 18, taxAmount: 3960, totalAmount: 25960 },
        ] },
      },
    });
    const rfq2 = await prisma.rfq.create({
      data: { rfqNumber: `RFQ-${new Date().getFullYear()}-0002`, title: "Office workstation refresh", description: "New desks and ergonomic chairs", createdBy: users.procurement.id, deadline, status: "DRAFT", items: { create: [{ itemName: "Ergonomic chair", quantity: 25, unit: "pieces", specifications: "Adjustable lumbar support" }] }, invites: { create: [{ vendorId: vendors[4].id }] } },
    });
    const approval = await prisma.approval.create({ data: { rfqId: rfq.id, selectedQuotationId: quote.id, requestedBy: users.procurement.id, reviewedBy: users.finance.id, status: "APPROVED", remarks: "Approved within budget" } });
    const po = await prisma.purchaseOrder.create({
      data: { poNumber: `PO-${new Date().getFullYear()}-0001`, rfqId: rfq.id, quotationId: quote.id, vendorId: vendors[0].id, createdBy: users.procurement.id, status: "DISPATCHED", subtotal: quote.subtotal, taxAmount: quote.taxAmount, grandTotal: quote.grandTotal, termsConditions: "Delivery to central warehouse. Net 30 payment.", items: { create: [{ itemName: "Industrial resin", quantity: 500, unitPrice: 320, taxAmount: 28800, totalAmount: 188800 }, { itemName: "Steel fasteners", quantity: 2000, unitPrice: 11, taxAmount: 3960, totalAmount: 25960 }] } },
      include: { items: true },
    });
    await prisma.delivery.create({ data: { purchaseOrderId: po.id, vendorId: vendors[0].id, status: "DISPATCHED", notes: "Shipment in transit", updatedBy: users.vendor.id } });
    await prisma.invoice.create({ data: { invoiceNumber: `INV-${new Date().getFullYear()}-0001`, purchaseOrderId: po.id, vendorId: vendors[0].id, subtotal: po.subtotal, taxAmount: po.taxAmount, grandTotal: po.grandTotal, dueDate: new Date(Date.now() + 30 * 86400000), items: { create: po.items.map((i) => ({ itemName: i.itemName, quantity: i.quantity, unitPrice: i.unitPrice, taxAmount: i.taxAmount, totalAmount: i.totalAmount })) } } });
    await prisma.activityLog.createMany({ data: [
      { userId: users.procurement.id, action: "RFQ_CREATED", entityType: "RFQ", entityId: rfq.id, description: `${rfq.rfqNumber} created` },
      { userId: users.finance.id, action: "APPROVAL_APPROVED", entityType: "APPROVAL", entityId: approval.id, description: `${rfq.rfqNumber} approved` },
      { userId: users.procurement.id, action: "PO_GENERATED", entityType: "PURCHASE_ORDER", entityId: po.id, description: `${po.poNumber} generated` },
    ] });
    console.log(`Seeded sample workflow and draft ${rfq2.rfqNumber}`);
  }
  console.log("VendorBridge seed complete. All demo passwords: password123");
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());

