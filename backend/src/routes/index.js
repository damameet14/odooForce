const express = require("express");
const { body } = require("express-validator");
const asyncHandler = require("../utils/asyncHandler");
const { validate } = require("../middlewares/error.middleware");
const { protect, authorize } = require("../middlewares/auth.middleware");
const auth = require("../controllers/auth.controller");
const master = require("../controllers/master.controller");
const rfq = require("../controllers/rfq.controller");
const flow = require("../controllers/workflow.controller");
const report = require("../controllers/report.controller");

const router = express.Router();
const a = (...roles) => [protect, authorize(...roles)];
const handlers = (...items) => items.map((item) => typeof item === "function" && item.constructor.name === "AsyncFunction" ? asyncHandler(item) : item);
const roleValues = ["ADMIN", "PROCUREMENT_OFFICER", "FINANCE_OFFICER", "VENDOR"];
const userStatusValues = ["ACTIVE", "INACTIVE"];
const vendorStatusValues = ["ACTIVE", "INACTIVE", "PENDING", "BLACKLISTED"];
const userCreateValidators = [
  body("name").trim().notEmpty().withMessage("Name is required").isLength({ max: 120 }).withMessage("Name must be 120 characters or fewer"),
  body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password").isLength({ min: 8, max: 128 }).withMessage("Password must be between 8 and 128 characters"),
  body("role").isIn(roleValues).withMessage("Role is invalid"),
  body("phone").optional({ values: "falsy" }).trim().isLength({ max: 30 }).withMessage("Phone must be 30 characters or fewer"),
  body("status").optional({ values: "falsy" }).isIn(userStatusValues).withMessage("Status is invalid"),
];
const userUpdateValidators = [
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty").isLength({ max: 120 }).withMessage("Name must be 120 characters or fewer"),
  body("email").optional().trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password").optional({ values: "falsy" }).isLength({ min: 8, max: 128 }).withMessage("Password must be between 8 and 128 characters"),
  body("role").optional().isIn(roleValues).withMessage("Role is invalid"),
  body("phone").optional({ values: "falsy" }).trim().isLength({ max: 30 }).withMessage("Phone must be 30 characters or fewer"),
  body("status").optional().isIn(userStatusValues).withMessage("Status is invalid"),
];
const categoryValidators = [
  body("name").trim().notEmpty().withMessage("Category name is required").isLength({ max: 100 }).withMessage("Category name must be 100 characters or fewer"),
  body("description").optional({ values: "falsy" }).trim().isLength({ max: 500 }).withMessage("Description must be 500 characters or fewer"),
];
const vendorCreateValidators = [
  body("companyName").trim().notEmpty().withMessage("Company name is required").isLength({ max: 160 }).withMessage("Company name must be 160 characters or fewer"),
  body("contactPerson").optional({ values: "falsy" }).trim().isLength({ max: 120 }).withMessage("Contact person must be 120 characters or fewer"),
  body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("phone").optional({ values: "falsy" }).trim().isLength({ max: 30 }).withMessage("Phone must be 30 characters or fewer"),
  body("address").optional({ values: "falsy" }).trim().isLength({ max: 500 }).withMessage("Address must be 500 characters or fewer"),
  body("gstNumber").optional({ values: "falsy" }).trim().isLength({ max: 40 }).withMessage("GST number must be 40 characters or fewer"),
  body("password").optional().isLength({ min: 8, max: 128 }).withMessage("Password must be between 8 and 128 characters"),
  body("categoryId").optional({ values: "falsy" }).isUUID().withMessage("Category is invalid"),
  body("status").optional({ values: "falsy" }).isIn(vendorStatusValues).withMessage("Status is invalid"),
  body("rating").optional({ values: "falsy" }).isFloat({ min: 0, max: 5 }).withMessage("Rating must be between 0 and 5"),
];
const vendorUpdateValidators = [
  body("companyName").optional().trim().notEmpty().withMessage("Company name cannot be empty").isLength({ max: 160 }).withMessage("Company name must be 160 characters or fewer"),
  body("contactPerson").optional({ values: "falsy" }).trim().isLength({ max: 120 }).withMessage("Contact person must be 120 characters or fewer"),
  body("email").optional().trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("phone").optional({ values: "falsy" }).trim().isLength({ max: 30 }).withMessage("Phone must be 30 characters or fewer"),
  body("address").optional({ values: "falsy" }).trim().isLength({ max: 500 }).withMessage("Address must be 500 characters or fewer"),
  body("gstNumber").optional({ values: "falsy" }).trim().isLength({ max: 40 }).withMessage("GST number must be 40 characters or fewer"),
  body("categoryId").optional({ values: "falsy" }).isUUID().withMessage("Category is invalid"),
  body("status").optional().isIn(vendorStatusValues).withMessage("Status is invalid"),
  body("rating").optional({ values: "falsy" }).isFloat({ min: 0, max: 5 }).withMessage("Rating must be between 0 and 5"),
];

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Login' }
 *     responses:
 *       200: { description: Login successful }
 *       401: { description: Invalid credentials }
 */
