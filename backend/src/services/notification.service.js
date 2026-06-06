const prisma = require("../config/db");

exports.notify = ({ userId, title, message, type, isRead, ...rest }, db = prisma) => db.notification.create({ data: { userId, title, message, type: type || rest.entityType || null, isRead } });

exports.notifyRole = async (role, { title, message, type, isRead, entityType, ...rest }, db = prisma) => {
  const users = await db.user.findMany({ where: { role, status: "ACTIVE" }, select: { id: true } });
  if (!users.length) return;
  return db.notification.createMany({ data: users.map(({ id }) => ({ userId: id, title, message, type: type || entityType || null, isRead })) });
};

