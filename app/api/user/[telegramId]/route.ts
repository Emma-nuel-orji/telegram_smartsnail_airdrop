import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';
import crypto from "crypto";
import { authenticateTelegramUser } from "@/lib/auth";
function serializeUser(user: any) {
  if (!user) return null;

  return {
    id: user.id.toString(),
    telegramId: user.telegramId.toString(),
    username: user.username || "",

    first_name: user.firstName || "",
    firstName: user.firstName || "",
    last_name: user.lastName || "",
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

// ✅ SECURE GET
export async function GET(req: NextRequest): Promise<Response> {
  try {
    // 🔐 ONE SINGLE AUTH SYSTEM
    const auth = await authenticateTelegramUser(req);

    if (!auth.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const telegramId = auth.telegramId;

    // 👤 FETCH USER
    const [dbUser, admin] = await Promise.all([
      prisma.user.findUnique({
        where: { telegramId },
        include: {
          athleteProfile: { include: { nft: true } },
        },
      }),
      prisma.admin.findUnique({
        where: { telegramId },
      }),
    ]);

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ⚡ BOOST EXPIRY LOGIC
    const now = new Date();
    if (dbUser.boostExpiresAt && dbUser.boostExpiresAt < now) {
      await prisma.user.update({
        where: { telegramId },
        data: {
          tappingRate: 1,
          boostExpiresAt: null,
        },
      });

      dbUser.tappingRate = 1;
      dbUser.boostExpiresAt = null;
    }

    // 📦 RESPONSE
    const serialized = serializeUser(dbUser);

    return NextResponse.json({
      ...serialized,
      nickname: dbUser.username || null,
      name: dbUser.firstName || null,
      permissions: admin?.permissions || [],
      isAdmin: !!admin,
      isSuperAdmin: false,
    });
  } catch (error) {
    console.error("ERROR:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}