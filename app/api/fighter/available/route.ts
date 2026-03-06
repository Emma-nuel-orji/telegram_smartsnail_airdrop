import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const available = await prisma.fighter.findMany({
      where: {
        isForSale: true,
      },
      include: {
        collection: true,
        owner: true
      }
    });

    // Handle BigInt serialization
    const serialized = JSON.parse(JSON.stringify(available, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));

    return NextResponse.json(serialized);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}