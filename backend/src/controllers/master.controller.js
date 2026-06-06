const bcrypt = require("bcryptjs");
const prisma = require("../config/db");
const ApiError = require("../utils/ApiError");
const { logActivity } = require("../services/activityLog.service");

const pageArgs = (req) => ({ skip: Math.max(0, Number(req.query.page || 1) - 1) * Number(req.query.limit || 25), take: Math.min(100, Number(req.query.limit || 25)) });
const userSelect = { id: true, name: true, email: true, phone: true, role: true, status: true, createdAt: true, updatedAt: true };

exports.listUsers = async (req, res) => res.json(await prisma.user.findMany({ ...pageArgs(req), orderBy: { createdAt: "desc" }, select: userSelect }));
exports.createUser = async (req, res) => {
  const { name, email, password, role, phone, status } = req.body;
  const user = await prisma.user.create({ data: { name, email: email.toLowerCase(), phone, role, status, passwordHash: await bcrypt.hash(password, 12) } });
  await logActivity({ userId: req.user.id, action: "USER_CREATED", entityType: "USER", entityId: user.id, description: `${req.user.name} created ${user.name}` });
  const { passwordHash, ...safe } = user;
  res.status(201).json(safe);
};
exports.getUser = async (req, res) => res.json(await prisma.user.findUniqueOrThrow({ where: { id: req.params.id }, select: userSelect }));
exports.updateUser = async (req, res) => {
  const { name, email, phone, role, status, password } = req.body;
  const data = {
    ...(name !== undefined && { name }),
    ...(email !== undefined && { email: email.toLowerCase() }),
    ...(phone !== undefined && { phone }),
    ...(role !== undefined && { role }),
    ...(status !== undefined && { status }),
    ...(password && { passwordHash: await bcrypt.hash(password, 12) }),
  };
  res.json(await prisma.user.update({ where: { id: req.params.id }, data, select: userSelect }));
};
exports.deleteUser = async (req, res) => res.json(await prisma.user.update({ where: { id: req.params.id }, data: { status: "INACTIVE" } }));

exports.listCategories = async (_req, res) => res.json(await prisma.vendorCategory.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { vendors: true } } } }));
exports.createCategory = async (req, res) => res.status(201).json(await prisma.vendorCategory.create({ data: req.body }));
exports.getCategory = async (req, res) => res.json(await prisma.vendorCategory.findUniqueOrThrow({ where: { id: req.params.id } }));
exports.updateCategory = async (req, res) => res.json(await prisma.vendorCategory.update({ where: { id: req.params.id }, data: req.body }));
exports.deleteCategory = async (req, res) => {
  const category = await prisma.vendorCategory.findUniqueOrThrow({ where: { id: req.params.id }, include: { _count: { select: { vendors: true } } } });
  if (category._count.vendors) throw new ApiError(409, "Category is in use");
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
    if (createLogin) user = await tx.user.create({ data: { name: contactPerson || companyName, email: email.toLowerCase(), phone, role: "VENDOR", passwordHash: await bcrypt.hash(password, 12) } });
    const created = await tx.vendor.create({ data: { companyName, contactPerson, email: email.toLowerCase(), phone, address, gstNumber, categoryId: categoryId || null, status, rating, userId: user?.id } });
    await logActivity({ userId: req.user.id, action: "VENDOR_CREATED", entityType: "VENDOR", entityId: created.id, description: `${req.user.name} created vendor ${companyName}` }, tx);
    return created;
  });
  res.status(201).json(vendor);
};
exports.getVendor = async (req, res) => res.json(await prisma.vendor.findUniqueOrThrow({ where: { id: req.params.id }, include: { category: true, quotations: true, purchaseOrders: true } }));
exports.updateVendor = async (req, res) => {
  const { companyName, contactPerson, email, phone, address, gstNumber, categoryId, status, rating } = req.body;
  const data = {
    ...(companyName !== undefined && { companyName }),
    ...(contactPerson !== undefined && { contactPerson }),
    ...(email !== undefined && { email: email.toLowerCase() }),
    ...(phone !== undefined && { phone }),
    ...(address !== undefined && { address }),
    ...(gstNumber !== undefined && { gstNumber }),
    ...(categoryId !== undefined && { categoryId: categoryId || null }),
    ...(status !== undefined && { status }),
    ...(rating !== undefined && { rating }),
  };
  const vendor = await prisma.vendor.update({ where: { id: req.params.id }, data });
  await logActivity({ userId: req.user.id, action: "VENDOR_UPDATED", entityType: "VENDOR", entityId: vendor.id, description: `${req.user.name} updated vendor ${vendor.companyName}` });
  res.json(vendor);
};
exports.deleteVendor = async (req, res) => res.json(await prisma.vendor.update({ where: { id: req.params.id }, data: { status: "INACTIVE" } }));
