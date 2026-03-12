import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { telegramId, pointsToAdd } = body;

    // Validation
    if (!telegramId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Telegram ID is required' 
      }, { status: 400 });
    }

    if (typeof pointsToAdd !== 'number' || pointsToAdd <= 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid points amount' 
      }, { status: 400 });
    }

    // Anti-cheat
    if (pointsToAdd > 1000) {
      return NextResponse.json({ 
        success: false, 
        message: 'Too many points in one sync' 
      }, { status: 400 });
    }

    console.log(`💾 Syncing ${pointsToAdd} points for user ${telegramId}`);

    // Update user in MongoDB using Prisma
    const updatedUser = await prisma.user.update({
      where: { telegramId },
      data: {
        points: {
          increment: pointsToAdd
        }
      }
    });

    console.log(`✅ User ${telegramId} now has ${updatedUser.points} points`);

    return NextResponse.json({
      success: true,
      points: updatedUser.points,
      user: {
        id: updatedUser.id,
        telegramId: updatedUser.telegramId,
        username: updatedUser.username,
        points: updatedUser.points,
        tappingRate: updatedUser.tappingRate,
        hasClaimedWelcome: updatedUser.hasClaimedWelcome,
      }
    });

  } catch (error: any) {
    console.error('❌ Sync points error:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json({
        success: false,
        message: 'User not found',
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: false,
      message: 'Failed to sync points',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}