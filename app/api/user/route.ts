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

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

function serializeUser(user: any) {
    if (!user) return null;

    // By explicitly listing fields, we avoid sending raw BigInts 
    // that haven't been converted to strings or numbers.
    return {
      id: user.id.toString(),
      telegramId: user.telegramId.toString(),
      username: user.username || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      points: Number(user.points || 0), // Convert BigInt to Number for JS
      tappingRate: user.tappingRate || 1,
      hasClaimedWelcome: user.hasClaimedWelcome ?? false,
      createdAt: user.createdAt?.toISOString(),
      updatedAt: user.updatedAt?.toISOString(),
     
    };
}
  
  // ✅ POST: Create or Update User
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const body = await req.json();
    console.log("POST /api/user - Body received:", body);

    const { telegramId, firstName, lastName, username } = body;

    if (!telegramId || !/^[0-9]+$/.test(telegramId)) {
      return NextResponse.json({ error: "Invalid Telegram ID" }, { status: 400 });
    }

    console.log("POST /api/user - Attempting Upsert for:", telegramId);
    let user = await prisma.user.upsert({
      where: { telegramId: BigInt(telegramId) },
      update: { firstName, lastName, username },
      create: { telegramId: BigInt(telegramId), firstName, lastName, username },
    });

    console.log("POST /api/user - Success, serializing...");
    return NextResponse.json(serializeUser(user));
  } catch (error) {
    console.error("POST /api/user - CRITICAL ERROR:", error);
    return NextResponse.json({ error: "Internal server error", details: (error as Error).message }, { status: 500 });
  }
}

// ✅ PATCH: Increment Points
export async function PATCH(req: NextRequest): Promise<Response> {
  try {
    const { telegramId, increment } = await req.json();
    console.log(`PATCH /api/user - ID: ${telegramId}, Inc: ${increment}`);

    if (!telegramId || !/^[0-9]+$/.test(telegramId)) {
      return NextResponse.json({ error: "Invalid Telegram ID" }, { status: 400 });
    }

    // FIX: Use atomic increment with BigInt to avoid 500 errors
    const user = await prisma.user.update({
      where: { telegramId: BigInt(telegramId) },
      data: { 
        points: { increment: BigInt(Math.floor(Number(increment))) } 
      },
    });

    console.log("PATCH /api/user - Update successful");
    return NextResponse.json(serializeUser(user));
  } catch (error) {
    console.error("PATCH /api/user - CRITICAL ERROR:", error);
    return NextResponse.json({ error: "Internal server error", details: (error as Error).message }, { status: 500 });
  }
}