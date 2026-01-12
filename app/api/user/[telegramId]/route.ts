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
    fighter: user.fighter ? {
      ...user.fighter,
      id: user.fighter.id.toString(),
      telegramId: user.fighter.telegramId?.toString(),
      points: Number(user.fighter.points),
      height: Number(user.fighter.height),
      weight: Number(user.fighter.weight),
      // 2. Serialize the nested NFT team data assigned by admin
      nft: user.fighter.nft ? {
        ...user.fighter.nft,
        id: user.fighter.nft.id.toString(),
        priceTon: Number(user.fighter.nft.priceTon),
        priceStars: Number(user.fighter.nft.priceStars),
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
        fighter: {
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
