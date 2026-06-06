const prisma = require("../config/db");
const ApiError = require("../utils/ApiError");
const { nextNumber } = require("../services/numberGenerator.service");
const { logActivity } = require("../services/activityLog.service");
const { notify, notifyRole } = require("../services/notification.service");
const { streamDocument } = require("../services/pdf.service");
const { sendEmail } = require("../services/email.service");
const templates = require("../utils/emailTemplates");

const poInclude = { vendor: true, rfq: true, quotation: true, items: true, delivery: true, invoices: true };
const invoiceInclude = { vendor: true, purchaseOrder: true, items: true };
const ensureVendorOwns = (req, vendorId) => {
  if (req.user.role === "VENDOR" && req.user.vendorId !== vendorId) throw new ApiError(403, "You can only access your own records");
};

exports.submitQuotation = async (req, res) => {
  if (!req.user.vendorId) throw new ApiError(403, "Your account is not linked to a vendor");
  const { rfqId, deliveryTimeline, paymentTerms, notes, discountAmount = 0, items } = req.body;
  const rfq = await prisma.rfq.findUniqueOrThrow({ where: { id: rfqId }, include: { items: true, invites: true } });
  if (!rfq.invites.some((i) => i.vendorId === req.user.vendorId)) throw new ApiError(403, "This RFQ is not assigned to you");
  if (!["SENT", "QUOTATIONS_RECEIVED"].includes(rfq.status) || rfq.deadline <= new Date()) throw new ApiError(409, "This RFQ is not accepting quotations");
  if (items?.length !== rfq.items.length || rfq.items.some((r) => !items.some((i) => i.rfqItemId === r.id))) throw new ApiError(422, "Pricing is required for every RFQ item");
  const calculated = items.map((item) => {
    const quantity = Number(item.quantity);
    const base = Number(item.unitPrice) * quantity;
    const taxAmount = base * Number(item.taxPercentage || 0) / 100;
    const totalAmount = base + taxAmount - Number(item.discount || 0);
    return { ...item, quantity, taxAmount, totalAmount };
  });
  const subtotal = calculated.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);
  const taxAmount = calculated.reduce((sum, item) => sum + item.taxAmount, 0);
  const grandTotal = subtotal + taxAmount - Number(discountAmount);
  const quotation = await prisma.$transaction(async (tx) => {
    const q = await tx.quotation.create({
      data: { quotationNumber: await nextNumber("QUO", tx), rfqId, vendorId: req.user.vendorId, deliveryTimeline, paymentTerms, notes, discountAmount, subtotal, taxAmount, grandTotal, items: { create: calculated } },
      include: { items: true, vendor: true },
    });
    await tx.rfq.update({ where: { id: rfqId }, data: { status: "QUOTATIONS_RECEIVED" } });
    await tx.rfqVendorInvite.update({ where: { rfqId_vendorId: { rfqId, vendorId: req.user.vendorId } }, data: { status: "QUOTED" } });
    await notify({ userId: rfq.createdBy, title: "Quotation submitted", message: `${q.vendor.companyName} submitted ${q.quotationNumber}`, type: "QUOTATION_SUBMITTED" }, tx);
    await logActivity({ userId: req.user.id, action: "QUOTATION_SUBMITTED", entityType: "QUOTATION", entityId: q.id, description: `${q.vendor.companyName} submitted ${q.quotationNumber}` }, tx);
    return q;
  });
  res.status(201).json(quotation);
};

