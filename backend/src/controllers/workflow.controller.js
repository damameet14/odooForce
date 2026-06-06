const prisma = require("../config/db");
const ApiError = require("../utils/ApiError");
const { nextNumber } = require("../services/numberGenerator.service");
const { logActivity } = require("../services/activityLog.service");
const { notify, notifyRole } = require("../services/notification.service");
const { streamPoPdf, streamInvoicePdf } = require("../services/pdf.service");
const { sendEmail } = require("../services/email.service");
const templates = require("../utils/emailTemplates");

const poInclude = { vendor: true, rfq: true, quotation: true, items: true, delivery: true, invoices: true };
const invoiceInclude = { vendor: true, purchaseOrder: { include: { rfq: true } }, items: true };

const ensureVendorOwns = (req, vendorId) => {
  if (req.user.role === "VENDOR" && req.user.vendorId !== vendorId)
    throw new ApiError(403, "You can only access your own records");
};

// ─── Quotation Submission ───────────────────────────────────────────────────

exports.submitQuotation = async (req, res) => {
  if (!req.user.vendorId) throw new ApiError(403, "Your account is not linked to a vendor");
  const { rfqId, deliveryDays, paymentTerms, notes, discountAmount = 0, items } = req.body;

  if (!rfqId) throw new ApiError(422, "rfqId is required");
  if (!deliveryDays || Number(deliveryDays) <= 0)
    throw new ApiError(422, "Delivery days must be greater than 0");
  if (!items?.length) throw new ApiError(422, "At least one item is required");

  const rfq = await prisma.rfq.findUniqueOrThrow({
    where: { id: rfqId },
    include: {
      items: {
        include: {
          itemVendors: true,
          product: { include: { category: true } },
        },
      },
    },
  });

  // Check RFQ status and deadline
  if (!["SENT", "QUOTATIONS_RECEIVED"].includes(rfq.status) || rfq.deadline <= new Date())
    throw new ApiError(409, "This RFQ is not accepting quotations");

  // Get only items assigned to this vendor
  const vendorItems = rfq.items.filter((item) =>
    item.itemVendors.some((iv) => iv.vendorId === req.user.vendorId)
  );
  if (!vendorItems.length) throw new ApiError(403, "No items in this RFQ are assigned to you");

  // Must quote ALL assigned items
  const assignedItemIds = vendorItems.map((i) => i.id);
  const quotedItemIds = items.map((i) => i.rfqItemId);
  const missingItems = assignedItemIds.filter((id) => !quotedItemIds.includes(id));
  if (missingItems.length)
    throw new ApiError(422, `You must quote all assigned items. Missing: ${missingItems.length} item(s)`);
  const extraItems = quotedItemIds.filter((id) => !assignedItemIds.includes(id));
  if (extraItems.length)
    throw new ApiError(422, "You can only quote items assigned to you");

  // Validate each item
  for (const item of items) {
    if (!item.unitPrice || Number(item.unitPrice) <= 0)
      throw new ApiError(422, `Unit price must be greater than 0 for item ${item.rfqItemId}`);
    if (item.gstPercent !== undefined && (Number(item.gstPercent) < 0 || Number(item.gstPercent) > 100))
      throw new ApiError(422, `GST percentage must be between 0 and 100`);
  }

  // Calculate totals
  const calculated = items.map((item) => {
    const rfqItem = vendorItems.find((vi) => vi.id === item.rfqItemId);
    const quantity = Number(rfqItem.quantity);
    const unitPrice = Number(item.unitPrice);
    // Default GST from product category
    const gstPercent = item.gstPercent !== undefined
      ? Number(item.gstPercent)
      : Number(rfqItem.product?.defaultGstPct || rfqItem.product?.category?.defaultGstPercent || 18);
    const base = unitPrice * quantity;
    const taxAmount = (base * gstPercent) / 100;
    const totalAmount = base + taxAmount - Number(item.discount || 0);
    return {
      rfqItemId: item.rfqItemId,
      unitPrice,
      quantity,
      gstPercent,
      taxPercentage: gstPercent,
      taxAmount,
      discount: Number(item.discount || 0),
      totalAmount,
    };
  });

  const subtotal = calculated.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const taxAmount = calculated.reduce((sum, item) => sum + item.taxAmount, 0);
  const grandTotal = subtotal + taxAmount - Number(discountAmount);

  const quotation = await prisma.$transaction(async (tx) => {
    const q = await tx.quotation.create({
      data: {
        quotationNumber: await nextNumber("QUO", tx),
        rfqId,
        vendorId: req.user.vendorId,
        deliveryDays: Number(deliveryDays),
        deliveryTimeline: `${deliveryDays} days`,
        paymentTerms,
        notes,
        discountAmount,
        subtotal,
        taxAmount,
        grandTotal,
        items: { create: calculated },
      },
      include: { items: true, vendor: true },
    });

    // Update RFQ status
    await tx.rfq.update({ where: { id: rfqId }, data: { status: "QUOTATIONS_RECEIVED" } });

    // Update item vendor statuses
    for (const item of items) {
      await tx.rfqItemVendor.updateMany({
        where: { rfqItemId: item.rfqItemId, vendorId: req.user.vendorId },
        data: { status: "QUOTED" },
      });
    }

    // Update legacy invite status
    await tx.rfqVendorInvite.updateMany({
      where: { rfqId, vendorId: req.user.vendorId },
      data: { status: "QUOTED" },
    });

    // Notify procurement officers
    await notifyRole(
      "PROCUREMENT_OFFICER",
      {
        title: "Quotation submitted",
        message: `${q.vendor.companyName} submitted ${q.quotationNumber} for ${rfq.rfqNumber}`,
        type: "QUOTATION_SUBMITTED",
      },
      tx
    );

    await logActivity(
      {
        userId: req.user.id,
        action: "QUOTATION_SUBMITTED",
        entityType: "QUOTATION",
        entityId: q.id,
        description: `${q.vendor.companyName} submitted ${q.quotationNumber}`,
      },
      tx
    );

    // Send email to procurement officers
    const procUsers = await tx.user.findMany({
      where: { role: "PROCUREMENT_OFFICER", status: "ACTIVE" },
      select: { email: true },
    });
    for (const user of procUsers) {
      sendEmail({
        to: user.email,
        entityType: "QUOTATION",
        entityId: q.id,
        ...templates.quotationReceivedEmail(q, rfq),
      }).catch((err) => console.error("Quotation email failed", { reason: err.message }));
    }

    return q;
  });

  res.status(201).json(quotation);
};

