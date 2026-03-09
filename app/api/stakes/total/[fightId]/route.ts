import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';
import { StakeStatus } from '@prisma/client';

export async function GET(
  req: NextRequest,
  { params }: { params: { fightId: string } }
) {
  const { fightId } = params;

  try {
    // 1️⃣ Find the fight
    const fight = await prisma.fight.findUnique({
      where: { id: fightId },
      select: {
        fighter1Id: true,
        fighter2Id: true,
      },
    });

    if (!fight) {
      return NextResponse.json({ error: 'Fight not found' }, { status: 404 });
    }

    // 2️⃣ Aggregate stakes for BOTH fighters
    const stats = await prisma.stake.groupBy({
      by: ['fighterId'],
      where: {
        fighterId: { in: [fight.fighter1Id, fight.fighter2Id] },
        status: {
          in: [StakeStatus.PENDING, StakeStatus.WON, StakeStatus.CLAIMED],
        },
      },
      _sum: {
        stakeAmount: true,
      },
    });

    // 3️⃣ Helper to extract sums
    const getSum = (id: string) =>
      stats.find((s) => s.fighterId === id)?._sum.stakeAmount ?? 0n;

    const totalRedStakes = getSum(fight.fighter1Id);
    const totalBlueStakes = getSum(fight.fighter2Id);

    // 4️⃣ Return safe BigInt values
    return NextResponse.json({
      totalRedStakes: totalRedStakes.toString(),
      totalBlueStakes: totalBlueStakes.toString(),
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch stake totals' }, { status: 500 });
  }
}