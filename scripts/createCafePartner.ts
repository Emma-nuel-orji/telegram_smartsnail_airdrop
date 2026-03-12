import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const cafePartner = await prisma.partner.create({
    data: {
       name: "Sage Cafe",
      type: "GYM",
      
    },
  });

  console.log("Gym partner created successfully!");
  console.log("Partner ID:",  cafePartner.id);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(() => prisma.$disconnect());