// ─── Quotation Read ─────────────────────────────────────────────────────────

exports.getQuotation = async (req, res) => {
  const record = await prisma.quotation.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { vendor: true, rfq: true, items: { include: { rfqItem: { include: { product: true } } } } },
  });
  ensureVendorOwns(req, record.vendorId);
  res.json(record);
};

exports.updateQuotation = async (req, res) => {
  const record = await prisma.quotation.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { rfq: true },
  });
  ensureVendorOwns(req, record.vendorId);
  if (record.rfq.deadline <= new Date() || record.status !== "SUBMITTED")
    throw new ApiError(409, "Quotation is locked");
  res.json(
    await prisma.quotation.update({
      where: { id: record.id },
      data: {
        deliveryTimeline: req.body.deliveryTimeline,
        deliveryDays: req.body.deliveryDays ? Number(req.body.deliveryDays) : undefined,
        paymentTerms: req.body.paymentTerms,
        notes: req.body.notes,
      },
    })
  );
};

exports.listQuotations = async (req, res) => {
  const where = {
    rfqId: req.params.rfqId,
    ...(req.user.role === "VENDOR" && { vendorId: req.user.vendorId }),
  };
  res.json(
    await prisma.quotation.findMany({
      where,
      include: { vendor: true, items: { include: { rfqItem: { include: { product: true } } } } },
      orderBy: { grandTotal: "asc" },
    })
  );
};

// ─── Quotation Comparison & Best Quote ──────────────────────────────────────

