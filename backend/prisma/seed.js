require("dotenv").config();
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@odooforce.com";
const adminPassword = process.env.SEED_ADMIN_PASSWORD || "password123";

// ─── Indian Grocery Store Categories & Products ─────────────────────────────

const categories = [
  {
    name: "Staples & Grains",
    description: "Essential cereals, pulses, and flour products",
    defaultGstPercent: 5,
    products: [
      { name: "Basmati Rice (1 kg)", description: "Premium aged basmati rice, long grain", unit: "kg", defaultGstPct: 5 },
      { name: "Toor Dal (1 kg)", description: "Split pigeon pea lentils, unpolished", unit: "kg", defaultGstPct: 5 },
      { name: "Aashirvaad Whole Wheat Atta (5 kg)", description: "100% whole wheat flour for chapati", unit: "packs", defaultGstPct: 5 },
      { name: "Moong Dal (1 kg)", description: "Split green gram, washed", unit: "kg", defaultGstPct: 5 },
      { name: "Sooji / Rava (500 g)", description: "Fine semolina for upma and halwa", unit: "packs", defaultGstPct: 5 },
      { name: "Chana Dal (1 kg)", description: "Split chickpea lentils", unit: "kg", defaultGstPct: 5 },
      { name: "Poha / Flattened Rice (500 g)", description: "Medium thickness flattened rice", unit: "packs", defaultGstPct: 5 },
      { name: "Maida / Refined Flour (1 kg)", description: "All-purpose flour for baking and sweets", unit: "kg", defaultGstPct: 5 },
    ],
  },
  {
    name: "Dairy Products",
    description: "Milk, curd, paneer, ghee, and butter",
    defaultGstPercent: 5,
    products: [
      { name: "Amul Toned Milk (500 ml)", description: "Pasteurized toned milk, 3% fat", unit: "packets", defaultGstPct: 5 },
      { name: "Amul Butter (100 g)", description: "Pasteurized salted butter", unit: "packs", defaultGstPct: 12 },
      { name: "Paneer / Cottage Cheese (200 g)", description: "Fresh soft paneer block", unit: "packs", defaultGstPct: 5 },
      { name: "Amul Ghee (1 litre)", description: "Pure cow ghee, rich aroma", unit: "litres", defaultGstPct: 12 },
      { name: "Dahi / Curd (400 g)", description: "Fresh set curd, probiotic", unit: "cups", defaultGstPct: 5 },
      { name: "Amul Cheese Slices (10 pack)", description: "Processed cheese slices", unit: "packs", defaultGstPct: 12 },
    ],
  },
  {
    name: "Spices & Condiments",
    description: "Ground spices, whole spices, and masala blends",
    defaultGstPercent: 5,
    products: [
      { name: "Haldi / Turmeric Powder (100 g)", description: "Pure ground turmeric, high curcumin", unit: "packs", defaultGstPct: 5 },
      { name: "Lal Mirch / Red Chili Powder (100 g)", description: "Kashmiri red chili, mild heat", unit: "packs", defaultGstPct: 5 },
      { name: "Jeera / Cumin Seeds (100 g)", description: "Whole cumin seeds, aromatic", unit: "packs", defaultGstPct: 5 },
      { name: "Garam Masala (50 g)", description: "Blended aromatic spice mix", unit: "packs", defaultGstPct: 5 },
      { name: "Dhaniya / Coriander Powder (100 g)", description: "Freshly ground coriander", unit: "packs", defaultGstPct: 5 },
      { name: "Mustard Seeds / Rai (100 g)", description: "Brown mustard seeds for tempering", unit: "packs", defaultGstPct: 5 },
      { name: "Black Pepper / Kali Mirch (50 g)", description: "Whole Malabar black pepper", unit: "packs", defaultGstPct: 5 },
      { name: "Saunf / Fennel Seeds (100 g)", description: "Whole fennel seeds", unit: "packs", defaultGstPct: 5 },
    ],
  },
  {
    name: "Cooking Oil & Fats",
    description: "Edible oils and cooking fats",
    defaultGstPercent: 5,
    products: [
      { name: "Fortune Sunflower Oil (1 litre)", description: "Refined sunflower cooking oil", unit: "litres", defaultGstPct: 5 },
      { name: "Fortune Kachi Ghani Mustard Oil (1 litre)", description: "Cold-pressed mustard oil", unit: "litres", defaultGstPct: 5 },
      { name: "Saffola Gold Oil (1 litre)", description: "Blended edible oil, heart-healthy", unit: "litres", defaultGstPct: 5 },
      { name: "Coconut Oil (500 ml)", description: "Virgin cold-pressed coconut oil", unit: "bottles", defaultGstPct: 5 },
      { name: "Groundnut Oil (1 litre)", description: "Cold-pressed groundnut oil", unit: "litres", defaultGstPct: 5 },
    ],
  },
  {
    name: "Beverages",
    description: "Tea, coffee, juices, and ready-to-drink beverages",
    defaultGstPercent: 12,
    products: [
      { name: "Tata Tea Gold (500 g)", description: "Premium Assam tea leaves blend", unit: "packs", defaultGstPct: 5 },
      { name: "Nescafé Classic Coffee (50 g)", description: "Instant coffee powder", unit: "jars", defaultGstPct: 12 },
      { name: "Bru Instant Coffee (100 g)", description: "Coffee-chicory blend, South Indian style", unit: "packs", defaultGstPct: 12 },
      { name: "Real Fruit Juice — Mango (1 litre)", description: "Mango fruit juice, no preservatives", unit: "cartons", defaultGstPct: 12 },
      { name: "Paper Boat Aam Panna (200 ml x 6)", description: "Traditional raw mango drink", unit: "packs", defaultGstPct: 12 },
    ],
  },
  {
    name: "Packaged & Snack Foods",
    description: "Biscuits, chips, namkeen, noodles, and ready-to-eat",
    defaultGstPercent: 12,
    products: [
      { name: "Parle-G Glucose Biscuits (800 g)", description: "Classic glucose biscuits, family pack", unit: "packs", defaultGstPct: 12 },
      { name: "Maggi 2-Minute Noodles (Pack of 12)", description: "Instant masala noodles", unit: "packs", defaultGstPct: 12 },
      { name: "Haldiram's Aloo Bhujia (400 g)", description: "Crispy potato noodle snack", unit: "packs", defaultGstPct: 12 },
      { name: "Lay's Classic Salted Chips (90 g)", description: "Crispy potato chips", unit: "packs", defaultGstPct: 12 },
      { name: "Britannia Good Day Cashew (600 g)", description: "Cashew-enriched cookie biscuits", unit: "packs", defaultGstPct: 12 },
      { name: "MTR Ready-to-Eat Dal Makhani (300 g)", description: "Heat and serve dal makhani", unit: "packs", defaultGstPct: 12 },
    ],
  },
  {
    name: "Personal Care & Hygiene",
    description: "Soaps, shampoos, toothpaste, and personal grooming",
    defaultGstPercent: 18,
    products: [
      { name: "Dettol Original Soap (125 g x 4)", description: "Antibacterial bath soap", unit: "packs", defaultGstPct: 18 },
      { name: "Dove Shampoo (340 ml)", description: "Daily moisture shampoo", unit: "bottles", defaultGstPct: 18 },
      { name: "Colgate MaxFresh Toothpaste (150 g)", description: "Cooling crystal toothpaste", unit: "tubes", defaultGstPct: 18 },
      { name: "Himalaya Face Wash (100 ml)", description: "Neem purifying face wash", unit: "tubes", defaultGstPct: 18 },
      { name: "Nivea Body Lotion (400 ml)", description: "Nourishing body lotion, winter care", unit: "bottles", defaultGstPct: 18 },
    ],
  },
  {
    name: "Household & Cleaning",
    description: "Detergents, floor cleaners, and kitchen essentials",
    defaultGstPercent: 18,
    products: [
      { name: "Surf Excel Quick Wash (1 kg)", description: "Detergent powder for machine wash", unit: "packs", defaultGstPct: 18 },
      { name: "Lizol Floor Cleaner — Citrus (500 ml)", description: "Disinfectant surface cleaner", unit: "bottles", defaultGstPct: 18 },
      { name: "Vim Dishwash Bar (300 g)", description: "Lemon fresh dishwash bar", unit: "bars", defaultGstPct: 18 },
      { name: "Harpic Toilet Cleaner (500 ml)", description: "Power plus disinfectant", unit: "bottles", defaultGstPct: 18 },
      { name: "Scotch-Brite Scrub Pad (3 pack)", description: "Heavy-duty kitchen scrubber", unit: "packs", defaultGstPct: 18 },
    ],
  },
  {
    name: "Fresh Produce",
    description: "Seasonal vegetables and fruits (perishable)",
    defaultGstPercent: 0,
    products: [
      { name: "Onion / Pyaaz (1 kg)", description: "Medium-sized red onions", unit: "kg", defaultGstPct: 0 },
      { name: "Tomato / Tamatar (1 kg)", description: "Firm ripe tomatoes", unit: "kg", defaultGstPct: 0 },
      { name: "Potato / Aloo (1 kg)", description: "Fresh round potatoes", unit: "kg", defaultGstPct: 0 },
      { name: "Green Chili / Hari Mirch (250 g)", description: "Fresh green finger chilies", unit: "bundles", defaultGstPct: 0 },
      { name: "Banana / Kela (1 dozen)", description: "Ripe yellow Cavendish bananas", unit: "dozens", defaultGstPct: 0 },
      { name: "Apple / Seb (1 kg)", description: "Shimla red delicious apples", unit: "kg", defaultGstPct: 0 },
    ],
  },
  {
    name: "Frozen & Chilled Foods",
    description: "Frozen vegetables, ice cream, and chilled items",
    defaultGstPercent: 12,
    products: [
      { name: "Safal Frozen Green Peas (500 g)", description: "IQF green peas, ready to cook", unit: "packs", defaultGstPct: 12 },
      { name: "Amul Vanilla Ice Cream (750 ml)", description: "Real milk vanilla ice cream tub", unit: "tubs", defaultGstPct: 12 },
      { name: "McCain French Fries (450 g)", description: "Pre-cut frozen french fries", unit: "packs", defaultGstPct: 12 },
      { name: "ITC Aashirvaad Frozen Parathas (5 pack)", description: "Ready-to-cook whole wheat parathas", unit: "packs", defaultGstPct: 12 },
    ],
  },
];

