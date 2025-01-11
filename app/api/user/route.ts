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
  console.info('User API route hit');

  // Add timeout for the entire request processing
  const timeoutPromise = new Promise<Response>((_, reject) => {
    setTimeout(() => {
      reject(new Error('Operation timed out'));
    }, 8000);
  });

  try {
    const result = await Promise.race([
      processRequest(req),
      timeoutPromise
    ]);
    return result;
  } catch (error) {
    const err = error as Error;
    console.error('Request failed:', err);
    
    return new NextResponse(
      JSON.stringify({
        error: err.message || 'Request failed',
        details: 'The request took too long to process'
      }),
      { 
        status: err.message === 'Operation timed out' ? 504 : 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

async function processRequest(req: NextRequest): Promise<Response> {
  try {
    const rawBody = await req.text();
    let jsonBody;
    
    try {
      jsonBody = JSON.parse(rawBody);
    } catch (error) {
      const e = error as Error;
      return new NextResponse(
        JSON.stringify({ error: 'Invalid JSON', details: e.message }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const validationResult = userSchema.safeParse(jsonBody);
    if (!validationResult.success) {
      return new NextResponse(
        JSON.stringify({
          error: 'Validation error',
          details: validationResult.error.errors,
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const userData = validationResult.data;
    const { telegramId, ...updateData } = userData;

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

    return new NextResponse(
      JSON.stringify(serializedUser),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    const err = error as Error;
    return new NextResponse(
      JSON.stringify({
        error: 'Internal server error',
        details: err.message || 'An unknown error occurred',
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}