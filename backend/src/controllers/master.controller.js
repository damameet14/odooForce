const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const prisma = require("../config/db");
const ApiError = require("../utils/ApiError");
const { logActivity } = require("../services/activityLog.service");
const { sendEmail, EmailDeliveryError } = require("../services/email.service");
const { notify } = require("../services/notification.service");
const templates = require("../utils/emailTemplates");

const generatePassword = () => crypto.randomBytes(6).toString("base64url").slice(0, 10);

const pageArgs = (req) => ({ skip: Math.max(0, Number(req.query.page || 1) - 1) * Number(req.query.limit || 25), take: Math.min(100, Number(req.query.limit || 25)) });
const userSelect = { id: true, name: true, email: true, phone: true, role: true, status: true, createdAt: true, updatedAt: true };

exports.listUsers = async (req, res) => res.json(await prisma.user.findMany({ where: { role: { not: "VENDOR" } }, ...pageArgs(req), orderBy: { createdAt: "desc" }, select: userSelect }));
exports.createUser = async (req, res) => {
  const { name, email, password, role, phone, status } = req.body;
  const user = await prisma.user.create({ data: { name, email: email.toLowerCase(), phone: phone || null, role, status: status || undefined, passwordHash: await bcrypt.hash(password, 12) } });
  await logActivity({ userId: req.user.id, action: "USER_CREATED", entityType: "USER", entityId: user.id, description: `${req.user.name} created ${user.name}` });
  sendEmail({ to: user.email, entityType: "USER", entityId: user.id, ...templates.welcomeWithCredentialsEmail(user, password, roles[role] || role) }).catch(() => {});
  const { passwordHash, ...safe } = user;
  res.status(201).json(safe);
};
exports.getUser = async (req, res) => res.json(await prisma.user.findUniqueOrThrow({ where: { id: req.params.id }, select: userSelect }));
exports.updateUser = async (req, res) => {
  const { name, email, phone, role, status, password } = req.body;
  const data = {
    ...(name !== undefined && { name }),
    ...(email !== undefined && { email: email.toLowerCase() }),
    ...(phone !== undefined && { phone: phone || null }),
    ...(role !== undefined && { role }),
    ...(status !== undefined && { status }),
    ...(password && { passwordHash: await bcrypt.hash(password, 12) }),
  };
  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({ where: { id: req.params.id }, data, select: userSelect });
    await logActivity({ userId: req.user.id, action: "USER_UPDATED", entityType: "USER", entityId: updated.id, description: `${req.user.name} updated ${updated.name}` }, tx);
    return updated;
  });
  res.json(user);
};
exports.deleteUser = async (req, res) => {
  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({ where: { id: req.params.id }, data: { status: "INACTIVE" }, select: userSelect });
    await logActivity({ userId: req.user.id, action: "USER_DEACTIVATED", entityType: "USER", entityId: updated.id, description: `${req.user.name} deactivated ${updated.name}` }, tx);
    return updated;
  });
  sendEmail({ to: user.email, entityType: "USER", entityId: user.id, ...templates.accountDeletedEmail(user) }).catch((error) => {
    const reason = error instanceof EmailDeliveryError ? error.message : "Email delivery failed";
    console.error("Account deletion email skipped", { userId: user.id, reason });
  });
  res.json(user);
};

exports.listCategories = async (_req, res) => res.json(await prisma.vendorCategory.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { vendors: true, products: true } } } }));
exports.createCategory = async (req, res) => {
  const { name, description, defaultGstPercent } = req.body;
  if (defaultGstPercent !== undefined && (Number(defaultGstPercent) < 0 || Number(defaultGstPercent) > 100))
    throw new ApiError(422, "GST percentage must be between 0 and 100");
  res.status(201).json(await prisma.vendorCategory.create({ data: { name, description, defaultGstPercent: defaultGstPercent ?? 18 } }));
};
exports.getCategory = async (req, res) => res.json(await prisma.vendorCategory.findUniqueOrThrow({ where: { id: req.params.id }, include: { products: true, _count: { select: { vendors: true, products: true } } } }));
exports.updateCategory = async (req, res) => {
  const { name, description, defaultGstPercent } = req.body;
  if (defaultGstPercent !== undefined && (Number(defaultGstPercent) < 0 || Number(defaultGstPercent) > 100))
    throw new ApiError(422, "GST percentage must be between 0 and 100");
  const data = {
    ...(name !== undefined && { name }),
    ...(description !== undefined && { description }),
    ...(defaultGstPercent !== undefined && { defaultGstPercent }),
  };
  res.json(await prisma.vendorCategory.update({ where: { id: req.params.id }, data }));
};
exports.deleteCategory = async (req, res) => {
  const category = await prisma.vendorCategory.findUniqueOrThrow({ where: { id: req.params.id }, include: { _count: { select: { vendors: true, products: true } } } });
  if (category._count.vendors || category._count.products) throw new ApiError(409, "Category is in use by vendors or products");
  await prisma.vendorCategory.delete({ where: { id: category.id } });
  res.status(204).end();
};

