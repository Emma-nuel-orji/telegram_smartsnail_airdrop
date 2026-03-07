import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { fighterId, price, userId } = await req.json();

    if (!fighterId || price === undefined || !userId) {
      return NextResponse.json({ error: "Missing fighterId, price, or userId" }, { status: 400 });
    }

    // 1. OWNERSHIP CHECK: Find the fighter and check who owns it
    const fighter = await prisma.fighter.findUnique({
      where: { id: fighterId },
      select: { ownerId: true }
    });

    if (!fighter) {
      return NextResponse.json({ error: "Fighter not found" }, { status: 404 });
    }

    // Verify the person listing it is the actual owner
    // Note: Use BigInt(userId) if your ownerId is stored as a BigInt/Telegram ID
    if (fighter.ownerId !== userId) {
      return NextResponse.json({ error: "Unauthorized: You do not own this fighter" }, { status: 403 });
    }

    // 2. Update the asset status and price
    const updatedFighter = await prisma.fighter.update({
      where: { id: fighterId },
      data: {
        status: "ON_SALE",     
        isForSale: true,       // Good to keep this boolean in sync
        salePriceTon: price,   
      },
    });

    // 3. BIGINT FIX: Convert BigInts to strings before sending to the browser
    const safeData = JSON.parse(
      JSON.stringify(updatedFighter, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );

    return NextResponse.json({ success: true, fighter: safeData });

  } catch (error) {
    console.error("Listing error:", error);
    return NextResponse.json({ error: "Failed to list fighter" }, { status: 500 });
  }
}