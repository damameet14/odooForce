const prisma = require("../config/db");
const ApiError = require("../utils/ApiError");
const { nextNumber } = require("../services/numberGenerator.service");
const { logActivity } = require("../services/activityLog.service");
const { notify } = require("../services/notification.service");

const fullRfq = { creator: { select: { id: true, name: true } }, items: true, invites: { include: { vendor: { include: { category: true } } } }, quotations: { include: { vendor: true, items: true } }, approvals: true };

exports.list = async (req, res) => {
  const where = req.user.role === "VENDOR" ? { invites: { some: { vendorId: req.user.vendorId } } } : {};
  res.json(await prisma.rfq.findMany({ where, orderBy: { createdAt: "desc" }, include: { creator: { select: { name: true } }, _count: { select: { items: true, invites: true, quotations: true } } } }));
};
exports.get = async (req, res) => {
  const rfq = await prisma.rfq.findUniqueOrThrow({ where: { id: req.params.id }, include: fullRfq });
  if (req.user.role === "VENDOR" && !rfq.invites.some((invite) => invite.vendorId === req.user.vendorId)) throw new ApiError(403, "This RFQ is not assigned to you");
  if (req.user.role === "VENDOR") delete rfq.quotations;
  res.json(rfq);
};
exports.create = async (req, res) => {
  const { title, description, deadline, expectedDeliveryDate, items, vendorIds = [] } = req.body;
  if (!items?.length) throw new ApiError(422, "RFQ must include at least one item");
  const rfq = await prisma.$transaction(async (tx) => {
    const created = await tx.rfq.create({
      data: {
        rfqNumber: await nextNumber("RFQ", tx), title, description, deadline: new Date(deadline),
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null, createdBy: req.user.id,
        items: { create: items.map(({ itemName, description: itemDescription, quantity, unit, specifications }) => ({ itemName, description: itemDescription, quantity, unit, specifications })) },
        invites: { create: vendorIds.map((vendorId) => ({ vendorId })) },
      }, include: fullRfq,
    });
    await logActivity({ userId: req.user.id, action: "RFQ_CREATED", entityType: "RFQ", entityId: created.id, description: `${req.user.name} created ${created.rfqNumber}` }, tx);
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
  res.json(await prisma.rfqVendorInvite.findMany({ where: { rfqId: req.params.id }, include: { vendor: true } }));
};
exports.listVendors = async (req, res) => res.json(await prisma.rfqVendorInvite.findMany({ where: { rfqId: req.params.id }, include: { vendor: true } }));
exports.send = async (req, res) => {
  const rfq = await prisma.rfq.findUniqueOrThrow({ where: { id: req.params.id }, include: { invites: { include: { vendor: true } } } });
  if (!rfq.invites.length) throw new ApiError(422, "Assign at least one vendor before sending the RFQ");
  if (rfq.deadline <= new Date()) throw new ApiError(422, "RFQ deadline must be in the future");
  const updated = await prisma.$transaction(async (tx) => {
    const record = await tx.rfq.update({ where: { id: rfq.id }, data: { status: "SENT" } });
    for (const invite of rfq.invites) if (invite.vendor.userId) await notify({ userId: invite.vendor.userId, title: "New RFQ assigned", message: `${rfq.rfqNumber}: ${rfq.title}`, type: "RFQ_ASSIGNED" }, tx);
    await logActivity({ userId: req.user.id, action: "RFQ_SENT", entityType: "RFQ", entityId: rfq.id, description: `${rfq.rfqNumber} sent to ${rfq.invites.length} vendor(s)` }, tx);
    return record;
  });
  res.json(updated);
};

