import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';

export async function GET(req: NextRequest, { params }: { params: { fighterId: string } }) {
  const { fighterId } = params;

  try {
    // 1. Fetch the fight to identify the explicit fighters
    const fight = await prisma.fight.findUnique({
      where: { id: fighterId },
      select: { fighter1Id: true, fighter2Id: true }
    });

    if (!fight) {
      return NextResponse.json({ error: 'Fight not found' }, { status: 404 });
    }

    // 2. Aggregate all stakes for this fight, grouped by fighter
    const stats = await prisma.stake.groupBy({
      by: ['fighterId'],
      where: { 
        fightId,
        status: 'COMPLETED' 
      },
      _sum: { stakeAmount: true }
    });

    // 3. Map aggregates to Red (Fighter 1) and Blue (Fighter 2)
    const getSum = (id: string) => stats.find(s => s.fighterId === id)?._sum.stakeAmount || 0n;

    const totalRedStakes = getSum(fight.fighter1Id);
    const totalBlueStakes = getSum(fight.fighter2Id);

    return NextResponse.json({
      totalRedStakes: totalRedStakes.toString(), // String for BigInt safety
      totalBlueStakes: totalBlueStakes.toString()
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}