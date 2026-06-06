const prisma = require("../config/db");

exports.notify = (data, db = prisma) => db.notification.create({ data });

exports.notifyRole = async (role, payload, db = prisma) => {
  const users = await db.user.findMany({ where: { role, status: "ACTIVE" }, select: { id: true } });
  if (!users.length) return;
  return db.notification.createMany({ data: users.map(({ id }) => ({ userId: id, ...payload })) });
};

