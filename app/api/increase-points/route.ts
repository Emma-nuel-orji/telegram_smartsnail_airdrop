import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';

const DEFAULT_TAPPING_RATE = 1;

export async function POST(req: NextRequest) {
  try {
    const { telegramId } = await req.json();

    if (!telegramId) {
      return NextResponse.json({ error: 'Invalid telegramId' }, { status: 400 });
    }

    // Ensure telegramId is valid as BigInt
    const telegramIdBigInt = BigInt(telegramId);

    // Fetch the user's current points and tappingRate
    const user = await prisma.user.findUnique({
      where: { telegramId: telegramIdBigInt },
      select: { points: true, tappingRate: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Default tapping rate to 1 if it's not set in the database
    const tappingRate = user.tappingRate || DEFAULT_TAPPING_RATE;

    // Increment points by the tapping rate
    const updatedUser = await prisma.user.update({
      where: { telegramId: telegramIdBigInt },
      data: { points: { increment: tappingRate } },
    });

    return NextResponse.json({
      success: true,
      points: updatedUser.points,
      tappingRate, // Send the tapping rate for the frontend
    });
  } catch (error) {
    console.error('Error increasing points:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