router.post("/auth/login", ...handlers(body("email").isEmail(), body("password").notEmpty(), validate, auth.login));
router.post("/auth/signup", ...handlers(body("name").notEmpty(), body("email").isEmail(), body("password").isLength({ min: 8 }), validate, auth.signup));
router.get("/auth/me", protect, asyncHandler(auth.me));
router.post("/auth/logout", protect, asyncHandler(auth.logout));
router.post("/auth/forgot-password", ...handlers(body("email").isEmail(), validate, auth.forgotPassword));
router.post("/auth/reset-password", ...handlers(body("token").notEmpty(), body("password").isLength({ min: 8 }), validate, auth.resetPassword));

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: List users (Admin)
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: User list } }
 *   post:
 *     summary: Create user (Admin)
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: User created } }
 */
router.route("/users").get(...handlers(...a("ADMIN"), master.listUsers)).post(...handlers(...a("ADMIN"), ...userCreateValidators, validate, master.createUser));
router.route("/users/:id").get(...handlers(...a("ADMIN"), master.getUser)).put(...handlers(...a("ADMIN"), ...userUpdateValidators, validate, master.updateUser)).delete(...handlers(...a("ADMIN"), master.deleteUser));
router.route("/vendor-categories").get(protect, asyncHandler(master.listCategories)).post(...handlers(...a("ADMIN"), ...categoryValidators, validate, master.createCategory));
router.route("/vendor-categories/:id").get(protect, asyncHandler(master.getCategory)).put(...handlers(...a("ADMIN"), ...categoryValidators, validate, master.updateCategory)).delete(...handlers(...a("ADMIN"), master.deleteCategory));
router.route("/vendors").get(...handlers(...a("ADMIN", "PROCUREMENT_OFFICER"), master.listVendors)).post(...handlers(...a("ADMIN"), ...vendorCreateValidators, validate, master.createVendor));
router.route("/vendors/:id").get(...handlers(...a("ADMIN", "PROCUREMENT_OFFICER"), master.getVendor)).put(...handlers(...a("ADMIN"), ...vendorUpdateValidators, validate, master.updateVendor)).delete(...handlers(...a("ADMIN"), master.deleteVendor));

/**
 * @swagger
 * /api/rfqs:
 *   get:
 *     summary: List visible RFQs
 *     tags: [RFQs]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: RFQ list } }
 *   post:
 *     summary: Create an RFQ with items
 *     tags: [RFQs]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: RFQ created } }
 */
router.route("/rfqs").get(protect, asyncHandler(rfq.list)).post(...handlers(...a("PROCUREMENT_OFFICER"), body("title").notEmpty(), body("deadline").isISO8601(), body("items").isArray({ min: 1 }), validate, rfq.create));
router.route("/rfqs/:id").get(protect, asyncHandler(rfq.get)).put(...handlers(...a("PROCUREMENT_OFFICER"), rfq.update)).delete(...handlers(...a("PROCUREMENT_OFFICER"), rfq.remove));
router.post("/rfqs/:id/send", ...handlers(...a("PROCUREMENT_OFFICER"), rfq.send));
router.route("/rfqs/:id/vendors").get(...handlers(...a("ADMIN", "PROCUREMENT_OFFICER"), rfq.listVendors)).post(...handlers(...a("PROCUREMENT_OFFICER"), body("vendorIds").isArray({ min: 1 }), validate, rfq.assignVendors));
router.get("/vendor/rfqs", ...handlers(...a("VENDOR"), rfq.list));
router.get("/vendor/rfqs/:id", ...handlers(...a("VENDOR"), rfq.get));

/**
 * @swagger
 * /api/quotations:
 *   post:
 *     summary: Submit a vendor quotation
 *     tags: [Quotations]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Quotation submitted } }
 */
router.post("/quotations", ...handlers(...a("VENDOR"), body("rfqId").isUUID(), body("items").isArray({ min: 1 }), validate, flow.submitQuotation));
router.route("/quotations/:id").get(protect, asyncHandler(flow.getQuotation)).put(...handlers(...a("VENDOR"), flow.updateQuotation));
router.get("/rfqs/:rfqId/quotations", ...handlers(...a("ADMIN", "PROCUREMENT_OFFICER", "FINANCE_OFFICER"), flow.listQuotations));
router.get("/rfqs/:rfqId/quotations/compare", ...handlers(...a("PROCUREMENT_OFFICER", "FINANCE_OFFICER"), flow.compareQuotations));
router.post("/rfqs/:rfqId/quotations/:quotationId/select", ...handlers(...a("PROCUREMENT_OFFICER"), flow.selectQuotation));