exports.listVendors = async (req, res) => {
  const where = {
    ...(req.query.status && { status: req.query.status }),
    ...(req.query.categoryId && { categoryId: req.query.categoryId }),
    ...(req.query.search && { OR: [{ companyName: { contains: req.query.search, mode: "insensitive" } }, { email: { contains: req.query.search, mode: "insensitive" } }] }),
  };
  res.json(await prisma.vendor.findMany({ where, ...pageArgs(req), orderBy: { createdAt: "desc" }, include: { category: true, user: { select: { id: true, status: true } } } }));
};
exports.createVendor = async (req, res) => {
  const { companyName, contactPerson, email, phone, address, gstNumber, categoryId, status = "ACTIVE", rating = 0, createLogin = true, password } = req.body;
  if (createLogin && (!password || password.length < 8)) throw new ApiError(422, "A vendor login password of at least 8 characters is required");
  const vendor = await prisma.$transaction(async (tx) => {
    let user;
    if (createLogin) user = await tx.user.create({ data: { name: contactPerson || companyName, email: email.toLowerCase(), phone: phone || null, role: "VENDOR", passwordHash: await bcrypt.hash(password, 12) } });
    const created = await tx.vendor.create({ data: { companyName, contactPerson: contactPerson || null, email: email.toLowerCase(), phone: phone || null, address: address || null, gstNumber: gstNumber || null, categoryId: categoryId || null, status, rating: rating || 0, userId: user?.id } });
    await logActivity({ userId: req.user.id, action: "VENDOR_CREATED", entityType: "VENDOR", entityId: created.id, description: `${req.user.name} created vendor ${companyName}` }, tx);
    return { vendor: created, user };
  });
  if (vendor.user) sendEmail({ to: vendor.user.email, entityType: "USER", entityId: vendor.user.id, ...templates.welcomeWithCredentialsEmail(vendor.user, password, "Vendor") }).catch(() => {});
  res.status(201).json(vendor.vendor);
};
exports.getVendor = async (req, res) => res.json(await prisma.vendor.findUniqueOrThrow({ where: { id: req.params.id }, include: { category: true, quotations: true, purchaseOrders: true } }));
exports.updateVendor = async (req, res) => {
  const { companyName, contactPerson, email, phone, address, gstNumber, categoryId, status, rating } = req.body;
  const data = {
    ...(companyName !== undefined && { companyName }),
    ...(contactPerson !== undefined && { contactPerson: contactPerson || null }),
    ...(email !== undefined && { email: email.toLowerCase() }),
    ...(phone !== undefined && { phone: phone || null }),
    ...(address !== undefined && { address: address || null }),
    ...(gstNumber !== undefined && { gstNumber: gstNumber || null }),
    ...(categoryId !== undefined && { categoryId: categoryId || null }),
    ...(status !== undefined && { status }),
    ...(rating !== undefined && { rating }),
  };
  const vendor = await prisma.vendor.update({ where: { id: req.params.id }, data });
  await logActivity({ userId: req.user.id, action: "VENDOR_UPDATED", entityType: "VENDOR", entityId: vendor.id, description: `${req.user.name} updated vendor ${vendor.companyName}` });
  res.json(vendor);
};
exports.deleteVendor = async (req, res) => res.json(await prisma.vendor.update({ where: { id: req.params.id }, data: { status: "INACTIVE" } }));

// ─── Password Reset Requests ────────────────────────────────────────────────

const roles = { ADMIN: "Administrator", PROCUREMENT_OFFICER: "Procurement Officer", FINANCE_OFFICER: "Finance Officer", VENDOR: "Vendor" };

exports.createResetRequest = async (req, res) => {
  const existing = await prisma.passwordResetRequest.findFirst({ where: { userId: req.user.id, status: "PENDING" } });
  if (existing) throw new ApiError(409, "You already have a pending password reset request");
  const request = await prisma.passwordResetRequest.create({ data: { userId: req.user.id, message: req.body.message || null } });
  // Notify all admins
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", status: "ACTIVE" } });
  for (const admin of admins) {
    await notify({ userId: admin.id, title: "Password Reset Request", message: `${req.user.name} (${req.user.email}) has requested a password reset.`, entityType: "USER", entityId: req.user.id });
  }
  await logActivity({ userId: req.user.id, action: "PASSWORD_RESET_REQUESTED", entityType: "USER", entityId: req.user.id, description: `${req.user.name} requested a password reset` });
  res.status(201).json(request);
};

exports.listResetRequests = async (req, res) => {
  const where = req.query.status ? { status: req.query.status } : {};
  res.json(await prisma.passwordResetRequest.findMany({ where, orderBy: { createdAt: "desc" }, include: { user: { select: userSelect } } }));
};

exports.resolveResetRequest = async (req, res) => {
  const request = await prisma.passwordResetRequest.findUniqueOrThrow({ where: { id: req.params.id }, include: { user: true } });
  if (request.status !== "PENDING") throw new ApiError(409, "This request has already been resolved");

  const action = req.body.action; // "approve" or "reject"
  if (action === "reject") {
    const updated = await prisma.passwordResetRequest.update({ where: { id: request.id }, data: { status: "REJECTED", resolvedAt: new Date() } });
    await notify({ userId: request.userId, title: "Password Reset Rejected", message: "Your password reset request was rejected by the administrator.", entityType: "USER", entityId: request.userId });
    return res.json(updated);
  }

  // Generate new password, hash it, update user, email them
  const newPassword = generatePassword();
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: request.userId }, data: { passwordHash: await bcrypt.hash(newPassword, 12) } });
    await tx.passwordResetRequest.update({ where: { id: request.id }, data: { status: "COMPLETED", resolvedAt: new Date() } });
    await logActivity({ userId: req.user.id, action: "PASSWORD_RESET_BY_ADMIN", entityType: "USER", entityId: request.userId, description: `${req.user.name} reset password for ${request.user.name}` }, tx);
  });

  sendEmail({ to: request.user.email, entityType: "USER", entityId: request.userId, ...templates.passwordResetByAdminEmail(request.user, newPassword) }).catch(() => {});
  await notify({ userId: request.userId, title: "Password Reset Complete", message: "Your password has been reset. Check your email for the new credentials.", entityType: "USER", entityId: request.userId });

  res.json({ message: "Password reset and emailed to user", userId: request.userId });
};
