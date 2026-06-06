require("dotenv").config();
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@vendorbridge.com";
const adminPassword = process.env.SEED_ADMIN_PASSWORD || "password123";

async function main() {
  for (const role of ["ADMIN", "PROCUREMENT_OFFICER", "FINANCE_OFFICER", "VENDOR"]) {
    await prisma.roleDefinition.upsert({
      where: { name: role },
      update: {},
      create: { name: role, description: role.replaceAll("_", " ").toLowerCase() },
    });
  }

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Admin User",
      email: adminEmail,
      role: "ADMIN",
      passwordHash: await bcrypt.hash(adminPassword, 12),
    },
  });

  console.log(`VendorBridge seed complete. Admin account ensured: ${adminEmail}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(() => prisma.$disconnect());
