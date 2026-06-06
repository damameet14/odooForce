const prisma = require("../config/db");

const configs = {
  RFQ: ["rfq", "rfqNumber"],
  QUO: ["quotation", "quotationNumber"],
  PO: ["purchaseOrder", "poNumber"],
  INV: ["invoice", "invoiceNumber"],
};

exports.nextNumber = async (prefix, db = prisma) => {
  const [model, field] = configs[prefix];
  const year = new Date().getFullYear();
  const latest = await db[model].findFirst({
    where: { [field]: { startsWith: `${prefix}-${year}-` } },
    orderBy: { [field]: "desc" },
    select: { [field]: true },
  });
  const sequence = latest ? Number(latest[field].split("-").pop()) + 1 : 1;
  return `${prefix}-${year}-${String(sequence).padStart(4, "0")}`;
};

