import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Updates the points of a user identified by their telegramId.
 * @param telegramId The Telegram ID of the user.
 * @returns The updated points or null if the user is not found.
 */
export async function updatePointsForTelegramId(telegramId: string, amount: number = 0) {
  try {
    const user = await prisma.user.update({
      where: { telegramId },
      data: {
        points: {
          increment: amount
        }
      },
    });
    return user.points;
  } catch (error) {
    console.error("Error updating points:", error);
    return null;
  }
}

export async function markWelcomeBonusClaimed(telegramId: string) {
  try {
    await prisma.user.update({
      where: { telegramId },
      data: {
        hasClaimedWelcome: true
      }
    });
    return true;
  } catch (error) {
    console.error("Error marking welcome bonus claimed:", error);
    return false;
  }
}