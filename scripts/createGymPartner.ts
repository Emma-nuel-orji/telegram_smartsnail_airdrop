import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const gymPartner = await prisma.partner.create({
    data: {
      name: "Lilburn Gym",
      type: "GYM",
      
    },
  });

  console.log("Gym partner created successfully!");
  console.log("Partner ID:", gymPartner.id);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(() => prisma.$disconnect());
