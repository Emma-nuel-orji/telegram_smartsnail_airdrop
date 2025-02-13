import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';
import { z } from 'zod';

const userSchema = z.object({
  telegramId: z.string()
    .min(1, "Telegram ID is required")
    .regex(/^[0-9]+$/, "Telegram ID must be numeric")
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
    console.log(`🔍 Checking for user in database: ${params.telegramId}`);

    if (!/^[0-9]+$/.test(params.telegramId)) {
      console.warn(`❌ Invalid Telegram ID format: ${params.telegramId}`);
      return new NextResponse(
        JSON.stringify({ error: "Invalid Telegram ID format" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const telegramId = BigInt(params.telegramId);
    const user = await prisma.user.findFirst({ where: { telegramId } });

    if (!user) {
      console.warn(`⚠️ User not found in database: ${params.telegramId}`);
      return new NextResponse(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`✅ User found:`, user);

    return new NextResponse(
      JSON.stringify({ ...user, telegramId: user.telegramId.toString() }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    const err = error as Error; // Explicitly cast to Error
    console.error("❌ Error fetching user:", err);

    return new NextResponse(
      JSON.stringify({ error: "Internal server error", details: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
}

}


export async function POST(req: NextRequest): Promise<Response> {
  try {
    const jsonBody = await req.json();
    console.log("📥 Received user data for creation:", jsonBody);

    const validationResult = userSchema.safeParse(jsonBody);
    if (!validationResult.success) {
      console.warn("❌ Validation error:", validationResult.error.flatten());
      return new NextResponse(
        JSON.stringify({ error: "Validation error", details: validationResult.error.flatten() }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const userData = validationResult.data;

    console.log(`🔄 Attempting upsert for Telegram ID: ${userData.telegramId}`);

    const user = await prisma.user.upsert({
      where: { telegramId: userData.telegramId },
      update: {
        username: userData.username,
        firstName: userData.first_name,
        lastName: userData.last_name,
        points: userData.points,
        tappingRate: userData.tappingRate,
        hasClaimedWelcome: userData.hasClaimedWelcome,
        nft: userData.nft,
        updatedAt: new Date(),
      },
      create: {
        telegramId: userData.telegramId,
        username: userData.username,
        firstName: userData.first_name,
        lastName: userData.last_name,
        points: userData.points,
        tappingRate: userData.tappingRate,
        hasClaimedWelcome: userData.hasClaimedWelcome,
        nft: userData.nft,
      },
    });

    console.log("✅ Upsert successful, returning user:", user);

    return new NextResponse(
      JSON.stringify({ ...user, telegramId: user.telegramId.toString() }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    const err = error as Error; // Explicitly cast to Error
    console.error("❌ Error processing user creation request:", err);

    return new NextResponse(
      JSON.stringify({ error: "Internal server error", details: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
}

}

