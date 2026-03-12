import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';
import { sendRedemptionEmail } from '@/src/utils/emailUtils';

interface RedemptionRequest {
  userId: string;
  uniqueCode: string;
  referrerId?: string; 
  email: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("📩 Incoming redemption request:", body);

    const { userId, uniqueCode, referrerId, email }: RedemptionRequest = body;

    // ✅ Validate required fields
    if (!userId || !uniqueCode || !email) {
      console.error("❌ Missing required fields:", { userId, uniqueCode, email });
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // ✅ Check if the unique code exists
    const code = await prisma.generatedCode.findUnique({
      where: { code: uniqueCode },
    });

    if (!code) {
      console.error("❌ Invalid code:", uniqueCode);
      return NextResponse.json({ error: 'Invalid code. Please check your input.' }, { status: 400 });
    }

    if (code.isRedeemed) {
      console.error("❌ Code already redeemed:", uniqueCode);
      return NextResponse.json({ error: 'Code already redeemed. Please try another one.' }, { status: 400 });
    }

    // ✅ Special Case: If referrerId is "SMARTSNAIL", reward directly
    if (referrerId?.trim() === "SMARTSNAIL") {
      await prisma.generatedCode.update({
        where: { code: uniqueCode },
        data: { isRedeemed: true, redeemedAt: new Date(), redeemedBy: userId },
      });

      await prisma.user.update({
        where: { telegramId: BigInt(userId) }, // ✅ Fix: Use telegramId instead of id
        data: { points: { increment: 100000 } },
      });

      await sendRedemptionEmail(email);

      console.log("✅ Code redeemed successfully with SMARTSNAIL!");
      return NextResponse.json({ success: true, message: 'Code redeemed successfully with SMARTSNAIL!' });
    }

    // ✅ Validate the referrer ID
    const validatedReferrerId = await getReferrerId(userId, referrerId);
    if (!validatedReferrerId) {
      console.error("❌ Invalid or missing referrer ID:", referrerId);
      return NextResponse.json({ error: 'Invalid or missing referrer ID.' }, { status: 400 });
    }

    // ✅ Mark code as redeemed
    await prisma.generatedCode.update({
      where: { code: uniqueCode },
      data: { isRedeemed: true, redeemedAt: new Date(), redeemedBy: userId.toString() }, // ✅ Convert to string
    });
    
    

    // ✅ Reward user and referrer
    await prisma.user.update({
      where: { telegramId: BigInt(userId) }, // ✅ Fix: Use telegramId instead of id
      data: { points: { increment: 100000 } },
    });
    

    await prisma.user.update({
      where: { telegramId: BigInt(validatedReferrerId) }, // ✅ Fix: Use telegramId for referrer
      data: { points: { increment: 30000 } },
    });
    

    await sendRedemptionEmail(email);

    console.log("✅ Code redeemed successfully!");
    return NextResponse.json({ success: true, message: 'Code redeemed successfully! You earned 100,000 Shells.' });

  } catch (error) {
    console.error('❌ Server error processing redemption:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ✅ Helper function to validate referrer ID
async function getReferrerId(userId: string, referrerId?: string): Promise<string | null> {
  try {
    if (referrerId) {
      referrerId = referrerId.trim();
      
      if (referrerId === "SMARTSNAIL") return "SMARTSNAIL";

      if (!/^\d+$/.test(referrerId)) {
        console.error("❌ Invalid referrer Telegram ID:", referrerId);
        return null;
      }

      const referrer = await prisma.user.findUnique({ where: { telegramId: BigInt(referrerId) } });
      return referrer ? referrerId : null;
    }

    const referral = await prisma.referral.findFirst({ where: { referredId: BigInt(userId) }, select: { referrerId: true } });
    return referral?.referrerId ? referral.referrerId.toString() : null;
  } catch (error) {
    console.error("❌ Error validating referrer ID:", error);
    return null;
  }
}
