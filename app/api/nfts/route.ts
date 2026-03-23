import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNftData } from "@/lib/nftHelpers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const collection = searchParams.get("collection"); // Can be null
  const rarity = searchParams.get("rarity") || "All";
  const page = Number(searchParams.get("page") || 1);
  const limit = 20;

  let startNumber = (page - 1) * limit + 1;

  // Jump Logic
  if (collection === 'smartsnail' && rarity !== "All") {
    if (rarity === 'Epic') startNumber += 600;
    if (rarity === 'Rare') startNumber += 1350;
    if (rarity === 'Uncommon') startNumber += 2500;
    if (rarity === 'Common') startNumber += 4000;
  }

  // FIX: Only add the collection filter if it's not null
  const whereClause: any = { isSold: true };
  if (collection) {
    whereClause.collection = { name: collection };
  }

  const soldNfts = await prisma.nft.findMany({
    where: whereClause,
    select: { indexNumber: true, collection: { select: { name: true } } }
  });
  
  // Create a Set of "CollectionName-Index" so we don't skip the wrong one
  const soldSet = new Set(soldNfts.map(n => `${n.collection.name}-${n.indexNumber}`));

  const items = [];
  const TOTAL_SIZE = 6000;

  for (let i = startNumber; items.length < limit && i <= TOTAL_SIZE; i++) {
    // Alternate logic for "All" view
    let currentColl = collection;
    if (!collection) {
      currentColl = i % 2 === 0 ? "manchies" : "smartsnail";
    }

    // Skip if sold
    if (soldSet.has(`${currentColl}-${i}`)) continue;

    const data = getNftData(i, currentColl!);

    // Rarity filter
    if (rarity !== "All" && data.rarity !== rarity) {
      if (collection === 'smartsnail') {
         // Stop if we exit the rarity range for snails
         if (rarity === 'Legendary' && i > 600) break;
      }
      continue;
    }

    items.push({
      // FIX: Ensure ID doesn't contain "null"
      id: `virtual-${currentColl}-${i}`,
      name: `${currentColl === 'manchies' ? 'Manchie' : 'SmartSnail'} #${i}`,
      nickname: data.nickname,
      imageUrl: data.image,
      rarity: data.rarity,
      priceShells: data.price,
      priceTon: data.price / 1000000, 
      priceStars: Math.floor(data.price / 1000),
      collection: currentColl,
      indexNumber: i,
      isSold: false
    });
  }

  return NextResponse.json({
    items,
    page,
    total: TOTAL_SIZE,
    hasMore: items.length === limit,
  });
}