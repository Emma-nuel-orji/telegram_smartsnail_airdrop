import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Helper function to serialize BigInt values
function serializeBigInt(obj: any): any {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
}

export async function GET() {
  try {
    const now = new Date();
    
    const upcomingFights = await prisma.fight.findMany({
      where: {
        fightDate: {
          gte: now,
        },
        status: "SCHEDULED", // Keep your original filter
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
        // Add winner to the query
        winner: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log('Upcoming fights found:', upcomingFights.length);

    // Transform to match frontend interface
    const transformedFights = upcomingFights.map(fight => ({
      id: fight.id.toString(),
      title: fight.title,
      fightDate: fight.fightDate.toISOString(),
      status: fight.status,
      winnerId: fight.winnerId?.toString() || undefined, // Change null to undefined
      fighter1: {
        id: fight.fighter1.id.toString(),
        name: fight.fighter1.name,
        gender: fight.fighter1.gender,
        imageUrl: fight.fighter1.imageUrl,
        telegramId: fight.fighter1.telegramId,
        socialMedia: fight.fighter1.socialMedia,
      },
      fighter2: {
        id: fight.fighter2.id.toString(),
        name: fight.fighter2.name,
        gender: fight.fighter2.gender,
        imageUrl: fight.fighter2.imageUrl,
        telegramId: fight.fighter2.telegramId,
        socialMedia: fight.fighter2.socialMedia,
      },
    }));

    // Serialize BigInt values before returning
    const serializedFights = serializeBigInt(transformedFights);

    return NextResponse.json(serializedFights);
  } catch (error) {
    console.error("Error fetching upcoming fights:", error);
    return NextResponse.json({ error: "Failed to fetch fights" }, { status: 500 });
  }
}