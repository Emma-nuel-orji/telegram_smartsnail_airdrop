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
        status: { in: ["COMPLETED", "CANCELLED", "DRAW", "EXPIRED"] },
      },
      orderBy: { fightDate: "desc" },
      include: {
        fighter1: true,
        fighter2: true,
        winner: true,
      },
    });

    const transformedFights = pastFights.map((fight) => ({
      id: fight.id.toString(),
      title: fight.title,
      fightDate: fight.fightDate.toISOString(),
      status:
        fight.status === "SCHEDULED" && fight.fightDate < now
          ? "EXPIRED"
          : fight.status,
      winnerId: fight.winnerId?.toString() || undefined,
      winner: fight.winner
        ? {
            id: fight.winner.id,
            name: fight.winner.name,
            imageUrl: fight.winner.imageUrl || null,
          }
        : null,
      fighter1: fight.fighter1
        ? {
            id: fight.fighter1.id,
            name: fight.fighter1.name,
            imageUrl: fight.fighter1.imageUrl || null,
          }
        : null,
      fighter2: fight.fighter2
        ? {
            id: fight.fighter2.id,
            name: fight.fighter2.name,
            imageUrl: fight.fighter2.imageUrl || null,
          }
        : null,
    }));

    return NextResponse.json(serializeBigInt(transformedFights));
  } catch (error: any) {
    console.error("Error fetching past fights:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch fights" },
      { status: 500 }
    );
  }
}
