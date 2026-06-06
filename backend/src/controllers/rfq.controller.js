const prisma = require("../config/db");
const ApiError = require("../utils/ApiError");
const { nextNumber } = require("../services/numberGenerator.service");
const { logActivity } = require("../services/activityLog.service");
const { notify, notifyRole } = require("../services/notification.service");
const { sendEmail } = require("../services/email.service");
const templates = require("../utils/emailTemplates");

const fullRfq = {
  creator: { select: { id: true, name: true } },
  items: {
    include: {
      product: { include: { category: true } },
      itemVendors: { include: { vendor: { include: { category: true } } } },
      quotationItems: { include: { quotation: { include: { vendor: true } } } },
    },
  },
  invites: { include: { vendor: { include: { category: true } } } },
  quotations: { include: { vendor: true, items: { include: { rfqItem: true } } } },
  approvals: { include: { requester: { select: { name: true } }, reviewer: { select: { name: true } } } },
};

exports.list = async (req, res) => {
  const where =
    req.user.role === "VENDOR"
      ? { items: { some: { itemVendors: { some: { vendorId: req.user.vendorId } } } } }
      : {};
  res.json(
    await prisma.rfq.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        creator: { select: { name: true } },
        _count: { select: { items: true, quotations: true } },
      },
    })
  );
};

exports.get = async (req, res) => {
  const rfq = await prisma.rfq.findUniqueOrThrow({
    where: { id: req.params.id },
    include: fullRfq,
  });

  if (req.user.role === "VENDOR") {
    const vendorId = req.user.vendorId;
    const hasAccess = rfq.items.some((item) =>
      item.itemVendors.some((iv) => iv.vendorId === vendorId)
    );
    if (!hasAccess) throw new ApiError(403, "This RFQ is not assigned to you");
    // Filter items to only those assigned to this vendor
    rfq.items = rfq.items.filter((item) =>
      item.itemVendors.some((iv) => iv.vendorId === vendorId)
    );
    // Hide other vendors' quotations
    delete rfq.quotations;
  }
  res.json(rfq);
};

exports.create = async (req, res) => {
  const { title, description, items } = req.body;
  if (!title?.trim()) throw new ApiError(422, "RFQ title is required");
  if (!items?.length) throw new ApiError(422, "RFQ must include at least one item");

  // Default deadline: 2 days from now
  const defaultDeadline = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

  // Validate items
  for (const [index, item] of items.entries()) {
    if (!item.productId) throw new ApiError(422, `Item ${index + 1}: product is required`);
    if (!item.quantity || Number(item.quantity) <= 0)
      throw new ApiError(422, `Item ${index + 1}: quantity must be greater than 0`);
    if (!item.vendorIds?.length)
      throw new ApiError(422, `Item ${index + 1}: at least one vendor must be selected`);
  }

  // Look up all referenced products
  const productIds = [...new Set(items.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, status: "ACTIVE" },
    include: { category: true },
  });
  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));
  for (const item of items) {
    if (!productMap[item.productId])
      throw new ApiError(422, `Product not found or inactive: ${item.productId}`);
  }

  // Validate vendors exist
  const allVendorIds = [...new Set(items.flatMap((i) => i.vendorIds))];
  const vendors = await prisma.vendor.findMany({
    where: { id: { in: allVendorIds }, status: "ACTIVE" },
  });
  const vendorMap = Object.fromEntries(vendors.map((v) => [v.id, v]));
  for (const item of items) {
    for (const vendorId of item.vendorIds) {
      if (!vendorMap[vendorId])
        throw new ApiError(422, `Vendor not found or inactive: ${vendorId}`);
    }
  }

  const rfq = await prisma.$transaction(async (tx) => {
    const rfqDeadline = items.reduce((earliest, item) => {
      const d = item.deadline ? new Date(item.deadline) : defaultDeadline;
      return d < earliest ? d : earliest;
    }, defaultDeadline);

    const created = await tx.rfq.create({
      data: {
        rfqNumber: await nextNumber("RFQ", tx),
        title: title.trim(),
        description: description?.trim() || null,
        deadline: rfqDeadline,
        createdBy: req.user.id,
        status: "SENT",
        items: {
          create: items.map((item, index) => {
            const product = productMap[item.productId];
            return {
              productId: item.productId,
              itemName: product.name,
              description: product.description,
              quantity: Number(item.quantity),
              unit: product.unit,
              specifications: item.specifications || null,
              deadline: item.deadline ? new Date(item.deadline) : defaultDeadline,
              itemVendors: {
                create: item.vendorIds.map((vendorId) => ({ vendorId })),
              },
            };
          }),
        },
        // Also create legacy RfqVendorInvite records for unique vendors
        invites: {
          create: allVendorIds.map((vendorId) => ({ vendorId })),
        },
      },
      include: fullRfq,
    });

    // Notify each vendor with email + in-app notification
    for (const vendorId of allVendorIds) {
      const vendor = vendorMap[vendorId];
      const vendorItems = created.items.filter((item) =>
        item.itemVendors.some((iv) => iv.vendorId === vendorId)
      );

      if (vendor.userId) {
        await notify(
          {
            userId: vendor.userId,
            title: "New RFQ assigned",
            message: `${created.rfqNumber}: ${created.title} — ${vendorItems.length} item(s) assigned to you`,
            type: "RFQ_ASSIGNED",
          },
          tx
        );
      }

      // Send formatted email to vendor
      sendEmail({
        to: vendor.email,
        entityType: "RFQ",
        entityId: created.id,
        ...templates.rfqInviteEmail(created, vendorItems, vendor),
      }).catch((err) => console.error("RFQ invite email failed", { vendorId, reason: err.message }));
    }

    await logActivity(
      {
        userId: req.user.id,
        action: "RFQ_CREATED",
        entityType: "RFQ",
        entityId: created.id,
        description: `${req.user.name} created and sent ${created.rfqNumber} to ${allVendorIds.length} vendor(s)`,
      },
      tx
    );

    return created;
  });

  res.status(201).json(rfq);
};

