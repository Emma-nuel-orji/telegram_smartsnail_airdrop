// app/api/referrals/route.ts - Fixed version
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    console.log("🚀 API HIT: Received referral data:", data);

    const { userTelegramId, referrerTelegramId } = data;

    const uId = BigInt(userTelegramId);
    const rId = BigInt(referrerTelegramId);

    // 🔍 DEBUG LOG 3: Check Referrer Existence
    const referrer = await prisma.user.findUnique({ where: { telegramId: rId } });
    if (!referrer) {
      console.log(`❌ FAIL: Referrer ${rId} does not exist in the database yet.`);
      return NextResponse.json({ error: "Referrer not found" }, { status: 400 });
    }

    // 🔍 DEBUG LOG 4: Check if referral already exists
    const existing = await prisma.referral.findUnique({ where: { referredId: uId } });
    if (existing) {
      console.log(`ℹ️ INFO: User ${uId} is already someone's referral.`);
      return NextResponse.json({ existing: true });
    }

    // Transaction
    await prisma.$transaction([
      prisma.referral.create({ data: { referrerId: rId, referredId: uId } }),
      prisma.user.update({
        where: { telegramId: rId },
        data: { points: { increment: 20000 } }
      })
    ]);

    console.log(`✅ SUCCESS: ${uId} linked to ${rId}. 20k points awarded.`);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("🔥 DATABASE CRASH:", error.message);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
// Replace the GET logic in your route.ts with this
export async function GET(req: NextRequest) {
  try {
    const telegramId = req.nextUrl.searchParams.get("telegramId");
    if (!telegramId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const userId = BigInt(telegramId);

    const referrals = await prisma.referral.findMany({
      where: { referrerId: userId },
      select: {
        referred: { // Using select here is safer than 'include'
          select: {
            telegramId: true,
            username: true,
            createdAt: true,
          }
        }
      }
    });

    // Manually filter out any null results to avoid the crash
    const validReferrals = referrals
      .filter(r => r.referred !== null)
      .map(r => ({
        telegramId: r.referred!.telegramId.toString(),
        username: r.referred!.username,
        createdAt: r.referred!.createdAt
      }));

    return NextResponse.json({
      referrals: validReferrals,
      totalEarned: validReferrals.length * 10000,
      referralRate: 10000,
    });

  } catch (error) {
    console.error("🔥 GET ERROR:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}