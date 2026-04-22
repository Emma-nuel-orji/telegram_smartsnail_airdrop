// app/api/referrals/route.ts - Fixed version
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { userTelegramId, referrerTelegramId } = data;

    const uId = BigInt(userTelegramId);
    const rId = BigInt(referrerTelegramId);

    // Referrer must exist
    const referrer = await prisma.user.findUnique({ where: { telegramId: rId } });
    if (!referrer) {
      return NextResponse.json({ error: "Referrer not found" }, { status: 400 });
    }

    // Already referred?
   const existing = await prisma.referral.findFirst({ where: { referredId: uId } });
    if (existing) {
      return NextResponse.json({ existing: true });
    }

    // Does the referred user exist yet?
    const referredUser = await prisma.user.findUnique({ where: { telegramId: uId } });

    if (!referredUser) {
      // ✅ User not in DB yet — save as pending, resolved on user creation
      await prisma.user.update({
        where: { telegramId: rId },
        data: { pendingReferrerId: uId }
      });
      console.log(`⏳ Referral pending: ${uId} will resolve when user is created`);
      return NextResponse.json({ pending: true });
    }

    // User exists — create referral immediately
    await prisma.$transaction([
      prisma.referral.create({ data: { referrerId: rId, referredId: uId } }),
      prisma.user.update({
        where: { telegramId: rId },
        data: { points: { increment: 20000 } }
      })
    ]);

    console.log(`✅ Referral created immediately: ${uId} → ${rId}`);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("🔥 REFERRAL ERROR:", error.message);
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