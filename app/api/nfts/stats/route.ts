import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // 1. Count sold Legendary Snails (Limit: 600)
    const soldLegendarySnails = await prisma.nft.count({
      where: { collection: { name: 'smartsnail' }, rarity: 'Legendary', isSold: true }
    });

    // 2. Count sold Manchies (Since all are Legendary, Limit: 6000)
    const soldManchies = await prisma.nft.count({
      where: { collection: { name: 'manchies' }, isSold: true }
    });

    return NextResponse.json({
      smartsnail: {
        legendaryRemaining: 600 - soldLegendarySnails,
        legendaryTotal: 600,
        percent: Math.floor(((600 - soldLegendarySnails) / 600) * 100)
      },
      manchies: {
        remaining: 6000 - soldManchies,
        total: 6000,
        percent: Math.floor(((6000 - soldManchies) / 6000) * 100)
      }
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}