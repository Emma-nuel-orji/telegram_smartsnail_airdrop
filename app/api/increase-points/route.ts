import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { telegramId } = await req.json();

    if (!telegramId) {
      return NextResponse.json({ error: 'Invalid telegramId' }, { status: 400 });
    }

    // Fetch the user's tapping rate from the database
    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: { points: true, tappingRate: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const tappingRate = user.tappingRate || 1; // Default to 1 if tappingRate is not set

    // Increment points based on the tapping rate
    const updatedUser = await prisma.user.update({
      where: { telegramId },
      data: { points: { increment: tappingRate } },
    });

    return NextResponse.json({
      success: true,
      points: updatedUser.points,
      tappingRate, // Return the tapping rate for the frontend
    });
  } catch (error) {
    console.error('Error increasing points:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
