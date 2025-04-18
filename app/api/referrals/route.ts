import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';

type Referral = {
  referredId: string;
  referrer: {
    username: string;
  };
};

export async function POST(request: NextRequest) {
  try {
    const { userTelegramId, referrerTelegramId } = await request.json();

    if (!userTelegramId || !referrerTelegramId) {
      return NextResponse.json({ error: 'Missing userTelegramId or referrerTelegramId' }, { status: 400 });
    }

    const userId = BigInt(userTelegramId);
    const referrerId = BigInt(referrerTelegramId);

    // Prevent self-referral
    if (userId === referrerId) {
      return NextResponse.json({ error: 'User cannot refer themselves' }, { status: 400 });
    }

    // Check if the user already has a referrer
    const existingReferral = await prisma.referral.findFirst({
      where: { referredId: userId },
    });

    if (existingReferral) {
      return NextResponse.json({ error: 'User has already been referred' }, { status: 400 });
    }

    // Verify that both the referrer and referred user exist in the user table
    const [referrerExists, userExists] = await Promise.all([
      prisma.user.findUnique({ where: { telegramId: referrerId } }),
      prisma.user.findUnique({ where: { telegramId: userId } }),
    ]);

    if (!referrerExists) {
      return NextResponse.json({ error: 'Invalid referrer ID' }, { status: 400 });
    }

    if (!userExists) {
      return NextResponse.json({ error: 'User must exist before being referred' }, { status: 400 });
    }

    // Create referral
    const referral = await prisma.referral.create({
      data: {
        referrerId: referrerId,  // Ensure field names match your DB schema
        referredId: userId,
      },
    });

    return NextResponse.json({ success: true, referral });
  } catch (error) {
    console.error('Error creating referral:', error);
    return NextResponse.json({ error: 'Error saving referral' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const telegramId = request.nextUrl.searchParams.get('telegramId');

    if (!telegramId) {
      return NextResponse.json({ error: 'Missing telegramId' }, { status: 400 });
    }

    const userId = BigInt(telegramId);

    // Fetch referrer details
    const referrer = await prisma.referral.findFirst({
      where: { referredId: userId },
      select: { referrerId: true },
    });

    // Fetch referrals made by this user
    const referrals = await prisma.referral.findMany({
      where: { referrerId: userId },
      select: { referredId: true },
    });

    return NextResponse.json({
      referrals: referrals.map(r => r.referredId.toString()), // Convert BigInt to string
      referrer: referrer?.referrerId?.toString() ?? null, // Convert BigInt to string
    });
  } catch (error) {
    console.error('Error fetching referral data:', error);
    return NextResponse.json({ error: 'Error fetching referral data' }, { status: 500 });
  }
}
