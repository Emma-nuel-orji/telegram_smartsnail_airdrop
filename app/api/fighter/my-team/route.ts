import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();
const SUPER_ADMIN_ID = "795571382"; // Replace with your actual TG ID string

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) return NextResponse.json([]);

  try {
    let fighters;

    // 1. Fetch the data from the database
    if (userId === SUPER_ADMIN_ID) {
      fighters = await prisma.fighter.findMany({
        include: { collection: true, owner: true }
      });
    } else {
      fighters = await prisma.fighter.findMany({
        where: { ownerId: userId }, // Adjust this if you use 'owner' relation ID
        include: { collection: true }
      });
    }

    // 2. CONVERT BIGINT TO STRING BEFORE SENDING
    // This is the part you were asking about. It sits right before the return.
    const serializedFighters = JSON.parse(
      JSON.stringify(fighters, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );

    // 3. Return the clean, JSON-friendly data
    return NextResponse.json(serializedFighters);

  } catch (error) {
    console.error("Roster Fetch Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}