import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';
import { Prisma } from '@prisma/client';

const DEFAULT_TAPPING_RATE = 1;

export async function POST(req: NextRequest) {
  try {
    console.log('Starting points increase request');
    
    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { telegramId } = body;

    if (!telegramId) {
      console.warn('Missing telegramId in request');
      return NextResponse.json({ error: 'Invalid telegramId' }, { status: 400 });
    }

    // Safe BigInt conversion
    let telegramIdBigInt: bigint;
    try {
      telegramIdBigInt = BigInt(telegramId);
    } catch (error) {
      console.warn('Invalid telegramId format:', telegramId);
      return NextResponse.json({ error: 'Invalid telegram ID format' }, { status: 400 });
    }

    // Fetch user with error handling
    const user = await prisma.user.findUnique({
      where: { telegramId: telegramIdBigInt },
      select: { points: true, tappingRate: true },
    }).catch((error) => {
      console.error('Database query error:', error);
      throw error;
    });

    if (!user) {
      console.warn('User not found:', telegramId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Use default tapping rate if not set
    const tappingRate = user.tappingRate ?? DEFAULT_TAPPING_RATE;

    // Update points with error handling
    try {
      const updatedUser = await prisma.user.update({
        where: { telegramId: telegramIdBigInt },
        data: { points: { increment: tappingRate } },
      });

      console.log('Successfully updated points for user:', telegramId);
      
      return NextResponse.json({
        success: true,
        points: updatedUser.points,
        tappingRate,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error('Prisma error:', {
          code: error.code,
          message: error.message,
          telegramId
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error processing request:', {
      error,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? 
        error instanceof Error ? error.message : 'Unknown error' 
        : undefined
    }, { status: 500 });
  }
}