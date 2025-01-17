import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';

interface RequestBody {
  telegramId: string;
  tappingRate?: number;
  requestId?: number;
}

const DEFAULT_TAPPING_RATE = 1;
const MAX_POINTS_PER_TAP = 1000;

export async function POST(req: NextRequest) {
  try {
    const requestBody = await req.json() as RequestBody;
    const { telegramId } = requestBody;

    if (!telegramId) {
      return NextResponse.json({ 
        success: false,
        error: 'Invalid telegramId' 
      }, { status: 400 });
    }

    let telegramIdBigInt: bigint;
    try {
      telegramIdBigInt = BigInt(telegramId);
    } catch (error) {
      return NextResponse.json({ 
        success: false,
        error: 'Invalid telegram ID format' 
      }, { status: 400 });
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      // Try to find or create user
      let user = await tx.user.findUnique({
        where: { telegramId: telegramIdBigInt },
      });

      if (!user) {
        // Create new user with default values if doesn't exist
        user = await tx.user.create({
          data: {
            telegramId: telegramIdBigInt,
            points: 0,
            tappingRate: DEFAULT_TAPPING_RATE,
            hasClaimedWelcome: false,
          },
        });
      }

      const effectiveTappingRate = user.tappingRate ?? DEFAULT_TAPPING_RATE;
      const pointsToAdd = Math.min(effectiveTappingRate, MAX_POINTS_PER_TAP);

      return tx.user.update({
        where: { telegramId: telegramIdBigInt },
        data: {
          points: {
            increment: pointsToAdd
          }
        },
      });
    });

    return NextResponse.json({
      success: true,
      points: updatedUser.points.toString(),
      requestId: requestBody.requestId
    });

  } catch (error) {
    console.error('Error processing request:', error);
    
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}