exports.update = async (req, res) => {
  const existing = await prisma.rfq.findUniqueOrThrow({ where: { id: req.params.id } });
  if (existing.status !== "DRAFT") throw new ApiError(409, "Only draft RFQs can be edited");
  const { items, vendorIds, ...data } = req.body;
  if (data.deadline) data.deadline = new Date(data.deadline);
  if (data.expectedDeliveryDate) data.expectedDeliveryDate = new Date(data.expectedDeliveryDate);
  res.json(await prisma.rfq.update({ where: { id: existing.id }, data }));
};

exports.remove = async (req, res) => {
  const existing = await prisma.rfq.findUniqueOrThrow({ where: { id: req.params.id } });
  if (existing.status !== "DRAFT") throw new ApiError(409, "Only draft RFQs can be deleted");
  await prisma.rfq.delete({ where: { id: existing.id } });
  res.status(204).end();
};

exports.assignVendors = async (req, res) => {
  const data = req.body.vendorIds.map((vendorId) => ({ vendorId, rfqId: req.params.id }));
  await prisma.rfqVendorInvite.createMany({ data, skipDuplicates: true });
  res.json(
    await prisma.rfqVendorInvite.findMany({
      where: { rfqId: req.params.id },
      include: { vendor: true },
    })
  );
};

exports.listVendors = async (req, res) =>
  res.json(
    await prisma.rfqVendorInvite.findMany({
      where: { rfqId: req.params.id },
      include: { vendor: true },
    })
  );

exports.send = async (req, res) => {
  const rfq = await prisma.rfq.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      items: { include: { itemVendors: { include: { vendor: true } } } },
      invites: { include: { vendor: true } },
    },
  });
  const allVendorIds = [...new Set(rfq.items.flatMap((item) => item.itemVendors.map((iv) => iv.vendorId)))];
  if (!allVendorIds.length) throw new ApiError(422, "Assign at least one vendor before sending the RFQ");
  if (rfq.deadline <= new Date()) throw new ApiError(422, "RFQ deadline must be in the future");

  const updated = await prisma.$transaction(async (tx) => {
    const record = await tx.rfq.update({ where: { id: rfq.id }, data: { status: "SENT" } });
    for (const item of rfq.items) {
      for (const iv of item.itemVendors) {
        if (iv.vendor.userId)
          await notify(
            {
              userId: iv.vendor.userId,
              title: "New RFQ assigned",
              message: `${rfq.rfqNumber}: ${rfq.title}`,
              type: "RFQ_ASSIGNED",
            },
            tx
          );
      }
    }
    await logActivity(
      {
        userId: req.user.id,
        action: "RFQ_SENT",
        entityType: "RFQ",
        entityId: rfq.id,
        description: `${rfq.rfqNumber} sent to ${allVendorIds.length} vendor(s)`,
      },
      tx
    );
    return record;
  });
  res.json(updated);
};
