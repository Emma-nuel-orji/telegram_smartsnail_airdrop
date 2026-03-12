import { PrismaClient } from '@prisma/client'

// Correctly instantiate the Prisma Client
const prisma = new PrismaClient();

async function main() {
  console.log('--- Start Seeding ---');

  // 1. Create or Update Collections
  const snailCollection = await prisma.collection.upsert({
    where: { name: "SmartSnail" },
    update: { imageUrl: "/images/smartsnaillogo.jpg" },
    create: {
      name: "SmartSnail",
      bannerColor: "red",
      floorPriceShells: BigInt(200000),
      imageUrl: "/images/smartsnaillogo.jpg"
    }
  });

  const manchieCollection = await prisma.collection.upsert({
    where: { name: "Manchies" },
    update: { imageUrl: "/images/manchies.jpg" },
    create: {
      name: "Manchies",
      bannerColor: "blue",
      floorPriceShells: BigInt(250000),
      imageUrl: "/images/manchies.jpg"
    }
  });

 
  console.log('--- Seeding Finished ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // Correctly close the connection
    await prisma.$disconnect();
  });