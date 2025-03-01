import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';

// Helper function to safely serialize user data
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

// GET User by Telegram ID
export async function GET(
  req: NextRequest,
  { params }: { params: { telegramId: string } }
): Promise<Response> {
  try {
    // if (!/^[0-9]+$/.test(params.telegramId)) {
    //   return NextResponse.json({ error: "Invalid Telegram ID format" }, { status: 400 });
    // }

    const user = await prisma.user.findFirst({ where: { telegramId: BigInt(params.telegramId) } });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(serializeUser(user));
  } catch (error) {
    return NextResponse.json({ error: "Internal server error", details: (error as Error).message }, { status: 500 });
  }
}
