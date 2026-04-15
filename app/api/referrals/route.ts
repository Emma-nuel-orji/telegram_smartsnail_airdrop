// app/api/referrals/route.ts - Fixed version
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const userTelegramId = BigInt(data.userTelegramId);
    const referrerTelegramId = BigInt(data.referrerTelegramId);

    if (userTelegramId === referrerTelegramId) {
      return NextResponse.json({ error: "Self-referral" }, { status: 400 });
    }

    // 1. Handle existing referral immediately to save resources
    const existing = await prisma.referral.findUnique({
      where: { referredId: userTelegramId }
    });

    if (existing) {
      return NextResponse.json({ existing: true });
    }

    /* 🎯 THE FIX: Instead of failing, we verify the referrer exists.
       We don't strictly check the NEW user here because they might be 
       mid-creation. We focus on the REFERRER.
    */
    const referrer = await prisma.user.findUnique({ 
      where: { telegramId: referrerTelegramId } 
    });

    if (!referrer) {
      console.log("❌ Referrer not found in DB");
      return NextResponse.json({ error: "Referrer not found" }, { status: 400 });
    }

    // 2. Create the referral and reward the referrer in a TRANSACTION
    // This ensures both happen or neither happens.
    await prisma.$transaction([
      prisma.referral.create({
        data: {
          referrerId: referrerTelegramId,
          referredId: userTelegramId,
        }
      }),
      prisma.user.update({
        where: { telegramId: referrerTelegramId },
        data: {
          points: { increment: 20000 }
        }
      })
    ]);

    console.log(`✅ Referral success: ${userTelegramId} referred by ${referrerTelegramId}`);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    // Catch the specific Prisma error if the "referredId" (the new user) 
    // actually doesn't exist in the User table yet.
    if (error.code === 'P2003') { 
      console.log("⏳ Race condition: User record not ready yet.");
      return NextResponse.json({ error: "User record still initializing" }, { status: 429 });
    }
    
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