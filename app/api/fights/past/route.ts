import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const pastFights = await prisma.fight.findMany({
    where: {
      fightDate: {
        lt: new Date(),
      },
      // status: "COMPLETED", 
    },
    orderBy: {
      fightDate: "desc",
    },
    include: {
      fighter1: { select: { id: true, name: true, imageUrl: true } },
      fighter2: { select: { id: true, name: true, imageUrl: true } },
      winner: { select: { id: true } },
    },
  });

  return NextResponse.json(pastFights);
}
