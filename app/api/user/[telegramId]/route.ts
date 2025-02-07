import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';
import { z } from 'zod';

const userSchema = z.object({
  telegramId: z.string()
    .min(1, "Telegram ID is required")
    .regex(/^\d+$/, "Telegram ID must be numeric")
    .transform(val => BigInt(val)),
  username: z.string().nullable(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  points: z.number().int().min(0).default(0),
  tappingRate: z.number().int().positive().default(1),
  hasClaimedWelcome: z.boolean().default(false),
  nft: z.boolean().default(false),
  email: z.string().email().nullable().optional()
});

export async function GET(
  req: NextRequest,
  { params }: { params: { telegramId: string } }
): Promise<Response> {
  try {
    // Convert string to BigInt safely
    const telegramId = BigInt(params.telegramId);
    
    const user = await prisma.user.findFirst({
      where: {
        telegramId: telegramId
      }
    });

    if (!user) {
      return new NextResponse(
        JSON.stringify({ error: 'User not found' }),
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const responseUser = {
      ...user,
      telegramId: user.telegramId.toString(),
      points: Number(user.points)
    };

    return new NextResponse(
      JSON.stringify(responseUser),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error fetching user:', error);
    return new NextResponse(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const jsonBody = await req.json();
    const validationResult = userSchema.safeParse(jsonBody);

    if (!validationResult.success) {
      return new NextResponse(
        JSON.stringify({
          error: 'Validation error',
          details: validationResult.error.flatten()
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const userData = validationResult.data;
    
    const user = await prisma.user.upsert({
      where: {
        telegramId: userData.telegramId
      },
      update: {
        username: userData.username,
        firstName: userData.first_name,
        lastName: userData.last_name,
        points: userData.points,
        tappingRate: userData.tappingRate,
        hasClaimedWelcome: userData.hasClaimedWelcome,
        nft: userData.nft,
        updatedAt: new Date()
      },
      create: {
        telegramId: userData.telegramId,
        username: userData.username,
        firstName: userData.first_name,
        lastName: userData.last_name,
        points: userData.points,
        tappingRate: userData.tappingRate,
        hasClaimedWelcome: userData.hasClaimedWelcome,
        nft: userData.nft
      }
    });

    const responseUser = {
      ...user,
      telegramId: user.telegramId.toString(),
      points: Number(user.points)
    };

    return new NextResponse(
      JSON.stringify(responseUser),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return new NextResponse(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}