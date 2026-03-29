import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNftData } from "@/lib/nftHelpers";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const collection = searchParams.get("collection"); 
  const rarity = searchParams.get("rarity") || "All";
  const page = Number(searchParams.get("page") || 1);
  const limit = 20;

  let startNumber = (page - 1) * limit + 1;

  // 1. Fetch ALL sold NFTs to build a complete map
  // REMOVED the restrictive collection filter here to ensure we catch everything
  const allSoldFromDb = await prisma.nft.findMany({
    where: { isSold: true },
    select: { 
      indexNumber: true, 
      collection: { select: { name: true } } 
    }
  });

  // 2. Create the set using LOWERCASE for guaranteed matching
  const soldSet = new Set(
    allSoldFromDb.map(n => `${n.collection.name.toLowerCase()}-${n.indexNumber}`)
  );

  // DEBUG LOG: Check your Terminal/Console to see if this list is empty!
  console.log("--- MARKETPLACE DEBUG ---");
  console.log("Total Sold Items in DB:", allSoldFromDb.length);
  console.log("Sold Set Keys:", Array.from(soldSet));

  const items = [];
  const TOTAL_SIZE = 6000;
  let currentId = startNumber;

  while (items.length < limit && currentId <= TOTAL_SIZE) {
    let currentColl = collection || (currentId % 2 === 0 ? "smartsnail" : "manchies");
    const data = getNftData(currentId, currentColl!);

    if (rarity !== "All" && data.rarity !== rarity) {
      currentId++;
      continue;
    }

    // 3. Match using the same lowercase logic
    const lookupKey = `${currentColl.toLowerCase()}-${currentId}`;
    const isActuallySold = soldSet.has(lookupKey);

    items.push({
      id: `virtual-${currentColl}-${currentId}`,
      name: `${currentColl === 'manchies' ? 'Manchie' : 'SmartSnail'} #${currentId}`,
      nickname: data.nickname,
      imageUrl: data.image,
      rarity: data.rarity,
      priceShells: data.price,
      priceTon: data.price / 1000000, 
      priceStars: Math.floor(data.price / 1000),
      collection: { name: currentColl },
      indexNumber: currentId,
      isSold: isActuallySold 
    });

    currentId++;
  }

  return NextResponse.json({
    items,
    page,
    total: TOTAL_SIZE,
    hasMore: items.length === limit,
  });
}