exports.compareQuotations = async (req, res) => {
  const rfq = await prisma.rfq.findUniqueOrThrow({
    where: { id: req.params.rfqId },
    include: {
      items: { include: { itemVendors: true, product: true } },
      quotations: {
        include: { vendor: true, items: { include: { rfqItem: { include: { product: true } } } } },
      },
    },
  });

  // Group quotes by line item
  const itemComparison = rfq.items.map((rfqItem) => {
    const vendorCount = rfqItem.itemVendors.length;
    const quotes = rfq.quotations
      .map((q) => {
        const quotedItem = q.items.find((qi) => qi.rfqItemId === rfqItem.id);
        if (!quotedItem) return null;
        return {
          quotationId: q.id,
          quotationItemId: quotedItem.id,
          vendorId: q.vendorId,
          vendorName: q.vendor.companyName,
          vendorCategory: q.vendor.category?.name,
          unitPrice: Number(quotedItem.unitPrice),
          gstPercent: Number(quotedItem.gstPercent || quotedItem.taxPercentage),
          taxAmount: Number(quotedItem.taxAmount),
          totalAmount: Number(quotedItem.totalAmount),
          deliveryDays: q.deliveryDays,
          quantity: Number(quotedItem.quantity),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.totalAmount - b.totalAmount);

    const lowestPrice = quotes.length ? Math.min(...quotes.map((q) => q.totalAmount)) : null;

    return {
      rfqItemId: rfqItem.id,
      lineNumber: rfq.items.indexOf(rfqItem) + 1,
      itemName: rfqItem.itemName,
      description: rfqItem.description,
      quantity: Number(rfqItem.quantity),
      unit: rfqItem.unit,
      vendorCount,
      respondedCount: quotes.length,
      quotes: quotes.map((q) => ({
        ...q,
        isLowest: q.totalAmount === lowestPrice,
      })),
    };
  });

  const totalVendors = [...new Set(rfq.items.flatMap((i) => i.itemVendors.map((iv) => iv.vendorId)))].length;
  const respondedVendors = rfq.quotations.length;

  res.json({
    rfqId: rfq.id,
    rfqNumber: rfq.rfqNumber,
    title: rfq.title,
    totalVendors,
    respondedVendors,
    items: itemComparison,
  });
};

exports.getBestQuote = async (req, res) => {
  const rfq = await prisma.rfq.findUniqueOrThrow({
    where: { id: req.params.rfqId },
    include: {
      items: { include: { product: true } },
      quotations: {
        include: { vendor: true, items: { include: { rfqItem: true } } },
      },
    },
  });

  if (!rfq.quotations.length)
    throw new ApiError(409, "No quotations have been submitted yet");

  const bestItems = [];
  let bestTotal = 0;

  for (const rfqItem of rfq.items) {
    const candidates = rfq.quotations
      .map((q) => {
        const qi = q.items.find((i) => i.rfqItemId === rfqItem.id);
        if (!qi) return null;
        return {
          rfqItemId: rfqItem.id,
          quotationItemId: qi.id,
          quotationId: q.id,
          vendorId: q.vendorId,
          vendorName: q.vendor.companyName,
          itemName: rfqItem.itemName,
          quantity: Number(qi.quantity),
          unitPrice: Number(qi.unitPrice),
          gstPercent: Number(qi.gstPercent || qi.taxPercentage),
          taxAmount: Number(qi.taxAmount),
          totalAmount: Number(qi.totalAmount),
          deliveryDays: q.deliveryDays,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.totalAmount - b.totalAmount);

    if (!candidates.length)
      throw new ApiError(409, `No quotes received for item: ${rfqItem.itemName}`);

    bestItems.push(candidates[0]);
    bestTotal += candidates[0].totalAmount;
  }

  res.json({
    rfqId: rfq.id,
    rfqNumber: rfq.rfqNumber,
    bestTotal,
    items: bestItems,
  });
};

// ─── Procurement Manager Approval Selection ─────────────────────────────────

exports.approveSelection = async (req, res) => {
  const { selectedItems } = req.body;
  if (!selectedItems?.length) throw new ApiError(422, "selectedItems is required");

  const rfq = await prisma.rfq.findUniqueOrThrow({
    where: { id: req.params.rfqId },
    include: {
      items: true,
      quotations: { include: { items: true, vendor: true } },
    },
  });

  if (!["SENT", "QUOTATIONS_RECEIVED", "UNDER_REVIEW"].includes(rfq.status))
    throw new ApiError(409, "RFQ is not in a reviewable state");

  // Validate each selected item
  const enrichedItems = [];
  for (const sel of selectedItems) {
    if (!sel.rfqItemId || !sel.quotationItemId)
      throw new ApiError(422, "Each selectedItem must have rfqItemId and quotationItemId");

    const rfqItem = rfq.items.find((i) => i.id === sel.rfqItemId);
    if (!rfqItem) throw new ApiError(422, `RFQ item not found: ${sel.rfqItemId}`);

    let foundQi = null;
    let foundQ = null;
    for (const q of rfq.quotations) {
      const qi = q.items.find((i) => i.id === sel.quotationItemId && i.rfqItemId === sel.rfqItemId);
      if (qi) { foundQi = qi; foundQ = q; break; }
    }
    if (!foundQi) throw new ApiError(422, `Quotation item not found: ${sel.quotationItemId}`);

    enrichedItems.push({
      rfqItemId: sel.rfqItemId,
      quotationItemId: foundQi.id,
      quotationId: foundQ.id,
      vendorId: foundQ.vendorId,
      vendorName: foundQ.vendor.companyName,
      itemName: rfqItem.itemName,
      quantity: Number(foundQi.quantity),
      unitPrice: Number(foundQi.unitPrice),
      gstPercent: Number(foundQi.gstPercent || foundQi.taxPercentage),
      taxAmount: Number(foundQi.taxAmount),
      totalAmount: Number(foundQi.totalAmount),
    });
  }

  const approval = await prisma.$transaction(async (tx) => {
    // Mark all quotations as under review
    await tx.quotation.updateMany({ where: { rfqId: rfq.id }, data: { status: "UNDER_REVIEW" } });

    const result = await tx.approval.create({
      data: {
        rfqId: rfq.id,
        requestedBy: req.user.id,
        selectedItems: enrichedItems,
      },
    });

    await tx.rfq.update({ where: { id: rfq.id }, data: { status: "APPROVAL_PENDING" } });

    await notifyRole(
      "FINANCE_OFFICER",
      {
        title: "Approval request",
        message: `${rfq.rfqNumber} requires finance review`,
        type: "APPROVAL_REQUESTED",
      },
      tx
    );

    await logActivity(
      {
        userId: req.user.id,
        action: "APPROVAL_REQUESTED",
        entityType: "APPROVAL",
        entityId: result.id,
        description: `${req.user.name} submitted ${rfq.rfqNumber} for finance approval`,
      },
      tx
    );

    // Email finance officers
    const finUsers = await tx.user.findMany({
      where: { role: "FINANCE_OFFICER", status: "ACTIVE" },
      select: { email: true },
    });
    for (const user of finUsers) {
      sendEmail({
        to: user.email,
        entityType: "APPROVAL",
        entityId: result.id,
        ...templates.approvalRequestEmail(rfq, enrichedItems),
      }).catch((err) => console.error("Approval email failed", { reason: err.message }));
    }

    return result;
  });

  res.status(201).json(approval);
};

// ─── Approval Read ──────────────────────────────────────────────────────────

exports.listApprovals = async (req, res) =>
  res.json(
    await prisma.approval.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        rfq: { include: { items: { include: { product: true } }, quotations: { include: { vendor: true, items: { include: { rfqItem: true } } } } } },
        selectedQuotation: { include: { vendor: true, items: true } },
        requester: { select: { name: true } },
        reviewer: { select: { name: true } },
      },
    })
  );

exports.getApproval = async (req, res) => {
  const approval = await prisma.approval.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      rfq: {
        include: {
          items: { include: { product: true, itemVendors: { include: { vendor: true } } } },
          quotations: { include: { vendor: true, items: { include: { rfqItem: { include: { product: true } } } } } },
        },
      },
      selectedQuotation: { include: { vendor: true, items: true } },
      requester: { select: { name: true, email: true } },
      reviewer: { select: { name: true } },
    },
  });
  res.json(approval);
};

