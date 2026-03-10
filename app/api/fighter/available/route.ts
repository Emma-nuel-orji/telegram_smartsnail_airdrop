import { prisma } from '@/prisma/client';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const available = await prisma.fighter.findMany({
      where: {
        isForSale: true
      },
      include: {
        collection: true
      }
    });

    const serialized = JSON.parse(
      JSON.stringify(available, (_, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    );

    return NextResponse.json(serialized);

  } catch (error) {
    console.error("Marketplace Fetch Error:", error);

    return NextResponse.json(
      { error: "Failed to fetch fighters" },
      { status: 500 }
    );
  }
}