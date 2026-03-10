import { prisma } from '@/prisma/client';
import { NextResponse } from 'next/server';

// app/api/fighter/available/route.ts
export async function GET() {
  try {
    const available = await prisma.fighter.findMany({
      where: {
        isForSale: true, // Only show what is actively listed
      },
      include: {
        collection: true,
        owner: true // Useful to see who is selling
      }
    });

    console.log(`Marketplace API: Found ${available.length} items`);

    const serialized = JSON.parse(
      JSON.stringify(available, (_, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    );

    return NextResponse.json(serialized);
  } catch (error) {
    console.error("Marketplace Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}