import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';
import { sendRedemptionEmail } from '@/src/utils/emailUtils';
import { ObjectId } from "mongodb";

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

    const { userId, uniqueCode, referrerId: referrerTelegramId, email }: RedemptionRequest = body;


    // Validate required input fields
    if (!userId || !uniqueCode || !email) {
      console.error("❌ Missing required fields:", { userId, uniqueCode, email });
      return NextResponse.json(
        { error: 'Missing required fields: userId, uniqueCode, or email.' },
        { status: 400 }
      );
    }

    // Check if the unique code exists and whether it has already been redeemed
    const code = await prisma.generatedCode.findUnique({
      where: { code: uniqueCode },
    });
    
    if (!code) {
      return NextResponse.json(
        { error: 'Invalid code. Please check your input.' },
        { status: 400 }
      );
    }
    
    if (code.isRedeemed) {
      return NextResponse.json(
        { error: 'Code already redeemed. Please try another one.' },
        { status: 400 }
      );
    }

    // ✅ Special Case: If referrerId is "SMARTSNAIL", skip validation and reward directly
    if (referrerTelegramId?.trim() === "SMARTSNAIL") {

      await prisma.generatedCode.update({
        where: { code: uniqueCode },
        data: {
          isRedeemed: true,
          redeemedAt: new Date(),
          redeemedBy: userId,
        },
      });

      // Reward the user with 100,000 points
      await prisma.user.update({
        where: { id: userId },
        data: { points: { increment: 100000 } },
      });

      // Send confirmation email
      await sendRedemptionEmail(email);

      return NextResponse.json({
        success: true,
        message: 'Code redeemed successfully with SMARTSNAIL!',
      });
    }

    // ✅ Validate the referrer ID or fetch dynamically if not provided
    const validatedReferrerId = await getReferrerId(userId, referrerTelegramId);

    
    if (!validatedReferrerId) {
      return NextResponse.json(
        { error: 'Invalid or missing referrer ID.' },
        { status: 400 }
      );
    }

    // Mark the code as redeemed
    await prisma.generatedCode.update({
      where: { code: uniqueCode },
      data: {
        isRedeemed: true,
        redeemedAt: new Date(),
        redeemedBy: userId,
      },
    });

    // Reward the user with 100,000 points
    await prisma.user.update({
      where: { id: userId },
      data: { points: { increment: 100000 } },
    });

    // Reward the referrer with 30,000 points
    await prisma.user.update({
      where: { id: validatedReferrerId },
      data: { points: { increment: 30000 } },
    });

    // Send confirmation email
    await sendRedemptionEmail(email);

    return NextResponse.json({
      success: true,
      message: 'Code redeemed successfully! You have earned 100,000 Shells.',
    });

  } catch (error) {
    console.error('❌ Error processing request:', error);
    return NextResponse.json(
      { error: 'Internal Server Error. Please try again later.' },
      { status: 500 }
    );
  }
}

// ✅ Helper function to validate or fetch the referrer ID
async function getReferrerId(userId: string, referrerTelegramId?: string): Promise<string | null> {
  try {
    if (referrerTelegramId) {
      referrerTelegramId = referrerTelegramId.trim(); // ✅ Trim spaces

      if (referrerTelegramId === "SMARTSNAIL") {
        return "SMARTSNAIL"; // ✅ Special case
      }

      if (!/^\d+$/.test(referrerTelegramId)) { // ✅ Ensure it's a valid number
        console.error("❌ Invalid referrer Telegram ID:", referrerTelegramId);
        return null;
      }

      // Convert to BigInt and validate in the database
      const referrer = await prisma.user.findUnique({ 
        where: { telegramId: BigInt(referrerTelegramId) } 
      });

      return referrer ? referrerTelegramId : null;
    }

    // Fetch referrer from the referral table (if not provided)
    const referral = await prisma.referral.findFirst({
      where: { referredId: BigInt(userId) }, 
      select: { referrerId: true },
    });

    return referral?.referrerId ? referral.referrerId.toString() : null;

  } catch (error) {
    console.error("Error validating or fetching referrer ID:", error);
    return null;
  }
}

