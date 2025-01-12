import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';
import { z } from 'zod';

const userSchema = z.object({
  telegramId: z.string()
    .min(1, "Telegram ID is required")
    .regex(/^\d+$/, "Telegram ID must be numeric")
    .transform(BigInt),
  username: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  points: z.number().int().min(0).default(0),
  tappingRate: z.number().int().positive().default(1), // Changed to ensure it's an integer
  hasClaimedWelcome: z.boolean().default(false),
  nft: z.boolean().default(false),
});

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const rawBody = await req.text();
    console.log('Raw request body:', rawBody);

    const jsonBody = JSON.parse(rawBody);
    console.log('Parsed JSON body:', jsonBody);

    const validationResult = userSchema.safeParse(jsonBody);

    if (!validationResult.success) {
      console.error('Validation errors:', validationResult.error.flatten());
      return new NextResponse(
        JSON.stringify({
          error: 'Validation error',
          details: validationResult.error.flatten(),
        }),
        { status: 400 }
      );
    }

    const userData = validationResult.data;

    const updateData = {
      username: userData.username || '',
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      points: BigInt(userData.points), // Convert to BigInt for database
      tappingRate: userData.tappingRate, // Keep as regular integer
      hasClaimedWelcome: userData.hasClaimedWelcome,
      nft: userData.nft,
      updatedAt: new Date(),
    };

    console.log('Final update data (pre-DB operation):', {
      ...updateData,
      points: updateData.points.toString(), // Convert BigInt to string for logging
    });

    try {
      let user;
      const existingUser = await prisma.user.findUnique({
        where: { telegramId: userData.telegramId },
      });

      if (existingUser) {
        console.log('Updating existing user...');
        user = await prisma.user.update({
          where: { id: existingUser.id },
          data: updateData,
        });
      } else {
        console.log('Creating a new user...');
        user = await prisma.user.create({
          data: {
            telegramId: userData.telegramId,
            ...updateData,
          },
        });
      }

      // Convert BigInt to string for JSON response
      const responseUser = {
        ...user,
        telegramId: user.telegramId.toString(),
        points: user.points.toString(),
      };

      return new NextResponse(JSON.stringify(responseUser), { status: 200 });
    } catch (dbError) {
      console.error('Database operation error:', dbError);
      return new NextResponse(
        JSON.stringify({
          error: 'Database operation failed',
          details: dbError.message,
        }),
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('General error:', error);
    return new NextResponse(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message,
      }),
      { status: 500 }
    );
  }
}