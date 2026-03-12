import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.update({
    where: {
      telegramId: BigInt("7281452977"),
    },
    data: {
      points: {
        increment: 1_000_000,
      },
    },
  });

  console.log("✅ User funded:", user);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
