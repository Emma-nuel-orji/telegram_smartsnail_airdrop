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

export async function POST(req: NextRequest): Promise<Response> {
  console.log('API route started');
  
  try {
    const rawBody = await req.text();
    console.log('Raw request body:', rawBody);
    
    let jsonBody;
    try {
      jsonBody = JSON.parse(rawBody);
      console.log('Parsed request body:', jsonBody);
    } catch (error) {
      console.error('JSON parse error:', error);
      return new NextResponse(
        JSON.stringify({ error: 'Invalid JSON', details: (error as Error).message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const validationResult = userSchema.safeParse(jsonBody);
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error);
      return new NextResponse(
        JSON.stringify({
          error: 'Validation error',
          details: validationResult.error.errors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userData = validationResult.data;
    console.log('Validated user data:', userData);

    let user;
    try {
      // First try to find the user
      const existingUser = await prisma.user.findUnique({
        where: { telegramId: userData.telegramId },
      });
      console.log('Existing user:', existingUser);

      if (existingUser) {
        // Update existing user
        console.log('Updating existing user...');
        user = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            username: userData.username,
            firstName: userData.firstName,
            lastName: userData.lastName,
            points: userData.points,
            tappingRate: userData.tappingRate,
            hasClaimedWelcome: userData.hasClaimedWelcome,
            nft: userData.nft,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new user
        console.log('Creating new user...');
        user = await prisma.user.create({
          data: {
            telegramId: userData.telegramId,
            username: userData.username,
            firstName: userData.firstName,
            lastName: userData.lastName,
            points: userData.points,
            tappingRate: userData.tappingRate,
            hasClaimedWelcome: userData.hasClaimedWelcome,
            nft: userData.nft,
          },
        });
      }
      
      console.log('Database operation result:', user);

      if (!user) {
        throw new Error('User operation failed - no user returned');
      }

      const serializedUser = {
        ...user,
        telegramId: user.telegramId.toString(),
        id: user.id.toString(),
      };
      console.log('Serialized user:', serializedUser);

      return new NextResponse(
        JSON.stringify(serializedUser),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } catch (dbError) {
      console.error('Database operation error:', dbError);
      throw dbError; // Re-throw to be caught by outer try-catch
    }
  } catch (error) {
    console.error('General error:', error);
    return new NextResponse(
      JSON.stringify({
        error: 'Server error',
        details: (error as Error).message || 'An unknown error occurred',
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}