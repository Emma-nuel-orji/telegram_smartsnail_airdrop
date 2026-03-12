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
        OR: [
          { status: { in: ["COMPLETED", "CANCELLED", "DRAW", "EXPIRED"] } },
          { status: "SCHEDULED" },
        ],
      },
      orderBy: { fightDate: "desc" },
      include: {
        fighter1: { include: { collection: true } },
        fighter2: { include: { collection: true } },
        winner: { include: { collection: true } },
      },
    });

    const transformedFights = pastFights.map((fight) => ({
      id: fight.id.toString(),
      title: fight.title,
      fightDate: fight.fightDate.toISOString(),
      status: fight.status,
      winnerId: fight.winnerId?.toString() || undefined,
      
      // Fixed: Use fight.winner, fight.fighter1, and fight.fighter2
      winner: fight.winner ? transformFighterData(fight.winner) : null,
      fighter1: fight.fighter1 ? transformFighterData(fight.fighter1) : null,
      fighter2: fight.fighter2 ? transformFighterData(fight.fighter2) : null,
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

// A helper function to avoid repeating yourself and fix variable names
function transformFighterData(f: any) {
  return {
    id: f.id.toString(),
    name: f.name,
    imageUrl: f.imageUrl || null,
    telegramId: f.userTelegramId || null,
    socialMedia: f.socialMedia || null,
    ownerId: f.ownerId || null,
    isPrivate: f.isPrivate || false, // Important for your color logic!
    collection: f.collection ? {
      id: f.collection.id,
      name: f.collection.name,
      imageUrl: f.collection.imageUrl
    } : null,
  };
}