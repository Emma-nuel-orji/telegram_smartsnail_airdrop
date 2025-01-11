import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';
import { z } from 'zod';

// Validation schema for incoming user data
const userSchema = z.object({
  telegramId: z.string().regex(/^\d+$/).transform(BigInt), // Ensure telegramId is a numeric string and convert to BigInt
  username: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  points: z.number().optional().default(0), // Default to 0 if not provided
  tappingRate: z.number().optional().default(1), // Default to 1 if not provided
  hasClaimedWelcome: z.boolean().optional().default(false), // Default to false if not provided
  nft: z.boolean().optional().default(false), // Default to false if not provided
  email: z.string().email().optional(), // Optional, validate email format if provided
});

export async function POST(req: NextRequest) {
  console.info('User API route hit');

  try {
    // Parse and validate the incoming request body
    const userData = userSchema.parse(await req.json());
    console.debug('Validated user data:', userData);

    const { telegramId, ...updateData } = userData;

    // Check if the user already exists in the database
    let user = await prisma.user.findUnique({ where: { telegramId } });

    if (user) {
      // Update existing user data
      console.info('User exists, updating data...');
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          ...updateData,
          updatedAt: new Date(), // Update the timestamp
        },
      });
      console.info('User updated successfully:', user);
    } else {
      // Create a new user
      console.info('User not found, creating new user...');
      user = await prisma.user.create({
        data: {
          telegramId, // Use validated BigInt telegramId
          ...updateData,
        },
      });
      console.info('User created successfully:', user);
    }

    // Serialize the response (convert BigInt fields to strings)
    const serializedUser = {
      ...user,
      telegramId: user.telegramId.toString(),
      id: user.id.toString(),
    };

    console.debug('Serialized user data:', serializedUser);
    return NextResponse.json(serializedUser);
  } catch (err: any) {
    console.error('Error processing user:', err);

    // Handle validation errors from Zod
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: err.errors, // Include validation error details
        },
        { status: 400 }
      );
    }

    // Handle other unexpected errors
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: err.message || 'An unknown error occurred',
      },
      { status: 500 }
    );
  }
}
