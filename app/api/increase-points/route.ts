import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';
import { Prisma } from '@prisma/client';

// Define the expected request body type
interface RequestBody {
  telegramId: string;
  tappingRate?: number;
  requestId?: number;
}

const DEFAULT_TAPPING_RATE = 1;
const MAX_POINTS_PER_TAP = 1000;

export async function POST(req: NextRequest) {
  try {
    // Properly type the request body
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
      const user = await tx.user.findUnique({
        where: { telegramId: telegramIdBigInt },
        select: { points: true, tappingRate: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const effectiveTappingRate = user.tappingRate ?? DEFAULT_TAPPING_RATE;

      return tx.user.update({
        where: { telegramId: telegramIdBigInt },
        data: {
          points: {
            increment: effectiveTappingRate
          }
        },
      });
    });

    return NextResponse.json({
      success: true,
      points: updatedUser.points,
      requestId: requestBody.requestId
    });

  } catch (error) {
    console.error('Error processing request:', error);
    
    // Safe error response
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}