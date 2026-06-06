const prisma = require("../config/db");

exports.logActivity = (data, db = prisma) => db.activityLog.create({
  data: {
    userId: data.userId,
    action: data.action,
    entityType: data.entityType,
    entityId: data.entityId,
    description: data.description,
    metadata: data.metadata,
  },
});

