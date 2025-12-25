import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';

export async function GET(req: NextRequest, { params }: { params: { fighterId: string } }) {
  const { fighterId } = params;

  if (!fighterId) {
    return NextResponse.json({ error: 'Fighter ID is required' }, { status: 400 });
  }

  try {
    // Fetch total stars for the fighter
    const totalStars = await prisma.stake.aggregate({
      where: { 
        fighterId,
        stakeType: 'STARS', // Filter by stakeType = STARS
      },
      _sum: { stakeAmount: true }, // Aggregate stakeAmount for stars
    });

    // Fetch total points for the fighter
    const totalPoints = await prisma.stake.aggregate({
      where: { 
        fighterId,
        stakeType: 'POINTS', // Filter by stakeType = POINTS
      },
      _sum: { stakeAmount: true }, // Aggregate stakeAmount for points
    });

    return NextResponse.json({
      stars: totalStars._sum.stakeAmount || 0, // Use stakeAmount for stars
      points: totalPoints._sum.stakeAmount || 0, // Use stakeAmount for points
    });
  } catch (error) {
    console.error('Error fetching total support:', error);
    return NextResponse.json({ error: 'Failed to fetch total support' }, { status: 500 });
  }
}
