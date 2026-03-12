import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';
import { z } from 'zod';

// Schema for validation
const syncPointsSchema = z.object({
  telegramId: z.string()
    .min(1, "Telegram ID is required")
    .regex(/^\d+$/, "Telegram ID must be numeric")
    .transform(BigInt),
  pointsToAdd: z.number()
    .int("Points must be an integer")
    .min(0, "Points cannot be negative")
});

export async function POST(req: NextRequest): Promise<Response> {
  try {
    // Parse and validate request body
    const rawBody = await req.text();
    const jsonBody = JSON.parse(rawBody);
    const validationResult = syncPointsSchema.safeParse(jsonBody);

    if (!validationResult.success) {
      return new NextResponse(
        JSON.stringify({
          error: 'Validation error',
          details: validationResult.error.flatten()
        }),
        { status: 400 }
      );
    }

    const { telegramId, pointsToAdd } = validationResult.data;

    // Start a transaction to ensure data consistency
    const updatedUser = await prisma.$transaction(async (tx) => {
      // Get current user data
      const user = await tx.user.findUnique({
        where: { telegramId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Update user points
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          points: user.points + BigInt(pointsToAdd),
          updatedAt: new Date()
        }
      });

      return updatedUser;
    });

    // Format response
    const responseUser = {
      ...updatedUser,
      telegramId: updatedUser.telegramId.toString(),
      points: updatedUser.points.toString(),
    };

    return new NextResponse(JSON.stringify(responseUser), { 
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error in sync-points:', error);
    
    if (error instanceof Error && error.message === 'User not found') {
      return new NextResponse(
        JSON.stringify({ error: 'User not found' }),
        { status: 404 }
      );
    }

    return new NextResponse(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { status: 500 }
    );
  }
}