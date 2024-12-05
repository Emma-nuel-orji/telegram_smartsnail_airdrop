import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma.js';
import { sendRedemptionEmail } from '../../../../src/utils/emailUtils.js';

export async function POST(request) {
  try {
    const { userId, uniqueCode, referrerId, email } = await request.json();

    // Validate required input fields
    if (!userId || !uniqueCode || !email) {
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

    // Check if the referrerId is SMARTSNAIL (special case to bypass validation)
    if (referrerId === "SMARTSNAIL") {
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

    // Validate the referrer ID or fetch dynamically if not provided
    const validatedReferrerId = await getReferrerId(userId, referrerId);
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
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Internal Server Error. Please try again later.' },
      { status: 500 }
    );
  }
}

// Helper function to validate or fetch the referrer ID
async function getReferrerId(userId, referrerId) {
  try {
    // If referrerId is provided, validate it exists
    if (referrerId) {
      const referrer = await prisma.user.findUnique({ where: { id: referrerId } });
      return referrer ? referrerId : null;
    }

    // If referrerId is not provided, attempt to fetch it from the database
    const referral = await prisma.referral.findFirst({
      where: { referredTo: userId },
      select: { referredBy: true },
    });
    return referral?.referredBy || null;
  } catch (error) {
    console.error('Error validating or fetching referrer ID:', error);
    return null;
  }
}
