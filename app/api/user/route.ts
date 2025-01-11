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
  tappingRate: z.number().positive().default(1),
  hasClaimedWelcome: z.boolean().default(false),
  nft: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  console.info('User API route hit');

  try {
    // Log the raw request body
    const rawBody = await req.text();
    console.log('Raw request body:', rawBody);

    // Parse the JSON with proper error typing
    let jsonBody;
    try {
      jsonBody = JSON.parse(rawBody);
    } catch (error) {
      // Properly type the error object
      const e = error as Error;
      return NextResponse.json(
        { 
          error: 'Invalid JSON', 
          details: e.message || 'JSON parsing failed'
        },
        { status: 400 }
      );
    }

    // Log the parsed body
    console.log('Parsed request body:', jsonBody);

    // Validate the data
    const validationResult = userSchema.safeParse(jsonBody);
    if (!validationResult.success) {
      console.error('Validation errors:', validationResult.error);
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const userData = validationResult.data;
    console.debug('Validated user data:', userData);

    const { telegramId, ...updateData } = userData;

    // Database operations...
    let user = await prisma.user.findUnique({ where: { telegramId } });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          telegramId,
          ...updateData,
        },
      });
    }

    const serializedUser = {
      ...user,
      telegramId: user.telegramId.toString(),
      id: user.id.toString(),
    };

    return NextResponse.json(serializedUser);
  } catch (error) {
    // Properly type the error object
    const err = error as Error;
    console.error('Error processing user:', err);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: err.message || 'An unknown error occurred',
      },
      { status: 500 }
    );
  }
}