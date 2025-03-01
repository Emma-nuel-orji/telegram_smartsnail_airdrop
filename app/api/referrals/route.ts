import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';



// Type definition for referral
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

    // Convert to BigInt
    const userId = BigInt(userTelegramId);
    const referrerId = BigInt(referrerTelegramId);

    // Check if the user has already been referred
    const existingReferral = await prisma.referral.findFirst({
      where: { referrerId, referredId: userId },
    });

    if (existingReferral) {
      return NextResponse.json({ error: 'User has already been referred' }, { status: 400 });
    }

    // Create referral
    const referral = await prisma.referral.create({
      data: {
        referrerId,
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
      referrals: referrals.map(r => r.referredId.toString()), // Convert BigInt to string for JSON
      referrer: referrer?.referrerId?.toString() ?? null, // Convert BigInt to string for JSON
    });
  } catch (error) {
    console.error('Error fetching referral data:', error);
    return NextResponse.json({ error: 'Error fetching referral data' }, { status: 500 });
  }
}

