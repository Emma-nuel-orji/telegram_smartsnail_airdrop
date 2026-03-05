import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';

// Helper function to safely serialize user data
function serializeUser(user: any) {
  return {
    ...user,
    id: user.id.toString(),
    telegramId: user.telegramId.toString(),
    points: Number(user.points),
    // 1. Serialize the Fighter profile
    athleteProfile: user.athleteProfile ? {
      ...user.athleteProfile,
      id: user.athleteProfile.id.toString(),
      userTelegramId: user.athleteProfile.userTelegramId?.toString(),
      points: Number(user.athleteProfile.points || 0),
      height: Number(user.athleteProfile.height || 0),
      weight: Number(user.athleteProfile.weight || 0),
      nft: user.athleteProfile.nft ? {
        ...user.athleteProfile.nft,
        id: user.athleteProfile.nft.id.toString(),
        priceTon: Number(user.athleteProfile.nft.priceTon || 0),
        priceStars: Number(user.athleteProfile.nft.priceStars || 0),
      } : null
    } : null,
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
    // Ensure telegramId is a valid number before converting it to BigInt
    if (!/^\d+$/.test(params.telegramId)) {
      return NextResponse.json({ error: "Invalid Telegram ID format" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { telegramId: BigInt(params.telegramId) },
      include: { 
        athleteProfile: {
          include: { nft: true } 
        }
        
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(serializeUser(user));
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error", details: (error as Error).message },
      { status: 500 }
    );
  }
}