// ─── Finance Review ─────────────────────────────────────────────────────────

exports.reviewApproval = (status) => async (req, res) => {
  const approval = await prisma.approval.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { rfq: true, requester: { select: { id: true, name: true, email: true } } },
  });
  if (approval.status !== "PENDING") throw new ApiError(409, "Approval has already been reviewed");

  const updated = await prisma.$transaction(async (tx) => {
    let finalSelectedItems = approval.selectedItems;

    // Finance can override the selected items
    if (status === "APPROVED" && req.body.selectedItems?.length) {
      // Validate the override
      const rfq = await tx.rfq.findUniqueOrThrow({
        where: { id: approval.rfqId },
        include: { items: true, quotations: { include: { items: true, vendor: true } } },
      });
      const enrichedItems = [];
      for (const sel of req.body.selectedItems) {
        const rfqItem = rfq.items.find((i) => i.id === sel.rfqItemId);
        if (!rfqItem) throw new ApiError(422, `RFQ item not found: ${sel.rfqItemId}`);
        let foundQi = null, foundQ = null;
        for (const q of rfq.quotations) {
          const qi = q.items.find((i) => i.id === sel.quotationItemId && i.rfqItemId === sel.rfqItemId);
          if (qi) { foundQi = qi; foundQ = q; break; }
        }
        if (!foundQi) throw new ApiError(422, `Quotation item not found: ${sel.quotationItemId}`);
        enrichedItems.push({
          rfqItemId: sel.rfqItemId,
          quotationItemId: foundQi.id,
          quotationId: foundQ.id,
          vendorId: foundQ.vendorId,
          vendorName: foundQ.vendor.companyName,
          itemName: rfqItem.itemName,
          quantity: Number(foundQi.quantity),
          unitPrice: Number(foundQi.unitPrice),
          gstPercent: Number(foundQi.gstPercent || foundQi.taxPercentage),
          taxAmount: Number(foundQi.taxAmount),
          totalAmount: Number(foundQi.totalAmount),
        });
      }
      finalSelectedItems = enrichedItems;
    }

    const result = await tx.approval.update({
      where: { id: approval.id },
      data: {
        status,
        remarks: req.body.remarks,
        reviewedBy: req.user.id,
        selectedItems: finalSelectedItems,
      },
    });

    const rfqStatus = status === "APPROVED" ? "APPROVED" : status === "REJECTED" ? "REJECTED" : "UNDER_REVIEW";
    await tx.rfq.update({ where: { id: approval.rfqId }, data: { status: rfqStatus } });

    await notify(
      {
        userId: approval.requestedBy,
        title: `Approval ${status.toLowerCase().replace("_", " ")}`,
        message: `${approval.rfq.rfqNumber} was ${status.toLowerCase().replace("_", " ")}`,
        type: `APPROVAL_${status}`,
      },
      tx
    );

    await logActivity(
      {
        userId: req.user.id,
        action: `APPROVAL_${status}`,
        entityType: "APPROVAL",
        entityId: approval.id,
        description: `${req.user.name} marked ${approval.rfq.rfqNumber} as ${status}`,
      },
      tx
    );

    // Email procurement officer
    sendEmail({
      to: approval.requester.email,
      entityType: "APPROVAL",
      entityId: approval.id,
      ...templates.approvalDecisionEmail(approval.rfq, status, req.body.remarks),
    }).catch((err) => console.error("Approval decision email failed", { reason: err.message }));

    return result;
  });

  res.json(updated);
};

