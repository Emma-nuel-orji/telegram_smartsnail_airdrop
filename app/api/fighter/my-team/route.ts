import { prisma } from '@/prisma/client';
import { NextResponse } from 'next/server';

const SUPER_ADMIN_ID = process.env.NEXT_PUBLIC_ADMIN_TELEGRAM_ID;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json([]);
    }

    const isAdmin = userId === SUPER_ADMIN_ID;

    let fighters;

    if (isAdmin) {
      // Super admin: SmartSnail + Manchies + fighters owned by admin
      fighters = await prisma.fighter.findMany({
        where: {
          OR: [
            {
              collection: {
                name: "SmartSnail"
              }
            },
            {
              collection: {
                name: "Manchies"
              }
            },
            {
              ownerId: userId.toString()
            },
            { ownerId: null },
            {status: { in: ["PENDING", "ON_SALE", "CONTRACTED"] }}
          ]
        },
        include: {
          collection: true,
          owner: true
        }
      });
    } else {
      // Normal users only see their fighters
      fighters = await prisma.fighter.findMany({
        where: {
          ownerId: userId.toString()
        },
        include: {
          collection: true
        }
      });
    }

    // Fix BigInt serialization (important for Next.js)
    const serializedFighters = JSON.parse(
      JSON.stringify(fighters, (_, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    );

    return NextResponse.json(serializedFighters);

  } catch (error) {
    console.error("Roster Fetch Error:", error);
    return NextResponse.json(
      { error: "Server Error" },
      { status: 500 }
    );
  }
}