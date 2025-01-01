import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Safely converts a string Telegram ID to BigInt, ensuring no undefined errors.
 * @param telegramId The Telegram ID as a string.
 * @returns The Telegram ID as a BigInt or null if the input is invalid.
 */
function getTelegramIdBigInt(telegramId: string | undefined): bigint | null {
  if (!telegramId) {
    console.error("Telegram ID is undefined or invalid.");
    return null;
  }
  return BigInt(telegramId);
}

/**
 * Updates the points of a user identified by their telegramId.
 * @param telegramId The Telegram ID of the user as a string.
 * @param amount The amount to increment the user's points by.
 * @returns The updated points or null if the user is not found or an error occurs.
 */
export async function updatePointsForTelegramId(telegramId: string, amount: number = 0) {
  const telegramIdBigInt = getTelegramIdBigInt(telegramId);
  if (!telegramIdBigInt) return null;

  try {
    const user = await prisma.user.update({
      where: { telegramId: telegramIdBigInt },
      data: {
        points: {
          increment: amount,
        },
      },
    });
    return user.points;
  } catch (error) {
    console.error("Error updating points:", error);
    return null;
  }
}

/**
 * Marks the welcome bonus as claimed for a user identified by their telegramId.
 * @param telegramId The Telegram ID of the user as a string.
 * @returns True if successful, false otherwise.
 */
export async function markWelcomeBonusClaimed(telegramId: string) {
  const telegramIdBigInt = getTelegramIdBigInt(telegramId);
  if (!telegramIdBigInt) return false;

  try {
    await prisma.user.update({
      where: { telegramId: telegramIdBigInt },
      data: {
        hasClaimedWelcome: true,
      },
    });
    return true;
  } catch (error) {
    console.error("Error marking welcome bonus claimed:", error);
    return false;
  }
}