// ─── PO Generation (Per-Vendor Split) ───────────────────────────────────────

exports.generatePo = async (req, res) => {
  const approval = await prisma.approval.findUniqueOrThrow({
    where: { id: req.body.approvalId },
    include: { rfq: true },
  });
  if (approval.status !== "APPROVED")
    throw new ApiError(409, "Finance approval is required before PO generation");

  const selectedItems = approval.selectedItems;
  if (!selectedItems?.length)
    throw new ApiError(409, "No items selected in this approval");

  // Check if POs already exist for this approval
  const existingPos = await prisma.purchaseOrder.findMany({
    where: { approvalId: approval.id },
  });
  if (existingPos.length)
    throw new ApiError(409, "Purchase orders have already been generated for this approval");

  // Group selected items by vendor
  const vendorGroups = {};
  for (const item of selectedItems) {
    if (!vendorGroups[item.vendorId]) vendorGroups[item.vendorId] = [];
    vendorGroups[item.vendorId].push(item);
  }

  const pos = await prisma.$transaction(async (tx) => {
    const results = [];

    for (const [vendorId, items] of Object.entries(vendorGroups)) {
      const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
      const taxAmount = items.reduce((sum, i) => sum + i.taxAmount, 0);
      const grandTotal = subtotal + taxAmount;

      const po = await tx.purchaseOrder.create({
        data: {
          poNumber: await nextNumber("PO", tx),
          rfqId: approval.rfqId,
          approvalId: approval.id,
          vendorId,
          createdBy: req.user.id,
          subtotal,
          taxAmount,
          grandTotal,
          termsConditions: req.body.termsConditions,
          items: {
            create: items.map((item) => ({
              itemName: item.itemName,
              description: item.description || null,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              gstPercent: item.gstPercent,
              taxAmount: item.taxAmount,
              totalAmount: item.totalAmount,
            })),
          },
        },
        include: poInclude,
      });

      // Notify vendor
      const vendor = await tx.vendor.findUnique({ where: { id: vendorId } });
      if (vendor?.userId) {
        await notify(
          {
            userId: vendor.userId,
            title: "Purchase order generated",
            message: `${po.poNumber} is ready`,
            type: "PO_GENERATED",
          },
          tx
        );
      }

      // Send PO email to vendor
      if (vendor) {
        sendEmail({
          to: vendor.email,
          entityType: "PURCHASE_ORDER",
          entityId: po.id,
          ...templates.purchaseOrderEmail(po, vendor),
        }).catch((err) => console.error("PO email failed", { vendorId, reason: err.message }));
      }

      await logActivity(
        {
          userId: req.user.id,
          action: "PO_GENERATED",
          entityType: "PURCHASE_ORDER",
          entityId: po.id,
          description: `${req.user.name} generated ${po.poNumber}`,
        },
        tx
      );

      results.push(po);
    }

    await tx.rfq.update({ where: { id: approval.rfqId }, data: { status: "PO_GENERATED" } });

    return results;
  });

  res.status(201).json(pos);
};

