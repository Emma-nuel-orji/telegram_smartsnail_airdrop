import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function stringifyBigInts(obj: any) {
  return JSON.parse(
    JSON.stringify(obj, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export async function GET() {
  try {
    const upcomingFights = await prisma.fight.findMany({
      where: {
        fightDate: {
          gte: new Date(),
        },
        status: "SCHEDULED",
      },
      orderBy: {
        fightDate: "asc",
      },
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
      },
    });

    return NextResponse.json(upcomingFights);
  } catch (error) {
    console.error("Error fetching upcoming fights:", error);
    return NextResponse.json({ error: "Failed to fetch fights" }, { status: 500 });
  }
}
