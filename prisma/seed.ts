import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const gym1 = await prisma.partner.upsert({
    where: { id: "684d8d8c86d4f1a3ebf72669" },
    update: {
      country: "Nigeria",
      cityState: "Enugu"
    },
    create: {
      id: "684d8d8c86d4f1a3ebf72669",
      name: "Lilburn Gym",
      type: "GYM",
      country: "Nigeria",
      cityState: "Enugu"
    }
  });

  const gym2 = await prisma.partner.upsert({
    where: { id: "69cd1be69d551cabe5d1e3f2" },
    update: {
      country: "Nigeria",
      cityState: "Enugu"
    },
    create: {
      id: "69cd1be69d551cabe5d1e3f2",
      name: "SageCombat",
      type: "COMBAT",
      country: "Nigeria",
      cityState: "Enugu"
    }
  });

  console.log("✅ Seed successful:", { gym1: gym1.name, gym2: gym2.name });
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });