import { PrismaClient } from "@prisma/client";

const prismaTelegram = new PrismaClient({
  datasources: { db: { url: "mongodb+srv://alexandersagenonso:5t4yQ4tPgAGclM3R@test.i4uui.mongodb.net/test" } },
});

const prismaProject0 = new PrismaClient({
  datasources: { db: { url: "mongodb+srv://alexandersagenonso:0FZbTiOurIsW72LD@smartsnaildb.xiueo.mongodb.net/smartsnail" } },
});

const migrateUsers = async () => {
  try {
    await prismaTelegram.$connect();
    await prismaProject0.$connect();
    console.log("Successfully connected to both databases");

    const rawUsers = await prismaTelegram.user.findMany();
    console.log(`Found ${rawUsers.length} users to migrate`);

    const failedUsers = [];

    for (const rawUser of rawUsers) {
      try {
        const telegramIdNumber = Number(rawUser.telegramId);

        // Check if user already exists
        const existingUser = await prismaProject0.user.findUnique({
          where: { telegramId: telegramIdNumber },
        });

        if (existingUser) {
          console.log(`User with telegramId ${telegramIdNumber} already exists, skipping`);
          continue;
        }

        // Check for duplicate email before creation
        if (rawUser.email) {
          const emailExists = await prismaProject0.user.findUnique({
            where: { email: rawUser.email },
          });

          if (emailExists) {
            console.warn(`Duplicate email detected for telegramId ${telegramIdNumber}. Skipping user.`);
            continue;
          }
        }

        const transformedUser = {
          telegramId: telegramIdNumber,
          username: rawUser.username || null,
          firstName: rawUser.firstName || null,
          lastName: rawUser.lastName || null,
          points: Number(rawUser.points || 0),
          tappingRate: 1,
          createdAt: rawUser.createdAt ? new Date(rawUser.createdAt) : new Date(),
          updatedAt: rawUser.updatedAt ? new Date(rawUser.updatedAt) : new Date(),
          email: rawUser.email || "", // Default to empty string
          nft: false,
        };

        await prismaProject0.user.create({ data: transformedUser });
        console.log(`Successfully migrated user with telegramId: ${telegramIdNumber}`);
      } catch (error) {
        console.error(`Failed to migrate user with telegramId: ${rawUser.telegramId}`);
        console.error('Error details:', error);
        failedUsers.push(rawUser);
      }
    }

    if (failedUsers.length > 0) {
      console.log("Retrying failed users...");
      for (const user of failedUsers) {
        try {
          const telegramIdNumber = Number(user.telegramId);

          const existingUser = await prismaProject0.user.findUnique({
            where: { telegramId: telegramIdNumber },
          });

          if (existingUser) {
            console.log(`User with telegramId ${telegramIdNumber} already exists, skipping`);
            continue;
          }

          if (user.email) {
            const emailExists = await prismaProject0.user.findUnique({
              where: { email: user.email },
            });

            if (emailExists) {
              console.warn(`Duplicate email detected for retry user with telegramId ${telegramIdNumber}. Skipping.`);
              continue;
            }
          }

          const transformedUser = {
            telegramId: telegramIdNumber,
            username: user.username || null,
            firstName: user.firstName || null,
            lastName: user.lastName || null,
            points: Number(user.points || 0),
            tappingRate: 1,
            createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
            updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date(),
            email: user.email || "", // Default to empty string
            nft: false,
          };

          await prismaProject0.user.create({ data: transformedUser });
          console.log(`Successfully retried user with telegramId: ${telegramIdNumber}`);
        } catch (retryError) {
          console.error(`Retry failed for user with telegramId: ${user.telegramId}`);
          console.error('Retry error details:', retryError);
        }
      }
    }
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await prismaTelegram.$disconnect();
    await prismaProject0.$disconnect();
  }
};

migrateUsers().catch(error => {
  console.error("Top-level error:", error);
  process.exit(1);
});
