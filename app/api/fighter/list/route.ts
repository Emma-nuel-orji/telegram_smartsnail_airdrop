import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { fighterId, price, userId } = await req.json();

    if (!fighterId || price === undefined || !userId) {
      return NextResponse.json({ error: "Missing fighterId, price, or userId" }, { status: 400 });
    }

   // 1. OWNERSHIP CHECK
const fighter = await prisma.fighter.findUnique({
  where: { id: fighterId },
  select: { id: true, ownerId: true }
});

if (!fighter) {
  return NextResponse.json({ error: "Fighter not found" }, { status: 404 });
}

// 🚨 REMOVE THE "GENESIS FIX" THAT ASSIGNS OWNERID HERE
// Only allow the listing if the owner is NULL (Genesis) OR matches the Admin ID
const isAdmin = userId.toString() === process.env.NEXT_PUBLIC_ADMIN_TELEGRAM_ID;

if (fighter.ownerId !== null && fighter.ownerId.toString() !== userId.toString()) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}

// 2. Update status and price BUT LEAVE ownerId ALONE
const updatedFighter = await prisma.fighter.update({
  where: { id: fighterId },
  data: {
    status: "ON_SALE",     
    isForSale: true,       
    salePriceTon: price,   
    // ❌ DO NOT include ownerId: userId here!
  },
});

    // 3. BIGINT FIX: Convert BigInts to strings before sending to the browser
    const safeData = JSON.parse(
      JSON.stringify(updatedFighter, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );

    return NextResponse.json({ success: true, fighter: safeData });

  } catch (error: any) {
  console.error("Listing error FULL:", error);
  console.error("Error message:", error?.message);
  console.error("Error stack:", error?.stack);

  return NextResponse.json(
    { error: error?.message || "Failed to list fighter" },
    { status: 500 }
  );
}}

export async function PATCH(req: Request) {
  try {
    const { fighterId, userId, withdraw } = await req.json();

    if (!fighterId || !userId || !withdraw) {
      return NextResponse.json({ error: "Missing data for withdrawal" }, { status: 400 });
    }

    // 1. OWNERSHIP CHECK (Crucial for security)
    const fighter = await prisma.fighter.findUnique({
      where: { id: fighterId },
      select: { ownerId: true }
    });

    if (!fighter) {
      return NextResponse.json({ error: "Fighter not found" }, { status: 404 });
    }

    // Ensure the requester is the owner
    if (fighter.ownerId?.toString() !== userId.toString()) {
  return NextResponse.json({ error: "Unauthorized withdrawal" }, { status: 403 });
}
    // 2. WITHDRAW: Reset the listing status
    const updatedFighter = await prisma.fighter.update({
      where: { id: fighterId },
      data: {
        status: "CONTRACTED",       // Or whatever your default status is
        isForSale: false,
        salePriceTon: null,
        // salePriceShells: null, // Reset this too if you use it
      },
    });

    return NextResponse.json({ success: true, message: "Asset withdrawn from market" });

  } catch (error) {
    console.error("Withdrawal error:", error);
    return NextResponse.json({ error: "Failed to withdraw fighter" }, { status: 500 });
  }
}