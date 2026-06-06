const prisma = require("../config/db");
const ApiError = require("../utils/ApiError");
const { logActivity } = require("../services/activityLog.service");

const pageArgs = (req) => ({
  skip: Math.max(0, Number(req.query.page || 1) - 1) * Number(req.query.limit || 50),
  take: Math.min(100, Number(req.query.limit || 50)),
});

exports.listProducts = async (req, res) => {
  const where = {
    ...(req.query.status && { status: req.query.status }),
    ...(req.query.categoryId && { categoryId: req.query.categoryId }),
    ...(req.query.search && {
      OR: [
        { name: { contains: req.query.search, mode: "insensitive" } },
        { description: { contains: req.query.search, mode: "insensitive" } },
      ],
    }),
    ...(!req.query.status && { status: "ACTIVE" }),
  };
  res.json(
    await prisma.product.findMany({
      where,
      ...pageArgs(req),
      orderBy: { name: "asc" },
      include: { category: true },
    })
  );
};

exports.createProduct = async (req, res) => {
  const { name, description, categoryId, unit, defaultGstPct } = req.body;
  if (!name?.trim()) throw new ApiError(422, "Product name is required");
  if (!categoryId) throw new ApiError(422, "Product category is required");
  await prisma.vendorCategory.findUniqueOrThrow({ where: { id: categoryId } });
  if (defaultGstPct !== undefined && (defaultGstPct < 0 || defaultGstPct > 100))
    throw new ApiError(422, "GST percentage must be between 0 and 100");

  const product = await prisma.product.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      categoryId,
      unit: unit?.trim() || "pieces",
      defaultGstPct: defaultGstPct ?? 18,
    },
    include: { category: true },
  });
  await logActivity({
    userId: req.user.id,
    action: "PRODUCT_CREATED",
    entityType: "PRODUCT",
    entityId: product.id,
    description: `${req.user.name} created product ${product.name}`,
  });
  res.status(201).json(product);
};

exports.getProduct = async (req, res) => {
  res.json(
    await prisma.product.findUniqueOrThrow({
      where: { id: req.params.id },
      include: { category: true },
    })
  );
};

exports.updateProduct = async (req, res) => {
  const { name, description, categoryId, unit, defaultGstPct, status } = req.body;
  if (categoryId) await prisma.vendorCategory.findUniqueOrThrow({ where: { id: categoryId } });
  if (defaultGstPct !== undefined && (defaultGstPct < 0 || defaultGstPct > 100))
    throw new ApiError(422, "GST percentage must be between 0 and 100");

  const data = {
    ...(name !== undefined && { name: name.trim() }),
    ...(description !== undefined && { description: description?.trim() || null }),
    ...(categoryId !== undefined && { categoryId }),
    ...(unit !== undefined && { unit: unit.trim() }),
    ...(defaultGstPct !== undefined && { defaultGstPct }),
    ...(status !== undefined && { status }),
  };
  const product = await prisma.product.update({
    where: { id: req.params.id },
    data,
    include: { category: true },
  });
  await logActivity({
    userId: req.user.id,
    action: "PRODUCT_UPDATED",
    entityType: "PRODUCT",
    entityId: product.id,
    description: `${req.user.name} updated product ${product.name}`,
  });
  res.json(product);
};

exports.deleteProduct = async (req, res) => {
  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: { status: "INACTIVE" },
  });
  await logActivity({
    userId: req.user.id,
    action: "PRODUCT_DELETED",
    entityType: "PRODUCT",
    entityId: product.id,
    description: `${req.user.name} deactivated product ${product.name}`,
  });
  res.json(product);
};
