import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateTelegramUser } from "@/lib/auth";

/**
 * Serializes the User object to ensure BigInts and Dates 
 * are converted to JSON-friendly formats.
 */
function serializeUser(user: any) {
  if (!user) return null;
  return {
    id: user.id.toString(),
    telegramId: user.telegramId.toString(),
    username: user.username || "",
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    nickname: user.nickname || null,
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
    
    // 1. Basic Auth Guard
    if (!auth.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (auth.telegramId.toString() !== params.telegramId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tId = BigInt(params.telegramId);

    // 2. Parallel Fetch: Get User Data and Admin Status at the same time
    const [dbUser, adminRecord] = await Promise.all([
      prisma.user.findUnique({
        where: { telegramId: tId },
        include: { 
          athleteProfile: { include: { nft: true } },
          purchases: true 
        },
      }),
      prisma.admin.findUnique({
        where: { telegramId: tId }
      })
    ]);

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 3. Calculate totals from the purchase history (Bags and Relations)
    const totals = dbUser.purchases.reduce((acc, p) => ({
      fxckedUpBagsQty: acc.fxckedUpBagsQty + (p.fxckedUpBagsQty || 0),
      humanRelationsQty: acc.humanRelationsQty + (p.humanRelationsQty || 0)
    }), { fxckedUpBagsQty: 0, humanRelationsQty: 0 });

    // 4. Serialize core user data
    const serializedUser = serializeUser(dbUser);

    // 5. Merge everything into the final response
    return NextResponse.json({
      ...serializedUser,
      ...totals,
      // Admin logic based on your Admin model
      isAdmin: !!adminRecord, 
      isSuperAdmin: adminRecord?.permissions?.includes('SUPERADMIN') || false,
      permissions: adminRecord?.permissions || [],
    });

  } catch (error) {
    console.error("GET USER ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}