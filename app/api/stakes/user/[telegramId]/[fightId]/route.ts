import { NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';

export async function GET(
  req: Request,
  { params }: { params: { telegramId: string; fightId: string } }
) {
  try {
    const { telegramId, fightId } = params;

    // 1. Find the internal User ID from the Telegram ID
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ stakes: [], claimed: false });
    }

    // 2. Fetch all stakes for this specific user and fight
    const stakes = await prisma.stake.findMany({
      where: {
        userId: user.id,
        fightId: fightId
      },
      orderBy: { createdAt: 'desc' }
    });

    // 3. Check if they have already claimed rewards (assuming you have a 'claimed' status or field)
    // If you don't have a 'claimed' field yet, we default to false.
    const claimed = stakes.some(s => s.status === 'CLAIMED');

    // 4. Serialize BigInts for the JSON response
    const serializedStakes = stakes.map(stake => ({
      ...stake,
      stakeAmount: stake.stakeAmount.toString(),
      initialStakeAmount: stake.initialStakeAmount.toString(),
    }));

    return NextResponse.json({
      stakes: serializedStakes,
      claimed: claimed
    });

  } catch (error: any) {
    console.error('Fetch Stakes Error:', error);
    return NextResponse.json({ error: 'Failed to fetch stakes' }, { status: 500 });
  }
}