// ─── PO Read ────────────────────────────────────────────────────────────────

exports.listPos = async (req, res) =>
  res.json(
    await prisma.purchaseOrder.findMany({
      where: req.user.role === "VENDOR" ? { vendorId: req.user.vendorId } : {},
      orderBy: { createdAt: "desc" },
      include: poInclude,
    })
  );

exports.getPo = async (req, res) => {
  const po = await prisma.purchaseOrder.findUniqueOrThrow({
    where: { id: req.params.id },
    include: poInclude,
  });
  ensureVendorOwns(req, po.vendorId);
  res.json(po);
};

// ─── PO Status & Delivery Tracking ─────────────────────────────────────────

exports.updatePoStatus = async (req, res) => {
  const po = await prisma.purchaseOrder.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { vendor: true, items: true },
  });
  ensureVendorOwns(req, po.vendorId);

  const newStatus = req.body.status;
  if (!newStatus) throw new ApiError(422, "Status is required");

  // Vendor can mark: SHIPPED, ON_THE_WAY, DELIVERED
  // Proc manager / Admin can mark: SENT_TO_VENDOR, RECEIVED, COMPLETED, CANCELLED
  const vendorAllowed = ["ACKNOWLEDGED", "READY", "DISPATCHED", "DELIVERED"];
  const internalAllowed = ["SENT_TO_VENDOR", "COMPLETED", "CANCELLED"];

  // Map new delivery statuses to PO statuses
  const deliveryStatusMap = {
    SHIPPED: "DISPATCHED",
    ON_THE_WAY: "DISPATCHED",
    DELIVERED: "DELIVERED",
    RECEIVED: "COMPLETED",
  };

  // Determine delivery status
  let deliveryStatus = req.body.deliveryStatus || newStatus;
  let poStatus = newStatus;

  // Handle new delivery flow
  if (["SHIPPED", "ON_THE_WAY", "DELIVERED"].includes(newStatus)) {
    if (req.user.role !== "VENDOR") throw new ApiError(403, "Only vendors can update shipping status");
    deliveryStatus = newStatus;
    poStatus = deliveryStatusMap[newStatus] || newStatus;
  } else if (newStatus === "RECEIVED") {
    if (req.user.role === "VENDOR") throw new ApiError(403, "Only procurement officers can mark as received");
    deliveryStatus = "RECEIVED";
    poStatus = "COMPLETED";
  } else {
    if (req.user.role === "VENDOR") {
      if (!vendorAllowed.includes(newStatus)) throw new ApiError(403, "Status transition not allowed for your role");
    } else {
      if (!internalAllowed.includes(newStatus) && !["RECEIVED"].includes(newStatus))
        throw new ApiError(403, "Status transition not allowed for your role");
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.purchaseOrder.update({
      where: { id: po.id },
      data: {
        status: poStatus,
        deliveryStatus: ["SHIPPED", "ON_THE_WAY", "DELIVERED", "RECEIVED"].includes(deliveryStatus) ? deliveryStatus : undefined,
      },
    });

    // Upsert delivery record
    const deliveryStatusForRecord = ["SHIPPED", "ON_THE_WAY", "DELIVERED", "RECEIVED"].includes(deliveryStatus) ? deliveryStatus : "PENDING";
    await tx.delivery.upsert({
      where: { purchaseOrderId: po.id },
      create: {
        purchaseOrderId: po.id,
        vendorId: po.vendorId,
        status: deliveryStatusForRecord,
        notes: req.body.notes,
        updatedBy: req.user.id,
      },
      update: {
        status: deliveryStatusForRecord,
        notes: req.body.notes,
        updatedBy: req.user.id,
      },
    });

    await logActivity(
      {
        userId: req.user.id,
        action: "PO_STATUS_UPDATED",
        entityType: "PURCHASE_ORDER",
        entityId: po.id,
        description: `${po.poNumber} updated to ${newStatus}`,
      },
      tx
    );

    // Auto-generate invoice when RECEIVED
    if (newStatus === "RECEIVED" || deliveryStatus === "RECEIVED") {
      const existingInvoice = await tx.invoice.findFirst({ where: { purchaseOrderId: po.id } });
      if (!existingInvoice) {
        const invoice = await tx.invoice.create({
          data: {
            invoiceNumber: await nextNumber("INV", tx),
            purchaseOrderId: po.id,
            vendorId: po.vendorId,
            subtotal: po.subtotal,
            taxAmount: po.taxAmount,
            discountAmount: po.discountAmount,
            grandTotal: po.grandTotal,
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            items: {
              create: po.items.map(({ itemName, quantity, unitPrice, gstPercent, taxAmount, totalAmount }) => ({
                itemName,
                quantity,
                unitPrice,
                gstPercent: gstPercent || 18,
                taxAmount,
                totalAmount,
              })),
            },
          },
          include: invoiceInclude,
        });

        await logActivity(
          {
            userId: req.user.id,
            action: "INVOICE_GENERATED",
            entityType: "INVOICE",
            entityId: invoice.id,
            description: `Invoice ${invoice.invoiceNumber} auto-generated on delivery receipt`,
          },
          tx
        );

        // Notify finance
        await notifyRole(
          "FINANCE_OFFICER",
          {
            title: "Invoice generated",
            message: `${invoice.invoiceNumber} generated for ${po.poNumber}`,
            type: "INVOICE_GENERATED",
          },
          tx
        );

        // Email finance officers
        const finUsers = await tx.user.findMany({
          where: { role: "FINANCE_OFFICER", status: "ACTIVE" },
          select: { email: true },
        });
        for (const user of finUsers) {
          sendEmail({
            to: user.email,
            entityType: "INVOICE",
            entityId: invoice.id,
            ...templates.invoiceGeneratedEmail(invoice),
          }).catch((err) => console.error("Invoice email failed", { reason: err.message }));
        }
      }
    }

    return result;
  });

  res.json(updated);
};

