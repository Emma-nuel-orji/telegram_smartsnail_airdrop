import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { PrismaClient } from '@prisma/client';


const WELCOME_BONUS_AMOUNT = 5000;

export async function POST(req: NextRequest) {
  try {
    const { telegramId } = await req.json();

    // Validate input
    if (!telegramId) {
      return NextResponse.json(
        { success: false, error: "telegramId is required" },
        { status: 400 }
      );
    }
    const telegramIdBigInt = BigInt(telegramId);
    const result = await prisma.$transaction(async (tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) => {
      // Check if the user exists and if they've claimed the bonus
      const user = await tx.user.findUnique({
        where: { telegramId: telegramIdBigInt,},
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

      // Update user with welcome bonus and mark as claimed
      const updatedUser = await tx.user.update({
        where: { telegramId: telegramIdBigInt,},
        data: {
          points: {
            increment: WELCOME_BONUS_AMOUNT
          },
          hasClaimedWelcome: true
        },
        select: {
          points: true
        }
      });

      return updatedUser;
    });

    return NextResponse.json({
      success: true,
      points: result.points
    });

  } catch (error) {
    console.error("Error in /api/claim-welcome:", error);
    
    if (error instanceof Error) {
      if (error.message === 'User not found') {
        return NextResponse.json(
          { success: false, error: "User not found" },
          { status: 404 }
        );
      }
      if (error.message === 'Welcome bonus already claimed') {
        return NextResponse.json(
          { success: false, error: "Welcome bonus already claimed" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}