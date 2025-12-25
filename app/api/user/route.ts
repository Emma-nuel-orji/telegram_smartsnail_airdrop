// File: /api/user/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const userSchema = z.object({
    telegramId: z.string().min(1).regex(/^[0-9]+$/, "Telegram ID must be numeric").transform(val => BigInt(val)),
    username: z.string().nullable(),
    first_name: z.string().nullable(),
    last_name: z.string().nullable(),
    points: z.number().int().min(0).default(0),
    tappingRate: z.number().int().positive().default(1),
    hasClaimedWelcome: z.boolean().default(false),
    nft: z.boolean().default(false),
    email: z.string().email().nullable().optional()
});

// Helper function to serialize user data
function serializeUser(user: any) {
    return {
      ...user,
      id: user.id.toString(),
      telegramId: user.telegramId.toString(),
      points: Number(user.points),
      hasClaimedWelcome: user.hasClaimedWelcome ?? false,
      createdAt: user.createdAt?.toISOString(),
      updatedAt: user.updatedAt?.toISOString(),
    };
  }
  
  // ✅ POST: Create or Update User
  export async function POST(req: NextRequest): Promise<Response> {
    try {
      const { telegramId, firstName, lastName, username } = await req.json();
  
      if (!telegramId || !/^[0-9]+$/.test(telegramId)) {
        return NextResponse.json({ error: "Invalid Telegram ID" }, { status: 400 });
      }
  
      let user = await prisma.user.upsert({
        where: { telegramId: BigInt(telegramId) },
        update: { firstName, lastName, username },
        create: { telegramId: BigInt(telegramId), firstName, lastName, username },
      });
  
      return NextResponse.json(serializeUser(user));
    } catch (error) {
      return NextResponse.json({ error: "Internal server error", details: (error as Error).message }, { status: 500 });
    }
  }
  
  // ✅ PATCH: Increment Points
  export async function PATCH(req: NextRequest): Promise<Response> {
    try {
      const { telegramId, increment } = await req.json();
  
      if (!telegramId || !/^[0-9]+$/.test(telegramId)) {
        return NextResponse.json({ error: "Invalid Telegram ID" }, { status: 400 });
      }
  
      if (!increment || isNaN(increment)) {
        return NextResponse.json({ error: "Invalid increment value" }, { status: 400 });
      }
  
      let user = await prisma.user.findFirst({ where: { telegramId: BigInt(telegramId) } });
  
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
  
      user = await prisma.user.update({
        where: { id: user.id },
        data: { points: Number(user.points) + Number(increment) },
      });
  
      return NextResponse.json(serializeUser(user));
    } catch (error) {
      return NextResponse.json({ error: "Internal server error", details: (error as Error).message }, { status: 500 });
    }
  }