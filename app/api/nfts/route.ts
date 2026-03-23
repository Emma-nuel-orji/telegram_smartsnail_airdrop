import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNftData } from "@/lib/nftHelpers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const collection = (searchParams.get("collection") || "smartsnail").toLowerCase();
  const rarity = searchParams.get("rarity") || "All";
  const page = Number(searchParams.get("page") || 1);
  const limit = 20;

  // --- THE JUP LOGIC ---
  // This tells the loop where to start looking based on the rarity selected
  let startNumber = (page - 1) * limit + 1;

  if (collection === 'smartsnail' && rarity !== "All") {
    if (rarity === 'Epic') startNumber += 600;
    if (rarity === 'Rare') startNumber += 1350;
    if (rarity === 'Uncommon') startNumber += 2500;
    if (rarity === 'Common') startNumber += 4000;
    // Legendary stays at startNumber (1)
  }

  // 1. Fetch Sold Items
  const soldNfts = await prisma.nft.findMany({
    where: { isSold: true, collection: { name: collection } },
    select: { indexNumber: true }
  });
  const soldIndices = new Set(soldNfts.map(n => n.indexNumber));

  // 2. Generate Virtual Items
  const items = [];
  const TOTAL_SIZE = 6000;

  // We loop until we find 20 items OR hit the end of the collection
  for (let i = startNumber; items.length < limit && i <= TOTAL_SIZE; i++) {
    if (soldIndices.has(i)) continue; 

    const data = getNftData(i, collection);

    // CRITICAL: If filtering by rarity, skip items that don't match
    if (rarity !== "All" && data.rarity !== rarity) {
      // If we are looking for Legendaries and hit ID 601, stop the loop
      if (collection === 'smartsnail') break; 
      continue;
    }

    items.push({
      id: `virtual-${collection}-${i}`,
      name: `${collection === 'manchies' ? 'Manchie' : 'SmartSnail'} #${i}`,
      nickname: data.nickname,
      imageUrl: data.image,
      rarity: data.rarity,
      priceShells: data.price,
      priceTon: data.price / 1000000, 
      priceStars: Math.floor(data.price / 1000),
      collection: collection,
      indexNumber: i,
      isSold: false
    });
  }

  return NextResponse.json({
    items,
    page,
    total: TOTAL_SIZE,
    hasMore: items.length === limit, // If we found a full page, there's likely more
  });
}