exports.getQuotation = async (req, res) => {
  const record = await prisma.quotation.findUniqueOrThrow({ where: { id: req.params.id }, include: { vendor: true, rfq: true, items: { include: { rfqItem: true } } } });
  ensureVendorOwns(req, record.vendorId);
  res.json(record);
};
exports.updateQuotation = async (req, res) => {
  const record = await prisma.quotation.findUniqueOrThrow({ where: { id: req.params.id }, include: { rfq: true } });
  ensureVendorOwns(req, record.vendorId);
  if (record.rfq.deadline <= new Date() || record.status !== "SUBMITTED") throw new ApiError(409, "Quotation is locked");
  res.json(await prisma.quotation.update({ where: { id: record.id }, data: { deliveryTimeline: req.body.deliveryTimeline, paymentTerms: req.body.paymentTerms, notes: req.body.notes } }));
};
exports.listQuotations = async (req, res) => {
  const where = { rfqId: req.params.rfqId, ...(req.user.role === "VENDOR" && { vendorId: req.user.vendorId }) };
  res.json(await prisma.quotation.findMany({ where, include: { vendor: true, items: { include: { rfqItem: true } } }, orderBy: { grandTotal: "asc" } }));
};
exports.compareQuotations = async (req, res) => {
  const quotations = await prisma.quotation.findMany({ where: { rfqId: req.params.rfqId }, include: { vendor: true, items: { include: { rfqItem: true } } } });
  if (!quotations.length) return res.json([]);
  const minPrice = Math.min(...quotations.map((q) => Number(q.grandTotal)));
  const maxPrice = Math.max(...quotations.map((q) => Number(q.grandTotal)));
  const scored = quotations.map((q) => {
    const priceScore = maxPrice === minPrice ? 50 : 50 * (maxPrice - Number(q.grandTotal)) / (maxPrice - minPrice);
    const deliveryDays = Number.parseInt(q.deliveryTimeline, 10) || 30;
    const deliveryScore = Math.max(0, 30 * (1 - deliveryDays / 90));
    const ratingScore = Number(q.vendor.rating) / 5 * 20;
    return { ...q, score: Number((priceScore + deliveryScore + ratingScore).toFixed(2)), badges: [...(Number(q.grandTotal) === minPrice ? ["Lowest Price"] : [])] };
  }).sort((a, b) => b.score - a.score);
  if (scored[0]) scored[0].badges.push("Recommended");
  res.json(scored);
};
exports.selectQuotation = async (req, res) => {
  const quotation = await prisma.quotation.findUniqueOrThrow({ where: { id: req.params.quotationId }, include: { rfq: true } });
  if (quotation.rfqId !== req.params.rfqId) throw new ApiError(422, "Quotation does not belong to this RFQ");
  const approval = await prisma.$transaction(async (tx) => {
    await tx.quotation.updateMany({ where: { rfqId: quotation.rfqId }, data: { status: "UNDER_REVIEW" } });
    await tx.quotation.update({ where: { id: quotation.id }, data: { status: "SELECTED" } });
    const result = await tx.approval.create({ data: { rfqId: quotation.rfqId, selectedQuotationId: quotation.id, requestedBy: req.user.id } });
    await tx.rfq.update({ where: { id: quotation.rfqId }, data: { status: "APPROVAL_PENDING" } });
    await notifyRole("FINANCE_OFFICER", { title: "New approval request", message: `${quotation.rfq.rfqNumber} requires review`, type: "APPROVAL_REQUESTED" }, tx);
    await logActivity({ userId: req.user.id, action: "APPROVAL_REQUESTED", entityType: "APPROVAL", entityId: result.id, description: `${req.user.name} selected ${quotation.quotationNumber} for approval` }, tx);
    return result;
  });
  res.status(201).json(approval);
};

exports.listApprovals = async (req, res) => res.json(await prisma.approval.findMany({ orderBy: { createdAt: "desc" }, include: { rfq: true, selectedQuotation: { include: { vendor: true, items: true } }, requester: { select: { name: true } }, reviewer: { select: { name: true } } } }));
exports.getApproval = async (req, res) => res.json(await prisma.approval.findUniqueOrThrow({ where: { id: req.params.id }, include: { rfq: { include: { items: true } }, selectedQuotation: { include: { vendor: true, items: true } }, requester: { select: { name: true } }, reviewer: { select: { name: true } } } }));
exports.reviewApproval = (status) => async (req, res) => {
  const approval = await prisma.approval.findUniqueOrThrow({ where: { id: req.params.id }, include: { rfq: true } });
  if (approval.status !== "PENDING") throw new ApiError(409, "Approval has already been reviewed");
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.approval.update({ where: { id: approval.id }, data: { status, remarks: req.body.remarks, reviewedBy: req.user.id } });
    await tx.rfq.update({ where: { id: approval.rfqId }, data: { status: status === "APPROVED" ? "APPROVED" : status === "REJECTED" ? "REJECTED" : "UNDER_REVIEW" } });
    await notify({ userId: approval.requestedBy, title: `Approval ${status.toLowerCase()}`, message: `${approval.rfq.rfqNumber} was ${status.toLowerCase()}`, type: `APPROVAL_${status}` }, tx);
    await logActivity({ userId: req.user.id, action: `APPROVAL_${status}`, entityType: "APPROVAL", entityId: approval.id, description: `${req.user.name} marked ${approval.rfq.rfqNumber} as ${status}` }, tx);
    return result;
  });
  res.json(updated);
};

