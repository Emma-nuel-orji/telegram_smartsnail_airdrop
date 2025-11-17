import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Helper: serialize BigInt
function serializeBigInt(obj: any): any {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export async function GET() {
  try {
    const upcomingFights = await prisma.fight.findMany({
      where: {
        fightDate: { gte: new Date() },
        status: "SCHEDULED",
      },
      orderBy: { fightDate: "asc" },
      include: {
        fighter1: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            telegramId: true,
            socialMedia: true,
            gender: true,
          },
        },
        fighter2: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            telegramId: true,
            socialMedia: true,
            gender: true,
          },
        },
        stakes: true, // optional, if you want stake info
        winner: {
          select: { id: true, name: true, imageUrl: true },
        },
      },
    });

    // Replace missing fighters with null to avoid frontend crash
    const sanitizedFights = upcomingFights.map((fight) => ({
      ...fight,
      fighter1: fight.fighter1 || null,
      fighter2: fight.fighter2 || null,
      winner: fight.winner || null,
    }));

    return NextResponse.json(serializeBigInt(sanitizedFights));
  } catch (error) {
    console.error("Error fetching upcoming fights:", error);
    return NextResponse.json(
      { error: "Failed to fetch fights" },
      { status: 500 }
    );
  }
}
