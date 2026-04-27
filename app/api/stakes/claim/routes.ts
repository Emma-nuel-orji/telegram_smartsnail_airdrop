import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateTelegramUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    /* =========================
       1. AUTH (STANDARDIZED)
    ========================= */
    const auth = await authenticateTelegramUser(req as any);

    if (!auth.isAuthenticated || !auth.telegramId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const telegramId = auth.telegramId;

    /* =========================
       2. INPUT
    ========================= */
    const { fightId } = await req.json();

    if (!fightId) {
      return NextResponse.json({ error: "Missing fightId" }, { status: 400 });
    }

    /* =========================
       3. TRANSACTION
    ========================= */
    const result = await prisma.$transaction(async (tx) => {
      // 1. Find user
      const user = await tx.user.findUnique({
        where: { telegramId },
      });

      if (!user) throw new Error("User not found");

      // 2. Find winning stake
      const stake = await tx.stake.findFirst({
        where: {
          userId: user.id,
          fightId,
          outcome: "WIN",
          isClaimed: false,
        },
        include: {
          fight: {
            include: {
              fighter1: true,
              fighter2: true,
            },
          },
        },
      });

      if (!stake) throw new Error("No unclaimed winnings found");

      const winnings = BigInt(stake.pointsEarned || 0);

      // 3. Credit user
      await tx.user.update({
        where: { id: user.id },
        data: {
          points: { increment: winnings },
        },
      });

      // 4. Mark claimed
      await tx.stake.update({
        where: { id: stake.id },
        data: {
          isClaimed: true,
        },
      });

      // 5. Determine winner fighter
      const winnerFighter =
        stake.fight.winnerId === stake.fight.fighter1Id
          ? stake.fight.fighter1
          : stake.fight.fighter2;

      // 6. FIXED: safe collection win count
      const collectionWins = await tx.fight.count({
        where: {
          winnerId: {
            not: null,
          },
          OR: [
            { fighter1Id: winnerFighter.id },
            { fighter2Id: winnerFighter.id },
          ],
        },
      });

      return {
        winnings: winnings.toString(),
        fighterStreak: winnerFighter.currentStreak,
        isAirdropActive: collectionWins % 3 === 0,
        collectionWins,
      };
    });

    /* =========================
       4. RESPONSE
    ========================= */
    return NextResponse.json({
      message: "Rewards collected!",
      winnings: result.winnings,
      isAirdropActive: result.isAirdropActive,
      fighterStreak: result.fighterStreak,
    });

  } catch (error: any) {
    console.error("Claim Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed" },
      { status: 400 }
    );
  }
}