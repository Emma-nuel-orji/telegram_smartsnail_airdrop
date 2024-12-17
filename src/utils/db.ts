import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Updates the points of a user identified by their telegramId.
 * @param telegramId The Telegram ID of the user.
 * @returns The updated points or null if the user is not found.
 */
export async function updatePointsForTelegramId(telegramId: string): Promise<number | null> {
  try {
    const user = await prisma.user.update({
      where: { telegramId },
      data: {
        points: {
          increment: 5000, // Increment user points by 10
        },
      },
      select: {
        points: true, // Return only the updated points
      },
    });

    return user.points; // Return the updated points
  } catch (error) {
    console.error("Error updating points:", error);
    return null; // Return null if there is an error (e.g., user not found)
  }
}