// ─── PO PDF & Email ─────────────────────────────────────────────────────────

exports.poPdf = async (req, res) => {
  const po = await prisma.purchaseOrder.findUniqueOrThrow({
    where: { id: req.params.id },
    include: poInclude,
  });
  ensureVendorOwns(req, po.vendorId);
  streamPoPdf(res, po);
};

exports.emailPo = async (req, res) => {
  const po = await prisma.purchaseOrder.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { vendor: true, items: true },
  });
  res.json(
    await sendEmail({
      entityType: "PURCHASE_ORDER",
      entityId: po.id,
      to: req.body.email || po.vendor.email,
      ...templates.purchaseOrderEmail(po, po.vendor),
    })
  );
};

// ─── Invoice ────────────────────────────────────────────────────────────────

exports.generateInvoice = async (req, res) => {
  const po = await prisma.purchaseOrder.findUniqueOrThrow({
    where: { id: req.body.purchaseOrderId },
    include: { items: true, vendor: true },
  });
  if (await prisma.invoice.findFirst({ where: { purchaseOrderId: po.id } }))
    throw new ApiError(409, "An invoice already exists for this purchase order");

  const invoice = await prisma.$transaction(async (tx) => {
    const record = await tx.invoice.create({
      data: {
        invoiceNumber: await nextNumber("INV", tx),
        purchaseOrderId: po.id,
        vendorId: po.vendorId,
        subtotal: po.subtotal,
        taxAmount: po.taxAmount,
        discountAmount: po.discountAmount,
        grandTotal: po.grandTotal,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: {
          create: po.items.map(({ itemName, quantity, unitPrice, gstPercent, taxAmount, totalAmount }) => ({
            itemName,
            quantity,
            unitPrice,
            gstPercent: gstPercent || 18,
            taxAmount,
            totalAmount,
          })),
        },
      },
      include: invoiceInclude,
    });
    await logActivity(
      {
        userId: req.user.id,
        action: "INVOICE_GENERATED",
        entityType: "INVOICE",
        entityId: record.id,
        description: `${req.user.name} generated ${record.invoiceNumber}`,
      },
      tx
    );
    return record;
  });
  res.status(201).json(invoice);
};

