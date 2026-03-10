import { prisma } from '@/prisma/client';
import { NextResponse } from 'next/server';


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
    const body = await req.json();
    const { fighterId, userId, withdraw } = body;

    if (!fighterId || !userId || !withdraw) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    const fighter = await prisma.fighter.findUnique({
      where: { id: fighterId },
      select: { ownerId: true }
    });

    if (!fighter) {
      return NextResponse.json({ error: "Fighter not found" }, { status: 404 });
    }

    const ADMIN_ID = process.env.NEXT_PUBLIC_ADMIN_TELEGRAM_ID;
    const isAdmin = userId.toString() === ADMIN_ID;

    // ✅ FIXED: Allow withdrawal if owner matches OR if admin withdrawing a null-owner fighter
    const isOwner = fighter.ownerId?.toString() === userId.toString();
    const isGenesisAdmin = fighter.ownerId === null && isAdmin;

    if (!isOwner && !isGenesisAdmin) {
      return NextResponse.json({ error: "Unauthorized withdrawal" }, { status: 403 });
    }

    await prisma.fighter.update({
      where: { id: fighterId },
      data: {
        status: "CONTRACTED",
        isForSale: false,
        salePriceTon: null,
      },
    });

    return NextResponse.json({ success: true, message: "Asset withdrawn from market" });

  } catch (error) {
    console.error("Withdrawal error:", error);
    return NextResponse.json({ error: "Failed to withdraw fighter" }, { status: 500 });
  }
}