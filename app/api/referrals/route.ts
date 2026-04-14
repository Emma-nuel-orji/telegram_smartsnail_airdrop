// app/api/referrals/route.ts - Fixed version
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';

export async function POST(req: NextRequest) {
  console.log("🚀 Referral API HIT");

  try {
    const data = await req.json();
    console.log("📦 Incoming data:", data);

    const userTelegramId = BigInt(data.userTelegramId);
    const referrerTelegramId = BigInt(data.referrerTelegramId);

    console.log("🔍 Parsed IDs:", {
      user: userTelegramId.toString(),
      referrer: referrerTelegramId.toString()
    });

    if (userTelegramId === referrerTelegramId) {
      console.log("❌ Self referral blocked");
      return NextResponse.json({ error: "Self-referral" }, { status: 400 });
    }

    // Check existing referral
    const existing = await prisma.referral.findUnique({
      where: {
        referredId: userTelegramId
      }
    });

    if (existing) {
      console.log("⚠️ Referral already exists");
      return NextResponse.json({ existing: true });
    }

    // Ensure users exist
    const [user, referrer] = await Promise.all([
      prisma.user.findUnique({ where: { telegramId: userTelegramId } }),
      prisma.user.findUnique({ where: { telegramId: referrerTelegramId } }),
    ]);

    if (!user || !referrer) {
      console.log("❌ User or referrer missing");
      return NextResponse.json({ error: "User or referrer not found" }, { status: 400 });
    }

    // Create referral
    const referral = await prisma.referral.create({
      data: {
        referrerId: referrerTelegramId,
        referredId: userTelegramId,
      }
    });

    console.log("✅ Referral CREATED:", referral.id);

    // 🎯 REWARD
    await prisma.user.update({
      where: { telegramId: referrerTelegramId },
      data: {
        points: { increment: 20000 } // 🔥 FIXED VALUE
      }
    });

    console.log("💰 Reward sent to:", referrerTelegramId.toString());

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("🔥 Referral ERROR:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const telegramId = req.nextUrl.searchParams.get("telegramId");

    if (!telegramId) {
      return NextResponse.json({ error: "Missing telegramId" }, { status: 400 });
    }

    const userId = BigInt(telegramId);

    console.log("🔍 Fetching referrals for:", telegramId);

    // ✅ Get referrals
    const referrals = await prisma.referral.findMany({
      where: { referrerId: userId },
      include: {
        referred: true
      }
    });

    console.log("👥 Found referrals:", referrals.length);

    // ✅ Get referrer
    const referrerRecord = await prisma.referral.findUnique({
      where: { referredId: userId },
      include: {
        referrer: true
      }
    });

    const referrerUser = referrerRecord?.referrer || null;

    return NextResponse.json({
      referrals: referrals.map(r => ({
        telegramId: r.referred.telegramId.toString(),
        username: r.referred.username,
        createdAt: r.referred.createdAt
      })),

      referrer: referrerUser
        ? {
            telegramId: referrerUser.telegramId.toString(),
            username: referrerUser.username,
          }
        : null,

      totalEarned: referrals.length * 20000,
      pendingRewards: 0,
      referralRate: 20000,
    });

  } catch (error) {
    console.error("🔥 GET ERROR:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}