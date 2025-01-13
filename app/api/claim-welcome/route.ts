import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';

const WELCOME_BONUS_AMOUNT = 5000n; // Note the 'n' suffix for BigInt literal

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
    let telegramIdBigInt: bigint;
    try {
      telegramIdBigInt = BigInt(telegramId);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: "Invalid telegramId format" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // First, get the current user state with a FOR UPDATE lock
      const user = await tx.user.findUnique({
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
      const updatedUser = await tx.user.update({
        where: { telegramId: telegramIdBigInt },
        data: {
          points: {
            increment: Number(WELCOME_BONUS_AMOUNT) // Convert BigInt to Number for increment
          },
          hasClaimedWelcome: true,
        },
        select: {
          points: true,
          hasClaimedWelcome: true,
        },
      });

      return updatedUser;
    }, {
      // Add transaction options for better isolation
      isolationLevel: 'Serializable'
    });

    return NextResponse.json({
      success: true,
      points: result.points.toString(), // Convert BigInt to string for JSON
      hasClaimedWelcome: result.hasClaimedWelcome,
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