import { PrismaClient } from "@prisma/client";

const prismaTelegram = new PrismaClient({
  datasources: { db: { url: "mongodb+srv://alexandersagenonso:5t4yQ4tPgAGclM3R@test.i4uui.mongodb.net/telegram" } },
});

const prismaProject0 = new PrismaClient({
  datasources: { db: { url: "mongodb+srv://alexandersagenonso:0FZbTiOurIsW72LD@smartsnaildb.xiueo.mongodb.net/project_0" } },
});

const migrateUsers = async () => {
    try {
        await prismaTelegram.$connect();
        await prismaProject0.$connect();
        console.log("Successfully connected to both databases");

        const users = await prismaTelegram.user.findMany();
        console.log(`Found ${users.length} users to migrate`);

        for (const user of users) {
            console.log(`Migrating user with telegramId: ${user.telegramId}`);

            try {
                const existingUser = await prismaProject0.user.findUnique({
                    where: { telegramId: user.telegramId.toString() }
                });

                if (existingUser) {
                    console.log(`User ${user.telegramId} already exists, skipping`);
                    continue;
                }

                const transformedUser = {
                    telegramId: user.telegramId.toString(),
                    username: user.username || null,
                    firstName: user.firstName || null,
                    lastName: user.lastName || null,
                    points: user.points || 0,
                    tappingRate: 1,
                    createdAt: new Date(user.createdAt),
                    updatedAt: new Date(user.updatedAt),
                    email: null,
                    nft: false,
                };

                await prismaProject0.user.create({ data: transformedUser });
                console.log(`Successfully migrated user: ${user.telegramId}`);
            } catch (error) {
                console.error(`Failed to migrate user ${user.telegramId}:`, error);
            }
        }
    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        await prismaTelegram.$disconnect();
        await prismaProject0.$disconnect();
    }
}

migrateUsers();
