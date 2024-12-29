import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Type definition for referral
type Referral = {
  referredId: string;
  referrer: {
    username: string;
  };
};

export async function POST(request: NextRequest) {
  try {
    const { userId, referrerId } = await request.json();

    // Validate input
    if (!userId || !referrerId) {
      return NextResponse.json({ error: 'Missing userId or referrerId' }, { status: 400 });
    }

    // Check if the user already has a referral
    const existingReferral = await prisma.referral.findFirst({
      where: { referrerId, referredId: userId }, 
    });

    if (existingReferral) {
      return NextResponse.json({ error: 'User has already been referred' }, { status: 400 });
    }

    // Create the referral
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
    const userId = request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Fetch referrer details
    const referrer = await prisma.referral.findFirst({
      where: { referrerId: userId }, 
      include: { referrer: true }, 
    });

    // Fetch referrals made by this user
    const referrals = await prisma.referral.findMany({
      where: { referrerId: userId },
      select: { referredId: true }, 
    });

    return NextResponse.json({
      referrals: referrals.map(r => r.referredId),
      referrer: referrer?.referrer?.username ?? null,
    });
  } catch (error) {
    console.error('Error fetching referral data:', error);
    return NextResponse.json({ error: 'Error fetching referral data' }, { status: 500 });
  }
}