router.get("/approvals", ...handlers(...a("ADMIN", "PROCUREMENT_OFFICER", "FINANCE_OFFICER"), flow.listApprovals));
router.get("/approvals/:id", ...handlers(...a("ADMIN", "PROCUREMENT_OFFICER", "FINANCE_OFFICER"), flow.getApproval));
router.put("/approvals/:id/approve", ...handlers(...a("FINANCE_OFFICER"), flow.reviewApproval("APPROVED")));
router.put("/approvals/:id/reject", ...handlers(...a("FINANCE_OFFICER"), flow.reviewApproval("REJECTED")));
router.put("/approvals/:id/revision-requested", ...handlers(...a("FINANCE_OFFICER"), flow.reviewApproval("REVISION_REQUESTED")));

/**
 * @swagger
 * /api/purchase-orders/generate:
 *   post:
 *     summary: Generate PO from an approved request
 *     tags: [Purchase Orders]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Purchase order generated }, 409: { description: Approval required } }
 */
router.get("/purchase-orders", protect, asyncHandler(flow.listPos));
router.post("/purchase-orders/generate", ...handlers(...a("PROCUREMENT_OFFICER"), body("approvalId").isUUID(), validate, flow.generatePo));
router.get("/purchase-orders/:id", protect, asyncHandler(flow.getPo));
router.put("/purchase-orders/:id/status", ...handlers(...a("ADMIN", "PROCUREMENT_OFFICER", "VENDOR"), flow.updatePoStatus));
router.get("/purchase-orders/:id/pdf", protect, asyncHandler(flow.poPdf));
router.post("/purchase-orders/:id/email", ...handlers(...a("ADMIN", "PROCUREMENT_OFFICER"), flow.emailPo));
router.get("/deliveries", protect, asyncHandler(async (req, res) => res.json(await require("../config/db").delivery.findMany({ where: req.user.role === "VENDOR" ? { vendorId: req.user.vendorId } : {}, include: { purchaseOrder: true, vendor: true } }))));
router.get("/purchase-orders/:poId/delivery", protect, asyncHandler(async (req, res) => res.json(await require("../config/db").delivery.findUnique({ where: { purchaseOrderId: req.params.poId } }))));
router.put("/purchase-orders/:poId/delivery/status", ...a("ADMIN", "PROCUREMENT_OFFICER", "VENDOR"), (req, _res, next) => { req.params.id = req.params.poId; next(); }, asyncHandler(flow.updatePoStatus));

/**
 * @swagger
 * /api/invoices/generate:
 *   post:
 *     summary: Generate invoice from purchase order
 *     tags: [Invoices]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Invoice generated } }
 */
router.get("/invoices", protect, asyncHandler(flow.listInvoices));
router.post("/invoices/generate", ...handlers(...a("PROCUREMENT_OFFICER"), body("purchaseOrderId").isUUID(), validate, flow.generateInvoice));
router.get("/invoices/:id", protect, asyncHandler(flow.getInvoice));
router.put("/invoices/:id/payment-status", ...handlers(...a("FINANCE_OFFICER"), flow.updatePayment));
router.get("/invoices/:id/pdf", protect, asyncHandler(flow.invoicePdf));
router.post("/invoices/:id/email", ...handlers(...a("ADMIN", "PROCUREMENT_OFFICER", "FINANCE_OFFICER"), flow.emailInvoice));

router.get("/activity-logs", ...handlers(...a("ADMIN", "PROCUREMENT_OFFICER"), report.activityLogs));
router.get("/activity-logs/:id", ...handlers(...a("ADMIN", "PROCUREMENT_OFFICER"), report.activityLog));
router.get("/notifications", protect, asyncHandler(report.notifications));
router.put("/notifications/read-all", protect, asyncHandler(report.readAllNotifications));
router.put("/notifications/:id/read", protect, asyncHandler(report.readNotification));
router.get("/reports/dashboard-summary", protect, asyncHandler(report.dashboard));
router.get("/reports/monthly-spend", ...handlers(...a("ADMIN", "FINANCE_OFFICER"), report.monthlySpend));
router.get("/reports/vendor-performance", ...handlers(...a("ADMIN", "FINANCE_OFFICER"), report.vendorPerformance));
router.get("/reports/rfq-summary", ...handlers(...a("ADMIN", "FINANCE_OFFICER"), report.rfqSummary));
router.get("/reports/pending-approvals", ...handlers(...a("ADMIN", "FINANCE_OFFICER"), report.pendingApprovals));
router.get("/reports/export/procurement-summary", ...handlers(...a("ADMIN", "FINANCE_OFFICER"), report.exportSummary));

module.exports = router;
