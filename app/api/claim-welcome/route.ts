import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';

const WELCOME_BONUS_AMOUNT = 5000n; // BigInt for welcome bonus

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
      // Try to find an existing user
      let user = await tx.user.findUnique({
        where: { telegramId: telegramIdBigInt },
      });

      if (!user) {
        // Create new user with initial points and welcome bonus claimed
        user = await tx.user.create({
          data: {
            telegramId: telegramIdBigInt,
            points: Number(WELCOME_BONUS_AMOUNT), // Convert BigInt to Number for initial points
            hasClaimedWelcome: true, // Set to true immediately
            tappingRate: 1, // Set default tapping rate
          },
        });
        return user;
      }

      // If user exists but hasn't claimed welcome bonus
      if (!user.hasClaimedWelcome) {
        const updatedUser = await tx.user.update({
          where: { telegramId: telegramIdBigInt },
          data: {
            points: {
              increment: Number(WELCOME_BONUS_AMOUNT)
            },
            hasClaimedWelcome: true,
          },
        });
        return updatedUser;
      }

      throw new Error('Welcome bonus already claimed');
    });

    return NextResponse.json({
      success: true,
      points: result.points.toString(), // Convert to string for JSON
      hasClaimedWelcome: result.hasClaimedWelcome,
    });

  } catch (error) {
    console.error('Error in /api/claim-welcome:', error);

    if (error instanceof Error) {
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