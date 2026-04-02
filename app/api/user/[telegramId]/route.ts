import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';

// Helper function to safely serialize user data
function serializeUser(user: any) {
  if (!user) return null;

  return {
    // Basic Info
    id: user.id.toString(),
    telegramId: user.telegramId.toString(),
    username: user.username || "",
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    
    // Currency & Stats (Convert BigInt to Number)
    points: Number(user.points || 0),
    tappingRate: user.tappingRate || 1,
    consecutiveWins: Number(user.consecutiveWins || 0),
    totalManagerEarnings: Number(user.totalManagerEarnings || 0),
    hasClaimedWelcome: !!user.hasClaimedWelcome,

    // Athlete Profile logic
    athleteProfile: user.athleteProfile ? {
      id: user.athleteProfile.id.toString(),
      name: user.athleteProfile.name,
      points: Number(user.athleteProfile.points || 0),
      status: user.athleteProfile.status,
      // Nested NFT
      nft: user.athleteProfile.nft ? {
        id: user.athleteProfile.nft.id.toString(),
        name: user.athleteProfile.nft.name,
        // Add other NFT fields here, ensuring Numbers for BigInts
      } : null
    } : null,

    // Dates
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
    console.log("GET /api/user/[id] - Requested ID:", params.telegramId);

    if (!/^\d+$/.test(params.telegramId)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { telegramId: BigInt(params.telegramId) },
      include: { 
        athleteProfile: { include: { nft: true } } 
      }
    });

    if (!user) {
      console.log("GET /api/user/[id] - User not found in DB");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("GET /api/user/[id] - User found, starting serialization...");
    
    // Log the structure of athleteProfile to see if it's what we expect
    console.log("AthleteProfile Check:", !!user.athleteProfile, "NFT Check:", !!user.athleteProfile?.nft);

    const admin = await prisma.admin.findFirst({
  where: { telegramId: BigInt(params.telegramId) }
});

    const serialized = serializeUser(user);
    return NextResponse.json({
  ...serialized,
  nickname: user.username || null,       
  name: user.firstName || null,           
  permissions: admin?.permissions || [], 
});
  } catch (error) {
    console.error("GET /api/user/[id] - CRITICAL ERROR:", error);
    return NextResponse.json(
      { error: "Internal server error", details: (error as Error).message },
      { status: 500 }
    );
  }
}
