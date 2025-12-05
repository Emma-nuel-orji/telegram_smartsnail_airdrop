// app/api/increase-point/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';

interface BatchItem {
  points: number;
  timestamp: number;
  attempts: number;
}

interface RequestBody {
  telegramId?: string;  // For single tap
  userId?: string;      // For batch sync
  tappingRate?: number;
  requestId?: number;
  points?: number;      // For batch sync
  batch?: BatchItem[];  // For batch sync
}

const DEFAULT_TAPPING_RATE = 1;
const MAX_POINTS_PER_TAP = 1000;

export async function POST(req: NextRequest) {
  try {
    const requestBody = await req.json() as RequestBody;
    
    // Determine if this is a single tap or batch sync
    const isBatchSync = requestBody.userId && requestBody.points !== undefined;
    const telegramId = isBatchSync ? requestBody.userId : requestBody.telegramId;

    if (!telegramId) {
      return NextResponse.json({ 
        success: false,
        error: 'Invalid telegramId or userId' 
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
      // Find or create user
      let user = await tx.user.findUnique({
        where: { telegramId: telegramIdBigInt },
      });

      if (!user) {
        user = await tx.user.create({
          data: {
            telegramId: telegramIdBigInt,
            points: 0,
            tappingRate: DEFAULT_TAPPING_RATE,
            hasClaimedWelcome: false,
          },
        });
      }

      // Calculate points to add
      let pointsToAdd: number;
      
      if (isBatchSync) {
        // Batch sync - use provided points
        pointsToAdd = Math.floor(requestBody.points!);
      } else {
        // Single tap - use tapping rate
        const effectiveTappingRate = user.tappingRate ?? DEFAULT_TAPPING_RATE;
        pointsToAdd = Math.min(effectiveTappingRate, MAX_POINTS_PER_TAP);
      }

      // Update user points
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
      message: isBatchSync ? 'Points synced successfully' : 'Tap recorded',
      requestId: requestBody.requestId
    });

  } catch (error: any) {
    console.error('Error processing request:', error);
    
    // Handle user not found
    if (error.code === 'P2025') {
      return NextResponse.json({ 
        success: false,
        error: 'User not found' 
      }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}