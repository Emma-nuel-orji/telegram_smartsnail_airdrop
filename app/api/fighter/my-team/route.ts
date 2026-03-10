import { prisma } from '@/prisma/client';
import { NextResponse } from 'next/server';

const SUPER_ADMIN_ID = process.env.NEXT_PUBLIC_ADMIN_TELEGRAM_ID;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) return NextResponse.json([]);

    const isAdmin = userId === SUPER_ADMIN_ID;

    let fighters;

    if (isAdmin) {
      fighters = await prisma.fighter.findMany({
        where: {
          OR: [
            // Genesis fighters from official collections (no owner)
            {
            collection: { name: { in: ["SmartSnail", "Manchies"] } },
          OR: [
            { ownerId: null },
            { ownerId: undefined }
          ]
            },
            // Fighters the admin personally signed/owns
            { ownerId: SUPER_ADMIN_ID }
          ]
        },
        include: { collection: true, owner: true }
      });

    } else {
      // Private managers: ONLY fighters explicitly assigned to them
      // Strict ownerId match — never leaks genesis/collection fighters
      fighters = await prisma.fighter.findMany({
        where: {
          ownerId: userId.toString()
          // ownerId: null fighters are NEVER returned here
        },
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