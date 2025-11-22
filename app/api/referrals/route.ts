// app/api/referrals/route.ts - Fixed version
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';

export async function POST(req: NextRequest) {
  console.log("Referral API endpoint called");
  
  try {
    const data = await req.json();
    console.log("Referral request data:", data);
    
    // Validate input data
    if (!data.userTelegramId || !data.referrerTelegramId) {
      console.error("Missing required fields");
      return NextResponse.json(
        { error: "Missing required fields: userTelegramId or referrerTelegramId" },
        { status: 400 }
      );
    }
    
    // Convert to BigInt
    const userTelegramId = BigInt(data.userTelegramId);
    const referrerTelegramId = BigInt(data.referrerTelegramId);
    
    // Validate that the IDs are valid
    if (userTelegramId === BigInt(0) || referrerTelegramId === BigInt(0)) {
      console.error("Invalid Telegram IDs");
      return NextResponse.json(
        { error: "Invalid Telegram IDs" },
        { status: 400 }
      );
    }
    
    // Prevent self-referrals
    if (userTelegramId === referrerTelegramId) {
      console.error("Self-referral attempted");
      return NextResponse.json(
        { error: "Self-referrals are not allowed" },
        { status: 400 }
      );
    }
    
    // Check if the referrer exists
    const referrer = await prisma.user.findUnique({
      where: { telegramId: referrerTelegramId }
    });
    
    if (!referrer) {
      console.error(`Referrer with telegramId ${referrerTelegramId.toString()} not found`);
      return NextResponse.json(
        { error: "Referrer not found" },
        { status: 400 }
      );
    }
    
    // Check if the user exists
    const user = await prisma.user.findUnique({
      where: { telegramId: userTelegramId }
    });
    
    if (!user) {
      console.error(`User with telegramId ${userTelegramId.toString()} not found`);
      return NextResponse.json(
        { error: "User not found" },
        { status: 400 }
      );
    }
    
    // Check if a referral already exists for this user
    const existingReferral = await prisma.referral.findFirst({
      where: { referredId: userTelegramId }
    });
    
    if (existingReferral) {
      console.error(`Referral already exists for user ${userTelegramId.toString()}`);
      return NextResponse.json(
        { error: "Referral already exists for this user" },
        { status: 400 }
      );
    }
    
    // Create the referral
    const referral = await prisma.referral.create({
      data: {
        referrerId: referrerTelegramId,
        referredId: userTelegramId
      }
    });
    
    console.log(`Referral created successfully: ${referral.id}`);
    
    // Update the referrer's points/rewards (customize as needed)
    await prisma.user.update({
      where: { telegramId: referrerTelegramId },
      data: {
        points: { increment: 10 } // Award 10 points for successful referral
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      referral: {
        ...referral,
        referrerId: referral.referrerId.toString(),
        referredId: referral.referredId.toString()
      }
    });
    
  } catch (error) {
    console.error("Error processing referral:", error);
    return NextResponse.json(
      { error: "Internal server error processing referral" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("telegramId");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing telegramId" },
        { status: 400 }
      );
    }

    // 1. Get referrals including referred user details
    const referrals = await prisma.referral.findMany({
      where: { referrerId: BigInt(userId) },
      include: {
        referred: true, // MUST have relation in Prisma schema
      },
    });

    // 2. Get the referrer (who referred THIS user)
    const referrer = await prisma.referral.findFirst({
      where: { referredId: BigInt(userId) },
    });

    let referrerUser = null;
    if (referrer) {
      referrerUser = await prisma.user.findUnique({
        where: { telegramId: referrer.referrerId },
      });
    }

    // 3. FINAL RETURN — place this EXACTLY here
    return NextResponse.json({
      referrals: referrals.map((r) => ({
        telegramId: r.referred.telegramId.toString(),
        username: r.referred.username || null,
        createdAt: r.referred.createdAt || null,
      })),
      referrer: referrer
        ? {
            telegramId: referrer.referrerId.toString(),
            username: referrerUser?.username || null,
            createdAt: referrerUser?.createdAt || null,
          }
        : null,
    });

  } catch (error) {
    console.error("Error fetching referral data:", error);
    return NextResponse.json(
      { error: "Failed to fetch referral data" },
      { status: 500 }
    );
  }
}