// ─── Seed Execution ─────────────────────────────────────────────────────────

async function main() {
  console.log("🧹 Cleaning existing data...\n");

  // Delete in reverse-dependency order
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.quotationItem.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.rfqItemVendor.deleteMany();
  await prisma.rfqVendorInvite.deleteMany();
  await prisma.rfqItem.deleteMany();
  await prisma.rfq.deleteMany();
  await prisma.product.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.emailLog.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.vendorCategory.deleteMany();
  // Keep users and roles — only upsert admin

  console.log("✅ Data cleaned\n");

  // ── Roles ───────────────────────────────────────────────────────────────

  for (const role of ["ADMIN", "PROCUREMENT_OFFICER", "FINANCE_OFFICER", "VENDOR"]) {
    await prisma.roleDefinition.upsert({
      where: { name: role },
      update: {},
      create: { name: role, description: role.replaceAll("_", " ").toLowerCase() },
    });
  }
  console.log("✅ Roles ensured\n");

  // ── Admin Account ───────────────────────────────────────────────────────

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
  console.log(`✅ Admin account ensured: ${adminEmail}\n`);

  // ── Categories & Products ─────────────────────────────────────────────

  for (const cat of categories) {
    const category = await prisma.vendorCategory.create({
      data: {
        name: cat.name,
        description: cat.description,
        defaultGstPercent: cat.defaultGstPercent,
      },
    });

    for (const prod of cat.products) {
      await prisma.product.create({
        data: {
          name: prod.name,
          description: prod.description,
          unit: prod.unit,
          defaultGstPct: prod.defaultGstPct,
          categoryId: category.id,
        },
      });
    }

    console.log(`📦 ${cat.name}: ${cat.products.length} products (GST ${cat.defaultGstPercent}%)`);
  }

  const totalProducts = categories.reduce((sum, cat) => sum + cat.products.length, 0);
  console.log(`\n✅ Seeded ${categories.length} categories and ${totalProducts} products`);
  console.log(`\n🎉 OdooForce seed complete!`);
  console.log(`   Admin: ${adminEmail} / ${adminPassword.slice(0, 4)}****`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(() => prisma.$disconnect());
