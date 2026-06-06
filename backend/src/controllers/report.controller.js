const prisma = require("../config/db");

exports.dashboard = async (req, res) => {
  const vendorWhere = req.user.role === "VENDOR" ? { vendorId: req.user.vendorId } : {};
  const rfqWhere = req.user.role === "VENDOR" ? { invites: { some: { vendorId: req.user.vendorId } } } : {};
  const [users, vendors, rfqs, quotations, approvals, purchaseOrders, invoices, spend] = await Promise.all([
    req.user.role === "VENDOR" ? 0 : prisma.user.count(),
    req.user.role === "VENDOR" ? 0 : prisma.vendor.count(),
    prisma.rfq.count({ where: rfqWhere }),
    prisma.quotation.count({ where: vendorWhere }),
    req.user.role === "VENDOR" ? 0 : prisma.approval.count({ where: req.user.role === "FINANCE_OFFICER" ? { status: "PENDING" } : {} }),
    prisma.purchaseOrder.count({ where: vendorWhere }), prisma.invoice.count({ where: vendorWhere }),
    prisma.purchaseOrder.aggregate({ where: vendorWhere, _sum: { grandTotal: true } }),
  ]);
  const summary = { rfqs, quotations, approvals, purchaseOrders, invoices, totalSpend: spend._sum.grandTotal || 0 };
  if (req.user.role !== "VENDOR") Object.assign(summary, { users, vendors });
  res.json(summary);
};

exports.monthlySpend = async (_req, res) => {
  const data = await prisma.$queryRaw`SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, SUM(grand_total)::float AS total FROM purchase_orders GROUP BY 1 ORDER BY 1`;
  res.json(data);
};
exports.vendorPerformance = async (_req, res) => res.json(await prisma.vendor.findMany({ select: { id: true, companyName: true, rating: true, _count: { select: { quotations: true, purchaseOrders: true } } }, orderBy: { rating: "desc" } }));
exports.rfqSummary = async (_req, res) => res.json(await prisma.rfq.groupBy({ by: ["status"], _count: { status: true } }));
exports.pendingApprovals = async (_req, res) => res.json(await prisma.approval.findMany({ where: { status: "PENDING" }, include: { rfq: true, selectedQuotation: { include: { vendor: true } } } }));
exports.exportSummary = async (_req, res) => {
  const pos = await prisma.purchaseOrder.findMany({ include: { vendor: true, rfq: true } });
  const csv = ["PO Number,RFQ,Vendor,Status,Grand Total,Created At", ...pos.map((p) => [p.poNumber, p.rfq.rfqNumber, p.vendor.companyName, p.status, p.grandTotal, p.createdAt.toISOString()].map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))].join("\n");
  res.setHeader("Content-Type", "text/csv"); res.setHeader("Content-Disposition", "attachment; filename=procurement-summary.csv"); res.send(csv);
};

exports.activityLogs = async (req, res) => {
  const where = req.user.role === "ADMIN" ? {} : { userId: req.user.id };
  res.json(await prisma.activityLog.findMany({ where, orderBy: { createdAt: "desc" }, take: 100, include: { user: { select: { name: true, role: true } } } }));
};
exports.activityLog = async (req, res) => res.json(await prisma.activityLog.findUniqueOrThrow({ where: { id: req.params.id }, include: { user: true } }));
exports.notifications = async (req, res) => res.json(await prisma.notification.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: "desc" }, take: 100 }));
exports.readNotification = async (req, res) => res.json(await prisma.notification.update({ where: { id: req.params.id, userId: req.user.id }, data: { isRead: true } }));
exports.readAllNotifications = async (req, res) => { await prisma.notification.updateMany({ where: { userId: req.user.id }, data: { isRead: true } }); res.json({ message: "All notifications marked as read" }); };
