import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StakeStatus } from "@prisma/client";
import { authenticateTelegramUser } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: { fightId: string } }
) {
  try {
    // 🔐 STANDARD AUTH (prevents abuse)
    const auth = await authenticateTelegramUser(request as any);

    if (!auth.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const fightId = params.fightId;

    // 1️⃣ Find fight
    const fight = await prisma.fight.findUnique({
      where: { id: fightId },
      select: {
        fighter1Id: true,
        fighter2Id: true,
      },
    });

    if (!fight) {
      return NextResponse.json({ error: "Fight not found" }, { status: 404 });
    }

    // 2️⃣ Aggregate stakes
    const stats = await prisma.stake.groupBy({
      by: ["fighterId"],
      where: {
        fighterId: {
          in: [fight.fighter1Id, fight.fighter2Id],
        },
        status: {
          in: [
            StakeStatus.PENDING,
            StakeStatus.WON,
            StakeStatus.CLAIMED,
          ],
        },
      },
      _sum: {
        stakeAmount: true,
      },
    });

    // 3️⃣ Safe helper
    const getSum = (id: string) =>
      stats.find((s) => s.fighterId === id)?._sum.stakeAmount ?? 0n;

    const totalRedStakes = getSum(fight.fighter1Id);
    const totalBlueStakes = getSum(fight.fighter2Id);

    // 4️⃣ Response
    return NextResponse.json({
      totalRedStakes: totalRedStakes.toString(),
      totalBlueStakes: totalBlueStakes.toString(),
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stake totals" },
      { status: 500 }
    );
  }
}