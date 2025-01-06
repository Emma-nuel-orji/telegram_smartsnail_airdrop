import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';

const WELCOME_BONUS_AMOUNT = 5000;

export async function POST(req: NextRequest) {
  try {
    const { telegramId } = await req.json();
    console.log('Received telegramId:', telegramId);

    if (!telegramId) {
      console.error('Missing telegramId in request body');
      return NextResponse.json(
        { success: false, error: 'telegramId is required' },
        { status: 400 }
      );
    }

    // Safely convert telegramId to BigInt
    let telegramIdBigInt;
    try {
      telegramIdBigInt = BigInt(telegramId);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: "Invalid telegramId format" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (prisma: { user: { findUnique: (arg0: { where: { telegramId: bigint; }; select: { hasClaimedWelcome: boolean; points: boolean; }; }) => any; update: (arg0: { where: { telegramId: bigint; }; data: { points: { increment: number; }; hasClaimedWelcome: boolean; }; select: { points: boolean; }; }) => any; }; }) => {
      // Find user
      const user = await prisma.user.findUnique({
        where: { telegramId: telegramIdBigInt },
        select: {
          hasClaimedWelcome: true,
          points: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (user.hasClaimedWelcome) {
        throw new Error('Welcome bonus already claimed');
      }

      // Update user points and mark as claimed
      const updatedUser = await prisma.user.update({
        where: { telegramId: telegramIdBigInt },
        data: {
          points: { increment: WELCOME_BONUS_AMOUNT },
          hasClaimedWelcome: true,
        },
        select: { points: true },
      });

      return updatedUser;
    });

    return NextResponse.json({
      success: true,
      points: result.points,
    });
  } catch (error) {
    console.error('Error in /api/claim-welcome:', error);

    if (error instanceof Error) {
      if (error.message === 'User not found') {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }
      if (error.message === 'Welcome bonus already claimed') {
        return NextResponse.json(
          { success: false, error: 'Welcome bonus already claimed' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}