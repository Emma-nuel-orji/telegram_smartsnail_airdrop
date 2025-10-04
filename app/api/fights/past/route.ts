import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function serializeBigInt(obj: any): any {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export async function GET() {
  try {
    const now = new Date();

    const pastFights = await prisma.fight.findMany({
      where: {
        fightDate: { lt: now },
        status: {
          in: ["COMPLETED", "CANCELLED", "DRAW", "EXPIRED"], // ✅ multiple statuses
        },
      },
      orderBy: { fightDate: "desc" },
      include: {
        fighter1: true,
        fighter2: true,
        winner: true,
      },
    });

    const transformedFights = pastFights.map((fight) => {
      // If it's still marked as SCHEDULED but already in the past → treat as EXPIRED
      const effectiveStatus =
        fight.status === "SCHEDULED" && fight.fightDate < now
          ? "EXPIRED"
          : fight.status;

      return {
        id: fight.id.toString(),
        title: fight.title,
        fightDate: fight.fightDate.toISOString(),
        status: effectiveStatus,
        winnerId: fight.winnerId?.toString() || undefined,
        winner: fight.winner
          ? {
              id: fight.winner.id.toString(),
              name: fight.winner.name,
              imageUrl: fight.winner.imageUrl,
            }
          : null,
        fighter1: {
          id: fight.fighter1.id.toString(),
          name: fight.fighter1.name,
          imageUrl: fight.fighter1.imageUrl,
        },
        fighter2: {
          id: fight.fighter2.id.toString(),
          name: fight.fighter2.name,
          imageUrl: fight.fighter2.imageUrl,
        },
      };
    });

    return NextResponse.json(serializeBigInt(transformedFights));
  } catch (error) {
    console.error("Error fetching past fights:", error);
    return NextResponse.json(
      { error: "Failed to fetch fights" },
      { status: 500 }
    );
  }
}
// jjkl