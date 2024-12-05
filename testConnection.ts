import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testConnection() {
  try {
    const users = await prisma.user.findMany(); // Ensure the `user` table exists
    console.log("Connection successful! Retrieved users:", users);
  } catch (error) {
    console.error("Error connecting to the database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
