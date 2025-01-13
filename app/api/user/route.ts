import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';
import { z } from 'zod';

const userSchema = z.object({
  telegramId: z.string()
    .min(1, "Telegram ID is required")
    .regex(/^\d+$/, "Telegram ID must be numeric")
    .transform(BigInt),
  username: z.string().nullable(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  points: z.number().int().min(0).default(0),
  tappingRate: z.number().int().positive().default(1), // Changed to ensure it's an integer
  hasClaimedWelcome: z.boolean().default(false),
  nft: z.boolean().default(false),
  email: z.string().email().nullable().optional() // Optional email field with validation

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
      username: userData.username || null, // Set to null if missing
      firstName: userData.first_name || null, // Set to null if missing
      lastName: userData.last_name || null, // Set to null if missing
      points: userData.points, // No need for BigInt conversion here
      tappingRate: userData.tappingRate,
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

      const responseUser = {
        ...user,
        telegramId: user.telegramId.toString(),
        points: user.points.toString(),
      };

      return new NextResponse(JSON.stringify(responseUser), { status: 200 });

    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        {
          error: 'Database operation failed',
          details: dbError instanceof Error ? dbError.message : 'Unknown database error',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('General error:', error);
    
    // Type guard to check if `error` is an instance of Error
    if (error instanceof Error) {
      return new NextResponse(
        JSON.stringify({
          error: 'Internal server error',
          details: error.message,
        }),
        { status: 500 }
      );
    }

    // If error is not an instance of Error, handle it generically
    return new NextResponse(
      JSON.stringify({
        error: 'Internal server error',
        details: 'Unknown error occurred',
      }),
      { status: 500 }
    );
  }
}
