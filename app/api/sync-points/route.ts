import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';
import { z } from 'zod';

const syncPointsSchema = z.object({
  telegramId: z.string()
    .min(1, "Telegram ID is required")
    .regex(/^\d+$/, "Telegram ID must be numeric"),
  pointsToAdd: z.number()
    .int("Points must be an integer")
    .min(0, "Points cannot be negative")
});

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const rawBody = await req.text();
    const jsonBody = JSON.parse(rawBody);
    const validationResult = syncPointsSchema.safeParse(jsonBody);

    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: validationResult.error.flatten()
      }, { status: 400 });
    }

    const { telegramId, pointsToAdd } = validationResult.data;

    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { telegramId: BigInt(telegramId) },
      });

      if (!user) {
        throw new Error('User not found');
      }

      return tx.user.update({
        where: { id: user.id },
        data: {
          points: user.points + BigInt(pointsToAdd),
          updatedAt: new Date()
        }
      });
    });

    // ✅ Manually pick each field — no spread of updatedUser
    return NextResponse.json({
      success: true,
      points: Number(updatedUser.points),
      user: {
        id: updatedUser.id,
        telegramId: updatedUser.telegramId.toString(),
        points: Number(updatedUser.points),
        tappingRate: Number(updatedUser.tappingRate),
        hasClaimedWelcome: updatedUser.hasClaimedWelcome,
      }
    });

  } catch (error) {
    console.error('Error in sync-points:', error);

    if (error instanceof Error && error.message === 'User not found') {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}