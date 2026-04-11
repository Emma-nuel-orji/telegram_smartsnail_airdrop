import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';

function serializeUser(user: any) {
  if (!user) return null;

  return {
    // Basic Info
    id: user.id.toString(),
    telegramId: user.telegramId.toString(),
    username: user.username || "",

    // Use consistent naming - both first_name AND firstName so frontend works either way
    first_name: user.firstName || "",
    firstName: user.firstName || "",
    last_name: user.lastName || "",
    lastName: user.lastName || "",

    // Currency & Stats
    points: Number(user.points || 0),
    tappingRate: user.tappingRate || 1,
    consecutiveWins: Number(user.consecutiveWins || 0),
    totalManagerEarnings: Number(user.totalManagerEarnings || 0),
    hasClaimedWelcome: !!user.hasClaimedWelcome,

    // Fighter field mapped from athleteProfile (fixes badge never showing)
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

    // Keep athleteProfile too for any other usage
    athleteProfile: user.athleteProfile ? {
      id: user.athleteProfile.id.toString(),
      name: user.athleteProfile.name,
      points: Number(user.athleteProfile.points || 0),
      status: user.athleteProfile.status,
      nft: user.athleteProfile.nft ? {
        id: user.athleteProfile.nft.id.toString(),
        name: user.athleteProfile.nft.name,
      } : null,
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

    const [user, admin] = await Promise.all([
      prisma.user.findFirst({
        where: { telegramId: BigInt(params.telegramId) },
        include: {
          athleteProfile: { include: { nft: true } }
        }
      }),
      prisma.admin.findFirst({
        where: { telegramId: BigInt(params.telegramId) }
      })
    ]);

    if (!user) {
      console.log("GET /api/user/[id] - User not found in DB");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ✅ Reset tapping rate if boost has expired
const now = new Date();
if (user.boostExpiresAt && user.boostExpiresAt < now) {
  await prisma.user.update({
    where: { telegramId: BigInt(params.telegramId) },
    data: {
      tappingRate: 1,        // back to base rate
      boostExpiresAt: null,  // clear the expiry
    }
  });

  // Update the local object so the response reflects the reset
  user.tappingRate = 1;
  user.boostExpiresAt = null;
}

    console.log("GET /api/user/[id] - User found");
    console.log("AthleteProfile:", !!user.athleteProfile, "NFT:", !!user.athleteProfile?.nft);

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