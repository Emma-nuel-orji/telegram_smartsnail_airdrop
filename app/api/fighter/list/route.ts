import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { fighterId, price } = await req.json();

    if (!fighterId || price === undefined) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    // Update the asset status and price
    const updatedFighter = await prisma.fighter.update({
      where: { id: fighterId },
      data: {
        status: "ON_SALE",     // This makes it visible in recruitment/page.tsx
        salePriceTon: price,   // The price set in the prompt
      },
    });

    return NextResponse.json({ success: true, fighter: updatedFighter });
  } catch (error) {
    console.error("Listing error:", error);
    return NextResponse.json({ error: "Failed to list fighter" }, { status: 500 });
  }
}