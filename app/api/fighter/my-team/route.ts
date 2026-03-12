import { prisma } from '@/prisma/client';
import { NextResponse } from 'next/server';

const SUPER_ADMIN_ID = process.env.NEXT_PUBLIC_ADMIN_TELEGRAM_ID;

// app/api/fighter/my-team/route.ts

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) return NextResponse.json([]);

    // ✅ Fix 1: Ensure we compare strings to strings
    const isAdmin = userId.toString() === SUPER_ADMIN_ID?.toString();

    let fighters;
console.log("DEBUG:", { userId, SUPER_ADMIN_ID, match: userId === SUPER_ADMIN_ID });
    if (isAdmin) {
      // ADMIN VIEW: Everything owned by admin OR everything with NO owner
      fighters = await prisma.fighter.findMany({
        where: {
          OR: [
            { ownerId: SUPER_ADMIN_ID },
            { ownerId: null },
            // Also include by collection name just in case
            { collection: { name: { in: ["SmartSnail", "Manchies"] } } }
          ]
        },
        include: { collection: true, owner: true }
      });
    } else {
      // USER VIEW: Strictly what they own
      fighters = await prisma.fighter.findMany({
        where: { ownerId: userId.toString() },
        include: { collection: true }
      });
    }

    const serializedFighters = JSON.parse(
      JSON.stringify(fighters, (_, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    );

    return NextResponse.json(serializedFighters);

  } catch (error) {
    console.error("Roster Fetch Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}