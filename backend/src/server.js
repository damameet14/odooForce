const app = require("./app");
const prisma = require("./config/db");

const port = process.env.PORT || 5000;
const server = app.listen(port, () => console.log(`OdooForce API running on http://localhost:${port}`));

const shutdown = async () => {
  await prisma.$disconnect();
  server.close(() => process.exit(0));
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

