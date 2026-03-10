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
          select: { id: true, ownerId: true } // Added id for the update
        });

        if (!fighter) {
          return NextResponse.json({ error: "Fighter not found" }, { status: 404 });
        }

        // 🚨 THE FIX: Handle Genesis (null) owners
        if (fighter.ownerId === null) {
          console.log("Genesis fighter detected. Assigning owner...");
          await prisma.fighter.update({
            where: { id: fighterId },
            data: { ownerId: userId.toString() }
          });
        } 
        // Normal check if an owner already exists
        else if (fighter.ownerId.toString() !== userId.toString()) {
          return NextResponse.json({ 
            error: "Unauthorized: You do not own this fighter" 
          }, { status: 403 });
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
        status: "PENDING",       // Or whatever your default status is
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