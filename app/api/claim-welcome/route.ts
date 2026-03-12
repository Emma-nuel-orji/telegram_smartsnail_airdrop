import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';


const WELCOME_BONUS_AMOUNT = 5000n; // BigInt for welcome bonus

export async function POST(req: NextRequest) {
  try {
    const { telegramId } = await req.json();
    console.log('Received telegramId:', telegramId);

    if (!telegramId) {
      console.error('❌ Missing telegramId in request body');
      return NextResponse.json(
        { success: false, error: 'telegramId is required' },
        { status: 400 }
      );
    }

    // ✅ Validate and safely convert to BigInt
    let telegramIdBigInt: bigint;
    try {
      telegramIdBigInt = BigInt(telegramId);
    } catch (error) {
      console.error('❌ Invalid telegramId format:', telegramId);
      return NextResponse.json(
        { success: false, error: 'Invalid telegramId format' },
        { status: 400 }
      );
    }

    // ✅ Use transaction for safety
    const result = await prisma.$transaction(async (tx) => {
      // Find user
      let user = await tx.user.findUnique({
        where: { telegramId: telegramIdBigInt },
      });

      if (!user) {
        console.log(`🆕 Creating new user: ${telegramId}`);
        user = await tx.user.create({
          data: {
            telegramId: telegramIdBigInt,
            points: Number(WELCOME_BONUS_AMOUNT),
            hasClaimedWelcome: true,
            tappingRate: 1, 
          },
        });
        return { user, alreadyClaimed: false };
      }

      // If already claimed, return instead of throwing
      if (user.hasClaimedWelcome) {
        return { user, alreadyClaimed: true };
      }

      console.log(`🎉 Granting welcome bonus to: ${telegramId}`);
      const updatedUser = await tx.user.update({
        where: { telegramId: telegramIdBigInt },
        data: {
          points: { increment: Number(WELCOME_BONUS_AMOUNT) },
          hasClaimedWelcome: true,
        },
      });

      return { user: updatedUser, alreadyClaimed: false };
    });

    if (result.alreadyClaimed) {
      return NextResponse.json(
        { success: false, error: 'Welcome bonus already claimed' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      points: result.user.points.toString(), // Convert BigInt to string
      hasClaimedWelcome: result.user.hasClaimedWelcome,
    });

  } catch (error) {
    console.error('❌ Error in /api/claim-welcome:', error);

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
