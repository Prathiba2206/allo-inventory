import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  await prisma.reservation.deleteMany({});
  await prisma.inventory.deleteMany({});
  await prisma.warehouse.deleteMany({});
  await prisma.product.deleteMany({});

  const productA = await prisma.product.create({
    data: {
      name: "Pro Gaming Laptop X",
      sku: "GAM-LAP-001",
      price: 1499.99,
      description: "High-performance gaming laptop with RTX 4080 and 32GB RAM.",
    },
  });

  const productB = await prisma.product.create({
    data: {
      name: 'Ultra-Wide 34" Monitor',
      sku: "MON-UW-002",
      price: 499.99,
      description: "144Hz curved ultra-wide gaming and productivity monitor.",
    },
  });

  const productC = await prisma.product.create({
    data: {
      name: "Ergonomic Mechanical Keyboard",
      sku: "KEY-MECH-003",
      price: 129.99,
      description: "Split mechanical keyboard with hot-swappable switches.",
    },
  });

  const warehouseEast = await prisma.warehouse.create({
    data: {
      name: "East Coast Distribution Center",
      location: "Newark, NJ",
    },
  });

  const warehouseWest = await prisma.warehouse.create({
    data: {
      name: "West Coast Logistics Hub",
      location: "Oakland, CA",
    },
  });

  await prisma.inventory.create({
    data: { productId: productA.id, warehouseId: warehouseEast.id, totalUnits: 50, reservedUnits: 0 },
  });
  await prisma.inventory.create({
    data: { productId: productA.id, warehouseId: warehouseWest.id, totalUnits: 30, reservedUnits: 0 },
  });

  await prisma.inventory.create({
    data: { productId: productB.id, warehouseId: warehouseEast.id, totalUnits: 5, reservedUnits: 0 },
  });
  await prisma.inventory.create({
    data: { productId: productB.id, warehouseId: warehouseWest.id, totalUnits: 15, reservedUnits: 0 },
  });

  await prisma.inventory.create({
    data: { productId: productC.id, warehouseId: warehouseEast.id, totalUnits: 1, reservedUnits: 0 },
  });
  await prisma.inventory.create({
    data: { productId: productC.id, warehouseId: warehouseWest.id, totalUnits: 80, reservedUnits: 0 },
  });

  console.log("Database seeded successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
