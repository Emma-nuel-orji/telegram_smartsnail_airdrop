import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateTelegramUser } from "@/lib/auth";

function serializeUser(user: any) {
  if (!user) return null;
  return {
    id: user.id.toString(),
    telegramId: user.telegramId.toString(),
    username: user.username || "",
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    points: Number(user.points || 0),
    tappingRate: user.tappingRate || 1,
    consecutiveWins: Number(user.consecutiveWins || 0),
    totalManagerEarnings: Number(user.totalManagerEarnings || 0),
    hasClaimedWelcome: !!user.hasClaimedWelcome,
    fighter: user.athleteProfile ? {
      id: user.athleteProfile.id.toString(),
      name: user.athleteProfile.name,
      height: user.athleteProfile.height || 0,
      weight: user.athleteProfile.weight || 0,
      weightClass: user.athleteProfile.weightClass || "",
      nft: user.athleteProfile.nft ? {
        id: user.athleteProfile.nft.id.toString(),
        name: user.athleteProfile.nft.name,
        imageUrl: user.athleteProfile.nft.imageUrl || "",
        collection: user.athleteProfile.nft.collection || "",
      } : null,
    } : null,
    createdAt: user.createdAt?.toISOString(),
    updatedAt: user.updatedAt?.toISOString(),
  };
}

export async function GET(
  req: NextRequest, 
  { params }: { params: { telegramId: string } }
) {
  try {
    const auth = await authenticateTelegramUser(req);
    
    // 1. Check Auth (Type-safe)
    if (!auth.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Prevent ID spoofing
    if (auth.telegramId.toString() !== params.telegramId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3. Fetch data
    const dbUser = await prisma.user.findUnique({
      where: { telegramId: BigInt(params.telegramId) },
      include: { athleteProfile: { include: { nft: true } } },
    });

    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json(serializeUser(dbUser));
  } catch (error) {
    console.error("GET USER ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}