exports.listInvoices = async (req, res) =>
  res.json(
    await prisma.invoice.findMany({
      where: req.user.role === "VENDOR" ? { vendorId: req.user.vendorId } : {},
      orderBy: { createdAt: "desc" },
      include: invoiceInclude,
    })
  );

exports.getInvoice = async (req, res) => {
  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: req.params.id },
    include: invoiceInclude,
  });
  ensureVendorOwns(req, invoice.vendorId);
  res.json(invoice);
};

exports.updatePayment = async (req, res) => {
  if (!req.body.paymentStatus) throw new ApiError(422, "paymentStatus is required");
  res.json(
    await prisma.invoice.update({
      where: { id: req.params.id },
      data: { paymentStatus: req.body.paymentStatus },
    })
  );
};

exports.invoicePdf = async (req, res) => {
  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: req.params.id },
    include: invoiceInclude,
  });
  ensureVendorOwns(req, invoice.vendorId);
  streamInvoicePdf(res, invoice);
};

exports.emailInvoice = async (req, res) => {
  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { vendor: true, items: true },
  });
  res.json(
    await sendEmail({
      entityType: "INVOICE",
      entityId: invoice.id,
      to: req.body.email || invoice.vendor.email,
      ...templates.invoiceGeneratedEmail(invoice),
    })
  );
};
