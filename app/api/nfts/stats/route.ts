export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // 1. Count sold Legendary Snails
    const soldLegendarySnails = await prisma.nft.count({
      where: { 
        collection: { name: 'smartsnail' }, 
        rarity: 'Legendary', 
        isSold: true 
      }
    });

    // 2. Count sold Manchies
    const soldManchies = await prisma.nft.count({
      where: { 
        collection: { name: 'manchies' }, 
        isSold: true 
      }
    });

    // Calculate remaining amounts
    const smartSnailRemaining = 600 - soldLegendarySnails;
    const manchiesRemaining = 6000 - soldManchies;

    // "Current" Logic: Bar starts at 100% and drops to 0% as items sell
    const legendaryPercent = Math.floor((smartSnailRemaining / 600) * 100);
    const manchiesPercent = Math.floor((manchiesRemaining / 6000) * 100);

    return NextResponse.json({
      smartsnail: {
        legendaryRemaining: smartSnailRemaining,
        legendaryTotal: 600,
        percent: legendaryPercent 
      },
      manchies: {
        remaining: manchiesRemaining,
        total: 6000,
        percent: manchiesPercent 
      }
    });

  } catch (error) {
    console.error("Stats Error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}