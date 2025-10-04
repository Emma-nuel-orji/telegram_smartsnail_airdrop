import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const pastFights = await prisma.fight.findMany({
      where: {
        fightDate: { lt: new Date() },
        status: { in: ["SCHEDULED", "EXPIRED", "COMPLETED", "CANCELLED"] },
      },
      orderBy: { fightDate: "desc" },
      include: {
        fighter1: { select: { id: true, name: true, imageUrl: true } },
        fighter2: { select: { id: true, name: true, imageUrl: true } },
        winner: { select: { id: true, name: true, imageUrl: true } }, // so you can display winner’s image
      },
    });

    return NextResponse.json(pastFights);
  } catch (error) {
    console.error("Error fetching past fights:", error);
    return NextResponse.json({ error: "Failed to fetch past fights" }, { status: 500 });
  }
}
