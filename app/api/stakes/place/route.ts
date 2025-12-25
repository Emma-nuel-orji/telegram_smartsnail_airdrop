// app/api/stakes/place/route.ts
import { NextResponse } from 'next/server';
// import {prisma} from '@/lib/prisma';
import { prisma } from '@/prisma/client';
import { getWebAppUser } from '@/lib/storage';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fightId, fighterId, stakeAmount, stakeType } = body;
    
    if (!fightId || !fighterId || !stakeAmount || !stakeType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Get user from Telegram Web App
    const telegramUser = await getWebAppUser();
    if (!telegramUser || !telegramUser.id) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }
    
    // Find user in database
    const user = await prisma.user.findUnique({
      where: {
        telegramId: BigInt(telegramUser.id)
      }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if user has minimum required points
    if (user.points < 200000) {
      return NextResponse.json(
        { error: 'Minimum 200,000 points required to participate' },
        { status: 403 }
      );
    }
    
    // Validate fight and fighter
    const fight = await prisma.fight.findUnique({
      where: { id: fightId },
      include: { fighter1: true, fighter2: true }
    });
    
    if (!fight) {
      return NextResponse.json(
        { error: 'Fight not found' },
        { status: 404 }
      );
    }
    
    if (fight.status !== 'SCHEDULED') {
      return NextResponse.json(
        { error: 'Can only stake on scheduled fights' },
        { status: 400 }
      );
    }
    
    const isValidFighter = 
      fight.fighter1Id === fighterId || 
      fight.fighter2Id === fighterId;
      
    if (!isValidFighter) {
      return NextResponse.json(
        { error: 'Invalid fighter for this fight' },
        { status: 400 }
      );
    }
    
    // Check if user already has a stake for this fight
    const existingStake = await prisma.stake.findFirst({
      where: {
        userId: user.id,
        fightId
      }
    });
    
    if (existingStake) {
      return NextResponse.json(
        { error: 'You have already placed a stake for this fight' },
        { status: 400 }
      );
    }
    
    // For POINTS stake type, ensure user has enough points
    if (stakeType === 'POINTS' && user.points < stakeAmount) {
      return NextResponse.json(
        { error: 'Insufficient points balance' },
        { status: 400 }
      );
    }
    
    // Process based on stake type
    if (stakeType === 'POINTS') {
      // Deduct points immediately for POINTS stake type
      await prisma.user.update({
        where: { id: user.id },
        data: {
          points: {
            decrement: stakeAmount
          }
        }
      });
    }
    
    // Create stake
    const stake = await prisma.stake.create({
      data: {
        userId: user.id,
        fightId,
        fighterId,
        stakeAmount,
        stakeType,
        initialStakeAmount: stakeAmount,
      }
    });
    
    return NextResponse.json({
      message: 'Stake placed successfully',
      stake
    });
    
  } catch (error) {
    console.error('Error placing stake:', error);
    return NextResponse.json(
      { error: 'Failed to place stake' },
      { status: 500 }
    );
  }
}