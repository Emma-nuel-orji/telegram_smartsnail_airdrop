import { NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';

export async function POST(req: Request) {
  try {
    const { fightId, telegramId } = await req.json();

    // The 'result' variable will hold everything returned by the transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Find User
      const user = await tx.user.findUnique({
        where: { telegramId: BigInt(telegramId) }
      });
      if (!user) throw new Error("User not found");

      // 2. Find Winning Stake and include the Fight + Fighter info
      const stake = await tx.stake.findFirst({
        where: { 
          userId: user.id, 
          fightId, 
          outcome: "WIN",
          isClaimed: false 
        },
        include: {
          fight: {
            include: {
              fighter1: true,
              fighter2: true
            }
          }
        }
      });

      if (!stake) throw new Error("No unclaimed winnings found");

      // 3. CREDIT BALANCE
      const winnings = BigInt(stake.pointsEarned || 0);
      await tx.user.update({
        where: { id: user.id },
        data: { points: { increment: winnings } }
      });

      // 4. MARK AS CLAIMED
      await tx.stake.update({
        where: { id: stake.id },
        data: { isClaimed: true }
      });

      // 5. GET STREAK DATA FOR THE WINNING FIGHTER
      const isF1Winner = stake.fight.winnerId === stake.fight.fighter1Id;
      const winnerFighter = isF1Winner ? stake.fight.fighter1 : stake.fight.fighter2;

      // 6. CHECK TEAM MILESTONE
      const collectionWins = await tx.fight.count({
        where: {
          winnerId: { not: null },
          OR: [
            { fighter1: { collectionId: winnerFighter.collectionId }, winnerId: { equals: prisma.fight.fields.fighter1Id } },
            { fighter2: { collectionId: winnerFighter.collectionId }, winnerId: { equals: prisma.fight.fields.fighter2Id } }
          ]
        }
      });

      // Return ALL data needed for the frontend animations
      return { 
        winnings: winnings.toString(),
        fighterStreak: winnerFighter.currentStreak,
        isAirdropActive: (collectionWins % 3 === 0), // Your Team Milestone
        collectionWins: collectionWins
      };
    });

    // ✅ Now we use 'result.winnings' instead of just 'winnings'
    return NextResponse.json({ 
      message: "Rewards collected!", 
      winnings: result.winnings,
      isAirdropActive: result.isAirdropActive,
      fighterStreak: result.fighterStreak
    });

  } catch (error: any) {
    console.error("Claim Error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}