exports.generatePo = async (req, res) => {
  const approval = await prisma.approval.findUniqueOrThrow({ where: { id: req.body.approvalId }, include: { selectedQuotation: { include: { items: { include: { rfqItem: true } }, vendor: true } } } });
  if (approval.status !== "APPROVED") throw new ApiError(409, "Finance approval is required before PO generation");
  const existing = await prisma.purchaseOrder.findFirst({ where: { quotationId: approval.selectedQuotationId } });
  if (existing) throw new ApiError(409, "A purchase order already exists for this quotation");
  const q = approval.selectedQuotation;
  const po = await prisma.$transaction(async (tx) => {
    const result = await tx.purchaseOrder.create({
      data: {
        poNumber: await nextNumber("PO", tx), rfqId: approval.rfqId, quotationId: q.id, vendorId: q.vendorId, createdBy: req.user.id,
        subtotal: q.subtotal, taxAmount: q.taxAmount, discountAmount: q.discountAmount, grandTotal: q.grandTotal, termsConditions: req.body.termsConditions,
        items: { create: q.items.map((item) => ({ itemName: item.rfqItem.itemName, description: item.rfqItem.description, quantity: item.quantity, unitPrice: item.unitPrice, taxAmount: item.taxAmount, totalAmount: item.totalAmount })) },
      }, include: poInclude,
    });
    await tx.rfq.update({ where: { id: approval.rfqId }, data: { status: "PO_GENERATED" } });
    if (q.vendor.userId) await notify({ userId: q.vendor.userId, title: "Purchase order generated", message: `${result.poNumber} is ready`, type: "PO_GENERATED" }, tx);
    await logActivity({ userId: req.user.id, action: "PO_GENERATED", entityType: "PURCHASE_ORDER", entityId: result.id, description: `${req.user.name} generated ${result.poNumber}` }, tx);
    return result;
  });
  res.status(201).json(po);
};
exports.listPos = async (req, res) => res.json(await prisma.purchaseOrder.findMany({ where: req.user.role === "VENDOR" ? { vendorId: req.user.vendorId } : {}, orderBy: { createdAt: "desc" }, include: poInclude }));
exports.getPo = async (req, res) => {
  const po = await prisma.purchaseOrder.findUniqueOrThrow({ where: { id: req.params.id }, include: poInclude });
  ensureVendorOwns(req, po.vendorId); res.json(po);
};
exports.updatePoStatus = async (req, res) => {
  const po = await prisma.purchaseOrder.findUniqueOrThrow({ where: { id: req.params.id } }); ensureVendorOwns(req, po.vendorId);
  const allowed = req.user.role === "VENDOR" ? ["ACKNOWLEDGED", "READY", "DISPATCHED", "DELIVERED"] : ["SENT_TO_VENDOR", "COMPLETED", "CANCELLED"];
  if (!allowed.includes(req.body.status)) throw new ApiError(403, "Status transition is not allowed for your role");
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.purchaseOrder.update({ where: { id: po.id }, data: { status: req.body.status } });
    await tx.delivery.upsert({ where: { purchaseOrderId: po.id }, create: { purchaseOrderId: po.id, vendorId: po.vendorId, status: req.body.status, notes: req.body.notes, updatedBy: req.user.id }, update: { status: req.body.status, notes: req.body.notes, updatedBy: req.user.id } });
    await logActivity({ userId: req.user.id, action: "PO_STATUS_UPDATED", entityType: "PURCHASE_ORDER", entityId: po.id, description: `${po.poNumber} updated to ${req.body.status}` }, tx);
    return result;
  }); res.json(updated);
};
exports.poPdf = async (req, res) => { const po = await prisma.purchaseOrder.findUniqueOrThrow({ where: { id: req.params.id }, include: poInclude }); ensureVendorOwns(req, po.vendorId); streamDocument(res, "Purchase Order", po); };
exports.emailPo = async (req, res) => { const po = await prisma.purchaseOrder.findUniqueOrThrow({ where: { id: req.params.id }, include: { vendor: true } }); res.json(await sendEmail({ entityType: "PURCHASE_ORDER", entityId: po.id, to: req.body.email || po.vendor.email, ...templates.purchaseOrderEmail(po) })); };

exports.generateInvoice = async (req, res) => {
  const po = await prisma.purchaseOrder.findUniqueOrThrow({ where: { id: req.body.purchaseOrderId }, include: { items: true, vendor: true } });
  if (await prisma.invoice.findFirst({ where: { purchaseOrderId: po.id } })) throw new ApiError(409, "An invoice already exists for this purchase order");
  const invoice = await prisma.$transaction(async (tx) => {
    const record = await tx.invoice.create({ data: { invoiceNumber: await nextNumber("INV", tx), purchaseOrderId: po.id, vendorId: po.vendorId, subtotal: po.subtotal, taxAmount: po.taxAmount, discountAmount: po.discountAmount, grandTotal: po.grandTotal, dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null, items: { create: po.items.map(({ itemName, quantity, unitPrice, taxAmount, totalAmount }) => ({ itemName, quantity, unitPrice, taxAmount, totalAmount })) } }, include: invoiceInclude });
    await logActivity({ userId: req.user.id, action: "INVOICE_GENERATED", entityType: "INVOICE", entityId: record.id, description: `${req.user.name} generated ${record.invoiceNumber}` }, tx);
    return record;
  }); res.status(201).json(invoice);
};
exports.listInvoices = async (req, res) => res.json(await prisma.invoice.findMany({ where: req.user.role === "VENDOR" ? { vendorId: req.user.vendorId } : {}, orderBy: { createdAt: "desc" }, include: invoiceInclude }));
exports.getInvoice = async (req, res) => { const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: req.params.id }, include: invoiceInclude }); ensureVendorOwns(req, invoice.vendorId); res.json(invoice); };
exports.updatePayment = async (req, res) => res.json(await prisma.invoice.update({ where: { id: req.params.id }, data: { paymentStatus: req.body.paymentStatus } }));
exports.invoicePdf = async (req, res) => { const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: req.params.id }, include: invoiceInclude }); ensureVendorOwns(req, invoice.vendorId); streamDocument(res, "Invoice", invoice); };
exports.emailInvoice = async (req, res) => { const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: req.params.id }, include: { vendor: true } }); res.json(await sendEmail({ entityType: "INVOICE", entityId: invoice.id, to: req.body.email || invoice.vendor.email, ...templates.invoiceEmail(invoice) })); };
