import { PrismaClient } from "@prisma/client";

const prismaTelegram = new PrismaClient({
  datasources: { db: { url: "mongodb://localhost:27017/telegram" } },
});

const prismaProject0 = new PrismaClient({
  datasources: { db: { url: "mongodb://localhost:27017/project_0" } },
});

async function migrate() {
  const users = await prismaTelegram.user.findMany();
  for (const user of users) {
    await prismaProject0.user.create({ data: user });
  }
  console.log("Data migrated!");
}

migrate()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prismaTelegram.$disconnect();
    await prismaProject0.$disconnect();
  });
