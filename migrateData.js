import { PrismaClient } from "@prisma/client";

// Prisma clients for both databases
const prismaTelegram = new PrismaClient({
  datasources: { db: { url: "mongodb+srv://alexandersagenonso:5t4yQ4tPgAGclM3R@test.i4uui.mongodb.net/telegram" } },
});


const prismaProject0 = new PrismaClient({
  datasources: { db: { url: "mongodb+srv://alexandersagenonso:0FZbTiOurIsW72LD@smartsnaildb.xiueo.mongodb.net/project_0" } },
});

async function migrateUsers() {
  try {
    console.log("Fetching users from Telegram database...");
    const users = await prismaTelegram.user.findMany();

    console.log(`Found ${users.length} users. Migrating...`);
    for (const user of users) {
      try {
        // Transform data to fit the `project_0` schema
        const transformedUser = {
          telegramId: user.telegramId.toString(), // Ensure it's stored as a string
          username: user.username,
          firstName: user.firstName || null,
          lastName: user.lastName ? user.lastName : null, // Empty string to null
          points: user.points || 0,
          tappingRate: 1, // Default value
          createdAt: new Date(user.createdAt), // Convert to Date
          updatedAt: new Date(user.updatedAt), // Convert to Date
          email: null, // Not present in source
          nft: false, // Default value
        };

        // Insert into the target database
        await prismaProject0.user.create({ data: transformedUser });
        console.log(`Migrated user: ${user.telegramId}`);
      } catch (error) {
        console.error(`Failed to migrate user: ${user.telegramId}`, error);
      }
    }
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Error during migration:", error);
  } finally {
    await prismaTelegram.$disconnect();
    await prismaProject0.$disconnect();
  }
}

// Run the migration
migrateUsers();
